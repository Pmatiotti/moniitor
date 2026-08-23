import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  invested_amount: number | null;
  created_at: string;
}

interface CashFlow {
  id: string;
  flow_type: 'deposit' | 'withdrawal';
  amount: number;
  flow_date: string;
}

interface SnapshotData {
  user_id: string;
  snapshot_date: string;
  total_value: number;
  total_invested: number;
  daily_return_percent: number | null;
  cumulative_return_percent: number | null;
  assets_breakdown: object;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.log(`Creating snapshot for user: ${user.id}`);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's personal assets only (exclude CRM client assets)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .is('client_id', null)
      .order('created_at', { ascending: true });

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw new Error('Failed to fetch assets');
    }

    console.log(`Found ${assets?.length || 0} assets`);

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhum ativo encontrado. Adicione ativos antes de criar um snapshot.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the first snapshot
    const { data: existingSnapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .select('id, snapshot_date')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(1);

    const isFirstSnapshot = !existingSnapshots || existingSnapshots.length === 0;

    // Determine the snapshot date
    let snapshotDate: string;
    
    if (isFirstSnapshot) {
      // For first snapshot, use the date of the first asset upload
      const oldestAsset = assets[0] as Asset;
      const firstUploadDate = new Date(oldestAsset.created_at);
      snapshotDate = firstUploadDate.toISOString().split('T')[0];
      console.log(`First snapshot - using first asset upload date: ${snapshotDate}`);
    } else {
      // For subsequent snapshots, use today's date
      snapshotDate = new Date().toISOString().split('T')[0];
    }

    // Calculate totals
    let totalValue = 0;
    let totalInvested = 0;
    const assetsBreakdown: Record<string, { value: number; invested: number; quantity: number; ticker: string }> = {};

    for (const asset of assets as Asset[]) {
      const currentPrice = asset.current_price || asset.average_price;
      
      // For first snapshot, use invested amount as value (no gains yet)
      const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                  asset.invested_amount && Number(asset.invested_amount) > 0;
      
      let value: number;
      let invested: number;
      
      if (usesInvestedAmount) {
        // For fixed income: invested_amount is the total, current_price might be unit price or total
        invested = Number(asset.invested_amount);
        // If current_price is set and looks like a unit price (similar to average_price), multiply by quantity
        // Otherwise, assume invested_amount as current value (no market price for some fixed income)
        if (asset.current_price && asset.current_price > 0) {
          // Check if current_price looks like a unit price (close to average_price magnitude)
          const avgPrice = Number(asset.average_price);
          const curPrice = Number(asset.current_price);
          const qty = Number(asset.quantity);
          
          // If current_price is similar in magnitude to average_price, it's a unit price
          if (avgPrice > 0 && curPrice / avgPrice < 10) {
            value = curPrice * qty;
          } else {
            // current_price might already be total value
            value = curPrice;
          }
        } else {
          value = invested; // No current price, use invested
        }
      } else {
        // For stocks/FIIs: always quantity * price
        invested = Number(asset.average_price) * Number(asset.quantity);
        value = Number(currentPrice) * Number(asset.quantity);
      }
      
      totalValue += value;
      totalInvested += invested;
      
      assetsBreakdown[asset.id] = {
        ticker: asset.ticker,
        value,
        invested,
        quantity: asset.quantity
      };
    }

    // Get previous snapshot and cash flows for adjusted daily return calculation
    let dailyReturn: number | null = null;
    let cumulativeReturn: number | null = null;

    if (!isFirstSnapshot) {
      // Get previous snapshot
      const { data: previousSnapshot } = await supabase
        .from('portfolio_snapshots')
        .select('total_value, snapshot_date')
        .eq('user_id', user.id)
        .lt('snapshot_date', snapshotDate)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      // Get cash flows for today (CFA/GIPS adjustment)
      const { data: todayCashFlows } = await supabase
        .from('portfolio_cash_flows')
        .select('*')
        .eq('user_id', user.id)
        .eq('flow_date', snapshotDate);

      // Calculate net cash flow for the day
      const netCashFlow = (todayCashFlows as CashFlow[] || []).reduce((sum, cf) => 
        sum + (cf.flow_type === 'deposit' ? Number(cf.amount) : -Number(cf.amount)), 0);

      console.log(`Cash flows for ${snapshotDate}: ${netCashFlow}`);

      if (previousSnapshot && previousSnapshot.total_value > 0) {
        // CFA/GIPS adjusted daily return:
        // Retorno = (Valor Final - Valor Inicial - Fluxo Líquido) / Valor Inicial
        // O fluxo ocorre no início do dia, então ajustamos a base
        const adjustedBase = previousSnapshot.total_value + netCashFlow;
        
        if (adjustedBase > 0) {
          // Método modificado Dietz para retorno diário
          dailyReturn = ((totalValue - adjustedBase) / previousSnapshot.total_value) * 100;
        } else {
          dailyReturn = ((totalValue - previousSnapshot.total_value) / previousSnapshot.total_value) * 100;
        }
        
        console.log(`Daily return (CFA adjusted): ${dailyReturn.toFixed(4)}%`);
      }

      if (totalInvested > 0) {
        cumulativeReturn = ((totalValue - totalInvested) / totalInvested) * 100;
        console.log(`Cumulative return: ${cumulativeReturn.toFixed(2)}%`);
      }
    } else {
      // First snapshot: no return yet
      cumulativeReturn = 0;
    }

    // Upsert snapshot (update if exists for that date, insert if not)
    const snapshotData: SnapshotData = {
      user_id: user.id,
      snapshot_date: snapshotDate,
      total_value: totalValue,
      total_invested: totalInvested,
      daily_return_percent: dailyReturn,
      cumulative_return_percent: cumulativeReturn,
      assets_breakdown: assetsBreakdown
    };

    const { data: snapshot, error: snapshotError } = await supabase
      .from('portfolio_snapshots')
      .upsert(snapshotData, { 
        onConflict: 'user_id,snapshot_date',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError);
      throw new Error('Failed to create snapshot');
    }

    console.log(`Snapshot created successfully for ${snapshotDate}${isFirstSnapshot ? ' (first snapshot)' : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        isFirstSnapshot,
        snapshot: {
          date: snapshotDate,
          total_value: totalValue,
          total_invested: totalInvested,
          daily_return_percent: dailyReturn,
          cumulative_return_percent: cumulativeReturn,
          assets_count: assets?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-portfolio-snapshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create snapshot';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
