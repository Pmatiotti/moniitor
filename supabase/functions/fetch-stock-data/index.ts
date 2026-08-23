import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  fifty_two_week?: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
  };
}

interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
}

interface TechnicalIndicatorData {
  meta: {
    symbol: string;
    indicator: {
      name: string;
    };
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, dataType = 'all' } = await req.json();
    
    if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!TWELVE_DATA_API_KEY) {
      console.error('TWELVE_DATA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any = {
      ticker,
      success: true,
      data: {}
    };

    // 1. Fetch current quote and fundamental data
    if (dataType === 'all' || dataType === 'quote') {
      console.log(`Fetching quote for ${ticker}`);
      const quoteUrl = `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${TWELVE_DATA_API_KEY}`;
      const quoteResponse = await fetch(quoteUrl);
      const quoteData: TwelveDataQuote = await quoteResponse.json();

      if (quoteData && !('code' in quoteData)) {
        results.data.quote = quoteData;

        // Update fundamental_data table
        const fundamentalData = {
          ticker: ticker.toUpperCase(),
          asset_class: 'Renda Variável',
          current_price: parseFloat(quoteData.close),
          previous_close: parseFloat(quoteData.previous_close),
          day_change_percent: parseFloat(quoteData.percent_change),
          week_52_high: quoteData.fifty_two_week ? parseFloat(quoteData.fifty_two_week.high) : null,
          week_52_low: quoteData.fifty_two_week ? parseFloat(quoteData.fifty_two_week.low) : null,
          avg_volume: parseFloat(quoteData.average_volume),
          data_source: 'Twelve Data',
          last_updated: new Date().toISOString(),
        };

        const { error: fundError } = await supabase
          .from('fundamental_data')
          .upsert(fundamentalData, { onConflict: 'ticker,asset_class' });

        if (fundError) {
          console.error('Error updating fundamental_data:', fundError);
        }
      }
    }

    // 2. Fetch time series (historical prices)
    if (dataType === 'all' || dataType === 'history') {
      console.log(`Fetching time series for ${ticker}`);
      const timeSeriesUrl = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&outputsize=90&apikey=${TWELVE_DATA_API_KEY}`;
      const timeSeriesResponse = await fetch(timeSeriesUrl);
      const timeSeriesData: TwelveDataTimeSeries = await timeSeriesResponse.json();

      if (timeSeriesData.values && Array.isArray(timeSeriesData.values)) {
        results.data.history = timeSeriesData.values;

        // Insert price history (upsert to avoid duplicates)
        const priceHistoryRecords = timeSeriesData.values.map((item) => ({
          ticker: ticker.toUpperCase(),
          date: item.datetime.split(' ')[0], // Get just the date part
          open_price: parseFloat(item.open),
          high_price: parseFloat(item.high),
          low_price: parseFloat(item.low),
          close_price: parseFloat(item.close),
          volume: parseInt(item.volume),
        }));

        const { error: histError } = await supabase
          .from('stock_price_history')
          .upsert(priceHistoryRecords, { onConflict: 'ticker,date' });

        if (histError) {
          console.error('Error updating stock_price_history:', histError);
        }
      }
    }

    // 3. Fetch technical indicators
    if (dataType === 'all' || dataType === 'indicators') {
      console.log(`Fetching technical indicators for ${ticker}`);
      
      // RSI (14 days)
      const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${ticker}&interval=1day&time_period=14&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`;
      const rsiResponse = await fetch(rsiUrl);
      const rsiData: TechnicalIndicatorData = await rsiResponse.json();

      if (rsiData.values && Array.isArray(rsiData.values)) {
        results.data.rsi = rsiData.values;
        
        const rsiRecords = rsiData.values.map((item) => ({
          ticker: ticker.toUpperCase(),
          date: item.datetime.split(' ')[0],
          indicator_type: 'rsi',
          value: parseFloat(item.rsi),
          period: 14,
        }));

        await supabase
          .from('technical_indicators')
          .upsert(rsiRecords, { onConflict: 'ticker,date,indicator_type,period' });
      }

      // MACD
      const macdUrl = `https://api.twelvedata.com/macd?symbol=${ticker}&interval=1day&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`;
      const macdResponse = await fetch(macdUrl);
      const macdData: TechnicalIndicatorData = await macdResponse.json();

      if (macdData.values && Array.isArray(macdData.values)) {
        results.data.macd = macdData.values;
        
        for (const item of macdData.values) {
          const date = item.datetime.split(' ')[0];
          
          // Store MACD line
          if (item.macd) {
            await supabase
              .from('technical_indicators')
              .upsert({
                ticker: ticker.toUpperCase(),
                date,
                indicator_type: 'macd',
                value: parseFloat(item.macd),
                period: null,
                metadata: { signal: item.macd_signal, histogram: item.macd_hist }
              }, { onConflict: 'ticker,date,indicator_type,period' });
          }
        }
      }

      // SMA (Simple Moving Average) - 20 and 50 days
      for (const period of [20, 50]) {
        const smaUrl = `https://api.twelvedata.com/sma?symbol=${ticker}&interval=1day&time_period=${period}&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`;
        const smaResponse = await fetch(smaUrl);
        const smaData: TechnicalIndicatorData = await smaResponse.json();

        if (smaData.values && Array.isArray(smaData.values)) {
          if (!results.data.sma) results.data.sma = {};
          results.data.sma[`sma${period}`] = smaData.values;
          
          const smaRecords = smaData.values.map((item) => ({
            ticker: ticker.toUpperCase(),
            date: item.datetime.split(' ')[0],
            indicator_type: 'sma',
            value: parseFloat(item.sma),
            period,
          }));

          await supabase
            .from('technical_indicators')
            .upsert(smaRecords, { onConflict: 'ticker,date,indicator_type,period' });
        }
      }
    }

    console.log(`Successfully fetched and stored data for ${ticker}`);
    
    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-stock-data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stock data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
