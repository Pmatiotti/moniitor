import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DividendRecord {
  valor_por_cota: number;
  data_pagamento: string;
  data_base: string | null;
  tipo: string;
  cotacao_data_base?: number | null;
}

interface VPHistoryRecord {
  data_referencia: string;
  patrimonio_liquido: number | null;
  valor_patrimonial_cota: number | null;
  num_cotistas?: number | null;
}

interface PriceHistoryRecord {
  date: string;
  close: number;
  volume?: number;
}

interface PublicFIIData {
  ticker: string;
  nome_fundo?: string | null;
  
  // Market data
  current_price: number;
  day_change: number | null;
  day_change_percent: number | null;
  previous_close: number | null;
  
  // 52 week stats
  week_52_high: number | null;
  week_52_low: number | null;
  year_change_percent: number | null;
  month_change_percent: number | null;
  
  // Valuation
  p_vp: number | null;
  p_vp_calculado: number | null;
  
  // Patrimony data (CVM)
  patrimonio_liquido: number | null;
  valor_patrimonial_cota: number | null;
  liquidez_media_diaria: number | null;
  
  // Fund info
  num_cotistas: number | null;
  tipo_fii: string | null;
  segmento: string | null;
  gestor: string | null;
  administrador: string | null;
  data_referencia_cvm: string | null;
  
  // Last dividend
  ultimo_dividendo: number | null;
  data_ultimo_dividendo: string | null;
  
  // Dividend summaries by period
  dividendos_ultimo: { valor: number; percentual: number };
  dividendos_3m: { valor: number; percentual: number };
  dividendos_6m: { valor: number; percentual: number };
  dividendos_12m: { valor: number; percentual: number };
  dividendos_total: { valor: number; percentual: number }; // Since IPO
  
  // Full dividend history for charts/tables
  dividends: DividendRecord[];
  
  // VP history for charts
  vp_history: VPHistoryRecord[];
  
  // Price history for chart
  price_history: PriceHistoryRecord[];
  
  // Metadata
  sources: string[];
  last_update: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    
    if (!ticker) {
      throw new Error("Ticker is required");
    }

    const tickerUpper = ticker.toUpperCase().trim();
    console.log(`[fetch-public-fii] Fetching data for: ${tickerUpper}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sources: string[] = [];
    const result: Partial<PublicFIIData> = {
      ticker: tickerUpper,
      current_price: 0,
      dividends: [],
      vp_history: [],
      price_history: [],
      sources: [],
      last_update: new Date().toISOString(),
    };

    // 1. Fetch fund name from fii_registry
    const { data: registry } = await supabase
      .from("fii_registry")
      .select("nome_fundo, tipo, segmento")
      .eq("ticker", tickerUpper)
      .maybeSingle();

    if (registry) {
      result.nome_fundo = registry.nome_fundo;
      result.tipo_fii = registry.tipo;
      result.segmento = registry.segmento;
    }

    // 2. Fetch market data from Yahoo Finance
    console.log("[fetch-public-fii] Fetching Yahoo Finance data...");
    const yahooTicker = `${tickerUpper}.SA`;
    
    try {
      const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1y&events=div`;
      const chartResponse = await fetch(chartUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        const chartResult = chartData?.chart?.result?.[0];
        
        if (chartResult) {
          const meta = chartResult.meta;
          const timestamps = chartResult.timestamp || [];
          const quotes = chartResult.indicators?.quote?.[0] || {};
          
          const currentPrice = meta.regularMarketPrice || 0;
          result.current_price = currentPrice;
          result.previous_close = meta.chartPreviousClose || null;
          
          const prevClose = result.previous_close || currentPrice;
          const dayChange = currentPrice - prevClose;
          result.day_change = dayChange;
          result.day_change_percent = prevClose > 0 
            ? (dayChange / prevClose) * 100 
            : null;

          // Build price history
          const priceHistory: PriceHistoryRecord[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            if (quotes.close?.[i] != null) {
              priceHistory.push({
                date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                close: quotes.close[i],
                volume: quotes.volume?.[i] || 0,
              });
            }
          }
          result.price_history = priceHistory;

          // Calculate 52 week high/low
          if (priceHistory.length > 0) {
            const closes = priceHistory.map(p => p.close).filter(c => c > 0);
            result.week_52_high = Math.max(...closes);
            result.week_52_low = Math.min(...closes);
            
            // Year change (first vs current)
            const firstPrice = priceHistory[0]?.close || 0;
            if (firstPrice > 0 && currentPrice > 0) {
              result.year_change_percent = ((currentPrice - firstPrice) / firstPrice) * 100;
            }
            
            // Month change (last 30 days)
            const thirtyDaysAgo = priceHistory[Math.max(0, priceHistory.length - 22)];
            if (thirtyDaysAgo?.close > 0 && currentPrice > 0) {
              result.month_change_percent = ((currentPrice - thirtyDaysAgo.close) / thirtyDaysAgo.close) * 100;
            }
          }

          // Calculate average volume (last 30 days)
          const last30 = priceHistory.slice(-30);
          const totalVolume = last30.reduce((sum, p) => sum + (p.volume || 0), 0);
          const avgVolume = last30.length > 0 ? totalVolume / last30.length : 0;
          result.liquidez_media_diaria = avgVolume * (result.current_price || 0);

          // Process dividends from Yahoo
          const dividendEvents = chartResult.events?.dividends || {};
          const dividendsList = Object.entries(dividendEvents)
            .map(([timestamp, div]: [string, any]) => ({
              date: parseInt(timestamp),
              amount: div.amount,
            }))
            .sort((a, b) => b.date - a.date);

          if (dividendsList.length > 0) {
            result.ultimo_dividendo = dividendsList[0].amount;
            result.data_ultimo_dividendo = new Date(dividendsList[0].date * 1000).toISOString().split('T')[0];
          }

          sources.push("yahoo_finance");
          console.log("[fetch-public-fii] Yahoo Finance data fetched successfully");
        }
      }
    } catch (yahooError) {
      console.warn("[fetch-public-fii] Yahoo Finance fetch failed:", yahooError);
    }

