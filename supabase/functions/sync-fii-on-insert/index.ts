import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FIIRegistry {
  ticker: string;
  cnpj: string;
  nome_fundo: string | null;
  tipo: string | null;
  segmento: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticker, asset_id, user_id } = await req.json();

    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: "Ticker é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedTicker = ticker.toUpperCase().replace(/\.SA$/, "");
    console.log(`[sync-fii-on-insert] Starting sync for ${normalizedTicker}`);

    const results = {
      ticker: normalizedTicker,
      registry_status: "unknown",
      market_data: false,
      cvm_data: false,
      dividends: false,
      relevant_facts: false,
      errors: [] as string[],
    };

    // Step 1: Check if ticker exists in registry
    const { data: registryData, error: registryError } = await supabase
      .from("fii_registry")
      .select("*")
      .eq("ticker", normalizedTicker)
      .maybeSingle();

    if (registryError) {
      console.error("[sync-fii-on-insert] Registry lookup error:", registryError);
      results.errors.push(`Registry lookup: ${registryError.message}`);
    }

    if (!registryData) {
      console.log(`[sync-fii-on-insert] Ticker ${normalizedTicker} not in registry, attempting discovery...`);
      
      // Try to discover the ticker
      try {
        const discoverResponse = await supabase.functions.invoke("discover-fii-ticker", {
          body: { ticker: normalizedTicker },
        });

        if (discoverResponse.error) {
          console.warn("[sync-fii-on-insert] Discovery failed:", discoverResponse.error);
          results.registry_status = "not_found";
          results.errors.push(`Discovery: ${discoverResponse.error.message || "Failed"}`);
        } else if (discoverResponse.data?.success) {
          results.registry_status = "discovered";
          console.log(`[sync-fii-on-insert] Successfully discovered ${normalizedTicker}`);
        } else {
          results.registry_status = "discovery_failed";
        }
      } catch (discoverErr) {
        console.error("[sync-fii-on-insert] Discovery error:", discoverErr);
        results.registry_status = "error";
        results.errors.push(`Discovery error: ${discoverErr instanceof Error ? discoverErr.message : "Unknown"}`);
      }
    } else {
      results.registry_status = "found";
      console.log(`[sync-fii-on-insert] Ticker ${normalizedTicker} found in registry`);
    }

    // Step 2: Fetch market data from Yahoo Finance
    console.log(`[sync-fii-on-insert] Fetching market data for ${normalizedTicker}...`);
    try {
      const yahooResponse = await supabase.functions.invoke("fetch-yahoo-fii-data", {
        body: { ticker: normalizedTicker },
      });

      if (yahooResponse.error) {
        console.warn("[sync-fii-on-insert] Yahoo fetch failed:", yahooResponse.error);
        results.errors.push(`Yahoo: ${yahooResponse.error.message || "Failed"}`);
      } else if (yahooResponse.data?.success !== false) {
        results.market_data = true;
        console.log(`[sync-fii-on-insert] Market data fetched successfully`);
        
        // Update asset with current price if we got it
        if (yahooResponse.data?.current_price && asset_id) {
          await supabase
            .from("assets")
            .update({ current_price: yahooResponse.data.current_price })
            .eq("id", asset_id);
        }
      }
    } catch (yahooErr) {
      console.error("[sync-fii-on-insert] Yahoo error:", yahooErr);
      results.errors.push(`Yahoo error: ${yahooErr instanceof Error ? yahooErr.message : "Unknown"}`);
    }

    // Step 3: Fetch CVM data if ticker is in registry
    if (results.registry_status === "found" || results.registry_status === "discovered") {
      console.log(`[sync-fii-on-insert] Fetching CVM data for ${normalizedTicker}...`);
      
      // Check if we already have CVM metrics
      const { data: existingMetrics } = await supabase
        .from("fii_metrics")
        .select("id, data_referencia")
        .eq("ticker", normalizedTicker)
        .order("data_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingMetrics) {
        results.cvm_data = true;
        console.log(`[sync-fii-on-insert] CVM data already exists (${existingMetrics.data_referencia})`);
      } else {
        // Trigger CVM sync for this specific ticker
        console.log(`[sync-fii-on-insert] No CVM data, would need full CVM sync`);
        // Note: Individual ticker CVM sync would require downloading full CSV
        // For now, mark as pending - cron job will pick it up
        results.cvm_data = false;
      }
    }

    // Step 4: Fetch historical dividends
    console.log(`[sync-fii-on-insert] Fetching dividends for ${normalizedTicker}...`);
    try {
      // Check existing dividends in fii_dividends table
      const { data: existingDividends, error: divError } = await supabase
        .from("fii_dividends")
        .select("id")
        .eq("ticker", normalizedTicker)
        .limit(1);

      if (divError) {
        console.warn("[sync-fii-on-insert] Dividends check error:", divError);
      }

      if (!existingDividends || existingDividends.length === 0) {
        // Try to fetch from Brapi
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        if (brapiKey) {
          try {
            const brapiUrl = `https://brapi.dev/api/quote/${normalizedTicker}?token=${brapiKey}&dividends=true`;
            const brapiResponse = await fetch(brapiUrl);
            
            if (brapiResponse.ok) {
              const brapiData = await brapiResponse.json();
              const dividends = brapiData?.results?.[0]?.dividendsData?.cashDividends || [];
              
              if (dividends.length > 0) {
                // Insert dividends into fii_dividends table
                const dividendsToInsert = dividends.slice(0, 24).map((div: any) => ({
                  ticker: normalizedTicker,
                  valor_por_cota: div.rate || 0,
                  data_pagamento: div.paymentDate?.split("T")[0] || null,
                  data_base: div.lastDatePrior?.split("T")[0] || null,
                  data_declaracao: div.approvedOn?.split("T")[0] || null,
                  tipo: div.type || "RENDIMENTO",
                  source: "brapi",
                })).filter((d: any) => d.data_pagamento && d.valor_por_cota > 0);

                if (dividendsToInsert.length > 0) {
                  const { error: insertError } = await supabase
                    .from("fii_dividends")
                    .upsert(dividendsToInsert, { 
                      onConflict: "ticker,data_pagamento",
                      ignoreDuplicates: true 
                    });

                  if (insertError) {
                    console.warn("[sync-fii-on-insert] Dividends insert error:", insertError);
                  } else {
                    results.dividends = true;
                    console.log(`[sync-fii-on-insert] Inserted ${dividendsToInsert.length} dividends`);
                  }
                }
              }
            }
          } catch (brapiErr) {
            console.warn("[sync-fii-on-insert] Brapi dividends error:", brapiErr);
            results.errors.push(`Brapi dividends: ${brapiErr instanceof Error ? brapiErr.message : "Unknown"}`);
          }
        }
      } else {
        results.dividends = true;
        console.log(`[sync-fii-on-insert] Dividends already exist`);
      }
    } catch (divErr) {
      console.error("[sync-fii-on-insert] Dividends error:", divErr);
      results.errors.push(`Dividends: ${divErr instanceof Error ? divErr.message : "Unknown"}`);
    }

    // Step 5: Fetch relevant facts
    console.log(`[sync-fii-on-insert] Fetching relevant facts for ${normalizedTicker}...`);
    try {
      const factsResponse = await supabase.functions.invoke("fetch-fii-relevant-facts", {
        body: { ticker: normalizedTicker, days: 30 },
      });

      if (factsResponse.error) {
        console.warn("[sync-fii-on-insert] Facts fetch failed:", factsResponse.error);
      } else if (factsResponse.data?.success) {
        results.relevant_facts = true;
        console.log(`[sync-fii-on-insert] Relevant facts fetched: ${factsResponse.data.count || 0}`);
      }
    } catch (factsErr) {
      console.error("[sync-fii-on-insert] Facts error:", factsErr);
      results.errors.push(`Facts: ${factsErr instanceof Error ? factsErr.message : "Unknown"}`);
    }

    // Step 6: Sync corporate events and notify
    console.log(`[sync-fii-on-insert] Syncing corporate events for ${normalizedTicker}...`);
    try {
      const eventsResponse = await supabase.functions.invoke("sync-corporate-events", {
        body: { ticker: normalizedTicker, notify: true, days: 30 },
      });

      if (eventsResponse.error) {
        console.warn("[sync-fii-on-insert] Corporate events sync failed:", eventsResponse.error);
        results.errors.push(`Corporate events: ${eventsResponse.error.message || "Failed"}`);
      } else if (eventsResponse.data?.success) {
        console.log(`[sync-fii-on-insert] Corporate events synced: ${eventsResponse.data.events_inserted || 0} new events`);
      }
    } catch (eventsErr) {
      console.error("[sync-fii-on-insert] Corporate events error:", eventsErr);
      results.errors.push(`Corporate events: ${eventsErr instanceof Error ? eventsErr.message : "Unknown"}`);
    }

    console.log(`[sync-fii-on-insert] Sync complete for ${normalizedTicker}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-fii-on-insert] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
