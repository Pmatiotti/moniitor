import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUSINESS_DAYS_PER_YEAR = 252;

interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  asset_name: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  invested_amount: number | null;
  rate: string | null;
  application_date: string | null;
  asset_class: string;
  sub_class: string | null;
  created_at: string | null;
}

interface RateInfo {
  type: 'cdi' | 'cdi_percent' | 'cdi_plus' | 'ipca_plus' | 'selic' | 'selic_plus' | 'prefixado';
  percentage?: number;
  spread?: number;
  fixedRate?: number;
}

function parseRate(rateStr: string | null): RateInfo | null {
  if (!rateStr) return null;
  
  // Normalize: uppercase, trim, replace comma with dot for numbers
  const normalized = rateStr.toUpperCase().trim();
  
  console.log(`Parsing rate: "${rateStr}" -> normalized: "${normalized}"`);
  
  // 1. Percentage of CDI: "132% CDI", "132,00% CDI", "100% DO CDI", "132% do CDI"
  const percentCDIMatch = normalized.match(/^(\d+(?:[.,]\d+)?)\s*%\s*(?:DO\s+)?CDI$/);
  if (percentCDIMatch) {
    const pct = parseFloat(percentCDIMatch[1].replace(',', '.'));
    console.log(`  -> cdi_percent: ${pct}%`);
    return { type: 'cdi_percent', percentage: pct };
  }
  
  // 2. CDI +/- spread: "CDI + 2%", "CDI + 2,5%", "CDI+2%", "CDI - 0,01%"
  const cdiSpreadMatch = normalized.match(/^CDI\s*([+-])\s*(\d+(?:[.,]\d+)?)\s*%?$/);
  if (cdiSpreadMatch) {
    const sign = cdiSpreadMatch[1] === '-' ? -1 : 1;
    const spread = parseFloat(cdiSpreadMatch[2].replace(',', '.')) * sign;
    console.log(`  -> cdi_plus: spread ${spread}%`);
    return { type: 'cdi_plus', spread };
  }
  
  // 3. Pure CDI: "CDI", "100% CDI"
  if (normalized === 'CDI' || normalized === '100% CDI' || normalized === '100,00% CDI') {
    console.log(`  -> cdi (100%)`);
    return { type: 'cdi' };
  }
  
  // 4. IPCA/IPC-A + spread: "IPCA + 6%", "IPC-A + 6,5%", "IPCA+6,50%"
  const ipcaPlusMatch = normalized.match(/^IPC-?A\s*\+\s*(\d+(?:[.,]\d+)?)\s*%?$/);
  if (ipcaPlusMatch) {
    const spread = parseFloat(ipcaPlusMatch[1].replace(',', '.'));
    console.log(`  -> ipca_plus: spread ${spread}%`);
    return { type: 'ipca_plus', spread };
  }
  
  // 5. LFT + spread: "LFT + 0,06%", "LFT+0,5%" (Tesouro Selic com spread)
  const lftPlusMatch = normalized.match(/^LFT\s*\+\s*(\d+(?:[.,]\d+)?)\s*%?$/);
  if (lftPlusMatch) {
    const spread = parseFloat(lftPlusMatch[1].replace(',', '.'));
    console.log(`  -> selic_plus (LFT): spread ${spread}%`);
    return { type: 'selic_plus', spread };
  }
  
  // 6. Pure LFT: "LFT" (Tesouro Selic = 100% SELIC)
  if (normalized === 'LFT') {
    console.log(`  -> selic (LFT = 100% SELIC)`);
    return { type: 'selic' };
  }
  
  // 7. SELIC + spread: "SELIC + 0,5%"
  const selicPlusMatch = normalized.match(/^SELIC\s*\+\s*(\d+(?:[.,]\d+)?)\s*%?$/);
  if (selicPlusMatch) {
    const spread = parseFloat(selicPlusMatch[1].replace(',', '.'));
    console.log(`  -> selic_plus: spread ${spread}%`);
    return { type: 'selic_plus', spread };
  }
  
  // 8. Pure SELIC: "SELIC", "100% SELIC"
  if (normalized === 'SELIC' || normalized === '100% SELIC' || normalized === '100,00% SELIC') {
    console.log(`  -> selic (100%)`);
    return { type: 'selic' };
  }
  
  // 9. Prefixado: "13,80%", "13.80%", "+ 13,80%", "13,80% a.a.", "13,80 % A.A."
  // Also handles: "13,80", "13.80" (without %)
  const prefixadoMatch = normalized.match(/^[+\s]*(\d+(?:[.,]\d+)?)\s*%?\s*(?:A\.?A\.?)?$/);
  if (prefixadoMatch) {
    const rate = parseFloat(prefixadoMatch[1].replace(',', '.'));
    console.log(`  -> prefixado: ${rate}%`);
    return { type: 'prefixado', fixedRate: rate };
  }
  
  // 10. Try to extract any number as prefixado (last resort)
  const anyNumberMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (anyNumberMatch) {
    const rate = parseFloat(anyNumberMatch[1].replace(',', '.'));
    // Only if it looks like an annual rate (between 1 and 30)
    if (rate >= 1 && rate <= 30) {
      console.log(`  -> prefixado (fallback): ${rate}%`);
      return { type: 'prefixado', fixedRate: rate };
    }
  }
  
  console.log(`  -> Could not parse rate`);
  return null;
}

