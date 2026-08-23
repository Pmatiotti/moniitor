import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnrichRequest {
  ticker?: string;
  tickers?: string[];
  years?: number[];
  force?: boolean;
}

interface YearEndPrice {
  year: number;
  price: number;
  date: string;
}

interface EnrichResult {
  year: number;
  year_end_price: number;
  p_l: number | null;
  p_vp: number | null;
  dividend_yield: number | null;
}

interface EnrichResponse {
  ok: boolean;
  ticker: string;
  enriched: number;
  skipped: number;
  errors: string[];
  details: EnrichResult[];
}

// Fetch historical prices from BRAPI
async function fetchHistoricalPrices(ticker: string, apiKey: string): Promise<YearEndPrice[]> {
  console.log(`[BRAPI] Fetching historical prices for ${ticker}`);
  
  const url = `https://brapi.dev/api/quote/${ticker}?range=max&interval=1d&token=${apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`BRAPI error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.results || !data.results[0]?.historicalDataPrice) {
    throw new Error("No historical price data available");
  }
  
  const historicalData = data.results[0].historicalDataPrice;
  console.log(`[BRAPI] Received ${historicalData.length} price points`);
  
  // Group by year and find last trading day of each year
  const yearEndPrices: Map<number, YearEndPrice> = new Map();
  
  for (const candle of historicalData) {
    const date = new Date(candle.date * 1000);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed, December = 11
    
    // Only consider December candles
    if (month !== 11) continue;
    
    const existing = yearEndPrices.get(year);
    
    // Keep the latest date in December
    if (!existing || date.getTime() > new Date(existing.date).getTime()) {
      yearEndPrices.set(year, {
        year,
        price: candle.close,
        date: date.toISOString().split("T")[0],
      });
    }
  }
  
  const result = Array.from(yearEndPrices.values()).sort((a, b) => a.year - b.year);
  console.log(`[BRAPI] Found year-end prices for years: ${result.map(r => r.year).join(", ")}`);
  
  return result;
}

interface FundamentalRecord {
  market_cap: number | null;
  current_price: number | null;
}

interface AnnualRecord {
  year: number;
  net_income: number | null;
  total_equity: number | null;
  dividends_paid: number | null;
  p_l: number | null;
  p_vp: number | null;
  dividend_yield: number | null;
}

// Get shares outstanding from current fundamental data
// deno-lint-ignore no-explicit-any
async function getSharesOutstanding(
  supabase: any,
  ticker: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("fundamental_data")
    .select("market_cap, current_price")
    .eq("ticker", ticker)
    .maybeSingle();
  
  if (error || !data) {
    console.log(`[DB] No fundamental_data found for ${ticker}`);
    return null;
  }
  
  const record = data as FundamentalRecord;
  
  if (!record.market_cap || !record.current_price || record.current_price === 0) {
    console.log(`[DB] Missing market_cap or current_price for ${ticker}`);
    return null;
  }
  
  const shares = record.market_cap / record.current_price;
  console.log(`[DB] Calculated shares outstanding for ${ticker}: ${shares.toLocaleString()}`);
  
  return shares;
}

// Calculate indicators for a single year
function calculateIndicators(
  yearEndPrice: number,
  sharesOutstanding: number,
  netIncome: number | null,
  totalEquity: number | null,
  dividendsPaid: number | null
): { p_l: number | null; p_vp: number | null; dividend_yield: number | null } {
  const marketCap = yearEndPrice * sharesOutstanding;
  
  // P/L = Market Cap / Net Income
  let p_l: number | null = null;
  if (netIncome && netIncome !== 0) {
    p_l = Math.round((marketCap / netIncome) * 100) / 100;
  }
  
  // P/VP = Market Cap / Total Equity
  let p_vp: number | null = null;
  if (totalEquity && totalEquity > 0) {
    p_vp = Math.round((marketCap / totalEquity) * 100) / 100;
  }
  
  // DY = Dividends Paid / Market Cap (as decimal, e.g., 0.05 = 5%)
  let dividend_yield: number | null = null;
  if (dividendsPaid && marketCap > 0) {
    dividend_yield = Math.round((dividendsPaid / marketCap) * 10000) / 10000;
  }
  
  return { p_l, p_vp, dividend_yield };
}

