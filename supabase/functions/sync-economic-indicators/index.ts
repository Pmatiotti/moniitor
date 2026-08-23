import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BCB API Series
const BCB_SERIES = {
  CDI: 12,    // CDI diário
  IPCA: 433,  // IPCA mensal
  SELIC: 432, // SELIC diária (Meta)
};

interface BCBDataPoint {
  data: string;  // DD/MM/YYYY
  valor: string;
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

function parseBCBDate(dateStr: string): string {
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDateForBCB(date: Date): string {
  // Format as DD/MM/YYYY for BCB API
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
      function_name: "sync-economic-indicators",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {

    // Parse request body for initialLoad parameter
    let initialLoad = false;
    let yearsToLoad = 2;
    try {
      const body = await req.json();
      initialLoad = body?.initialLoad === true;
      if (body?.years && typeof body.years === 'number') {
        yearsToLoad = Math.min(body.years, 5); // Max 5 years
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get date range
    const endDate = new Date();
    let startDate = new Date();
    
    if (initialLoad) {
      // For initial load, go back specified years
      startDate.setFullYear(startDate.getFullYear() - yearsToLoad);
      console.log(`Initial load mode: loading ${yearsToLoad} years of data`);
    } else {
      // Default: check last sync date per indicator type to fill gaps
      // Get the earliest "last date" across all indicator types
      const indicatorTypes = ['CDI', 'SELIC', 'IPCA'];
      let earliestLastDate: Date | null = null;
      
      for (const indicatorType of indicatorTypes) {
        const { data: lastRecord } = await supabase
          .from('economic_indicators')
          .select('reference_date')
          .eq('indicator_type', indicatorType)
          .order('reference_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastRecord) {
          const lastDate = new Date(lastRecord.reference_date);
          if (!earliestLastDate || lastDate < earliestLastDate) {
            earliestLastDate = lastDate;
          }
        }
      }

      if (earliestLastDate) {
        // Start from the day after the earliest last date
        startDate = new Date(earliestLastDate);
        startDate.setDate(startDate.getDate() + 1);
        console.log(`Filling gaps from: ${startDate.toISOString().split('T')[0]}`);
      } else {
        // No data at all, load last 30 days
        startDate.setDate(startDate.getDate() - 30);
      }
    }

    const startDateStr = formatDateForBCB(startDate);
    const endDateStr = formatDateForBCB(endDate);

    console.log(`Syncing economic indicators from ${startDateStr} to ${endDateStr}`);

    let totalInserted = 0;
    const errors: string[] = [];

    // Sync CDI
    try {
      const cdiData = await fetchBCBData(BCB_SERIES.CDI, startDateStr, endDateStr);
      
      // Batch insert for better performance
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
        // Insert in batches of 100
        for (let i = 0; i < cdiRecords.length; i += 100) {
          const batch = cdiRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (error) {
            console.error(`Error inserting CDI batch:`, error);
          } else {
            totalInserted += batch.length;
          }
        }
      }
      console.log(`CDI sync complete: ${cdiData.length} records`);
    } catch (err) {
      const errorMsg = `CDI sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }


    // Sync IPCA (monthly)
    try {
      const ipcaData = await fetchBCBData(BCB_SERIES.IPCA, startDateStr, endDateStr);
      
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
          
          if (error) {
            console.error(`Error inserting IPCA batch:`, error);
          } else {
            totalInserted += batch.length;
          }
        }
      }
      console.log(`IPCA sync complete: ${ipcaData.length} records`);
    } catch (err) {
      const errorMsg = `IPCA sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // Sync SELIC (daily - series 432 returns annual rate as percentage, need to convert to daily)
    try {
      const selicData = await fetchBCBData(BCB_SERIES.SELIC, startDateStr, endDateStr);
      
      const selicRecords = selicData.map(point => {
        const referenceDate = parseBCBDate(point.data);
        // Series 432 returns annual SELIC rate as percentage (e.g., 14.25 for 14.25%)
        const annualRatePercent = parseFloat(point.valor.replace(',', '.'));
        const annualRate = annualRatePercent / 100; // Convert to decimal (0.1425)
        // Convert annual rate to daily rate: (1 + annual)^(1/252) - 1
        const dailyRate = Math.pow(1 + annualRate, 1 / 252) - 1;
        return {
          indicator_type: 'SELIC',
          reference_date: referenceDate,
          daily_rate: dailyRate,
          annual_rate: annualRate,
        };
      });

      if (selicRecords.length > 0) {
        for (let i = 0; i < selicRecords.length; i += 100) {
          const batch = selicRecords.slice(i, i + 100);
          const { error } = await supabase
            .from('economic_indicators')
            .upsert(batch, { onConflict: 'indicator_type,reference_date' });
          
          if (error) {
            console.error(`Error inserting SELIC batch:`, error);
          } else {
            totalInserted += batch.length;
          }
        }
      }
      console.log(`SELIC sync complete: ${selicData.length} records`);
    } catch (err) {
      const errorMsg = `SELIC sync error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // Update log entry on success
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: errors.length > 0 ? "partial" : "success",
          records_processed: totalInserted,
          details: { initialLoad, dateRange: { start: startDateStr, end: endDateStr }, errors: errors.length > 0 ? errors : undefined },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Economic indicators synced successfully`,
        totalInserted,
        initialLoad,
        errors: errors.length > 0 ? errors : undefined,
        dateRange: { start: startDateStr, end: endDateStr }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error syncing economic indicators:', err);

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
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
