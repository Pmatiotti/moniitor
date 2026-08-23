import { supabase } from "@/integrations/supabase/client";

/**
 * Serviço para criação automática de snapshots de portfólio
 */

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

/**
 * Calcula o valor investido e o valor de mercado de um ativo
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

/**
 * Cria snapshots iniciais após upload de ativos
 * - Snapshot na data mais antiga dos ativos (valor investido)
 * - Snapshot atual (valor de mercado)
 */
export async function createInitialSnapshots(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[SnapshotService] Creating initial snapshots for user:', userId);

    // Buscar apenas ativos pessoais do usuário (excluir ativos de clientes)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .is('client_id', null);

    if (assetsError || !assets || assets.length === 0) {
      console.log('[SnapshotService] No assets found');
      return { success: true, message: 'Sem ativos para criar snapshot' };
    }

    // Encontrar a data mais antiga (application_date ou created_at)
    const dates = assets.map(a => {
      const date = a.application_date || a.created_at?.split('T')[0];
      return date ? new Date(date) : new Date();
    });
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const earliestDateStr = earliestDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Calcular totais
    let totalInvested = 0;
    let totalMarketValue = 0;
    const assetBreakdown: Record<string, number> = {};

    assets.forEach((asset: Asset) => {
      const { invested, marketValue } = calculateAssetValues(asset);
      totalInvested += invested;
      totalMarketValue += marketValue;

      if (!assetBreakdown[asset.asset_class]) {
        assetBreakdown[asset.asset_class] = 0;
      }
      assetBreakdown[asset.asset_class] += marketValue;
    });

    // Verificar se já existem snapshots
    const { data: existingSnapshots } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: true })
      .limit(1);

    // Se não existem snapshots, criar o inicial na data mais antiga
    if (!existingSnapshots || existingSnapshots.length === 0) {
      console.log('[SnapshotService] Creating initial snapshot at:', earliestDateStr);
      
      const { error: initialError } = await supabase
        .from('portfolio_snapshots')
        .upsert({
          user_id: userId,
          snapshot_date: earliestDateStr,
          total_value: totalInvested, // Na data inicial, valor = investido (sem ganhos)
          total_invested: totalInvested,
          daily_return_percent: 0,
          cumulative_return_percent: 0,
          assets_breakdown: assetBreakdown
        }, {
          onConflict: 'user_id,snapshot_date'
        });

      if (initialError) {
        console.error('[SnapshotService] Error creating initial snapshot:', initialError);
      }
    }

    // Criar snapshot atual (hoje) se for diferente da data inicial
    if (earliestDateStr !== todayStr) {
      const returnPercent = totalInvested > 0 
        ? ((totalMarketValue - totalInvested) / totalInvested) * 100 
        : 0;

      console.log('[SnapshotService] Creating current snapshot at:', todayStr);
      
      const { error: currentError } = await supabase
        .from('portfolio_snapshots')
        .upsert({
          user_id: userId,
          snapshot_date: todayStr,
          total_value: totalMarketValue,
          total_invested: totalInvested,
          daily_return_percent: 0, // Será calculado em relação ao anterior
          cumulative_return_percent: returnPercent,
          assets_breakdown: assetBreakdown
        }, {
          onConflict: 'user_id,snapshot_date'
        });

      if (currentError) {
        console.error('[SnapshotService] Error creating current snapshot:', currentError);
        return { success: false, message: currentError.message };
      }
    }

    console.log('[SnapshotService] Snapshots created successfully');
    return { 
      success: true, 
      message: `Snapshots criados: investido R$ ${totalInvested.toFixed(2)}, atual R$ ${totalMarketValue.toFixed(2)}`
    };
  } catch (error: any) {
    console.error('[SnapshotService] Error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Cria um snapshot diário do portfólio (chamado após atualizar preços)
 */
export async function createDailySnapshot(userId: string): Promise<{ success: boolean; snapshot?: any }> {
  try {
    console.log('[SnapshotService] Creating daily snapshot for user:', userId);

    // Buscar apenas ativos pessoais (excluir ativos de clientes CRM)
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .is('client_id', null);

    if (assetsError || !assets || assets.length === 0) {
      return { success: true };
    }

    // Calcular totais atuais
    let totalValue = 0;
    let totalInvested = 0;
    const assetBreakdown: Record<string, number> = {};

    assets.forEach((asset: Asset) => {
      const { invested, marketValue } = calculateAssetValues(asset);
      totalInvested += invested;
      totalValue += marketValue;

      if (!assetBreakdown[asset.asset_class]) {
        assetBreakdown[asset.asset_class] = 0;
      }
      assetBreakdown[asset.asset_class] += marketValue;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Buscar snapshot anterior para calcular retorno diário
    const { data: previousSnapshot } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
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
    const { data: snapshot, error: snapshotError } = await supabase
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
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('[SnapshotService] Error creating daily snapshot:', snapshotError);
      return { success: false };
    }

    console.log('[SnapshotService] Daily snapshot created:', snapshot);
    return { success: true, snapshot };
  } catch (error: any) {
    console.error('[SnapshotService] Error creating daily snapshot:', error);
    return { success: false };
  }
}
