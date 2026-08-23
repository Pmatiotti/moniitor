import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketData {
  ticker: string;
  asset_class: string;
  current_price?: number;
  previous_close?: number;
  day_change_percent?: number;
  week_52_high?: number;
  week_52_low?: number;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  p_vp?: number;
  dividend_yield?: number;
  avg_volume?: number;
  patrimonio_liquido?: number;
  ultimo_dividendo?: number;
  data_ultimo_dividendo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, assetClass } = await req.json();
    console.log('Fetching market data for:', ticker, 'Asset class:', assetClass);

    if (!ticker) {
      throw new Error('Ticker is required');
    }

    const isFII = assetClass === 'FIIs';

    // Get auth from header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    // Fetch data from Yahoo Finance API (free, no key required)
    // Format: TICKER.SA for Brazilian stocks, but not for currency pairs (=X)
    const isCurrencyPair = ticker.includes('=X');
    const yahooTicker = (ticker.includes('.') || isCurrencyPair) ? ticker : `${ticker}.SA`;
    
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1y`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );

      if (!response.ok) {
        console.log('Yahoo Finance API error:', response.status);
        throw new Error('Failed to fetch from Yahoo Finance');
      }

      const data = await response.json();
      console.log('Yahoo Finance response received');

      const quote = data.chart?.result?.[0]?.meta;
      const indicators = data.chart?.result?.[0]?.indicators?.quote?.[0];

      if (!quote) {
        throw new Error('No data available for this ticker');
      }

      // Calculate metrics
      const currentPrice = quote.regularMarketPrice || quote.previousClose;
      const previousClose = quote.previousClose;
      const dayChangePercent = previousClose 
        ? ((currentPrice - previousClose) / previousClose) * 100 
        : 0;

      const marketData: MarketData = {
        ticker,
        asset_class: assetClass || 'stocks',
        current_price: currentPrice,
        previous_close: previousClose,
        day_change_percent: dayChangePercent,
        week_52_high: quote.fiftyTwoWeekHigh,
        week_52_low: quote.fiftyTwoWeekLow,
        market_cap: quote.marketCap,
        avg_volume: quote.averageDailyVolume10Day,
      };

      // Try to get additional fundamental data
      try {
        const statsResponse = await fetch(
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=defaultKeyStatistics,financialData,price,summaryDetail`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          const keyStats = statsData.quoteSummary?.result?.[0]?.defaultKeyStatistics;
          const financialData = statsData.quoteSummary?.result?.[0]?.financialData;
          const priceData = statsData.quoteSummary?.result?.[0]?.price;
          const summaryDetail = statsData.quoteSummary?.result?.[0]?.summaryDetail;

          if (keyStats) {
            if (isFII) {
              // Para FIIs, usar P/VP ao invés de P/L
              marketData.p_vp = keyStats.priceToBook?.raw;
              marketData.pb_ratio = keyStats.priceToBook?.raw;
            } else {
              // Para ações, manter P/L
              marketData.pe_ratio = keyStats.trailingPE?.raw;
              marketData.pb_ratio = keyStats.priceToBook?.raw;
            }
            
            marketData.dividend_yield = keyStats.dividendYield?.raw ? keyStats.dividendYield.raw * 100 : undefined;
            
            // Último dividendo
            if (summaryDetail?.dividendRate?.raw) {
              marketData.ultimo_dividendo = summaryDetail.dividendRate.raw;
            }
            
            if (summaryDetail?.exDividendDate?.fmt) {
              marketData.data_ultimo_dividendo = summaryDetail.exDividendDate.fmt;
            }
          }
          
          // Para FIIs, buscar valor patrimonial (NAV - Net Asset Value)
          if (isFII && priceData?.navPrice?.raw) {
            marketData.patrimonio_liquido = priceData.navPrice.raw;
          }
        }
      } catch (error) {
        console.log('Error fetching additional stats:', error);
        // Continue without additional stats
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('fundamental_data')
        .upsert({
          ticker,
          asset_class: marketData.asset_class,
          current_price: marketData.current_price,
          previous_close: marketData.previous_close,
          day_change_percent: marketData.day_change_percent,
          week_52_high: marketData.week_52_high,
          week_52_low: marketData.week_52_low,
          market_cap: marketData.market_cap,
          pe_ratio: marketData.pe_ratio,
          pb_ratio: marketData.pb_ratio,
          p_vp: marketData.p_vp,
          dividend_yield: marketData.dividend_yield,
          avg_volume: marketData.avg_volume,
          last_updated: new Date().toISOString(),
          data_source: 'yahoo_finance',
        }, {
          onConflict: 'ticker',
        });

      if (dbError) {
        console.error('Database error:', dbError);
      }

      return new Response(JSON.stringify({ success: true, data: marketData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (apiError) {
      console.error('API Error:', apiError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unable to fetch market data. Please try again later.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('fetch-market-data error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