async function getIndicatorRates(supabase: any, indicatorType: string, startDate: string, endDate: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('economic_indicators')
    .select('reference_date, daily_rate')
    .eq('indicator_type', indicatorType)
    .gte('reference_date', startDate)
    .lte('reference_date', endDate);

  if (error) {
    console.error(`Error fetching ${indicatorType} rates:`, error);
    return new Map();
  }

  const ratesMap = new Map<string, number>();
  for (const record of data || []) {
    ratesMap.set(record.reference_date, parseFloat(record.daily_rate));
  }
  console.log(`Loaded ${ratesMap.size} ${indicatorType} rates`);
  return ratesMap;
}

async function getBusinessDays(supabase: any, startDate: string, endDate: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_business_days', { start_date: startDate, end_date: endDate });
  if (error) {
    console.error('Error getting business days:', error);
    return [];
  }
  return (data || []).map((d: any) => d.business_date);
}

function calculateFixedIncomeValue(
  investedAmount: number, 
  rateInfo: RateInfo, 
  businessDays: string[],
  cdiRates: Map<string, number>, 
  ipcaRates: Map<string, number>, 
  selicRates: Map<string, number>
): number {
  let factor = 1;
  let daysWithRates = 0;
  
  switch (rateInfo.type) {
    case 'cdi':
      for (const day of businessDays) { 
        const rate = cdiRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate);
          daysWithRates++;
        }
      }
      break;
      
    case 'cdi_percent':
      const pct = (rateInfo.percentage || 100) / 100;
      for (const day of businessDays) { 
        const rate = cdiRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate * pct);
          daysWithRates++;
        }
      }
      break;
      
    case 'cdi_plus':
      const spreadDaily = Math.pow(1 + (rateInfo.spread || 0) / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
      for (const day of businessDays) { 
        const rate = cdiRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate) * (1 + spreadDaily);
          daysWithRates++;
        } else {
          // Still apply spread even without CDI rate
          factor *= (1 + spreadDaily);
        }
      }
      break;
      
    case 'ipca_plus':
      const realDaily = Math.pow(1 + (rateInfo.spread || 0) / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
      for (const day of businessDays) { 
        const rate = ipcaRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate) * (1 + realDaily);
          daysWithRates++;
        } else {
          // Still apply real rate even without IPCA rate
          factor *= (1 + realDaily);
        }
      }
      break;
      
    case 'selic':
      for (const day of businessDays) { 
        const rate = selicRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate);
          daysWithRates++;
        }
      }
      break;
      
    case 'selic_plus':
      const selicSpread = Math.pow(1 + (rateInfo.spread || 0) / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
      for (const day of businessDays) { 
        const rate = selicRates.get(day);
        if (rate !== undefined) {
          factor *= (1 + rate) * (1 + selicSpread);
          daysWithRates++;
        } else {
          factor *= (1 + selicSpread);
        }
      }
      break;
      
    case 'prefixado':
      const dailyRate = Math.pow(1 + (rateInfo.fixedRate || 0) / 100, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
      factor = Math.pow(1 + dailyRate, businessDays.length);
      daysWithRates = businessDays.length;
      break;
  }
  
  console.log(`  Calculation: factor=${factor.toFixed(6)}, daysWithRates=${daysWithRates}/${businessDays.length}`);
  
  return investedAmount * factor;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Start logging
  const { data: logEntry } = await supabase
    .from("sync_execution_logs")
    .insert({
      function_name: "update-fixed-income-values",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    console.log('Starting fixed income values update...');

    // Fetch all Renda Fixa assets with a rate defined
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_class', 'Renda Fixa')
      .not('rate', 'is', null);

    if (fetchError) throw new Error(fetchError.message);
    
    if (!assets?.length) {
      console.log('No fixed income assets found');
      return new Response(
        JSON.stringify({ success: true, updated: 0, total: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} fixed income assets`);

    const today = new Date().toISOString().split('T')[0];
    
    // Find the oldest application date or created_at
    const dates = assets
      .map((a: Asset) => a.application_date || (a.created_at?.split('T')[0]))
      .filter(Boolean)
      .sort();
    const oldestDate = dates[0] || today;
    
    console.log(`Date range: ${oldestDate} to ${today}`);

    // Load all indicator rates
    const [cdiRates, ipcaRates, selicRates] = await Promise.all([
      getIndicatorRates(supabase, 'CDI', oldestDate, today),
      getIndicatorRates(supabase, 'IPCA', oldestDate, today),
      getIndicatorRates(supabase, 'SELIC', oldestDate, today),
    ]);

    const stats = {
      updated: 0,
      skipped: 0,
      errors: 0,
      parseFailures: [] as string[],
    };

    for (const asset of assets as Asset[]) {
      try {
        console.log(`\nProcessing: ${asset.ticker} (${asset.asset_name})`);
        console.log(`  Rate: "${asset.rate}"`);
        
        const rateInfo = parseRate(asset.rate);
        if (!rateInfo) {
          console.log(`  SKIPPED: Could not parse rate`);
          stats.parseFailures.push(`${asset.ticker}: "${asset.rate}"`);
          stats.skipped++;
          continue;
        }
        
        // Use application_date, fallback to created_at
        const appDate = asset.application_date || (asset.created_at?.split('T')[0]);
        if (!appDate) {
          console.log(`  SKIPPED: No application date or created_at`);
          stats.skipped++;
          continue;
        }
        
        // Get invested amount
        const invested = asset.invested_amount || (asset.quantity * asset.average_price);
        if (!invested || invested <= 0) {
          console.log(`  SKIPPED: No invested amount (${invested})`);
          stats.skipped++;
          continue;
        }
        
        console.log(`  Application date: ${appDate}, Invested: R$ ${invested.toFixed(2)}`);
        
        // Get business days between application and today
        const businessDays = await getBusinessDays(supabase, appDate, today);
        if (!businessDays.length) {
          console.log(`  SKIPPED: No business days found`);
          stats.skipped++;
          continue;
        }
        
        console.log(`  Business days: ${businessDays.length}`);
        
        // Calculate current value
        const currentValue = calculateFixedIncomeValue(
          invested, rateInfo, businessDays, cdiRates, ipcaRates, selicRates
        );
        
        // Calculate price per unit (or total if quantity is 1)
        const currentPrice = asset.quantity > 0 ? currentValue / asset.quantity : currentValue;
        
        console.log(`  Current value: R$ ${currentValue.toFixed(2)}, Price/unit: R$ ${currentPrice.toFixed(2)}`);
        console.log(`  Return: ${((currentValue / invested - 1) * 100).toFixed(2)}%`);
        
        // Update the asset
        const { error: updateError } = await supabase
          .from('assets')
          .update({ 
            current_price: currentPrice, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', asset.id);
        
        if (updateError) {
          console.error(`  ERROR updating:`, updateError);
          stats.errors++;
        } else {
          stats.updated++;
        }
      } catch (assetError) {
        console.error(`  ERROR processing ${asset.ticker}:`, assetError);
        stats.errors++;
      }
    }

    console.log(`\n=== Update Summary ===`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    if (stats.parseFailures.length > 0) {
      console.log(`Parse failures: ${stats.parseFailures.join(', ')}`);
    }

    // Update log entry on success
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: stats.errors > 0 ? "partial" : "success",
          records_processed: stats.updated,
          details: { updated: stats.updated, skipped: stats.skipped, errors: stats.errors, parseFailures: stats.parseFailures },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: stats.updated, 
        total: assets.length,
        skipped: stats.skipped,
        errors: stats.errors,
        parseFailures: stats.parseFailures.length > 0 ? stats.parseFailures : undefined
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in update-fixed-income-values:', err);

    // Update log entry on failure
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
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
