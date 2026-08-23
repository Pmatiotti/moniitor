import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  ticker: string;
  current_price: number;
  quantity: number;
  invested_amount: number | null;
  asset_class: string;
}

interface GoalMapping {
  goal_id: string;
  asset_id: string | null;
  asset_class: string | null;
  sub_class: string | null;
  allocation_percentage: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting goal progress sync...');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Syncing goals for user: ${user.id}`);

    // Get all goals for the user
    const { data: goals, error: goalsError } = await supabase
      .from('financial_goals')
      .select('id, title, target_amount, current_amount')
      .eq('user_id', user.id);

    if (goalsError) throw goalsError;

    if (!goals || goals.length === 0) {
      console.log('No goals found for user');
      return new Response(
        JSON.stringify({ message: 'No goals to sync', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${goals.length} goals to process`);

    // Get user's personal assets only (exclude client assets)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, ticker, current_price, quantity, invested_amount, asset_class')
      .eq('user_id', user.id)
      .is('client_id', null);

    if (assetsError) {
      console.error(`Error fetching assets:`, assetsError);
      throw assetsError;
    }

    let updatedCount = 0;

    // Process each goal
    for (const goal of goals) {
      console.log(`Processing goal: ${goal.title} (${goal.id})`);

      // Get mappings for this goal
      const { data: mappings, error: mappingsError } = await supabase
        .from('goal_portfolio_mappings')
        .select('goal_id, asset_id, asset_class, sub_class, allocation_percentage')
        .eq('goal_id', goal.id);

      if (mappingsError) {
        console.error(`Error fetching mappings for goal ${goal.id}:`, mappingsError);
        continue;
      }

      if (!mappings || mappings.length === 0) {
        console.log(`No asset mappings for goal: ${goal.title}`);
        continue;
      }

      // Calculate total value from mapped assets
      let totalValue = 0;

      for (const mapping of mappings as GoalMapping[]) {
        // Get allocation percentage, default to 100 if not set
        const allocationPercent = mapping.allocation_percentage ?? 100;

        if (mapping.asset_id) {
          // Specific asset mapping
          const asset = (assets as Asset[])?.find(a => a.id === mapping.asset_id);
          if (asset) {
            const usesInvestedAmount = (asset.asset_class === 'Renda Fixa' || asset.asset_class === 'Multimercado') && 
                                       asset.invested_amount && Number(asset.invested_amount) > 0;
            
            const assetValue = usesInvestedAmount 
              ? Number(asset.current_price) 
              : Number(asset.current_price) * Number(asset.quantity);
            
            // Apply allocation percentage
            const allocatedValue = assetValue * (allocationPercent / 100);
            totalValue += allocatedValue;
            console.log(`  Asset ${asset.ticker}: ${assetValue} * ${allocationPercent}% = ${allocatedValue}`);
          }
        } else if (mapping.asset_class) {
          // Asset class or sub_class mapping
          const matchingAssets = (assets as Asset[])?.filter(a => {
            if (mapping.sub_class) {
              return a.asset_class === mapping.asset_class;
            }
            return a.asset_class === mapping.asset_class;
          });

          for (const asset of matchingAssets || []) {
            const usesInvestedAmount = (asset.asset_class === 'Renda Fixa' || asset.asset_class === 'Multimercado') && 
                                       asset.invested_amount && Number(asset.invested_amount) > 0;
            
            const assetValue = usesInvestedAmount 
              ? Number(asset.current_price) 
              : Number(asset.current_price) * Number(asset.quantity);
            
            // Apply allocation percentage
            const allocatedValue = assetValue * (allocationPercent / 100);
            totalValue += allocatedValue;
            console.log(`  Asset ${asset.ticker} (class match): ${assetValue} * ${allocationPercent}% = ${allocatedValue}`);
          }
        }
      }

      console.log(`  Total calculated value: ${totalValue}`);

      // Update goal's current_amount if changed
      if (Math.abs(totalValue - goal.current_amount) > 0.01) {
        const { error: updateError } = await supabase
          .from('financial_goals')
          .update({ current_amount: totalValue })
          .eq('id', goal.id);

        if (updateError) {
          console.error(`Error updating goal ${goal.id}:`, updateError);
          continue;
        }

        // Record in history
        await supabase
          .from('goal_progress_history')
          .insert({
            goal_id: goal.id,
            amount: totalValue,
            user_id: user.id,
          });

        console.log(`  Updated goal: ${goal.current_amount} -> ${totalValue}`);
        updatedCount++;
      } else {
        console.log(`  No change needed for goal`);
      }
    }

    console.log(`Sync complete. Updated ${updatedCount} goals`);

    return new Response(
      JSON.stringify({ 
        message: 'Goals synced successfully', 
        updated: updatedCount,
        total: goals.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing goal progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
