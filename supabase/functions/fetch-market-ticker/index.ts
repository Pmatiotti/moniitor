import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const brapiKey = Deno.env.get('BRAPI_API_KEY');
    const twelveDataKey = Deno.env.get('TWELVE_DATA_API_KEY');
    
    const quotes: QuoteData[] = [];
    const errors: string[] = [];

    // Fetch USD/BRL and EUR/BRL from BRAPI
    console.log('Fetching currency quotes from BRAPI...');
    try {
      const currencyResponse = await fetch(
        `https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL&token=${brapiKey}`
      );
      
      if (currencyResponse.ok) {
        const currencyData = await currencyResponse.json();
        console.log('Currency data received:', JSON.stringify(currencyData));
        
        if (currencyData.currency) {
          for (const curr of currencyData.currency) {
            const bidPrice = parseFloat(curr.bidPrice) || 0;
            const bidVariation = parseFloat(curr.bidVariation) || 0;
            
            // Calculate changePercent manually if pctChange is empty
            // Formula: (variation / (price - variation)) * 100
            let changePercent = parseFloat(curr.pctChange) || 0;
            if (!changePercent && bidPrice > 0 && bidVariation !== 0) {
              const previousPrice = bidPrice - bidVariation;
              if (previousPrice > 0) {
                changePercent = (bidVariation / previousPrice) * 100;
              }
            }
            
            if (curr.fromCurrency === 'USD') {
              quotes.push({
                symbol: 'USD',
                name: 'Dólar',
                price: bidPrice,
                change: bidVariation,
                changePercent: changePercent,
                currency: 'BRL',
              });
            } else if (curr.fromCurrency === 'EUR') {
              quotes.push({
                symbol: 'EUR',
                name: 'Euro',
                price: bidPrice,
                change: bidVariation,
                changePercent: changePercent,
                currency: 'BRL',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching currency:', err);
      errors.push('currency');
    }

    // Fetch crypto from BRAPI
    console.log('Fetching crypto quotes from BRAPI...');
    try {
      const cryptoResponse = await fetch(
        `https://brapi.dev/api/v2/crypto?coin=BTC,ETH&currency=BRL&token=${brapiKey}`
      );
      
      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        console.log('Crypto data received:', JSON.stringify(cryptoData));
        
        if (cryptoData.coins) {
          for (const coin of cryptoData.coins) {
            if (coin.coin === 'BTC') {
              quotes.push({
                symbol: 'BTC',
                name: 'Bitcoin',
                price: coin.regularMarketPrice || 0,
                change: coin.regularMarketChange || 0,
                changePercent: coin.regularMarketChangePercent || 0,
                currency: 'BRL',
              });
            } else if (coin.coin === 'ETH') {
              quotes.push({
                symbol: 'ETH',
                name: 'Ethereum',
                price: coin.regularMarketPrice || 0,
                change: coin.regularMarketChange || 0,
                changePercent: coin.regularMarketChangePercent || 0,
                currency: 'BRL',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching crypto:', err);
      errors.push('crypto');
    }

    // Fetch Brazilian index IBOV from BRAPI
    console.log('Fetching Ibovespa from BRAPI...');
    try {
      const ibovResponse = await fetch(
        `https://brapi.dev/api/quote/%5EBVSP?token=${brapiKey}`
      );
      
      if (ibovResponse.ok) {
        const ibovData = await ibovResponse.json();
        console.log('Ibovespa data received:', JSON.stringify(ibovData));
        
        if (ibovData.results && ibovData.results.length > 0) {
          const result = ibovData.results[0];
          quotes.push({
            symbol: 'IBOV',
            name: 'Ibovespa',
            price: result.regularMarketPrice || 0,
            change: result.regularMarketChange || 0,
            changePercent: result.regularMarketChangePercent || 0,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching Ibovespa:', err);
      errors.push('ibov');
    }

    // Fetch IFIX separately - try multiple approaches
    console.log('Fetching IFIX from BRAPI...');
    try {
      // Try fetching IFIX with Yahoo symbol
      const ifixResponse = await fetch(
        `https://brapi.dev/api/quote/IFIX.SA?token=${brapiKey}`
      );
      
      if (ifixResponse.ok) {
        const ifixData = await ifixResponse.json();
        console.log('IFIX data received:', JSON.stringify(ifixData));
        
        if (ifixData.results && ifixData.results.length > 0) {
          const result = ifixData.results[0];
          quotes.push({
            symbol: 'IFIX',
            name: 'IFIX',
            price: result.regularMarketPrice || 0,
            change: result.regularMarketChange || 0,
            changePercent: result.regularMarketChangePercent || 0,
          });
        }
      } else {
        // Fallback: try with ^IFIX
        const ifixAltResponse = await fetch(
          `https://brapi.dev/api/quote/%5EIFIX?token=${brapiKey}`
        );
        
        if (ifixAltResponse.ok) {
          const ifixAltData = await ifixAltResponse.json();
          console.log('IFIX alt data received:', JSON.stringify(ifixAltData));
          
          if (ifixAltData.results && ifixAltData.results.length > 0) {
            const result = ifixAltData.results[0];
            quotes.push({
              symbol: 'IFIX',
              name: 'IFIX',
              price: result.regularMarketPrice || 0,
              change: result.regularMarketChange || 0,
              changePercent: result.regularMarketChangePercent || 0,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching IFIX:', err);
      errors.push('ifix');
    }

    // Fetch US indices (S&P 500, Nasdaq) from BRAPI
    console.log('Fetching US indices from BRAPI...');
    try {
      const usResponse = await fetch(
        `https://brapi.dev/api/quote/%5EGSPC,%5EIXIC?token=${brapiKey}`
      );
      
      if (usResponse.ok) {
        const usData = await usResponse.json();
        console.log('US indices data received:', JSON.stringify(usData));
        
        if (usData.results) {
          for (const result of usData.results) {
            if (result.symbol === '^GSPC') {
              quotes.push({
                symbol: 'S&P500',
                name: 'S&P 500',
                price: result.regularMarketPrice || 0,
                change: result.regularMarketChange || 0,
                changePercent: result.regularMarketChangePercent || 0,
                currency: 'USD',
              });
            } else if (result.symbol === '^IXIC') {
              quotes.push({
                symbol: 'NASDAQ',
                name: 'Nasdaq',
                price: result.regularMarketPrice || 0,
                change: result.regularMarketChange || 0,
                changePercent: result.regularMarketChangePercent || 0,
                currency: 'USD',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching US indices:', err);
      errors.push('us_indices');
    }

    // Fetch Gold from Twelve Data (or BRAPI as fallback)
    console.log('Fetching Gold from Twelve Data...');
    if (twelveDataKey) {
      try {
        const goldResponse = await fetch(
          `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${twelveDataKey}`
        );
        
        if (goldResponse.ok) {
          const goldData = await goldResponse.json();
          console.log('Gold data received:', JSON.stringify(goldData));
          
          if (goldData.close) {
            quotes.push({
              symbol: 'GOLD',
              name: 'Ouro',
              price: parseFloat(goldData.close) || 0,
              change: parseFloat(goldData.change) || 0,
              changePercent: parseFloat(goldData.percent_change) || 0,
              currency: 'USD',
            });
          }
        }
      } catch (err) {
        console.error('Error fetching Gold:', err);
        errors.push('gold');
      }
    }

    // Fetch SELIC and IPCA from database (economic_indicators)
    console.log('Fetching SELIC and IPCA from database...');
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Get latest SELIC
      const { data: selicData } = await supabase
        .from('economic_indicators')
        .select('annual_rate, reference_date')
        .eq('indicator_type', 'SELIC')
        .order('reference_date', { ascending: false })
        .limit(1)
        .single();
      
      console.log('SELIC data from DB:', JSON.stringify(selicData));
      
      if (selicData) {
        // Multiply by 100 since annual_rate is stored as decimal (0.149 = 14.9%)
        quotes.push({
          symbol: 'SELIC',
          name: 'SELIC',
          price: (selicData.annual_rate || 0) * 100,
          change: 0,
          changePercent: 0,
        });
      }
      
      // Get latest IPCA (12 months accumulated)
      const { data: ipcaData } = await supabase
        .from('economic_indicators')
        .select('annual_rate, reference_date')
        .eq('indicator_type', 'IPCA')
        .order('reference_date', { ascending: false })
        .limit(1)
        .single();
      
      console.log('IPCA data from DB:', JSON.stringify(ipcaData));
      
      if (ipcaData) {
        // Multiply by 100 since annual_rate is stored as decimal (0.0403 = 4.03%)
        quotes.push({
          symbol: 'IPCA',
          name: 'IPCA 12m',
          price: (ipcaData.annual_rate || 0) * 100,
          change: 0,
          changePercent: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching economic indicators:', err);
      errors.push('economic');
    }

    console.log(`Fetched ${quotes.length} quotes successfully`);
    console.log('Final quotes:', JSON.stringify(quotes));

    return new Response(
      JSON.stringify({
        success: true,
        quotes,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in fetch-market-ticker:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
