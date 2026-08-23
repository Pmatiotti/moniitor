import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  ticker: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  asset_class: string;
  invested_amount: number | null;
  currency: string;
}

function calculateAssetValues(asset: Asset) {
  const usesInvestedAmount = (
    asset.asset_class === "Renda Fixa" || 
    asset.asset_class === "Fundos de Investimento" || 
    asset.asset_class === "Previdência"
  ) && asset.invested_amount && Number(asset.invested_amount) > 0;

  const invested = usesInvestedAmount 
    ? Number(asset.invested_amount) 
    : Number(asset.average_price) * Number(asset.quantity);

  const marketValue = Number(asset.current_price || asset.average_price) * Number(asset.quantity);

  return { invested, marketValue };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting portfolio prices update with auto-snapshot');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch user's personal assets only (exclude CRM client assets)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .is('client_id', null);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw new Error('Failed to fetch assets');
    }

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No assets to update',
        updated: 0,
        failed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${assets.length} assets to update`);

    let updatedCount = 0;
    let failedCount = 0;
    const results = [];

    // Update each asset
    for (const asset of assets) {
      try {
        console.log(`Updating ${asset.ticker}...`);

        const cleanTicker = asset.ticker.replace(/\s+/g, '');
        
        // Skip fixed income and investment funds
        const shouldSkip = ['CDB', 'CRA', 'CRI', 'DEB', 'NTNB', 'LCI', 'LCA'].some(prefix => 
          cleanTicker.startsWith(prefix)
        ) || asset.asset_class === 'Fundos de Investimento' || asset.asset_class === 'Previdência';
        
        if (shouldSkip) {
          console.log(`Skipping asset without market price: ${asset.ticker}`);
          continue;
        }
        
        // Format ticker for Yahoo Finance
        let yahooTicker = cleanTicker;
        if (!cleanTicker.includes('.')) {
          if (asset.currency === 'USD') {
            yahooTicker = cleanTicker;
          } else {
            yahooTicker = `${cleanTicker}.SA`;
          }
        }
        
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
          }
        );

        if (!response.ok) {
          console.log(`Yahoo Finance API error for ${asset.ticker}:`, response.status);
          failedCount++;
          results.push({ ticker: asset.ticker, success: false, error: 'API error' });
          continue;
        }

        const data = await response.json();
        const quote = data.chart?.result?.[0]?.meta;

        if (!quote || !quote.regularMarketPrice) {
          console.log(`No price data for ${asset.ticker}`);
          failedCount++;
          results.push({ ticker: asset.ticker, success: false, error: 'No price data' });
          continue;
        }

        const currentPrice = quote.regularMarketPrice;

        const { error: updateError } = await supabase
          .from('assets')
          .update({ 
            current_price: currentPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', asset.id);

        if (updateError) {
          console.error(`Error updating ${asset.ticker}:`, updateError);
          failedCount++;
          results.push({ ticker: asset.ticker, success: false, error: updateError.message });
        } else {
          console.log(`Updated ${asset.ticker}: ${currentPrice}`);
          updatedCount++;
          results.push({ 
            ticker: asset.ticker, 
            success: true, 
            price: currentPrice,
            oldPrice: asset.current_price 
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`Error processing ${asset.ticker}:`, error);
        failedCount++;
        results.push({ ticker: asset.ticker, success: false, error: error.message });
      }
    }

    // ========== AUTO-CREATE DAILY SNAPSHOT ==========
    console.log('Creating automatic daily snapshot...');
    
    try {
      // Re-fetch user's personal assets with updated prices (exclude CRM client assets)
      const { data: updatedAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .is('client_id', null);

      if (updatedAssets && updatedAssets.length > 0) {
        let totalValue = 0;
        let totalInvested = 0;
        const assetBreakdown: Record<string, number> = {};

        updatedAssets.forEach((asset: Asset) => {
          const { invested, marketValue } = calculateAssetValues(asset);
          totalInvested += invested;
          totalValue += marketValue;

          if (!assetBreakdown[asset.asset_class]) {
            assetBreakdown[asset.asset_class] = 0;
          }
          assetBreakdown[asset.asset_class] += marketValue;
        });

        const todayStr = new Date().toISOString().split('T')[0];

        // Get previous snapshot for daily return calculation
        const { data: previousSnapshot } = await supabase
          .from('portfolio_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .lt('snapshot_date', todayStr)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();

        let dailyReturnPercent = 0;
        if (previousSnapshot && previousSnapshot.total_value > 0) {
          dailyReturnPercent = ((totalValue - previousSnapshot.total_value) / previousSnapshot.total_value) * 100;
        }

        const cumulativeReturnPercent = totalInvested > 0 
          ? ((totalValue - totalInvested) / totalInvested) * 100 
          : 0;

        // Upsert snapshot
        const { error: snapshotError } = await supabase
          .from('portfolio_snapshots')
          .upsert({
            user_id: user.id,
            snapshot_date: todayStr,
            total_value: totalValue,
            total_invested: totalInvested,
            daily_return_percent: dailyReturnPercent,
            cumulative_return_percent: cumulativeReturnPercent,
            asset_breakdown: assetBreakdown
          }, {
            onConflict: 'user_id,snapshot_date'
          });

        if (snapshotError) {
          console.error('Error creating snapshot:', snapshotError);
        } else {
          console.log(`Snapshot created: value=${totalValue}, invested=${totalInvested}, return=${cumulativeReturnPercent.toFixed(2)}%`);
        }
      }
    } catch (snapshotErr: any) {
      console.error('Error in auto-snapshot:', snapshotErr);
    }

    return new Response(JSON.stringify({ 
      success: true,
      updated: updatedCount,
      failed: failedCount,
      total: assets.length,
      snapshotCreated: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('update-portfolio-prices error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
