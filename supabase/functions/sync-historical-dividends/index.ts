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
  asset_class: string;
  sub_class?: string;
  created_at: string;
}

interface BrapiDividend {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  type: string;
  label?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brapiKey = Deno.env.get('BRAPI_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting dividend sync for user ${user.id}`);

    // Get user's stock and FII assets
    // Support both direct asset_class and sub_class variations
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, ticker, quantity, asset_class, sub_class, created_at')
      .eq('user_id', user.id);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    const normalizeTicker = (ticker: string) => (ticker || '').replace('.SA', '').trim().toUpperCase();
    const isLikelyB3Ticker = (ticker: string) => /^[A-Z]{4,6}\d{1,2}$/.test(ticker);

    // Filter to only stocks and FIIs (multiple naming conventions)
    // Guardrails:
    // - exclude mutual funds ("Fundos de Investimento")
    // - exclude non-ticker strings (names with spaces etc.)
    const stockFiiAssets = (assets || []).filter((asset: any) => {
      const assetClass = (asset.asset_class || '').toLowerCase();
      const subClass = (asset.sub_class || '').toLowerCase();

      if (assetClass.includes('fundos')) return false;

      const cleanTicker = normalizeTicker(asset.ticker);
      if (!isLikelyB3Ticker(cleanTicker)) return false;
      
      // Check for Ações (only by asset_class, to avoid pulling funds with sub_class "Ações")
      if (assetClass === 'ações' || assetClass === 'acoes') {
        return true;
      }
      
      // Check for FIIs
      if (assetClass === 'fiis' || assetClass === 'fii' ||
          (subClass.includes('fundo') && subClass.includes('imobili')) ||
          subClass === 'fiis' || subClass === 'fii') {
        return true;
      }
      
      // Check for Renda Variável with stock/FII subclass
      if (assetClass === 'renda variável' || assetClass === 'renda variavel') {
        if (subClass.includes('imobili') || subClass.includes('ações') || 
            subClass.includes('acoes') || subClass === 'fiis' || subClass === 'fii') {
          return true;
        }
      }
      
      return false;
    });

    if (stockFiiAssets.length === 0) {
      console.log('No stock/FII assets found after filtering');
      return new Response(
        JSON.stringify({ synced: 0, skipped: 0, message: 'Nenhum ativo de Ações ou FIIs encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${stockFiiAssets.length} stock/FII assets to check for dividends`);

    // Get existing dividends to avoid duplicates
    const { data: existingDividends, error: existingError } = await supabase
      .from('dividends')
      .select('ticker, payment_date, dividend_type')
      .eq('user_id', user.id);

    if (existingError) {
      console.error('Error fetching existing dividends:', existingError);
      throw existingError;
    }

    // Create a Set for quick lookup of existing dividends
    const existingSet = new Set(
      (existingDividends || []).map((d: any) => {
        const type = (d.dividend_type || 'dividendo').toString().toLowerCase();
        const ticker = (d.ticker || '').toString().toUpperCase();
        return `${ticker}|${d.payment_date}|${type}`;
      })
    );

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalUnsupported = 0;
    let firstErrorMessage: string | null = null;
    const today = new Date().toISOString().split('T')[0];

    // Process assets in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < stockFiiAssets.length; i += batchSize) {
      const batch = stockFiiAssets.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(async (asset: Asset) => {
          try {
            // Clean ticker (remove .SA suffix if present)
            const cleanTicker = normalizeTicker(asset.ticker);
            // Fetch dividends from Brapi
            const url = brapiKey 
              ? `https://brapi.dev/api/quote/${cleanTicker}?dividends=true&token=${brapiKey}`
              : `https://brapi.dev/api/quote/${cleanTicker}?dividends=true`;
            
            console.log(`Fetching dividends for ${cleanTicker}`);
            
            const response = await fetch(url);
            if (!response.ok) {
              const status = response.status;
              console.error(`Brapi error for ${cleanTicker}: ${status}`);
              // 404 usually means it's not a valid B3 ticker in this API
              if (status === 404) {
                return { synced: 0, skipped: 0, error: false, unsupported: true };
              }
              return { synced: 0, skipped: 0, error: true, errorMessage: `Brapi ${status}` };
            }

            const data = await response.json();
            const result = data.results?.[0];
            
            let cashDividends: BrapiDividend[] = result?.dividendsData?.cashDividends || [];
            
            // Fallback to CVM data for FIIs if Brapi has no dividends
            if (cashDividends.length === 0) {
              console.log(`No Brapi dividend data for ${cleanTicker}, checking CVM...`);
              
              // Check if it's a FII (ticker ends with 11)
              if (cleanTicker.endsWith('11')) {
                const { data: cvmDividends, error: cvmError } = await supabase
                  .from('fii_dividends')
                  .select('*')
                  .eq('ticker', cleanTicker)
                  .order('data_pagamento', { ascending: false });
                
                if (!cvmError && cvmDividends && cvmDividends.length > 0) {
                  console.log(`Found ${cvmDividends.length} CVM dividends for ${cleanTicker}`);
                  
                  // Map CVM format to Brapi format
                  cashDividends = cvmDividends.map((d: any) => ({
                    assetIssued: d.data_base || d.data_pagamento,
                    paymentDate: d.data_pagamento,
                    rate: d.valor_por_cota,
                    type: d.tipo || 'rendimento',
                    label: `${d.tipo || 'rendimento'} - CVM`
                  }));
                }
              }
            }
            
            if (cashDividends.length === 0) {
              console.log(`No dividend data found for ${cleanTicker}`);
              return { synced: 0, skipped: 0, error: false };
            }

            const assetCreatedAt = new Date(asset.created_at).toISOString().split('T')[0];
            
            console.log(`${cleanTicker}: ${cashDividends.length} dividends from Brapi, asset since ${assetCreatedAt}`);
            
            let synced = 0;
            let skipped = 0;

            const dividendsToInsert = [];

            for (const dividend of cashDividends) {
              const paymentDate = dividend.paymentDate;
              
              // Skip if payment date is before asset was registered or after today
              if (paymentDate < assetCreatedAt || paymentDate > today) {
                continue;
              }

              // Map Brapi types to lowercase values accepted by DB constraint
              // DB accepts: 'dividendo', 'jcp', 'rendimento', 'amortização', 'cupom'
              let dividendType = 'dividendo';
              const brapiType = (dividend.type || '').toLowerCase();
              const brapiLabel = (dividend.label || '').toLowerCase();
              
              if (brapiType.includes('jcp') || brapiLabel.includes('jcp') || 
                  brapiLabel.includes('juros sobre capital')) {
                dividendType = 'jcp';
              } else if (brapiType.includes('rendimento') || brapiLabel.includes('rendimento')) {
                dividendType = 'rendimento';
              } else if (brapiType.includes('amortiza') || brapiLabel.includes('amortiza')) {
                dividendType = 'amortização';
              }

              // Check if already exists (using lowercase type for dedup key)
              const key = `${cleanTicker}|${paymentDate}|${dividendType}`;
              if (existingSet.has(key)) {
                skipped++;
                continue;
              }

              // Calculate amount
              const amount = dividend.rate * asset.quantity;

              // Determine asset class and market type
              const subClass = (asset.sub_class || '').toLowerCase();
              const assetClassLower = (asset.asset_class || '').toLowerCase();
              const isFII = assetClassLower === 'fiis' || assetClassLower === 'fii' || 
                           subClass.includes('imobili') || subClass === 'fiis' || subClass === 'fii';
              const assetClassLabel = isFII ? 'FII' : 'Ação';
              const marketType = 'Brasil';

              dividendsToInsert.push({
                user_id: user.id,
                ticker: cleanTicker,
                dividend_type: dividendType,
                amount: amount,
                payment_date: paymentDate,
                ex_date: dividend.paymentDate,
                asset_class: assetClassLabel,
                market_type: marketType,
                asset_id: asset.id
              });

              // Add to existing set to avoid duplicates within same sync
              existingSet.add(key);
              synced++;
            }

            // Batch insert dividends
            if (dividendsToInsert.length > 0) {
              const { error: insertError } = await supabase
                .from('dividends')
                .insert(dividendsToInsert);

              if (insertError) {
                console.error(`${cleanTicker}: Insert error - ${insertError.message}`);
                return { synced: 0, skipped, error: true, errorMessage: insertError.message };
              }
              
              console.log(`${cleanTicker}: Inserted ${dividendsToInsert.length} dividends`);
            }

            return { synced, skipped, error: false };
          } catch (err) {
            console.error(`Error processing ${asset.ticker}:`, err);
            const msg = err instanceof Error ? err.message : 'Erro desconhecido';
            return { synced: 0, skipped: 0, error: true, errorMessage: msg };
          }
        })
      );

      // Aggregate results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalSynced += result.value.synced;
          totalSkipped += result.value.skipped;
          if ((result.value as any).unsupported) totalUnsupported++;
          if (result.value.error) {
            totalErrors++;
            if (!firstErrorMessage && (result.value as any).errorMessage) {
              firstErrorMessage = (result.value as any).errorMessage;
            }
          }
        } else {
          totalErrors++;
          if (!firstErrorMessage) firstErrorMessage = 'Falha ao processar ativos';
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Sync complete: ${totalSynced} synced, ${totalSkipped} skipped, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        synced: totalSynced, 
        skipped: totalSkipped, 
        errors: totalErrors,
        unsupported: totalUnsupported,
        errorMessage: firstErrorMessage,
        message: totalSynced > 0
          ? `${totalSynced} provento(s) sincronizado(s) com sucesso!`
          : totalErrors > 0
            ? 'Alguns ativos não puderam ser sincronizados'
            : 'Nenhum novo provento encontrado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar proventos';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
