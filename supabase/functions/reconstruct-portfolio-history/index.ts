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
  application_date: string | null;
  created_at: string | null;
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
    console.log('Starting portfolio history reconstruction');

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

    if (assetsError || !assets || assets.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No assets found',
        snapshotsCreated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${assets.length} assets`);

    // Find the earliest date from assets
    const dates = assets.map((a: Asset) => {
      const date = a.application_date || a.created_at?.split('T')[0];
      return date ? new Date(date) : new Date();
    });
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const today = new Date();

    // Calculate total invested and current value
    let totalInvested = 0;
    let totalCurrentValue = 0;
    const assetBreakdown: Record<string, number> = {};

    assets.forEach((asset: Asset) => {
      const { invested, marketValue } = calculateAssetValues(asset);
      totalInvested += invested;
      totalCurrentValue += marketValue;

      if (!assetBreakdown[asset.asset_class]) {
        assetBreakdown[asset.asset_class] = 0;
      }
      assetBreakdown[asset.asset_class] += marketValue;
    });

    // Check existing snapshots
    const { data: existingSnapshots } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date')
      .eq('user_id', user.id);

    const existingDates = new Set(existingSnapshots?.map(s => s.snapshot_date) || []);

    // Create at least 2 snapshots for chart visibility
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate a date 30 days ago or use earliest date (whichever is earlier)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = earliestDate < thirtyDaysAgo ? earliestDate : thirtyDaysAgo;
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let snapshotsCreated = 0;

    // Create initial snapshot (simulated start point with invested value)
    if (!existingDates.has(startDateStr)) {
      console.log(`Creating initial snapshot at ${startDateStr}`);
      
      const { error } = await supabase
        .from('portfolio_snapshots')
        .upsert({
          user_id: user.id,
          snapshot_date: startDateStr,
          total_value: totalInvested, // At start, value = invested
          total_invested: totalInvested,
          daily_return_percent: 0,
          cumulative_return_percent: 0,
          asset_breakdown: assetBreakdown
        }, {
          onConflict: 'user_id,snapshot_date'
        });

      if (!error) snapshotsCreated++;
    }

    // Always create/update current snapshot
    console.log(`Creating current snapshot at ${todayStr}`);
    
    const cumulativeReturnPercent = totalInvested > 0 
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 
      : 0;

    const { error: todayError } = await supabase
      .from('portfolio_snapshots')
      .upsert({
        user_id: user.id,
        snapshot_date: todayStr,
        total_value: totalCurrentValue,
        total_invested: totalInvested,
        daily_return_percent: 0,
        cumulative_return_percent: cumulativeReturnPercent,
        asset_breakdown: assetBreakdown
      }, {
        onConflict: 'user_id,snapshot_date'
      });

    if (!todayError && !existingDates.has(todayStr)) snapshotsCreated++;

    console.log(`Created ${snapshotsCreated} snapshots`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Portfolio history reconstructed`,
      snapshotsCreated,
      earliestDate: startDateStr,
      totalInvested,
      totalCurrentValue,
      returnPercent: totalInvested > 0
        ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 
        : 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('reconstruct-portfolio-history error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
