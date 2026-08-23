import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CVMInformeMensal {
  cnpj_fundo: string;
  denom_social: string;
  dt_comptc: string;
  vl_patrim_liq: number;
  vl_quota: number;
  nr_cotst: number;
  tp_fundo: string;
  segmento?: string;
  nm_admin?: string;
  nm_gestor?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting CVM FII data sync...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current year and try to fetch the most recent data
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1];
    
    let csvData = "";
    let fetchedYear = 0;

    for (const year of years) {
      const cvmUrl = `https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_${year}.csv`;
      console.log(`Trying to fetch CVM data from: ${cvmUrl}`);

      try {
        const response = await fetch(cvmUrl);
        if (response.ok) {
          csvData = await response.text();
          fetchedYear = year;
          console.log(`Successfully fetched CVM data for year ${year}`);
          break;
        }
      } catch (error) {
        console.log(`Failed to fetch data for year ${year}:`, error);
      }
    }

    if (!csvData) {
      throw new Error("Could not fetch CVM data for any year");
    }

    // Parse CSV
    const lines = csvData.split("\n");
    const headers = lines[0].split(";").map(h => h.trim().toLowerCase());
    
    console.log(`CSV headers: ${headers.join(", ")}`);
    console.log(`Total lines: ${lines.length}`);

    // Get column indexes
    const cnpjIdx = headers.indexOf("cnpj_fundo");
    const nomeIdx = headers.indexOf("denom_social");
    const dataIdx = headers.indexOf("dt_comptc");
    const plIdx = headers.indexOf("vl_patrim_liq");
    const quotaIdx = headers.indexOf("vl_quota");
    const cotistasIdx = headers.indexOf("nr_cotst");
    const tipoIdx = headers.indexOf("tp_fundo");
    const segmentoIdx = headers.indexOf("segmento");
    const adminIdx = headers.indexOf("nm_admin");
    const gestorIdx = headers.indexOf("nm_gestor");

    if (cnpjIdx === -1 || nomeIdx === -1 || dataIdx === -1) {
      console.log("Available headers:", headers);
      throw new Error("Required columns not found in CSV");
    }

    // Process most recent data for each fund
    const fundData: Map<string, CVMInformeMensal> = new Map();
    const processedFunds: string[] = [];
    let recordsProcessed = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(";");
      if (cols.length < 5) continue;

      const cnpj = cols[cnpjIdx]?.trim();
      const nome = cols[nomeIdx]?.trim();
      const data = cols[dataIdx]?.trim();

      if (!cnpj || !nome || !data) continue;

      const existingData = fundData.get(cnpj);
      const currentDate = new Date(data);

      // Keep only the most recent data for each fund
      if (!existingData || new Date(existingData.dt_comptc) < currentDate) {
        fundData.set(cnpj, {
          cnpj_fundo: cnpj,
          denom_social: nome,
          dt_comptc: data,
          vl_patrim_liq: parseFloat(cols[plIdx]?.replace(",", ".") || "0") || 0,
          vl_quota: parseFloat(cols[quotaIdx]?.replace(",", ".") || "0") || 0,
          nr_cotst: parseInt(cols[cotistasIdx] || "0") || 0,
          tp_fundo: cols[tipoIdx]?.trim() || "",
          segmento: segmentoIdx >= 0 ? cols[segmentoIdx]?.trim() : undefined,
          nm_admin: adminIdx >= 0 ? cols[adminIdx]?.trim() : undefined,
          nm_gestor: gestorIdx >= 0 ? cols[gestorIdx]?.trim() : undefined,
        });
        recordsProcessed++;
      }
    }

    console.log(`Processed ${recordsProcessed} records, unique funds: ${fundData.size}`);

    // Fetch existing registry to map CNPJ to ticker
    const { data: registry, error: registryError } = await supabase
      .from("fii_registry")
      .select("cnpj, ticker");

    if (registryError) {
      console.log("Registry not populated yet, will update metrics without ticker mapping");
    }

    const cnpjToTicker = new Map<string, string>();
    if (registry) {
      registry.forEach((r: { cnpj: string; ticker: string }) => {
        cnpjToTicker.set(r.cnpj, r.ticker);
      });
    }

    console.log(`Registry has ${cnpjToTicker.size} mappings`);

    // Insert/update metrics
    const metricsToUpsert: any[] = [];
    
    fundData.forEach((fund, cnpj) => {
      const ticker = cnpjToTicker.get(cnpj);
      
      // Only process funds that have a ticker mapping
      if (ticker) {
        metricsToUpsert.push({
          ticker,
          cnpj_fundo: fund.cnpj_fundo,
          nome_fundo: fund.denom_social,
          tipo_fii: fund.tp_fundo,
          segmento: fund.segmento,
          administrador: fund.nm_admin,
          gestor: fund.nm_gestor,
          patrimonio_liquido: fund.vl_patrim_liq,
          valor_patrimonial_cota: fund.vl_quota,
          num_cotistas: fund.nr_cotst,
          data_referencia: fund.dt_comptc,
        });
        processedFunds.push(ticker);
      }
    });

    console.log(`Funds with ticker mapping: ${metricsToUpsert.length}`);

    if (metricsToUpsert.length > 0) {
      // Batch upsert in chunks of 100
      const chunkSize = 100;
      let upsertedCount = 0;

      for (let i = 0; i < metricsToUpsert.length; i += chunkSize) {
        const chunk = metricsToUpsert.slice(i, i + chunkSize);
        
        const { error: upsertError } = await supabase
          .from("fii_metrics")
          .upsert(chunk, { 
            onConflict: "ticker,data_referencia",
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Error upserting chunk ${i}:`, upsertError);
        } else {
          upsertedCount += chunk.length;
        }
      }

      console.log(`Upserted ${upsertedCount} metrics records`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        year: fetchedYear,
        totalFundsInCVM: fundData.size,
        fundsWithTicker: metricsToUpsert.length,
        processedFunds: processedFunds.slice(0, 20), // Return first 20 for reference
        message: `Synced ${metricsToUpsert.length} FIIs from CVM data (year ${fetchedYear})`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing CVM data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
