import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  user_id: string;
  client_id: string | null;
}

interface UserAssetGroup {
  user_id: string;
  assets: Asset[];
}

/**
 * Calculates invested and market value for an asset
 */
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Start logging
  const { data: logEntry } = await supabase
    .from("sync_execution_logs")
    .insert({
      function_name: "daily-portfolio-snapshot",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if today is a business day (skip weekends)
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('[DailySnapshot] Skipping weekend');
      
      if (logId) {
        await supabase
          .from("sync_execution_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "skipped",
            details: { reason: "weekend" },
          })
          .eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped weekend' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if today is a holiday
    const { data: holiday } = await supabase
      .from('brazilian_holidays')
      .select('holiday_date')
      .eq('holiday_date', todayStr)
      .maybeSingle();

    if (holiday) {
      console.log('[DailySnapshot] Skipping holiday:', todayStr);
      
      if (logId) {
        await supabase
          .from("sync_execution_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "skipped",
            details: { reason: "holiday", date: todayStr },
          })
          .eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped holiday' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DailySnapshot] Creating snapshots for:', todayStr);

    // Fetch all personal assets (exclude client assets)
    const { data: allAssets, error: assetsError } = await supabase
      .from('assets')
      .select('id, ticker, quantity, average_price, current_price, asset_class, invested_amount, user_id, client_id')
      .is('client_id', null);

    if (assetsError) {
      throw new Error(`Error fetching assets: ${assetsError.message}`);
    }

    if (!allAssets || allAssets.length === 0) {
      console.log('[DailySnapshot] No assets found');
      
      if (logId) {
        await supabase
          .from("sync_execution_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "success",
            records_processed: 0,
            details: { message: "No assets to process" },
          })
          .eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to process', snapshotsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group assets by user
    const userAssets: Record<string, Asset[]> = {};
    for (const asset of allAssets) {
      if (!userAssets[asset.user_id]) {
        userAssets[asset.user_id] = [];
      }
      userAssets[asset.user_id].push(asset);
    }

    console.log(`[DailySnapshot] Processing ${Object.keys(userAssets).length} users`);

    let snapshotsCreated = 0;
    const errors: string[] = [];

    // Process each user
    for (const [userId, assets] of Object.entries(userAssets)) {
      try {
        // Calculate totals
        let totalValue = 0;
        let totalInvested = 0;
        const assetBreakdown: Record<string, number> = {};

        for (const asset of assets) {
          const { invested, marketValue } = calculateAssetValues(asset);
          totalInvested += invested;
          totalValue += marketValue;

          if (!assetBreakdown[asset.asset_class]) {
            assetBreakdown[asset.asset_class] = 0;
          }
          assetBreakdown[asset.asset_class] += marketValue;
        }

        // Get previous snapshot for daily return calculation
        const { data: previousSnapshot } = await supabase
          .from('portfolio_snapshots')
          .select('total_value, snapshot_date')
          .eq('user_id', userId)
          .lt('snapshot_date', todayStr)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle();

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
            user_id: userId,
            snapshot_date: todayStr,
            total_value: totalValue,
            total_invested: totalInvested,
            daily_return_percent: dailyReturnPercent,
            cumulative_return_percent: cumulativeReturnPercent,
            assets_breakdown: assetBreakdown
          }, {
            onConflict: 'user_id,snapshot_date'
          });

        if (snapshotError) {
          console.error(`[DailySnapshot] Error for user ${userId}:`, snapshotError);
          errors.push(`User ${userId}: ${snapshotError.message}`);
        } else {
          snapshotsCreated++;
          console.log(`[DailySnapshot] Created snapshot for user ${userId}: R$ ${totalValue.toFixed(2)}`);
        }

      } catch (err) {
        const errorMsg = `User ${userId}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`[DailySnapshot] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[DailySnapshot] Completed: ${snapshotsCreated} snapshots created`);

    // Update log entry
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: errors.length > 0 ? "partial" : "success",
          records_processed: snapshotsCreated,
          details: { 
            date: todayStr, 
            usersProcessed: Object.keys(userAssets).length,
            errors: errors.length > 0 ? errors : undefined 
          },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${snapshotsCreated} snapshots for ${todayStr}`,
        snapshotsCreated,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[DailySnapshot] Error:', err);

    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
