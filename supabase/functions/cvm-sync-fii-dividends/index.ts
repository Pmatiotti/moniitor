import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ZipReader, BlobReader, TextWriter } from "https://deno.land/x/zipjs@v2.7.45/index.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CVMDividendRow {
  CNPJ_FUNDO: string;
  DT_COMPTC: string;
  TP_EVENTO: string;
  VL_EVENTO: number;
  DT_PAGAMENTO: string;
  DT_BASE: string;
}

// Parse CSV string into array of objects
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  
  // Handle BOM and clean header
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(';').map(h => h.trim().replace(/"/g, ''));
  
  const results: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(';').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    results.push(row);
  }
  
  return results;
}

// Download and extract CSVs from CVM ZIP file - returns all CSV files
async function downloadAndExtractCVMData(year: number): Promise<Map<string, string>> {
  const csvFiles = new Map<string, string>();
  
  try {
    // CVM provides ZIP files containing the CSV data
    const zipUrl = `https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_${year}.zip`;
    console.log(`Downloading CVM ZIP for ${year}: ${zipUrl}`);
    
    const response = await fetch(zipUrl);
    if (!response.ok) {
      console.warn(`CVM ZIP for ${year} not available: ${response.status}`);
      return csvFiles;
    }
    
    const zipBlob = await response.blob();
    console.log(`Downloaded ZIP size: ${zipBlob.size} bytes`);
    
    const zipReader = new ZipReader(new BlobReader(zipBlob));
    const entries = await zipReader.getEntries();
    
    console.log(`ZIP contains ${entries.length} files: ${entries.map((e: any) => e.filename).join(', ')}`);
    
    // Extract all CSV files
    for (const entry of entries) {
      if (entry.filename.endsWith('.csv') && entry.getData) {
        try {
          const csvContent = await entry.getData(new TextWriter());
          csvFiles.set(entry.filename, csvContent);
          console.log(`Extracted ${entry.filename}: ${csvContent.length} chars`);
        } catch (e) {
          console.error(`Failed to extract ${entry.filename}:`, e);
        }
      }
    }
    
    await zipReader.close();
    
  } catch (error) {
    console.error(`Error downloading/extracting CVM data for ${year}:`, error);
  }
  
  return csvFiles;
}

