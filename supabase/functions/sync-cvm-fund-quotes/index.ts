import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FundQuoteRecord {
  cnpj: string;
  nome_fundo: string;
  data_quota: string;
  valor_quota: number;
  patrimonio_liquido: number | null;
  captacao_dia: number | null;
  resgate_dia: number | null;
  numero_cotistas: number | null;
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Parse Brazilian number format (1.234,56 -> 1234.56)
function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Format date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function fetchCVMData(yearMonth: string): Promise<string | null> {
  // CVM data URL format: inf_diario_fi_YYYYMM.csv
  const url = `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_${yearMonth}.csv`;
  
  console.log(`Fetching CVM data from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`CVM data not available for ${yearMonth}: ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    console.log(`Received ${text.length} bytes from CVM`);
    
    return text;
  } catch (error) {
    console.error(`Error fetching CVM data for ${yearMonth}:`, error);
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

  // Start logging
  const { data: logEntry } = await supabase
    .from("sync_execution_logs")
    .insert({
      function_name: "sync-cvm-fund-quotes",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {

    // Parse request body for target CNPJs or months
    let targetCnpjs: string[] = [];
    let months = 1;
    try {
      const body = await req.json();
      if (body?.cnpjs && Array.isArray(body.cnpjs)) {
        targetCnpjs = body.cnpjs;
      }
      if (body?.months && typeof body.months === 'number') {
        months = Math.min(body.months, 12); // Max 12 months
      }
    } catch {
      // No body or invalid JSON
    }

    // If no CNPJs provided, get CNPJs from assets table (Fundos de Investimento with CNPJ)
    if (targetCnpjs.length === 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('cnpj')
        .eq('asset_class', 'Fundos de Investimento')
        .not('cnpj', 'is', null);
      
      if (assets && assets.length > 0) {
        targetCnpjs = [...new Set(assets.map(a => a.cnpj).filter(Boolean))];
      }
    }

    if (targetCnpjs.length === 0) {
      console.log('No fund CNPJs to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No fund CNPJs to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing quotes for ${targetCnpjs.length} funds: ${targetCnpjs.slice(0, 5).join(', ')}...`);

    // Create a set of target CNPJs for fast lookup (normalize by removing punctuation)
    const targetCnpjSet = new Set(targetCnpjs.map(c => c.replace(/[.\-\/]/g, '')));

    // Get current month and previous months
    const monthsToFetch: string[] = [];
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthsToFetch.push(yearMonth);
    }

    console.log(`Fetching data for months: ${monthsToFetch.join(', ')}`);

    let totalSynced = 0;
    const errors: string[] = [];

    for (const yearMonth of monthsToFetch) {
      try {
        const csvData = await fetchCVMData(yearMonth);
        if (!csvData) {
          errors.push(`No data for ${yearMonth}`);
          continue;
        }

        const lines = csvData.split('\n');
        if (lines.length < 2) {
          errors.push(`Empty data for ${yearMonth}`);
          continue;
        }

        // Parse header
        const header = parseCSVLine(lines[0]);
        const cnpjIdx = header.findIndex(h => h.toUpperCase().includes('CNPJ'));
        const dataIdx = header.findIndex(h => h.toUpperCase().includes('DT_COMPTC'));
        const valorIdx = header.findIndex(h => h.toUpperCase().includes('VL_QUOTA'));
        const plIdx = header.findIndex(h => h.toUpperCase().includes('VL_PATRIM_LIQ'));
        const captIdx = header.findIndex(h => h.toUpperCase().includes('CAPTC_DIA'));
        const resgIdx = header.findIndex(h => h.toUpperCase().includes('RESG_DIA'));
        const cotistasIdx = header.findIndex(h => h.toUpperCase().includes('NR_COTST'));

        if (cnpjIdx < 0 || dataIdx < 0 || valorIdx < 0) {
          errors.push(`Invalid CSV header for ${yearMonth}`);
          continue;
        }

        console.log(`Processing ${lines.length - 1} records for ${yearMonth}`);

        // Collect records for batch insert
        const records: FundQuoteRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const fields = parseCSVLine(line);
          const cnpj = fields[cnpjIdx]?.replace(/[.\-\/]/g, '') || '';
          
          // Only process if this CNPJ is in our target list
          if (!targetCnpjSet.has(cnpj)) continue;

          const dataQuota = parseDate(fields[dataIdx]);
          const valorQuota = parseNumber(fields[valorIdx]);

          if (!dataQuota || valorQuota === null) continue;

          records.push({
            cnpj: cnpj,
            nome_fundo: '', // CVM inf_diario doesn't include fund name
            data_quota: dataQuota,
            valor_quota: valorQuota,
            patrimonio_liquido: parseNumber(fields[plIdx] || ''),
            captacao_dia: parseNumber(fields[captIdx] || ''),
            resgate_dia: parseNumber(fields[resgIdx] || ''),
            numero_cotistas: plIdx >= 0 ? Math.floor(parseNumber(fields[cotistasIdx] || '') || 0) : null,
          });
        }

        console.log(`Found ${records.length} matching records for ${yearMonth}`);

        // Batch insert
        if (records.length > 0) {
          for (let i = 0; i < records.length; i += 100) {
            const batch = records.slice(i, i + 100);
            const { error } = await supabase
              .from('fund_quotes')
              .upsert(batch, { onConflict: 'cnpj,data_quota' });
            
            if (error) {
              console.error(`Error inserting batch for ${yearMonth}:`, error);
              errors.push(`Insert error for ${yearMonth}: ${error.message}`);
            } else {
              totalSynced += batch.length;
            }
          }
        }
      } catch (monthError) {
        const msg = `Error processing ${yearMonth}: ${monthError instanceof Error ? monthError.message : 'Unknown'}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    console.log(`Sync completed: ${totalSynced} quotes synced`);

    // Update log entry on success
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: errors.length > 0 ? "partial" : "success",
          records_processed: totalSynced,
          details: { funds: targetCnpjs.length, months: monthsToFetch, errors: errors.length > 0 ? errors : undefined },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        funds: targetCnpjs.length,
        months: monthsToFetch,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in sync-cvm-fund-quotes:', err);

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
