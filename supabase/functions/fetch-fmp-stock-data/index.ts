import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FMP_API_KEY = Deno.env.get('FMP_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!FMP_API_KEY) {
      throw new Error('FMP_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { ticker, force_refresh = false } = await req.json();
    
    if (!ticker) {
      throw new Error('Ticker is required');
    }

    console.log(`Fetching FMP data for ${ticker} using Stable V2 endpoints (force_refresh: ${force_refresh})`);

    // Check cache (24h) - but only if data is from FMP and has essential fields
    if (!force_refresh) {
      const { data: existingData } = await supabase
        .from('fundamental_data')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .eq('asset_class', 'Ações')
        .single();

      if (existingData?.last_updated && existingData?.data_source === 'FMP') {
        const lastUpdate = new Date(existingData.last_updated);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        // Check if cache has essential data
        const hasEssentialData = existingData.current_price && 
                                 existingData.market_cap && 
                                 (existingData.pe_ratio || existingData.pb_ratio);
        
        if (hoursSinceUpdate < 24 && hasEssentialData) {
          console.log(`Using cached FMP data for ${ticker} (${hoursSinceUpdate.toFixed(1)}h old)`);
          return new Response(JSON.stringify(existingData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (!hasEssentialData) {
          console.log(`Cache invalid for ${ticker}: missing essential data, fetching fresh data`);
        }
      } else if (existingData?.data_source && existingData.data_source !== 'FMP') {
        console.log(`Cache invalid for ${ticker}: data_source is ${existingData.data_source}, not FMP`);
      }
    }

    // Fetch data from FMP Stable V2 endpoints in parallel
    const profileUrl = `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    const quoteUrl = `https://financialmodelingprep.com/stable/quote?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    const metricsUrl = `https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    const ratiosUrl = `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${ticker}&apikey=${FMP_API_KEY}`;

    console.log(`Fetching data from FMP Stable V2 for ${ticker}`);

    const [profileResponse, quoteResponse, metricsResponse, ratiosResponse] = await Promise.all([
      fetch(profileUrl),
      fetch(quoteUrl),
      fetch(metricsUrl),
      fetch(ratiosUrl)
    ]);

    // Check all responses
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error(`FMP Profile API Error: ${errorText}`);
      throw new Error(`FMP Profile API error: ${profileResponse.status} - ${errorText}`);
    }

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error(`FMP Quote API Error: ${errorText}`);
      throw new Error(`FMP Quote API error: ${quoteResponse.status} - ${errorText}`);
    }

    if (!metricsResponse.ok) {
      const errorText = await metricsResponse.text();
      console.error(`FMP Metrics API Error: ${errorText}`);
      throw new Error(`FMP Metrics API error: ${metricsResponse.status} - ${errorText}`);
    }

    if (!ratiosResponse.ok) {
      const errorText = await ratiosResponse.text();
      console.error(`FMP Ratios API Error: ${errorText}`);
      throw new Error(`FMP Ratios API error: ${ratiosResponse.status} - ${errorText}`);
    }

    const profileData = await profileResponse.json();
    const quoteData = await quoteResponse.json();
    const metricsData = await metricsResponse.json();
    const ratiosData = await ratiosResponse.json();

    // APIs retornam arrays, pegar o primeiro elemento
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData;
    const metrics = Array.isArray(metricsData) ? metricsData[0] : metricsData;
    const ratios = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;

    if (!profile || !quote) {
      throw new Error(`No data found for ticker ${ticker}`);
    }

    console.log(`Successfully fetched all data for ${ticker}`);

    // Map FMP Stable V2 data to fundamental_data table
    const fundamentalData: any = {
      ticker: ticker.toUpperCase(),
      asset_class: 'Ações',
      current_price: quote?.price || null,
      previous_close: quote?.previousClose || null,
      day_change_percent: quote?.changePercentage || null,
      pe_ratio: ratios?.priceToEarningsRatioTTM || null,
      pb_ratio: ratios?.priceToBookRatioTTM || null,
      market_cap: profile?.marketCap || null,
      dividend_yield: ratios?.dividendYieldTTM ? ratios.dividendYieldTTM * 100 : null,
      annual_dividend: profile?.lastDividend && quote?.price 
        ? (profile.lastDividend * 4)
        : null,
      roe: metrics?.returnOnEquityTTM ? metrics.returnOnEquityTTM * 100 : null,
      roe_percent: metrics?.returnOnEquityTTM ? metrics.returnOnEquityTTM * 100 : null,
      roa: metrics?.returnOnAssetsTTM ? metrics.returnOnAssetsTTM * 100 : null,
      roa_percent: metrics?.returnOnAssetsTTM ? metrics.returnOnAssetsTTM * 100 : null,
      profit_margin: ratios?.netProfitMarginTTM ? ratios.netProfitMarginTTM * 100 : null,
      m_liquida: ratios?.netProfitMarginTTM ? ratios.netProfitMarginTTM * 100 : null,
      m_bruta: ratios?.grossProfitMarginTTM ? ratios.grossProfitMarginTTM * 100 : null,
      m_ebit: ratios?.operatingProfitMarginTTM ? ratios.operatingProfitMarginTTM * 100 : null,
      m_ebitda: ratios?.ebitdaMarginTTM ? ratios.ebitdaMarginTTM * 100 : null,
      peg_ratio: ratios?.priceToEarningsGrowthRatioTTM || null,
      week_52_high: quote?.yearHigh || null,
      week_52_low: quote?.yearLow || null,
      avg_volume: profile?.averageVolume || quote?.volume || null,
      ev_ebitda: metrics?.evToEBITDATTM || null,
      payout_ratio: ratios?.dividendPayoutRatioTTM ? ratios.dividendPayoutRatioTTM * 100 : null,
      liq_corrente: ratios?.currentRatioTTM || null,
      div_liquida_pl: ratios?.debtToEquityTTM || null,
      roic: metrics?.returnOnCapitalEmployedTTM ? metrics.returnOnCapitalEmployedTTM * 100 : null,
      giro_ativos: ratios?.assetTurnoverTTM || null,
      data_source: 'FMP',
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`Mapped FMP data for ${ticker}:`, {
      has_price: !!fundamentalData.current_price,
      has_pe: !!fundamentalData.pe_ratio,
      has_pb: !!fundamentalData.pb_ratio,
      has_market_cap: !!fundamentalData.market_cap,
      has_margins: !!(fundamentalData.m_bruta || fundamentalData.m_ebit || fundamentalData.m_ebitda),
      has_ratios: !!(fundamentalData.roe || fundamentalData.roa || fundamentalData.roic)
    });

    console.log(`Storing fundamental data for ${ticker}`);
    const { data: upsertedData, error: upsertError } = await supabase
      .from('fundamental_data')
      .upsert(fundamentalData, { onConflict: 'ticker,asset_class' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting data:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully fetched and stored FMP data for ${ticker}`);

    return new Response(JSON.stringify(upsertedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-fmp-stock-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to fetch data from Financial Modeling Prep'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