// Try to find dividend data from any available CVM source
async function fetchCVMDividendData(year: number): Promise<Record<string, string>[]> {
  const allRows: Record<string, string>[] = [];
  
  // Source 1: Try the inf_mensal ZIP
  const csvFiles = await downloadAndExtractCVMData(year);
  
  for (const [filename, content] of csvFiles) {
    const rows = parseCSV(content);
    console.log(`File ${filename}: ${rows.length} rows`);
    
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      console.log(`Headers: ${headers.slice(0, 15).join(', ')}...`);
      
      // Check if this file might have dividend data
      const hasDividendColumns = headers.some(h => 
        h.toLowerCase().includes('rend') || 
        h.toLowerCase().includes('prov') ||
        h.toLowerCase().includes('pagamento') ||
        h.toLowerCase().includes('distribui')
      );
      
      if (hasDividendColumns) {
        console.log(`Found potential dividend columns in ${filename}`);
        console.log(`Sample: ${JSON.stringify(rows[0]).substring(0, 800)}`);
      }
    }
  }
  
  // Source 2: Try the specific dividend calendar endpoint (if exists)
  try {
    const provUrl = `https://dados.cvm.gov.br/dados/FII/DOC/PROV/DADOS/prov_fii_${year}.csv`;
    console.log(`Trying CVM proventos file: ${provUrl}`);
    
    const provResponse = await fetch(provUrl);
    if (provResponse.ok) {
      const provText = await provResponse.text();
      const provRows = parseCSV(provText);
      console.log(`Proventos file: ${provRows.length} rows`);
      
      if (provRows.length > 0) {
        console.log(`Proventos headers: ${Object.keys(provRows[0]).join(', ')}`);
        console.log(`Proventos sample: ${JSON.stringify(provRows[0])}`);
        return provRows;
      }
    } else {
      console.log(`Proventos file not found: ${provResponse.status}`);
    }
  } catch (e) {
    console.warn(`Error fetching proventos file:`, e);
  }
  
  return allRows;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting CVM FII dividends sync...');

    // Get current year and previous year for data fetching
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];
    
    let allDividends: CVMDividendRow[] = [];
    
    for (const year of years) {
      try {
        // Fetch dividend data from CVM sources
        const rows = await fetchCVMDividendData(year);
        
        if (rows.length === 0) {
          console.warn(`No dividend data found for ${year}`);
          continue;
        }
        
        console.log(`Processing ${rows.length} potential dividend rows for ${year}`);
        
        // Try to extract dividend info from rows based on available columns
        for (const row of rows) {
          const cnpj = row.CNPJ_FUNDO || row.CNPJ_Fundo_Classe || row.CNPJ || '';
          
          // Try to find value column
          const value = parseFloat((
            row.VL_EVENTO || 
            row.Valor_Evento || 
            row.VL_PROVENTO || 
            row.Valor_Provento ||
            row.VL_RENDIMENTO ||
            row.Rendimento_Distribuido_Por_Cota ||
            '0'
          ).toString().replace(',', '.'));
          
          // Try to find payment date
          const paymentDate = 
            row.DT_PAGAMENTO || 
            row.Data_Pagamento || 
            row.DT_PROV_PAGAMENTO ||
            '';
          
          const baseDate = 
            row.DT_BASE || 
            row.Data_Base || 
            row.DT_PROV_BASE ||
            '';
          
          const eventType = 
            row.TP_EVENTO || 
            row.Tipo_Evento || 
            row.TP_PROVENTO ||
            'rendimento';
          
          if (cnpj && value > 0 && paymentDate) {
            allDividends.push({
              CNPJ_FUNDO: cnpj.replace(/\D/g, ''),
              DT_COMPTC: row.DT_COMPTC || row.Data_Referencia || '',
              TP_EVENTO: eventType,
              VL_EVENTO: value,
              DT_PAGAMENTO: paymentDate,
              DT_BASE: baseDate
            });
          }
        }
      } catch (yearError) {
        console.error(`Error processing CVM data for ${year}:`, yearError);
      }
    }
    
    console.log(`Total dividend events found: ${allDividends.length}`);
    
    if (allDividends.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No dividend data found in CVM source',
          synced: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get FII registry to map CNPJ to ticker
    const { data: fiiRegistry, error: registryError } = await supabase
      .from('fii_registry')
      .select('cnpj, ticker');
    
    if (registryError) {
      console.error('Error fetching FII registry:', registryError);
      throw registryError;
    }
    
    // Create CNPJ to ticker map
    const cnpjToTicker = new Map<string, string>();
    for (const fii of fiiRegistry || []) {
      const cleanCnpj = (fii.cnpj || '').replace(/\D/g, '');
      if (cleanCnpj && fii.ticker) {
        cnpjToTicker.set(cleanCnpj, fii.ticker.toUpperCase());
      }
    }
    
    console.log(`FII registry has ${cnpjToTicker.size} entries`);

    // Get existing dividends to avoid duplicates
    const { data: existingDividends } = await supabase
      .from('fii_dividends')
      .select('ticker, data_pagamento, valor_por_cota');
    
    const existingSet = new Set(
      (existingDividends || []).map(d => 
        `${d.ticker}|${d.data_pagamento}|${d.valor_por_cota}`
      )
    );

    // Process and insert dividends
    let synced = 0;
    let skipped = 0;
    let unmapped = 0;
    
    const dividendsToInsert: Array<{
      ticker: string;
      valor_por_cota: number;
      data_pagamento: string;
      data_base: string | null;
      tipo: string;
      source: string;
    }> = [];

    for (const div of allDividends) {
      const ticker = cnpjToTicker.get(div.CNPJ_FUNDO);
      
      if (!ticker) {
        unmapped++;
        continue;
      }
      
      // Parse payment date (format: YYYY-MM-DD or DD/MM/YYYY)
      let paymentDate = div.DT_PAGAMENTO;
      if (paymentDate.includes('/')) {
        const parts = paymentDate.split('/');
        if (parts.length === 3) {
          paymentDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      
      // Parse base date
      let baseDate: string | null = null;
      if (div.DT_BASE) {
        if (div.DT_BASE.includes('/')) {
          const parts = div.DT_BASE.split('/');
          if (parts.length === 3) {
            baseDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else {
          baseDate = div.DT_BASE;
        }
      }
      
      // Determine type
      const eventType = div.TP_EVENTO.toLowerCase();
      let tipo = 'rendimento';
      if (eventType.includes('amortiza')) {
        tipo = 'amortização';
      }
      
      // Check for duplicate
      const key = `${ticker}|${paymentDate}|${div.VL_EVENTO}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      
      dividendsToInsert.push({
        ticker,
        valor_por_cota: div.VL_EVENTO,
        data_pagamento: paymentDate,
        data_base: baseDate,
        tipo,
        source: 'CVM'
      });
      
      existingSet.add(key);
    }

    // Batch insert
    if (dividendsToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < dividendsToInsert.length; i += batchSize) {
        const batch = dividendsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('fii_dividends')
          .upsert(batch, { 
            onConflict: 'ticker,data_pagamento,valor_por_cota',
            ignoreDuplicates: true 
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          // Try individual inserts for better error handling
          for (const item of batch) {
            const { error } = await supabase
              .from('fii_dividends')
              .insert(item);
            if (!error) synced++;
          }
        } else {
          synced += batch.length;
        }
      }
    }

    console.log(`CVM sync complete: ${synced} synced, ${skipped} skipped, ${unmapped} unmapped CNPJs`);

    // Now sync to user dividends for users who have these FIIs
    await syncToUserDividends(supabase, dividendsToInsert);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced,
        skipped,
        unmapped,
        message: `Sincronizados ${synced} proventos da CVM`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CVM sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao sincronizar CVM' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Sync CVM dividends to user-specific dividends table
async function syncToUserDividends(
  supabase: any, 
  cvmDividends: Array<{
    ticker: string;
    valor_por_cota: number;
    data_pagamento: string;
    data_base: string | null;
    tipo: string;
  }>
) {
  if (cvmDividends.length === 0) return;

  const tickers = [...new Set(cvmDividends.map(d => d.ticker))];
  
  // Get all user assets for these tickers
  const { data: userAssets, error: assetsError } = await supabase
    .from('assets')
    .select('id, user_id, ticker, quantity, created_at')
    .in('ticker', tickers);
  
  if (assetsError || !userAssets?.length) {
    console.log('No user assets found for CVM dividends');
    return;
  }

  console.log(`Found ${userAssets.length} user assets matching CVM tickers`);

  // Get existing user dividends to avoid duplicates
  const userIds = [...new Set(userAssets.map((a: any) => a.user_id))];
  const { data: existingUserDividends } = await supabase
    .from('dividends')
    .select('user_id, ticker, payment_date, dividend_type')
    .in('user_id', userIds)
    .in('ticker', tickers);
  
  const existingUserSet = new Set(
    (existingUserDividends || []).map((d: any) => 
      `${d.user_id}|${d.ticker}|${d.payment_date}|${d.dividend_type}`
    )
  );

  const today = new Date().toISOString().split('T')[0];
  const userDividendsToInsert: any[] = [];

  for (const asset of userAssets) {
    const assetCreatedAt = new Date(asset.created_at).toISOString().split('T')[0];
    
    for (const div of cvmDividends) {
      if (div.ticker !== asset.ticker) continue;
      
      // Skip if payment date is before asset was acquired or after today
      if (div.data_pagamento < assetCreatedAt || div.data_pagamento > today) {
        continue;
      }
      
      const dividendType = div.tipo === 'amortização' ? 'amortização' : 'rendimento';
      const key = `${asset.user_id}|${div.ticker}|${div.data_pagamento}|${dividendType}`;
      
      if (existingUserSet.has(key)) continue;
      
      userDividendsToInsert.push({
        user_id: asset.user_id,
        ticker: div.ticker,
        dividend_type: dividendType,
        amount: div.valor_por_cota * asset.quantity,
        payment_date: div.data_pagamento,
        ex_date: div.data_base,
        asset_class: 'FII',
        market_type: 'Brasil',
        asset_id: asset.id
      });
      
      existingUserSet.add(key);
    }
  }

  if (userDividendsToInsert.length > 0) {
    const { error } = await supabase
      .from('dividends')
      .insert(userDividendsToInsert);
    
    if (error) {
      console.error('Error inserting user dividends:', error);
    } else {
      console.log(`Inserted ${userDividendsToInsert.length} user dividends from CVM data`);
      
      // Create notifications for new dividends
      await createDividendNotifications(supabase, userDividendsToInsert);
    }
  }
}

// Create notifications for new dividend payments
async function createDividendNotifications(supabase: any, dividends: any[]) {
  const notifications: any[] = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Group by user for summary notifications
  const byUser = new Map<string, any[]>();
  for (const div of dividends) {
    if (!byUser.has(div.user_id)) {
      byUser.set(div.user_id, []);
    }
    byUser.get(div.user_id)!.push(div);
  }
  
  for (const [userId, userDivs] of byUser) {
    // Recent payments (last 7 days)
    const recentPayments = userDivs.filter(d => {
      const diffDays = Math.floor((new Date(today).getTime() - new Date(d.payment_date).getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
    
    if (recentPayments.length > 0) {
      const totalAmount = recentPayments.reduce((sum, d) => sum + d.amount, 0);
      const tickers = [...new Set(recentPayments.map(d => d.ticker))].slice(0, 3);
      
      notifications.push({
        user_id: userId,
        type: 'dividend_paid',
        title: `Proventos recebidos: ${tickers.join(', ')}${recentPayments.length > 3 ? '...' : ''}`,
        message: `Você recebeu R$ ${totalAmount.toFixed(2)} em proventos de ${recentPayments.length} ativo(s).`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
  }
  
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) {
      console.error('Error creating notifications:', error);
    } else {
      console.log(`Created ${notifications.length} dividend notifications`);
    }
  }
}
