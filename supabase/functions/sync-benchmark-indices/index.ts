import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BCB API Series
const BCB_SERIES = {
  CDI: 12,      // CDI diário
  IPCA: 433,   // IPCA mensal
  DOLAR: 1,    // PTAX venda
};

interface BCBDataPoint {
  data: string;  // DD/MM/YYYY
  valor: string;
}

interface BRAPIHistoricalResult {
  date: number;  // timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BRAPIResponse {
  results: Array<{
    symbol: string;
    historicalDataPrice?: BRAPIHistoricalResult[];
  }>;
}

function parseBCBDate(dateStr: string): string {
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDateForBCB(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function fetchBCBData(serieId: number, startDate: string, endDate: string): Promise<BCBDataPoint[]> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`;
  
  console.log(`Fetching BCB data for series ${serieId}: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BCB API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`Received ${data.length} records for series ${serieId}`);
  
  return data;
}

async function fetchBRAPIHistorical(symbol: string, apiKey: string, range: string = '1y'): Promise<BRAPIHistoricalResult[]> {
  const url = `https://brapi.dev/api/quote/${symbol}?range=${range}&interval=1d&token=${apiKey}`;
  
  console.log(`Fetching BRAPI data for ${symbol}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error(`BRAPI error for ${symbol}:`, text);
    throw new Error(`BRAPI API error: ${response.status}`);
  }
  
  const data: BRAPIResponse = await response.json();
  return data.results?.[0]?.historicalDataPrice || [];
}

async function fetchAnbimaIMAB(startDate: Date, endDate: Date): Promise<Array<{ date: string; dailyRate: number }>> {
  const clientId = Deno.env.get('ANBIMA_CLIENT_ID');
  const clientSecret = Deno.env.get('ANBIMA_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.log('ANBIMA credentials not configured, skipping IMAB');
    return [];
  }

  try {
    // Get access token
    const authResponse = await fetch('https://api.anbima.com.br/oauth/access-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      console.error('ANBIMA auth failed:', await authResponse.text());
      return [];
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Fetch IMA-B data
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const url = `https://api-sandbox.anbima.com.br/feed/precos-indices/v1/titulos-publicos/indices?data_inicio=${formatDate(startDate)}&data_fim=${formatDate(endDate)}&indice=IMA-B`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'client_id': clientId,
      },
    });

    if (!response.ok) {
      console.error('ANBIMA IMA-B fetch failed:', await response.text());
      return [];
    }

    const data = await response.json();
    
    // Parse and calculate daily returns
    const results: Array<{ date: string; dailyRate: number }> = [];
    const values = data.value || [];
    
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      const dailyRate = (curr.valor_indice / prev.valor_indice) - 1;
      results.push({
        date: curr.data_referencia,
        dailyRate,
      });
    }

    console.log(`ANBIMA IMA-B: ${results.length} records`);
    return results;
  } catch (error) {
    console.error('ANBIMA error:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const brapiKey = Deno.env.get('BRAPI_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Start logging
  const { data: logEntry } = await supabase
    .from("sync_execution_logs")
    .insert({
      function_name: "sync-benchmark-indices",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    // Parse request body
    let initialLoad = false;
    let yearsToLoad = 2;
    try {
      const body = await req.json();
      initialLoad = body?.initialLoad === true;
      if (body?.years && typeof body.years === 'number') {
        yearsToLoad = Math.min(body.years, 5);
      }
    } catch {
      // No body or invalid JSON
    }

    const endDate = new Date();
    const startDate = new Date();
    
    if (initialLoad) {
      startDate.setFullYear(startDate.getFullYear() - yearsToLoad);
      console.log(`Initial load mode: loading ${yearsToLoad} years of data`);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const startDateStrBCB = formatDateForBCB(startDate);
    const endDateStrBCB = formatDateForBCB(endDate);

    console.log(`Syncing benchmark indices from ${startDateStrBCB} to ${endDateStrBCB}`);

    let totalInserted = 0;
    const errors: string[] = [];

    // ============ SYNC CDI ============
    try {
      const cdiData = await fetchBCBData(BCB_SERIES.CDI, startDateStrBCB, endDateStrBCB);
      
      const cdiRecords = cdiData.map(point => {
        const referenceDate = parseBCBDate(point.data);
        const dailyRate = parseFloat(point.valor.replace(',', '.')) / 100;
        return {
          indicator_type: 'CDI',
          reference_date: referenceDate,
          daily_rate: dailyRate,
          annual_rate: Math.pow(1 + dailyRate, 252) - 1,
        };
      });

      if (cdiRecords.length > 0) {
        for (let i = 0; i < cdiRecords.length; i += 100) {
          const batch = cdiRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (!error) totalInserted += batch.length;
          else console.error('CDI insert error:', error);
        }
      }
      console.log(`CDI sync complete: ${cdiData.length} records`);
    } catch (err) {
      const errorMsg = `CDI sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // ============ SYNC IPCA ============
    try {
      const ipcaData = await fetchBCBData(BCB_SERIES.IPCA, startDateStrBCB, endDateStrBCB);
      
      const ipcaRecords = ipcaData.map(point => {
        const referenceDate = parseBCBDate(point.data);
        const monthlyRate = parseFloat(point.valor.replace(',', '.')) / 100;
        const dailyRate = Math.pow(1 + monthlyRate, 1 / 21) - 1;
        return {
          indicator_type: 'IPCA',
          reference_date: referenceDate,
          daily_rate: dailyRate,
          monthly_rate: monthlyRate,
          annual_rate: Math.pow(1 + monthlyRate, 12) - 1,
        };
      });

      if (ipcaRecords.length > 0) {
        for (let i = 0; i < ipcaRecords.length; i += 100) {
          const batch = ipcaRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (!error) totalInserted += batch.length;
          else console.error('IPCA insert error:', error);
        }
      }
      console.log(`IPCA sync complete: ${ipcaData.length} records`);
    } catch (err) {
      const errorMsg = `IPCA sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // ============ SYNC DOLAR (PTAX) ============
    try {
      const dolarData = await fetchBCBData(BCB_SERIES.DOLAR, startDateStrBCB, endDateStrBCB);
      
      // Need to calculate daily variation from prices
      const dolarRecords: Array<{
        indicator_type: string;
        reference_date: string;
        daily_rate: number;
      }> = [];
      
      for (let i = 1; i < dolarData.length; i++) {
        const prev = parseFloat(dolarData[i - 1].valor.replace(',', '.'));
        const curr = parseFloat(dolarData[i].valor.replace(',', '.'));
        const dailyRate = (curr / prev) - 1;
        
        dolarRecords.push({
          indicator_type: 'DOLAR',
          reference_date: parseBCBDate(dolarData[i].data),
          daily_rate: dailyRate,
        });
      }

      if (dolarRecords.length > 0) {
        for (let i = 0; i < dolarRecords.length; i += 100) {
          const batch = dolarRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (!error) totalInserted += batch.length;
          else console.error('DOLAR insert error:', error);
        }
      }
      console.log(`DOLAR sync complete: ${dolarRecords.length} records`);
    } catch (err) {
      const errorMsg = `DOLAR sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // ============ SYNC IBOV ============
    try {
      const range = initialLoad ? '5y' : '1mo';
      const ibovData = await fetchBRAPIHistorical('%5EBVSP', brapiKey, range);
      
      const ibovRecords: Array<{
        indicator_type: string;
        reference_date: string;
        daily_rate: number;
      }> = [];
      
      // Sort by date
      const sortedData = ibovData.sort((a, b) => a.date - b.date);
      
      for (let i = 1; i < sortedData.length; i++) {
        const prev = sortedData[i - 1].close;
        const curr = sortedData[i].close;
        const dailyRate = (curr / prev) - 1;
        const date = new Date(sortedData[i].date * 1000);
        
        ibovRecords.push({
          indicator_type: 'IBOV',
          reference_date: date.toISOString().split('T')[0],
          daily_rate: dailyRate,
        });
      }

      if (ibovRecords.length > 0) {
        for (let i = 0; i < ibovRecords.length; i += 100) {
          const batch = ibovRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (!error) totalInserted += batch.length;
          else console.error('IBOV insert error:', error);
        }
      }
      console.log(`IBOV sync complete: ${ibovRecords.length} records`);
    } catch (err) {
      const errorMsg = `IBOV sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // ============ CALCULATE IPCA+6 ============
    try {
      // Get IPCA data and add 6% annual spread
      const { data: ipcaRecords } = await supabase
        .from('economic_indicators')
        .select('reference_date, daily_rate')
        .eq('indicator_type', 'IPCA')
        .gte('reference_date', startDate.toISOString().split('T')[0])
        .order('reference_date', { ascending: true });

      if (ipcaRecords && ipcaRecords.length > 0) {
        // 6% annual = ~0.0159% per business day (252 days)
        const dailySpread = Math.pow(1.06, 1 / 252) - 1;
        
        const ipca6Records = ipcaRecords.map(record => ({
          indicator_type: 'IPCA+6',
          reference_date: record.reference_date,
          daily_rate: (record.daily_rate || 0) + dailySpread,
        }));

        for (let i = 0; i < ipca6Records.length; i += 100) {
          const batch = ipca6Records.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (!error) totalInserted += batch.length;
          else console.error('IPCA+6 insert error:', error);
        }
        console.log(`IPCA+6 sync complete: ${ipca6Records.length} records`);
      }
    } catch (err) {
      const errorMsg = `IPCA+6 sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // Update log entry
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: errors.length > 0 ? "partial" : "success",
          records_processed: totalInserted,
          details: { 
            initialLoad, 
            dateRange: { start: startDateStrBCB, end: endDateStrBCB }, 
            errors: errors.length > 0 ? errors : undefined,
            benchmarks: ['CDI', 'IPCA', 'DOLAR', 'IBOV', 'IPCA+6']
          },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Benchmark indices synced successfully`,
        totalInserted,
        initialLoad,
        errors: errors.length > 0 ? errors : undefined,
        dateRange: { start: startDateStrBCB, end: endDateStrBCB }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error syncing benchmark indices:', err);

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
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