// Enrich a single ticker
// deno-lint-ignore no-explicit-any
async function enrichTicker(
  supabase: any,
  ticker: string,
  brapiKey: string,
  years?: number[],
  force = false
): Promise<EnrichResponse> {
  const response: EnrichResponse = {
    ok: true,
    ticker,
    enriched: 0,
    skipped: 0,
    errors: [],
    details: [],
  };
  
  try {
    // Step 1: Fetch historical prices from BRAPI
    const yearEndPrices = await fetchHistoricalPrices(ticker, brapiKey);
    
    if (yearEndPrices.length === 0) {
      response.errors.push("No year-end prices found");
      response.ok = false;
      return response;
    }
    
    // Step 2: Get shares outstanding from current data
    const sharesOutstanding = await getSharesOutstanding(supabase, ticker);
    
    if (!sharesOutstanding) {
      response.errors.push("Could not calculate shares outstanding");
      response.ok = false;
      return response;
    }
    
    // Step 3: Fetch existing annual_fundamentals data
    const yearsToProcess = years || yearEndPrices.map(p => p.year);
    const currentYear = new Date().getFullYear();
    
    // Filter out current year (data not finalized) and future years
    const validYears = yearsToProcess.filter(y => y < currentYear);
    
    const { data: annualData, error: fetchError } = await supabase
      .from("annual_fundamentals")
      .select("year, net_income, total_equity, dividends_paid, p_l, p_vp, dividend_yield")
      .eq("ticker", ticker)
      .in("year", validYears);
    
    if (fetchError) {
      response.errors.push(`DB error: ${fetchError.message}`);
      response.ok = false;
      return response;
    }
    
    const typedAnnualData = (annualData || []) as AnnualRecord[];
    const annualDataMap = new Map(typedAnnualData.map(d => [d.year, d]));
    const priceMap = new Map(yearEndPrices.map(p => [p.year, p]));
    
    // Step 4: Calculate and update for each year
    for (const year of validYears) {
      const priceData = priceMap.get(year);
      const annual = annualDataMap.get(year);
      
      if (!priceData) {
        console.log(`[CALC] No price data for ${ticker} ${year}, skipping`);
        continue;
      }
      
      if (!annual) {
        console.log(`[CALC] No annual_fundamentals record for ${ticker} ${year}, skipping`);
        continue;
      }
      
      // Skip if already has indicators and not forcing
      if (!force && annual.p_l !== null && annual.p_vp !== null) {
        console.log(`[CALC] ${ticker} ${year} already has indicators, skipping`);
        response.skipped++;
        continue;
      }
      
      // Calculate indicators
      const indicators = calculateIndicators(
        priceData.price,
        sharesOutstanding,
        annual.net_income,
        annual.total_equity,
        annual.dividends_paid
      );
      
      // Update database
      const { error: updateError } = await supabase
        .from("annual_fundamentals")
        .update({
          current_price: priceData.price,
          p_l: indicators.p_l,
          p_vp: indicators.p_vp,
          dividend_yield: indicators.dividend_yield,
          updated_at: new Date().toISOString(),
        })
        .eq("ticker", ticker)
        .eq("year", year);
      
      if (updateError) {
        response.errors.push(`Failed to update ${year}: ${updateError.message}`);
        continue;
      }
      
      response.enriched++;
      response.details.push({
        year,
        year_end_price: priceData.price,
        p_l: indicators.p_l,
        p_vp: indicators.p_vp,
        dividend_yield: indicators.dividend_yield,
      });
      
      console.log(`[CALC] ${ticker} ${year}: Price=${priceData.price}, P/L=${indicators.p_l}, P/VP=${indicators.p_vp}, DY=${indicators.dividend_yield}`);
    }
    
    console.log(`[DONE] ${ticker}: enriched=${response.enriched}, skipped=${response.skipped}, errors=${response.errors.length}`);
    
  } catch (error) {
    response.ok = false;
    response.errors.push(error instanceof Error ? error.message : String(error));
    console.error(`[ERROR] ${ticker}:`, error);
  }
  
  return response;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brapiKey = Deno.env.get("BRAPI_API_KEY")!;
    
    if (!brapiKey) {
      throw new Error("BRAPI_API_KEY not configured");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: EnrichRequest = await req.json().catch(() => ({}));
    
    // Determine which tickers to process
    let tickers: string[] = [];
    
    if (body.ticker) {
      tickers = [body.ticker.toUpperCase()];
    } else if (body.tickers && Array.isArray(body.tickers)) {
      tickers = body.tickers.map(t => t.toUpperCase());
    } else {
      // If no ticker specified, get all unique tickers from annual_fundamentals
      const { data: tickerData, error } = await supabase
        .from("annual_fundamentals")
        .select("ticker")
        .limit(100);
      
      if (error) {
        throw new Error(`Failed to fetch tickers: ${error.message}`);
      }
      
      tickers = [...new Set(tickerData?.map(d => d.ticker) || [])];
    }
    
    if (tickers.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No tickers to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[START] Processing ${tickers.length} ticker(s): ${tickers.join(", ")}`);
    
    // Process each ticker
    const results: EnrichResponse[] = [];
    
    for (const ticker of tickers) {
      const result = await enrichTicker(
        supabase,
        ticker,
        brapiKey,
        body.years,
        body.force ?? false
      );
      results.push(result);
      
      // Small delay between tickers to avoid rate limiting
      if (tickers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Summary
    const totalEnriched = results.reduce((sum, r) => sum + r.enriched, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(`[SUMMARY] Total: enriched=${totalEnriched}, skipped=${totalSkipped}, errors=${totalErrors}`);
    
    return new Response(
      JSON.stringify({
        ok: totalErrors === 0,
        summary: {
          tickers_processed: tickers.length,
          total_enriched: totalEnriched,
          total_skipped: totalSkipped,
          total_errors: totalErrors,
        },
        results: results.length === 1 ? results[0] : results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[FATAL]", error);
    
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

