import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`Creating asset value snapshots for ${today}`);

    // Fetch all fixed income assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, user_id, ticker, asset_name, current_price, invested_amount, quantity, application_date')
      .eq('asset_class', 'Renda Fixa')
      .not('current_price', 'is', null);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} fixed income assets`);

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No fixed income assets found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const snapshots = [];
    const errors: string[] = [];

    for (const asset of assets) {
      try {
        const currentValue = Number(asset.current_price) * Number(asset.quantity);
        const investedAmount = asset.invested_amount 
          ? Number(asset.invested_amount) 
          : Number(asset.current_price) * Number(asset.quantity);

        // Calculate cumulative return
        const cumulativeReturn = investedAmount > 0 
          ? ((currentValue / investedAmount) - 1) * 100 
          : 0;

        // Fetch yesterday's snapshot to calculate daily return
        const { data: previousSnapshot } = await supabase
          .from('asset_value_history')
          .select('value_accrual, reference_date')
          .eq('asset_id', asset.id)
          .lt('reference_date', today)
          .order('reference_date', { ascending: false })
          .limit(1)
          .single();

        let dailyReturn = 0;
        if (previousSnapshot && previousSnapshot.value_accrual > 0) {
          dailyReturn = ((currentValue / previousSnapshot.value_accrual) - 1) * 100;
        }

        snapshots.push({
          asset_id: asset.id,
          user_id: asset.user_id,
          reference_date: today,
          value_accrual: currentValue,
          daily_return_percent: dailyReturn,
          cumulative_return_percent: cumulativeReturn,
        });

      } catch (err) {
        const errorMsg = `Error processing asset ${asset.ticker}: ${err}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (snapshots.length > 0) {
      // Upsert to handle re-runs on the same day
      const { error: insertError } = await supabase
        .from('asset_value_history')
        .upsert(snapshots, { 
          onConflict: 'asset_id,reference_date',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error inserting snapshots:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${snapshots.length} snapshots`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: today,
        count: snapshots.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-asset-value-snapshot:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
