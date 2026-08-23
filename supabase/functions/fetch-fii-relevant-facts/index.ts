import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelevantFact {
  ticker: string;
  titulo: string;
  resumo: string | null;
  data_publicacao: string;
  url_documento: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticker, days = 30, sync_all = false } = await req.json();

    console.log(`[fetch-fii-relevant-facts] Starting for ticker: ${ticker}, days: ${days}`);

    let tickersToProcess: string[] = [];

    if (sync_all) {
      // Fetch all tickers from registry for bulk sync
      const { data: registryData, error: registryError } = await supabase
        .from("fii_registry")
        .select("ticker");

      if (registryError) {
        throw new Error(`Registry error: ${registryError.message}`);
      }

      tickersToProcess = registryData?.map((r) => r.ticker) || [];
      console.log(`[fetch-fii-relevant-facts] Syncing ${tickersToProcess.length} tickers`);
    } else if (ticker) {
      tickersToProcess = [ticker.toUpperCase().replace(/\.SA$/, "")];
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Ticker ou sync_all é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { ticker: string; count: number; error?: string }[] = [];
    const allFacts: RelevantFact[] = [];

    for (const currentTicker of tickersToProcess) {
      try {
        console.log(`[fetch-fii-relevant-facts] Processing ${currentTicker}`);
        
        // Try to fetch facts from Status Invest (common source for FII news)
        // Note: In production, you'd want to use official B3/CVM APIs
        // For now, we'll create sample relevant facts based on common announcements
        
        // Check if we already have recent facts for this ticker
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const { data: existingFacts } = await supabase
          .from("fii_relevant_facts")
          .select("id, data_publicacao")
          .eq("ticker", currentTicker)
          .gte("data_publicacao", cutoffDate.toISOString().split("T")[0])
          .order("data_publicacao", { ascending: false })
          .limit(5);

        if (existingFacts && existingFacts.length > 0) {
          console.log(`[fetch-fii-relevant-facts] ${currentTicker} has ${existingFacts.length} recent facts`);
          results.push({ ticker: currentTicker, count: existingFacts.length });
          continue;
        }

        // Try to fetch from Brapi (if they have news endpoint)
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        let factsFound = 0;

        if (brapiKey) {
          try {
            // Brapi doesn't have a specific news endpoint, but we can check their quote endpoint
            // for any available information
            const brapiUrl = `https://brapi.dev/api/quote/${currentTicker}?token=${brapiKey}`;
            const response = await fetch(brapiUrl);
            
            if (response.ok) {
              const data = await response.json();
              const result = data?.results?.[0];
              
              // If the FII has dividends data, we can create a "dividend announced" fact
              if (result?.dividendsData?.cashDividends?.length > 0) {
                const latestDividend = result.dividendsData.cashDividends[0];
                const announcementDate = latestDividend.approvedOn?.split("T")[0] || 
                                         new Date().toISOString().split("T")[0];
                
                // Only add if it's recent
                if (new Date(announcementDate) >= cutoffDate) {
                  const fact: RelevantFact = {
                    ticker: currentTicker,
                    titulo: `Dividendo anunciado: R$ ${latestDividend.rate?.toFixed(2) || "0.00"} por cota`,
                    resumo: `Pagamento previsto para ${latestDividend.paymentDate?.split("T")[0] || "data a definir"}. Data-com: ${latestDividend.lastDatePrior?.split("T")[0] || "a definir"}.`,
                    data_publicacao: announcementDate,
                    url_documento: null,
                  };
                  
                  allFacts.push(fact);
                  factsFound++;
                }
              }
            }
          } catch (brapiErr) {
            console.warn(`[fetch-fii-relevant-facts] Brapi error for ${currentTicker}:`, brapiErr);
          }
        }

        results.push({ ticker: currentTicker, count: factsFound });
      } catch (tickerErr) {
        console.error(`[fetch-fii-relevant-facts] Error for ${currentTicker}:`, tickerErr);
        results.push({ 
          ticker: currentTicker, 
          count: 0, 
          error: tickerErr instanceof Error ? tickerErr.message : "Unknown" 
        });
      }
    }

    // Insert all facts
    if (allFacts.length > 0) {
      console.log(`[fetch-fii-relevant-facts] Inserting ${allFacts.length} facts`);
      
      const { error: insertError } = await supabase
        .from("fii_relevant_facts")
        .upsert(allFacts, { 
          onConflict: "ticker,data_publicacao,titulo",
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error("[fetch-fii-relevant-facts] Insert error:", insertError);
      } else {
        // Trigger corporate events sync to create notifications
        console.log("[fetch-fii-relevant-facts] Triggering corporate events sync...");
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          await fetch(`${supabaseUrl}/functions/v1/sync-corporate-events`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ 
              ticker: tickersToProcess[0], 
              notify: true,
              days: 7 
            }),
          });
        } catch (syncErr) {
          console.warn("[fetch-fii-relevant-facts] Corporate events sync failed:", syncErr);
        }
      }
    }

    const totalFacts = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`[fetch-fii-relevant-facts] Complete. Total facts: ${totalFacts}`);

    return new Response(
      JSON.stringify({
        success: true,
        count: totalFacts,
        tickers_processed: tickersToProcess.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-fii-relevant-facts] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
