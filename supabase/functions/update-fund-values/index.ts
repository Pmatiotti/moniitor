import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  asset_name: string;
  quantity: number;
  average_price: number;
  current_price: number | null;
  invested_amount: number | null;
  cnpj: string | null;
  asset_class: string;
}

interface FundQuote {
  cnpj: string;
  data_quota: string;
  valor_quota: number;
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
      function_name: "update-fund-values",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    console.log('Starting fund values update...');

    // Fetch all investment fund assets with CNPJ
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_class', 'Fundos de Investimento')
      .not('cnpj', 'is', null);

    if (fetchError) throw new Error(fetchError.message);

    if (!assets?.length) {
      console.log('No investment funds with CNPJ found');
      return new Response(
        JSON.stringify({ success: true, updated: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} investment fund assets with CNPJ`);

    // Get unique CNPJs (normalized)
    const uniqueCnpjs = [...new Set(
      assets.map((a: Asset) => a.cnpj?.replace(/[.\-\/]/g, '')).filter(Boolean)
    )];

    console.log(`Unique CNPJs: ${uniqueCnpjs.length}`);

    // Fetch latest quotes for each CNPJ from database
    const quotesMap = new Map<string, FundQuote>();

    for (const cnpj of uniqueCnpjs) {
      const { data: quote } = await supabase
        .from('fund_quotes')
        .select('cnpj, data_quota, valor_quota')
        .eq('cnpj', cnpj)
        .order('data_quota', { ascending: false })
        .limit(1)
        .single();

      if (quote) {
        quotesMap.set(cnpj as string, quote);
        console.log(`Latest quote for ${cnpj}: ${quote.valor_quota} on ${quote.data_quota}`);
      }
    }

    console.log(`Found quotes for ${quotesMap.size} funds in database`);

    // If missing quotes, try to fetch from ANBIMA
    const missingCnpjs = uniqueCnpjs.filter(cnpj => !quotesMap.has(cnpj as string));
    
    if (missingCnpjs.length > 0) {
      console.log(`Trying to fetch ${missingCnpjs.length} missing quotes from ANBIMA...`);
      
      try {
        const { data: anbimaResult, error: anbimaError } = await supabase.functions.invoke('fetch-anbima-fund-quotes', {
          body: { cnpjs: missingCnpjs }
        });

        if (!anbimaError && anbimaResult?.quotes) {
          for (const quote of anbimaResult.quotes) {
            quotesMap.set(quote.cnpj, {
              cnpj: quote.cnpj,
              data_quota: quote.data_quota,
              valor_quota: quote.valor_quota,
            });
            console.log(`ANBIMA quote for ${quote.cnpj}: ${quote.valor_quota} on ${quote.data_quota}`);
          }
          console.log(`Fetched ${anbimaResult.quotes.length} quotes from ANBIMA`);
        } else if (anbimaError) {
          console.warn('Could not fetch from ANBIMA:', anbimaError);
        }
      } catch (anbimaErr) {
        console.warn('ANBIMA fetch failed, continuing with available quotes:', anbimaErr);
      }
    }

    console.log(`Total quotes available: ${quotesMap.size}`);

    let updated = 0;
    let skipped = 0;

    for (const asset of assets as Asset[]) {
      const normalizedCnpj = asset.cnpj?.replace(/[.\-\/]/g, '') || '';
      const quote = quotesMap.get(normalizedCnpj);

      if (!quote) {
        console.log(`No quote found for ${asset.ticker} (CNPJ: ${asset.cnpj})`);
        skipped++;
        continue;
      }

      // Calculate current value
      const currentPrice = quote.valor_quota;
      const currentValue = currentPrice * asset.quantity;
      const invested = asset.invested_amount || (asset.quantity * asset.average_price);
      const returnPercent = invested > 0 ? ((currentValue / invested - 1) * 100) : 0;

      console.log(`${asset.ticker}: ${asset.quantity} cotas x R$ ${currentPrice.toFixed(6)} = R$ ${currentValue.toFixed(2)} (${returnPercent.toFixed(2)}%)`);

      // Update the asset
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          current_price: currentPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id);

      if (updateError) {
        console.error(`Error updating ${asset.ticker}:`, updateError);
      } else {
        updated++;
      }
    }

    console.log(`Update completed: ${updated} updated, ${skipped} skipped`);

    // Update log entry on success
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: "success",
          records_processed: updated,
          details: { updated, skipped, total: assets.length, quotesFound: quotesMap.size },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        skipped,
        total: assets.length,
        quotesFound: quotesMap.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in update-fund-values:', err);

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
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
