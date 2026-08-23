import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ANBIMA API URLs - OAuth always uses production, data uses sandbox for testing
const ANBIMA_AUTH_URL = 'https://api.anbima.com.br';
const ANBIMA_DATA_URL = 'https://api-sandbox.anbima.com.br';

interface AnbimaQuote {
  cnpj: string;
  data_quota: string;
  valor_quota: number;
  nome_fundo?: string;
  patrimonio_liquido?: number;
}

// Get ANBIMA access token using OAuth2
async function getAnbimaToken(): Promise<string> {
  const clientId = Deno.env.get('ANBIMA_CLIENT_ID');
  const clientSecret = Deno.env.get('ANBIMA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('ANBIMA credentials not configured');
  }

  console.log(`Using ANBIMA client_id: ${clientId.substring(0, 4)}...`);

  // ANBIMA OAuth2 - Basic auth with JSON body
  const credentials = btoa(`${clientId}:${clientSecret}`);
  console.log(`Auth header: Basic ${credentials.substring(0, 10)}...`);

  console.log(`Using ANBIMA auth endpoint: ${ANBIMA_AUTH_URL}`);
  
  const response = await fetch(`${ANBIMA_AUTH_URL}/oauth/access-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ANBIMA OAuth error:', response.status, errorText);
    throw new Error(`Failed to get ANBIMA token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('ANBIMA auth successful, token obtained');
  return data.access_token;
}

// Fetch fund quotes from ANBIMA API
async function fetchAnbimaQuote(cnpj: string, accessToken: string): Promise<AnbimaQuote | null> {
  const clientId = Deno.env.get('ANBIMA_CLIENT_ID')!;
  
  // Normalize CNPJ (remove formatting)
  const normalizedCnpj = cnpj.replace(/[.\-\/]/g, '');
  
  // Get quotes for the last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  try {
    // Try the fundos-estruturados endpoint first (for FIIs and some funds)
    let url = `${ANBIMA_DATA_URL}/feed/fundos/v1/fundos/${normalizedCnpj}/serie-historica?data-inicio=${formatDate(startDate)}&data-fim=${formatDate(endDate)}`;
    
    console.log(`Fetching ANBIMA quote for CNPJ: ${normalizedCnpj}`);
    
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'client_id': clientId,
        'access_token': accessToken,
        'Accept': 'application/json',
      },
    });

    // If not found, try alternative endpoint for investment funds
    if (response.status === 404) {
      url = `${ANBIMA_DATA_URL}/feed/precos-indices/v1/titulos-privados/fundos/${normalizedCnpj}/historico?data-inicio=${formatDate(startDate)}&data-fim=${formatDate(endDate)}`;
      
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'client_id': clientId,
          'access_token': accessToken,
          'Accept': 'application/json',
        },
      });
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Fund not found in ANBIMA: ${normalizedCnpj}`);
        return null;
      }
      const errorText = await response.text();
      console.error(`ANBIMA API error for ${normalizedCnpj}:`, errorText);
      return null;
    }

    const data = await response.json();
    
    // Parse response based on endpoint format
    if (Array.isArray(data) && data.length > 0) {
      // Sort by date descending to get latest
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.data || b.data_referencia).getTime() - new Date(a.data || a.data_referencia).getTime()
      );
      
      const latest = sorted[0];
      
      return {
        cnpj: normalizedCnpj,
        data_quota: latest.data || latest.data_referencia,
        valor_quota: parseFloat(latest.valor_cota || latest.valor_quota || latest.pu || latest.valor),
        nome_fundo: latest.nome_fundo || latest.nome,
        patrimonio_liquido: latest.patrimonio_liquido ? parseFloat(latest.patrimonio_liquido) : undefined,
      };
    } else if (data.historico && Array.isArray(data.historico) && data.historico.length > 0) {
      const sorted = data.historico.sort((a: any, b: any) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      
      const latest = sorted[0];
      
      return {
        cnpj: normalizedCnpj,
        data_quota: latest.data,
        valor_quota: parseFloat(latest.valor_cota || latest.valor),
        nome_fundo: data.nome_fundo,
        patrimonio_liquido: latest.patrimonio_liquido ? parseFloat(latest.patrimonio_liquido) : undefined,
      };
    }

    console.log(`No quote data found for ${normalizedCnpj}`);
    return null;
  } catch (error) {
    console.error(`Error fetching ANBIMA quote for ${normalizedCnpj}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Starting ANBIMA fund quotes sync...');

    // Get ANBIMA access token
    const accessToken = await getAnbimaToken();
    console.log('ANBIMA authentication successful');

    // Get request body for optional specific CNPJs
    let cnpjsToFetch: string[] = [];
    
    try {
      const body = await req.json();
      if (body.cnpjs && Array.isArray(body.cnpjs)) {
        cnpjsToFetch = body.cnpjs;
      }
    } catch {
      // No body or invalid JSON, fetch all funds
    }

    // If no specific CNPJs, get all unique CNPJs from assets
    if (cnpjsToFetch.length === 0) {
      const { data: assets, error: fetchError } = await supabase
        .from('assets')
        .select('cnpj')
        .eq('asset_class', 'Fundos de Investimento')
        .not('cnpj', 'is', null);

      if (fetchError) throw new Error(fetchError.message);

      if (!assets?.length) {
        console.log('No investment funds with CNPJ found');
        return new Response(
          JSON.stringify({ success: true, fetched: 0, total: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get unique normalized CNPJs
      const uniqueCnpjs = [...new Set(
        assets.map(a => a.cnpj?.replace(/[.\-\/]/g, '')).filter(Boolean)
      )] as string[];
      
      cnpjsToFetch = uniqueCnpjs;
    }

    console.log(`Fetching quotes for ${cnpjsToFetch.length} funds from ANBIMA...`);

    let fetched = 0;
    let failed = 0;
    const results: AnbimaQuote[] = [];

    for (const cnpj of cnpjsToFetch) {
      const quote = await fetchAnbimaQuote(cnpj, accessToken);
      
      if (quote) {
        results.push(quote);
        
        // Upsert to fund_quotes table
        const { error: upsertError } = await supabase
          .from('fund_quotes')
          .upsert({
            cnpj: quote.cnpj,
            data_quota: quote.data_quota,
            valor_quota: quote.valor_quota,
            nome_fundo: quote.nome_fundo,
            patrimonio_liquido: quote.patrimonio_liquido,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'cnpj,data_quota',
          });

        if (upsertError) {
          console.error(`Error upserting quote for ${cnpj}:`, upsertError);
          failed++;
        } else {
          fetched++;
          console.log(`✅ ${quote.nome_fundo || cnpj}: R$ ${quote.valor_quota.toFixed(6)} (${quote.data_quota})`);
        }
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`ANBIMA sync completed: ${fetched} fetched, ${failed} failed`);

    // Log the execution
    await supabase
      .from('sync_execution_logs')
      .insert({
        function_name: 'fetch-anbima-fund-quotes',
        status: failed > 0 && fetched === 0 ? 'failed' : 'success',
        records_processed: fetched,
        details: { fetched, failed, total: cnpjsToFetch.length },
      });

    return new Response(
      JSON.stringify({
        success: true,
        fetched,
        failed,
        total: cnpjsToFetch.length,
        quotes: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in fetch-anbima-fund-quotes:', err);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