    // 3. Fetch P/VP from Brapi
    try {
      const brapiApiKey = Deno.env.get('BRAPI_API_KEY');
      if (brapiApiKey) {
        const brapiUrl = `https://brapi.dev/api/quote/${tickerUpper}?fundamental=true&token=${brapiApiKey}`;
        const brapiResponse = await fetch(brapiUrl);
        
        if (brapiResponse.ok) {
          const brapiData = await brapiResponse.json();
          const brapiStock = brapiData.results?.[0];
          
          if (brapiStock?.summaryProfile?.pvp) {
            result.p_vp = brapiStock.summaryProfile.pvp;
            sources.push("brapi");
          }
        }
      }
    } catch (brapiError) {
      console.log("[fetch-public-fii] Brapi fetch failed, continuing:", brapiError);
    }

    // 4. Fetch CVM metrics (latest + history)
    console.log("[fetch-public-fii] Fetching CVM metrics...");
    const { data: cvmMetrics, error: cvmError } = await supabase
      .from("fii_metrics")
      .select("*")
      .eq("ticker", tickerUpper)
      .order("data_referencia", { ascending: false })
      .limit(60); // ~5 years of monthly data

    if (!cvmError && cvmMetrics && cvmMetrics.length > 0) {
      const latest = cvmMetrics[0];
      result.patrimonio_liquido = latest.patrimonio_liquido;
      result.valor_patrimonial_cota = latest.valor_patrimonial_cota;
      result.num_cotistas = latest.num_cotistas;
      result.tipo_fii = result.tipo_fii || latest.tipo_fii;
      result.segmento = result.segmento || latest.segmento;
      result.gestor = latest.gestor;
      result.administrador = latest.administrador;
      result.data_referencia_cvm = latest.data_referencia;

      // Calculate P/VP from CVM VP
      if (result.current_price && result.current_price > 0 && latest.valor_patrimonial_cota > 0) {
        result.p_vp_calculado = result.current_price / latest.valor_patrimonial_cota;
      }

      // Build VP history
      result.vp_history = cvmMetrics.map((m: any) => ({
        data_referencia: m.data_referencia,
        patrimonio_liquido: m.patrimonio_liquido,
        valor_patrimonial_cota: m.valor_patrimonial_cota,
        num_cotistas: m.num_cotistas,
      })).reverse();

      sources.push("cvm");
      console.log(`[fetch-public-fii] Found ${cvmMetrics.length} CVM records`);
    }

    // 5. Fetch dividend history from database
    console.log("[fetch-public-fii] Fetching dividend history...");
    const { data: dividends, error: divError } = await supabase
      .from("fii_dividends")
      .select("*")
      .eq("ticker", tickerUpper)
      .order("data_pagamento", { ascending: false })
      .limit(120); // ~10 years

    if (!divError && dividends && dividends.length > 0) {
      result.dividends = dividends.map((d: any) => ({
        valor_por_cota: d.valor_por_cota,
        data_pagamento: d.data_pagamento,
        data_base: d.data_base,
        tipo: d.tipo || "Rendimento",
        cotacao_data_base: d.cotacao_data_base,
      }));

      if (!result.ultimo_dividendo && dividends[0]) {
        result.ultimo_dividendo = dividends[0].valor_por_cota;
        result.data_ultimo_dividendo = dividends[0].data_pagamento;
      }

      sources.push("fii_dividends");
      console.log(`[fetch-public-fii] Found ${dividends.length} dividend records`);
    }

    // 6. Calculate dividend summaries by period
    const currentPrice = result.current_price || 0;
    const allDividends = result.dividends || [];
    const now = new Date();

    const calcDividendSummary = (months: number | null) => {
      let filteredDivs = allDividends;
      
      if (months !== null) {
        const cutoff = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
        filteredDivs = allDividends.filter(d => new Date(d.data_pagamento) >= cutoff);
      }
      
      const total = filteredDivs.reduce((sum, d) => sum + d.valor_por_cota, 0);
      const percentual = currentPrice > 0 ? (total / currentPrice) * 100 : 0;
      return { valor: total, percentual };
    };

    // Last dividend
    result.dividendos_ultimo = {
      valor: result.ultimo_dividendo || 0,
      percentual: currentPrice > 0 && result.ultimo_dividendo 
        ? (result.ultimo_dividendo / currentPrice) * 100 
        : 0,
    };
    
    result.dividendos_3m = calcDividendSummary(3);
    result.dividendos_6m = calcDividendSummary(6);
    result.dividendos_12m = calcDividendSummary(12);
    result.dividendos_total = calcDividendSummary(null); // All time

    result.sources = sources;

    console.log(`[fetch-public-fii] Data assembled from sources: ${sources.join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[fetch-public-fii] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
