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
    const { ticker } = await req.json();
    console.log(`Fetching Yahoo Finance data for ${ticker}`);

    if (!ticker) {
      throw new Error('Ticker is required');
    }

    // Format ticker for Yahoo Finance (add .SA for Brazilian stocks)
    const yahooTicker = `${ticker}.SA`;
    
    // Fetch historical data (1 year with dividends) - this endpoint works without auth
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1y&events=div`;
    console.log(`Calling Yahoo Finance chart URL: ${chartUrl}`);
    
    const chartResponse = await fetch(chartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!chartResponse.ok) {
      console.error(`Yahoo Finance chart API error: ${chartResponse.status}`);
      throw new Error(`Yahoo Finance API returned ${chartResponse.status}`);
    }

    const chartData = await chartResponse.json();
    console.log('Yahoo Finance chart data received');

    // Process data from chart endpoint only (quote endpoint requires auth)
    const result = chartData.chart.result[0];
    
    if (!result) {
      throw new Error('Invalid response from Yahoo Finance');
    }

    // Extract quote data from chart meta (includes current price, previous close, etc.)
    const meta = result.meta;

    // Extract historical prices
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    const volumes = result.indicators.quote[0].volume || [];
    
    const historicalPrices = timestamps.map((ts: number, idx: number) => ({
      date: ts,
      close: closes[idx],
      volume: volumes[idx],
    }))
    .filter((p: any) => p.close !== null) // Remove null prices
    .sort((a: any, b: any) => b.date - a.date); // Sort from most recent to oldest
    
    console.log(`Historical prices: ${historicalPrices.length} days`);
    if (historicalPrices.length > 0) {
      console.log('Most recent price date:', new Date(historicalPrices[0].date * 1000).toISOString());
      console.log('Oldest price date:', new Date(historicalPrices[historicalPrices.length - 1].date * 1000).toISOString());
    }

    // Extract dividends
    const dividendEvents = result.events?.dividends || {};
    const dividendsList = Object.values(dividendEvents).map((div: any) => ({
      date: div.date,
      amount: div.amount,
    })).sort((a: any, b: any) => b.date - a.date); // Most recent first

    console.log(`Found ${dividendsList.length} dividend payments`);

    // Calculate metrics from chart meta
    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.chartPreviousClose || currentPrice;
    const dayChange = currentPrice - previousClose;
    const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;

    // Calculate average volume (last 30 days)
    const last30Days = historicalPrices.slice(-30);
    const avgVolume = last30Days.reduce((sum: number, p: any) => sum + (p.volume || 0), 0) / last30Days.length;

    // Calculate dividends summary
    const now = Date.now() / 1000;
    const threeMonthsAgo = now - (90 * 24 * 60 * 60);
    const sixMonthsAgo = now - (180 * 24 * 60 * 60);
    const twelveMonthsAgo = now - (365 * 24 * 60 * 60);

    const dividendsLast3Months = dividendsList.filter((d: any) => d.date >= threeMonthsAgo);
    const dividendsLast6Months = dividendsList.filter((d: any) => d.date >= sixMonthsAgo);
    const dividendsLast12Months = dividendsList.filter((d: any) => d.date >= twelveMonthsAgo);

    const sum3Months = dividendsLast3Months.reduce((sum: number, d: any) => sum + d.amount, 0);
    const sum6Months = dividendsLast6Months.reduce((sum: number, d: any) => sum + d.amount, 0);
    const sum12Months = dividendsLast12Months.reduce((sum: number, d: any) => sum + d.amount, 0);

    const ultimoDividendo = dividendsList.length > 0 ? dividendsList[0].amount : null;
    const dataUltimoDividendo = dividendsList.length > 0 
      ? new Date(dividendsList[0].date * 1000).toISOString().split('T')[0] 
      : null;

    // Try to get P/VP from Brapi as a complement
    let p_vp = null;
    
    try {
      console.log(`Fetching P/VP from Brapi for ${ticker}`);
      const brapiUrl = `https://brapi.dev/api/quote/${ticker}?fundamental=true&token=${Deno.env.get('BRAPI_API_KEY')}`;
      const brapiResponse = await fetch(brapiUrl);
      
      if (brapiResponse.ok) {
        const brapiData = await brapiResponse.json();
        const brapiStock = brapiData.results?.[0];
        
        if (brapiStock?.summaryProfile?.pvp) {
          p_vp = brapiStock.summaryProfile.pvp;
          console.log(`P/VP from Brapi: ${p_vp}`);
        } else {
          console.log('P/VP not available from Brapi');
        }
      } else {
        console.log(`Brapi request failed with status: ${brapiResponse.status}`);
      }
    } catch (error) {
      console.log('Could not fetch P/VP from Brapi, continuing without it:', error);
      // Don't fail, just continue without P/VP
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: upsertError } = await supabase
      .from('fundamental_data')
      .upsert({
        ticker: ticker,
        asset_class: 'FII',
        current_price: currentPrice,
        day_change_percent: dayChangePercent,
        previous_close: previousClose,
        p_vp: p_vp,
        liquidez_media_diaria: avgVolume * currentPrice,
        ultimo_dividendo: ultimoDividendo,
        data_ultimo_dividendo: dataUltimoDividendo,
        dividends_summary: {
          ultimo: {
            valor: ultimoDividendo,
            dyPercent: ultimoDividendo && currentPrice > 0 ? (ultimoDividendo / currentPrice) * 100 : null,
          },
          tresMeses: {
            valor: sum3Months,
            dyPercent: currentPrice > 0 ? (sum3Months / currentPrice) * 100 : null,
          },
          seisMeses: {
            valor: sum6Months,
            dyPercent: currentPrice > 0 ? (sum6Months / currentPrice) * 100 : null,
          },
          dozeMeses: {
            valor: sum12Months,
            dyPercent: currentPrice > 0 ? (sum12Months / currentPrice) * 100 : null,
          },
        },
        data_source: 'yahoo_finance',
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'ticker,asset_class',
      });

    if (upsertError) {
      console.error('Error storing data in Supabase:', upsertError);
    } else {
      console.log('Data successfully stored in Supabase');
    }

    // Return processed data
    const response = {
      success: true,
      ticker: ticker,
      current_price: currentPrice,
      day_change: dayChange,
      day_change_percent: dayChangePercent,
      p_vp: p_vp,
      avg_volume: avgVolume,
      ultimo_dividendo: ultimoDividendo,
      data_ultimo_dividendo: dataUltimoDividendo,
      dividends_summary: {
        ultimo: {
          valor: ultimoDividendo,
          dyPercent: ultimoDividendo && currentPrice > 0 ? (ultimoDividendo / currentPrice) * 100 : null,
        },
        tresMeses: {
          valor: sum3Months,
          dyPercent: currentPrice > 0 ? (sum3Months / currentPrice) * 100 : null,
        },
        seisMeses: {
          valor: sum6Months,
          dyPercent: currentPrice > 0 ? (sum6Months / currentPrice) * 100 : null,
        },
        dozeMeses: {
          valor: sum12Months,
          dyPercent: currentPrice > 0 ? (sum12Months / currentPrice) * 100 : null,
        },
      },
      historical_prices: historicalPrices,
      source: 'yahoo_finance',
      last_updated: new Date().toISOString(),
    };

    console.log('Successfully fetched and processed Yahoo Finance data for', ticker);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-yahoo-fii-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        source: 'yahoo_finance',
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
