import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompleteFIIData {
  ticker: string;
  current_price: number;
  day_change_percent: number | null;
  
  // Market data (Yahoo/Brapi)
  p_vp_mercado: number | null;
  ultimo_dividendo: number | null;
  avg_volume: number | null;
  
  // CVM data
  patrimonio_liquido: number | null;
  valor_patrimonial_cota: number | null;
  p_vp_calculado: number | null;
  num_cotistas: number | null;
  taxa_vacancia: number | null;
  tipo_fii: string | null;
  segmento: string | null;
  gestor: string | null;
  administrador: string | null;
  data_referencia_cvm: string | null;
  
  // Dividends history
  dividends: Array<{
    valor_por_cota: number;
    data_pagamento: string;
    data_base: string | null;
    tipo: string;
  }>;
  
  // Calculated dividend summaries
  dividendos_1m: { valor: number; percentual: number };
  dividendos_3m: { valor: number; percentual: number };
  dividendos_6m: { valor: number; percentual: number };
  dividendos_12m: { valor: number; percentual: number };
  
  // Performance
  performance_mes: number | null;
  performance_ano: number | null;
  
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

    console.log(`Fetching complete FII data for: ${ticker}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sources: string[] = [];
    let result: Partial<CompleteFIIData> = {
      ticker,
      current_price: 0,
      sources: [],
      last_update: new Date().toISOString(),
    };

    // 1. Fetch market data from Yahoo Finance
    console.log("Fetching Yahoo Finance data...");
    try {
      const yahooResponse = await fetch(
        `${supabaseUrl}/functions/v1/fetch-yahoo-fii-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ ticker }),
        }
      );

      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json();
        if (yahooData.success) {
          result.current_price = yahooData.current_price || 0;
          result.day_change_percent = yahooData.day_change || null;
          result.p_vp_mercado = yahooData.p_vp || null;
          result.ultimo_dividendo = yahooData.ultimo_dividendo || null;
          result.avg_volume = yahooData.avg_volume || null;
          
          // Process dividends from Yahoo
          if (yahooData.dividends_summary) {
            const ds = yahooData.dividends_summary;
            result.dividendos_1m = {
              valor: ds.ultimo?.valor || 0,
              percentual: ds.ultimo?.dyPercent || 0,
            };
            result.dividendos_3m = {
              valor: ds.tresMeses?.valor || 0,
              percentual: ds.tresMeses?.dyPercent || 0,
            };
            result.dividendos_6m = {
              valor: ds.seisMeses?.valor || 0,
              percentual: ds.seisMeses?.dyPercent || 0,
            };
            result.dividendos_12m = {
              valor: ds.dozeMeses?.valor || 0,
              percentual: ds.dozeMeses?.dyPercent || 0,
            };
          }

          // Calculate performance from historical prices
          if (yahooData.historical_prices?.length > 0) {
            const prices = yahooData.historical_prices;
            const currentPrice = result.current_price ?? 0;
            const now = new Date();
            
            // Month performance
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const monthAgoPrice = prices.find((p: any) => new Date(p.date * 1000) <= thirtyDaysAgo);
            if (monthAgoPrice?.close > 0 && currentPrice > 0) {
              result.performance_mes = ((currentPrice - monthAgoPrice.close) / monthAgoPrice.close) * 100;
            }
            
            // Year performance
            const oldestPrice = prices[prices.length - 1];
            if (oldestPrice?.close > 0 && currentPrice > 0) {
              result.performance_ano = ((currentPrice - oldestPrice.close) / oldestPrice.close) * 100;
            }
          }

          sources.push("yahoo_finance");
          console.log("Yahoo Finance data fetched successfully");
        }
      }
    } catch (yahooError) {
      console.warn("Yahoo Finance fetch failed:", yahooError);
    }

    // 2. Fetch CVM metrics from database
    console.log("Fetching CVM metrics from database...");
    const { data: cvmMetrics, error: cvmError } = await supabase
      .from("fii_metrics")
      .select("*")
      .eq("ticker", ticker)
      .order("data_referencia", { ascending: false })
      .limit(1);

    if (!cvmError && cvmMetrics && cvmMetrics.length > 0) {
      const cvm = cvmMetrics[0];
      result.patrimonio_liquido = cvm.patrimonio_liquido;
      result.valor_patrimonial_cota = cvm.valor_patrimonial_cota;
      result.num_cotistas = cvm.num_cotistas;
      result.taxa_vacancia = cvm.taxa_vacancia;
      result.tipo_fii = cvm.tipo_fii;
      result.segmento = cvm.segmento;
      result.gestor = cvm.gestor;
      result.administrador = cvm.administrador;
      result.data_referencia_cvm = cvm.data_referencia;

      // Calculate precise P/VP if we have VP from CVM
      const currPrice = result.current_price ?? 0;
      if (currPrice > 0 && cvm.valor_patrimonial_cota > 0) {
        result.p_vp_calculado = currPrice / cvm.valor_patrimonial_cota;
      }

      sources.push("cvm");
      console.log("CVM data fetched successfully");
    } else {
      console.log("No CVM data available for ticker:", ticker);
    }

    // 3. Fetch dividend history from database
    console.log("Fetching dividend history...");
    const { data: dividends, error: divError } = await supabase
      .from("fii_dividends")
      .select("*")
      .eq("ticker", ticker)
      .order("data_pagamento", { ascending: false })
      .limit(24); // Last 2 years

    if (!divError && dividends && dividends.length > 0) {
      result.dividends = dividends.map((d: any) => ({
        valor_por_cota: d.valor_por_cota,
        data_pagamento: d.data_pagamento,
        data_base: d.data_base,
        tipo: d.tipo,
      }));
      sources.push("fii_dividends");
      console.log(`Found ${dividends.length} dividend records`);

      // Recalculate dividend summaries if we have more complete data
      const now = new Date();
      const currentPrice = result.current_price || 0;

      const calcDividendSummary = (months: number) => {
        const cutoff = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
        const periodDividends = dividends.filter(
          (d: any) => new Date(d.data_pagamento) >= cutoff
        );
        const total = periodDividends.reduce((sum: number, d: any) => sum + d.valor_por_cota, 0);
        const percentual = currentPrice > 0 ? (total / currentPrice) * 100 : 0;
        return { valor: total, percentual };
      };

      // Only override if we have more data from DB
      if (dividends.length > 0) {
        const db1m = calcDividendSummary(1);
        const db3m = calcDividendSummary(3);
        const db6m = calcDividendSummary(6);
        const db12m = calcDividendSummary(12);

        // Use DB data if it's more complete
        if (db1m.valor > 0 || !result.dividendos_1m?.valor) result.dividendos_1m = db1m;
        if (db3m.valor > 0 || !result.dividendos_3m?.valor) result.dividendos_3m = db3m;
        if (db6m.valor > 0 || !result.dividendos_6m?.valor) result.dividendos_6m = db6m;
        if (db12m.valor > 0 || !result.dividendos_12m?.valor) result.dividendos_12m = db12m;
      }
    }

    // Set defaults for missing dividend data
    result.dividendos_1m = result.dividendos_1m || { valor: 0, percentual: 0 };
    result.dividendos_3m = result.dividendos_3m || { valor: 0, percentual: 0 };
    result.dividendos_6m = result.dividendos_6m || { valor: 0, percentual: 0 };
    result.dividendos_12m = result.dividendos_12m || { valor: 0, percentual: 0 };
    result.dividends = result.dividends || [];
    result.sources = sources;

    console.log(`Complete FII data assembled from sources: ${sources.join(", ")}`);

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
    console.error("Error fetching complete FII data:", error);
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
