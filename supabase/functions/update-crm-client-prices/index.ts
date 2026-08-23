import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Asset {
  id: string;
  ticker: string;
  asset_class: string;
  current_price: number | null;
  quantity: number;
  currency: string | null;
}

async function fetchBrapiPrice(ticker: string, brapiKey: string | undefined): Promise<number | null> {
  try {
    const yahooTicker = ticker.toUpperCase().replace(/\s+/g, '');
    const url = brapiKey
      ? `https://brapi.dev/api/quote/${yahooTicker}?token=${brapiKey}`
      : `https://brapi.dev/api/quote/${yahooTicker}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Brapi returned ${response.status} for ${yahooTicker}`);
      return null;
    }

    const data = await response.json();
    const price = data?.results?.[0]?.regularMarketPrice;
    if (price && typeof price === "number" && price > 0) {
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Brapi price for ${ticker}:`, error);
    return null;
  }
}

async function fetchYahooPrice(ticker: string, currency: string | null): Promise<number | null> {
  try {
    let yahooTicker = ticker.toUpperCase();
    if (!currency || currency === "BRL") {
      if (!yahooTicker.includes(".")) {
        yahooTicker = `${yahooTicker}.SA`;
      }
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const quote = result.meta?.regularMarketPrice;
    if (quote && typeof quote === "number" && quote > 0) return quote;

    const closes = result.indicators?.quote?.[0]?.close;
    if (closes && closes.length > 0) {
      const lastClose = closes[closes.length - 1];
      if (lastClose && typeof lastClose === "number" && lastClose > 0) return lastClose;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo price for ${ticker}:`, error);
    return null;
  }
}

function shouldUpdatePrice(asset: Asset): boolean {
  const assetClass = asset.asset_class?.toLowerCase() || "";
  const variableIncomeClasses = [
    "ações", "acoes", "fiis", "fii", "fundos imobiliários", "fundos imobiliarios",
    "bdrs", "bdr", "etfs", "etf", "stocks", "reits", "renda variável", "renda variavel",
  ];
  return variableIncomeClasses.some(cls => assetClass.includes(cls));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brapiKey = Deno.env.get("BRAPI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientId } = await req.json();
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "clientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating prices for client: ${clientId}, requested by advisor: ${user.id}`);

    // Check if manual client
    const { data: manualClient } = await supabase
      .from("clients")
      .select("id, advisor_id")
      .eq("id", clientId)
      .maybeSingle();

    const isLinkedClient = !manualClient;

    // Verify access
    if (manualClient) {
      if (manualClient.advisor_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { data: link } = await supabase
        .from("client_advisor_links")
        .select("id")
        .eq("advisor_id", user.id)
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();

      if (!link) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, advisor_id")
          .eq("id", clientId)
          .maybeSingle();

        if (!profile || profile.advisor_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Access denied" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fetch assets
    let assetsQuery = supabase
      .from("assets")
      .select("id, ticker, asset_class, current_price, quantity, currency");

    if (isLinkedClient) {
      assetsQuery = assetsQuery.eq("user_id", clientId).is("client_id", null);
    } else {
      assetsQuery = assetsQuery.eq("client_id", clientId);
    }

    const { data: assets, error: assetsError } = await assetsQuery;
    if (assetsError) throw assetsError;

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No assets found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${assets.length} assets for client ${clientId}`);

    const assetsToUpdate = assets.filter(shouldUpdatePrice);
    console.log(`${assetsToUpdate.length} assets eligible for price update`);

    let updatedCount = 0;
    const errors: string[] = [];

    for (const asset of assetsToUpdate) {
      try {
        let price: number | null = null;
        const isUSD = asset.currency === "USD";

        if (!isUSD) {
          // BRL assets: Brapi first, Yahoo fallback
          price = await fetchBrapiPrice(asset.ticker, brapiKey);
          if (!price) {
            console.log(`Brapi failed for ${asset.ticker}, trying Yahoo fallback`);
            price = await fetchYahooPrice(asset.ticker, asset.currency);
          }
        } else {
          // USD assets: Yahoo directly
          price = await fetchYahooPrice(asset.ticker, asset.currency);
        }

        if (price !== null && price > 0) {
          const { error: updateError } = await supabase
            .from("assets")
            .update({ current_price: price, updated_at: new Date().toISOString() })
            .eq("id", asset.id);

          if (updateError) {
            errors.push(`${asset.ticker}: ${updateError.message}`);
          } else {
            console.log(`Updated ${asset.ticker}: ${asset.current_price} -> ${price}`);
            updatedCount++;
          }
        } else {
          console.log(`No price found for ${asset.ticker}`);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`${asset.ticker}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total: assetsToUpdate.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in update-crm-client-prices:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
