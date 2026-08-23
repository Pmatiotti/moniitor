import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  ticker: string;
  quantity: number;
  asset_class: string;
  sub_class: string | null;
}

const normalizeTicker = (ticker: string): string => {
  return ticker.replace(/\s+/g, '').toUpperCase();
};

const isDividendPayingAsset = (ticker: string, subClass: string | null): boolean => {
  const normalizedTicker = normalizeTicker(ticker);
  const isFII = /^[A-Z]{4}1[1-3]$/.test(normalizedTicker);
  const isStock = /^[A-Z]{4}[3-8]$/.test(normalizedTicker);
  const isRelevantSubClass = ['Ações', 'Fundos Imobiliário', 'ETF'].includes(subClass || '');
  return isRelevantSubClass || isFII || isStock;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brapiKey = Deno.env.get('BRAPI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Parse optional clientId from body
    let clientId: string | null = null;
    try {
      const body = await req.json();
      clientId = body?.clientId || null;
    } catch {
      // No body or invalid JSON - personal mode
    }

    console.log(`Fetching upcoming dividends for user: ${user.id}${clientId ? `, client: ${clientId}` : ''}`);

    // If clientId provided, validate advisor access
    if (clientId) {
      // Check manual client ownership
      const { data: manualClient } = await supabase
        .from('clients')
        .select('id, advisor_id')
        .eq('id', clientId)
        .maybeSingle();

      if (manualClient) {
        if (manualClient.advisor_id !== user.id) {
          throw new Error('Access denied');
        }
      } else {
        // Check linked client
        const { data: link } = await supabase
          .from('client_advisor_links')
          .select('id')
          .eq('advisor_id', user.id)
          .eq('client_id', clientId)
          .eq('status', 'active')
          .maybeSingle();

        if (!link) {
          // Fallback: check profiles.advisor_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, advisor_id')
            .eq('id', clientId)
            .maybeSingle();

          if (!profile || profile.advisor_id !== user.id) {
            throw new Error('Access denied');
          }
        }
      }
    }

    // Build assets query based on mode
    let assetsQuery = supabase
      .from('assets')
      .select('ticker, quantity, asset_class, sub_class')
      .eq('asset_class', 'Renda Variável');

    if (clientId) {
      // CRM mode: try client_id first, then user_id fallback for linked clients
      const { data: clientAssets } = await supabase
        .from('assets')
        .select('ticker, quantity, asset_class, sub_class')
        .eq('asset_class', 'Renda Variável')
        .eq('client_id', clientId);

      let allAssets = clientAssets || [];

      // If no assets found by client_id, try user_id (linked client)
      if (allAssets.length === 0) {
        const { data: linkedAssets } = await supabase
          .from('assets')
          .select('ticker, quantity, asset_class, sub_class')
          .eq('asset_class', 'Renda Variável')
          .eq('user_id', clientId)
          .is('client_id', null);

        allAssets = linkedAssets || [];
      }

      const assets = allAssets.filter((asset: Asset) =>
        isDividendPayingAsset(asset.ticker, asset.sub_class)
      );

      if (assets.length === 0) {
        return new Response(
          JSON.stringify({ upcomingDividends: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return await fetchDividendsForAssets(assets, brapiKey);
    } else {
      // Personal mode
      const { data: allAssets, error: assetsError } = await assetsQuery
        .eq('user_id', user.id)
        .is('client_id', null);

      if (assetsError) throw assetsError;

      const assets = (allAssets || []).filter((asset: Asset) =>
        isDividendPayingAsset(asset.ticker, asset.sub_class)
      );

      if (assets.length === 0) {
        return new Response(
          JSON.stringify({ upcomingDividends: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return await fetchDividendsForAssets(assets, brapiKey);
    }
  } catch (error) {
    console.error('Error in fetch-upcoming-dividends:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function fetchDividendsForAssets(assets: Asset[], brapiKey: string | undefined) {
  const assetMap = new Map<string, { quantity: number; originalTicker: string }>();
  const normalizedTickers: string[] = [];

  for (const asset of assets) {
    const normalized = normalizeTicker(asset.ticker);
    if (!assetMap.has(normalized)) {
      assetMap.set(normalized, { quantity: asset.quantity, originalTicker: asset.ticker });
      normalizedTickers.push(normalized);
    } else {
      assetMap.get(normalized)!.quantity += asset.quantity;
    }
  }

  console.log(`Unique tickers to fetch: ${normalizedTickers.length}`);

  const upcomingDividends: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batchSize = 10;
  for (let i = 0; i < normalizedTickers.length; i += batchSize) {
    const batch = normalizedTickers.slice(i, i + batchSize);
    const tickerString = batch.join(',');

    try {
      const brapiUrl = brapiKey
        ? `https://brapi.dev/api/quote/${tickerString}?dividends=true&token=${brapiKey}`
        : `https://brapi.dev/api/quote/${tickerString}?dividends=true`;

      const response = await fetch(brapiUrl);

      if (!response.ok) {
        // Fallback: individual requests
        for (const ticker of batch) {
          try {
            const singleUrl = brapiKey
              ? `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${brapiKey}`
              : `https://brapi.dev/api/quote/${ticker}?dividends=true`;
            const singleResponse = await fetch(singleUrl);
            if (singleResponse.ok) {
              const singleData = await singleResponse.json();
              if (singleData.results?.length > 0) {
                processDividendData(singleData.results[0], ticker, assetMap, today, upcomingDividends);
              }
            }
          } catch (e) {
            console.error(`Error fetching ${ticker}:`, e);
          }
        }
        continue;
      }

      const brapiData = await response.json();
      if (!brapiData.results || brapiData.results.length === 0) continue;

      for (const stockData of brapiData.results) {
        const ticker = stockData.symbol?.toUpperCase();
        if (!ticker) continue;
        processDividendData(stockData, ticker, assetMap, today, upcomingDividends);
      }
    } catch (error) {
      console.error(`Error fetching batch:`, error);
    }
  }

  console.log(`Total upcoming dividends found: ${upcomingDividends.length}`);

  upcomingDividends.sort((a, b) =>
    new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  );

  return new Response(
    JSON.stringify({ upcomingDividends }),
    { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' } }
  );
}

function processDividendData(
  stockData: any,
  ticker: string,
  assetMap: Map<string, { quantity: number; originalTicker: string }>,
  today: Date,
  upcomingDividends: any[]
) {
  const assetInfo = assetMap.get(ticker);
  if (!assetInfo) return;

  if (stockData.dividendsData?.cashDividends) {
    for (const dividend of stockData.dividendsData.cashDividends) {
      const paymentDate = new Date(dividend.paymentDate);
      if (isNaN(paymentDate.getTime())) continue;
      paymentDate.setHours(0, 0, 0, 0);
      if (paymentDate < today) continue;

      const paymentDateStr = paymentDate.toISOString().split('T')[0];
      const expectedAmount = dividend.rate * assetInfo.quantity;

      let exDate: string | null = null;
      if (dividend.assetIssued) {
        const parsedExDate = new Date(dividend.assetIssued);
        if (!isNaN(parsedExDate.getTime())) {
          exDate = parsedExDate.toISOString().split('T')[0];
        }
      }

      upcomingDividends.push({
        ticker,
        dividend_type: dividend.type || 'Dividendo',
        amount_per_share: dividend.rate,
        expected_total: expectedAmount,
        payment_date: paymentDateStr,
        ex_date: exDate,
        quantity: assetInfo.quantity,
        source: 'brapi',
      });
    }
  }
}
