import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AnnualFundamental {
  year: number;
  revenue?: number;
  gross_profit?: number;
  ebit?: number;
  ebitda?: number;
  net_income?: number;
  gross_margin?: number;
  ebit_margin?: number;
  ebitda_margin?: number;
  net_margin?: number;
  total_assets?: number;
  total_equity?: number;
  total_debt?: number;
  net_debt?: number;
  cash_and_equivalents?: number;
  dividends_paid?: number;
  payout_ratio?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  dividend_yield?: number;
  p_l?: number;
  p_vp?: number;
  ev_ebitda?: number;
  div_liquida_ebitda?: number;
  liq_corrente?: number;
  cagr_receitas_5a?: number;
  cagr_lucros_5a?: number;
  current_price?: number;
}

interface QuarterlyFundamental {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  revenue?: number;
  gross_profit?: number;
  ebit?: number;
  ebitda?: number;
  net_income?: number;
  gross_margin?: number;
  ebit_margin?: number;
  ebitda_margin?: number;
  net_margin?: number;
  total_assets?: number;
  total_equity?: number;
  total_debt?: number;
  net_debt?: number;
  cash_and_equivalents?: number;
  dividends_paid?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  p_l?: number;
  p_vp?: number;
  ev_ebitda?: number;
}

interface FundamentalDataPayload {
  ticker: string;
  asset_class: string;
  fiscal_year?: number;
  annual_history?: AnnualFundamental[];
  quarterly_history?: QuarterlyFundamental[];  // NEW: Support for quarterly data
  data_source?: string;
  
  // Financial institution support
  is_financial?: boolean;
  financial_type?: "bank" | "insurer" | "financial" | "other";
  
  current_price?: number;
  day_change_percent?: number;
  market_cap?: number;
  dividend_yield?: number;
  p_l?: number;
  p_vp?: number;
  ev_ebitda?: number;
  p_ebit?: number;
  p_ebitda?: number;
  p_ativo?: number;
  p_cap_giro?: number;
  p_ativo_circ_liq?: number;
  payout_ratio?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  m_bruta?: number;
  m_ebitda?: number;
  m_ebit?: number;
  m_liquida?: number;
  div_liquida_ebitda?: number;
  div_liquida_ebit?: number;
  div_liquida_pl?: number;
  passivo_ativo?: number;
  liq_corrente?: number;
  pl_ativo?: number;
  cagr_receitas_5?: number;
  cagr_lucros_5?: number;
  giro_ativos?: number;
  vpa?: number;
  liquidez_media_diaria?: number;
  patrimonio_liquido?: number;
  
  // English field names
  revenue?: number;
  gross_profit?: number;
  ebit?: number;
  ebitda?: number;
  net_income?: number;
  gross_margin?: number;
  ebit_margin?: number;
  net_margin?: number;
  total_assets?: number;
  total_equity?: number;
  total_debt?: number;
  net_debt?: number;
  cash_and_equivalents?: number;
  dividends_paid?: number;
  cagr_receitas_5a?: number;
  cagr_lucros_5a?: number;
  
  // Portuguese aliases (robot sends these)
  receita_liquida?: number;
  lucro_liquido?: number;
  lucro_bruto?: number;
  caixa?: number;
  emprestimos_cp?: number;
  emprestimos_lp?: number;
  divida_liquida?: number;
  ativo_total?: number;
}

interface RequestBody {
  data: FundamentalDataPayload | FundamentalDataPayload[];
}

interface FormatFlags {
  percent_out_of_range?: string[];
  null_critical_fields?: string[];
  ebitda_applicable?: boolean;
}

function normalizeTicker(ticker: string): string {
  return String(ticker || "").trim().toUpperCase();
}

function normalizeAssetClass(assetClass: string): string {
  return String(assetClass || "").trim().toLowerCase();
}

function coalescePatch<T>(incoming: T | null | undefined, existing: T | null | undefined): T | null | undefined {
  if (incoming === undefined || incoming === null) return existing;
  return incoming;
}

/**
 * Validates percent fields and returns flags for soft validation
 * Does NOT block ingestion, only registers warnings
 */
function validateAndFlag(record: any): FormatFlags {
  const flags: FormatFlags = {};
  
  // List of fields that are expected to be in decimal format (0-1)
  const percentFields = [
    'roe', 'roa', 'roic', 
    'gross_margin', 'ebitda_margin', 'ebit_margin', 'net_margin',
    'm_bruta', 'm_ebitda', 'm_ebit', 'm_liquida',
    'dividend_yield', 'payout_ratio',
    'cagr_receitas_5', 'cagr_lucros_5', 'cagr_receitas_5a', 'cagr_lucros_5a',
    'day_change_percent'
  ];
  
  // Check for values out of normal decimal range (|value| > 1)
  const outOfRange = percentFields.filter(field => {
    const value = record[field];
    return value !== null && value !== undefined && Math.abs(value) > 1;
  });
  
  if (outOfRange.length > 0) {
    flags.percent_out_of_range = outOfRange;
    console.warn(`[VALIDATION] ${record.ticker}: percent fields out of decimal range:`, outOfRange);
  }
  
  // Check for critical null fields
  const criticalFields = ['total_assets', 'total_equity', 'revenue', 'net_income'];
  const nullCritical = criticalFields.filter(field => 
    record[field] === null || record[field] === undefined
  );
  
  if (nullCritical.length > 0) {
    flags.null_critical_fields = nullCritical;
  }
  
  return flags;
}

/**
 * Process financial institution rules
 * Forces EBITDA fields to null for banks/insurers
 */
function processFinancialRules(record: any, isFinancial: boolean): any {
  if (!isFinancial) {
    return { ...record, format_flags: { ...(record.format_flags || {}), ebitda_applicable: true } };
  }
  
  console.log(`[FINANCIAL] ${record.ticker}: Forcing EBITDA fields to null`);
  
  // Force all EBITDA-related fields to null
  return {
    ...record,
    ebitda: null,
    ebitda_margin: null,
    m_ebitda: null,
    ev_ebitda: null,
    div_liquida_ebitda: null,
    p_ebitda: null,
    format_flags: {
      ...(record.format_flags || {}),
      ebitda_applicable: false,
    },
  };
}

function mapRobotFieldsToAnnual(record: FundamentalDataPayload): any {
  const isFinancial = record.is_financial || false;
  
  // === PORTUGUESE ALIASES → ENGLISH ===
  // Calculate total_debt from emprestimos_cp + emprestimos_lp if available
  const emprestimosCP = record.emprestimos_cp ?? 0;
  const emprestimosLP = record.emprestimos_lp ?? 0;
  const hasLoansData = record.emprestimos_cp !== undefined || record.emprestimos_lp !== undefined;
  const calculatedTotalDebt = hasLoansData ? emprestimosCP + emprestimosLP : undefined;
  
  // Cash: prefer English, fallback to Portuguese
  const caixa = record.cash_and_equivalents ?? record.caixa;
  
  // Net debt: prefer English, calculate from loans - cash if available
  const calculatedNetDebt = (calculatedTotalDebt !== undefined && caixa !== undefined)
    ? calculatedTotalDebt - caixa
    : record.divida_liquida;
  
  let mapped: any = {
    ticker: normalizeTicker(record.ticker),
    asset_class: normalizeAssetClass(record.asset_class),
    year: record.fiscal_year,
    data_source: record.data_source || "cvm_dfp_bot",
    is_financial: isFinancial,
    financial_type: record.financial_type || null,
    
    // Absolute values with PT-BR aliases
    revenue: record.revenue ?? record.receita_liquida,
    gross_profit: record.gross_profit ?? record.lucro_bruto,
    ebit: record.ebit,
    ebitda: record.ebitda,
    net_income: record.net_income ?? record.lucro_liquido,
    
    // Percentages stored as decimal (0.xx) - NO conversion
    gross_margin: record.gross_margin ?? record.m_bruta,
    ebit_margin: record.ebit_margin ?? record.m_ebit,
    ebitda_margin: record.m_ebitda,
    net_margin: record.net_margin ?? record.m_liquida,
    
    // Balance sheet with PT-BR aliases
    total_assets: record.total_assets ?? record.ativo_total,
    total_equity: record.total_equity ?? record.patrimonio_liquido,
    total_debt: record.total_debt ?? calculatedTotalDebt,
    net_debt: record.net_debt ?? calculatedNetDebt,
    cash_and_equivalents: caixa,
    
    // Other fields
    dividends_paid: record.dividends_paid,
    payout_ratio: record.payout_ratio,
    roe: record.roe,
    roa: record.roa,
    roic: record.roic,
    dividend_yield: record.dividend_yield,
    p_l: record.p_l,
    p_vp: record.p_vp,
    ev_ebitda: record.ev_ebitda,
    div_liquida_ebitda: record.div_liquida_ebitda,
    liq_corrente: record.liq_corrente,
    cagr_receitas_5a: record.cagr_receitas_5a ?? record.cagr_receitas_5,
    cagr_lucros_5a: record.cagr_lucros_5a ?? record.cagr_lucros_5,
    current_price: record.current_price,
    updated_at: new Date().toISOString(),
  };
  
  // Add validation flags
  const flags = validateAndFlag(mapped);
  mapped.format_flags = flags;
  
  // Apply financial rules (force EBITDA null)
  mapped = processFinancialRules(mapped, isFinancial);
  
  return mapped;
}

function mapRobotFieldsToFundamental(record: FundamentalDataPayload): any {
  const isFinancial = record.is_financial || false;
  
  let mapped: any = {
    ticker: normalizeTicker(record.ticker),
    asset_class: normalizeAssetClass(record.asset_class),
    data_source: record.data_source || "cvm_dfp_bot",
    is_financial: isFinancial,
    financial_type: record.financial_type || null,
    current_price: record.current_price,
    // Percentages stored as decimal (0.xx) - NO conversion
    day_change_percent: record.day_change_percent,
    market_cap: record.market_cap,
    dividend_yield: record.dividend_yield,
    p_l: record.p_l,
    p_vp: record.p_vp,
    ev_ebitda: record.ev_ebitda,
    p_ebit: record.p_ebit,
    p_ebitda: record.p_ebitda,
    p_ativo: record.p_ativo,
    p_cap_giro: record.p_cap_giro,
    p_ativo_circ_liq: record.p_ativo_circ_liq,
    payout_ratio: record.payout_ratio,
    roe: record.roe,
    roa: record.roa,
    roic: record.roic,
    m_bruta: record.m_bruta ?? record.gross_margin,
    m_ebitda: record.m_ebitda,
    m_ebit: record.m_ebit ?? record.ebit_margin,
    m_liquida: record.m_liquida ?? record.net_margin,
    div_liquida_ebitda: record.div_liquida_ebitda,
    div_liquida_ebit: record.div_liquida_ebit,
    div_liquida_pl: record.div_liquida_pl,
    passivo_ativo: record.passivo_ativo,
    liq_corrente: record.liq_corrente,
    pl_ativo: record.pl_ativo,
    cagr_receitas_5: record.cagr_receitas_5 ?? record.cagr_receitas_5a,
    cagr_lucros_5: record.cagr_lucros_5 ?? record.cagr_lucros_5a,
    giro_ativos: record.giro_ativos,
    vpa: record.vpa,
    liquidez_media_diaria: record.liquidez_media_diaria,
    patrimonio_liquido: record.patrimonio_liquido,
    updated_at: new Date().toISOString(),
  };
  
  // Add validation flags
  const flags = validateAndFlag(mapped);
  mapped.format_flags = flags;
  
  // Apply financial rules (force EBITDA null)
  mapped = processFinancialRules(mapped, isFinancial);
  
  return mapped;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("INGEST_API_KEY");

    if (!expectedApiKey) {
      console.error("INGEST_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      console.warn("Invalid or missing API key");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    
    if (!body.data) {
      return new Response(
        JSON.stringify({ error: "Missing 'data' field in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize to array
    const records = Array.isArray(body.data) ? body.data : [body.data];

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: "Empty data array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received ${records.length} records for processing`);
    
    // Log financial institutions for visibility
    const financialRecords = records.filter(r => r.is_financial);
    if (financialRecords.length > 0) {
      console.log(`[FINANCIAL] Processing ${financialRecords.length} financial institutions:`, 
        financialRecords.map(r => `${r.ticker}(${r.financial_type})`).join(', '));
    }

    // Validate required fields
    for (const record of records) {
      if (!record.ticker || !record.asset_class) {
        return new Response(
          JSON.stringify({ 
            error: "Each record must have 'ticker' and 'asset_class' fields",
            invalid_record: record 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Separate records by type (annual vs current)
    const annualRecords = records.filter(r => r.fiscal_year !== undefined);
    const currentRecords = records.filter(r => r.fiscal_year === undefined);

    console.log(`Processing: ${annualRecords.length} annual records, ${currentRecords.length} current records`);

    let fundamentalProcessed = 0;
    let annualProcessed = 0;
    const processedTickers: string[] = [];
    const validationWarnings: { ticker: string; flags: FormatFlags }[] = [];

    // ==========================================
    // PROCESS ANNUAL RECORDS (with fiscal_year) - OPTIMIZED BATCH
    // ==========================================
    if (annualRecords.length > 0) {
      // 1. Extract all unique tickers for batch query
      const allAnnualTickers = [...new Set(annualRecords.map(r => normalizeTicker(r.ticker)))];
      console.log(`Batch fetching existing data for ${allAnnualTickers.length} unique tickers`);

      // 2. Single batch query to fetch ALL existing annual_fundamentals
      const { data: existingAnnualData, error: fetchAnnualError } = await supabase
        .from("annual_fundamentals")
        .select("*")
        .in("ticker", allAnnualTickers);

      if (fetchAnnualError) {
        console.error("Error fetching existing annual data:", fetchAnnualError);
      }

      // 3. Index existing data by ticker|asset_class|year for O(1) lookup
      const existingAnnualByKey = new Map<string, any>();
      for (const ex of existingAnnualData || []) {
        const key = `${ex.ticker}|${ex.asset_class}|${ex.year}`;
        existingAnnualByKey.set(key, ex);
      }
      console.log(`Indexed ${existingAnnualByKey.size} existing annual records`);

      // 4. Prepare annual_fundamentals upserts with merge logic
      const annualUpsertsRaw = annualRecords.map(mapRobotFieldsToAnnual);

      // Deduplicate by ticker|asset_class|year
      const dedupeAnnualMap = new Map<string, any>();
      for (const row of annualUpsertsRaw) {
        dedupeAnnualMap.set(`${row.ticker}|${row.asset_class}|${row.year}`, row);
      }
      const annualUpserts = Array.from(dedupeAnnualMap.values());
      const annualDeduped = annualUpsertsRaw.length - annualUpserts.length;
      if (annualDeduped > 0) {
        console.log(`Deduped ${annualDeduped} duplicate annual records`);
      }

      // Collect validation warnings
      for (const row of annualUpserts) {
        if (row.format_flags?.percent_out_of_range?.length > 0) {
          validationWarnings.push({ ticker: row.ticker, flags: row.format_flags });
        }
      }

      // 5. Merge with existing data (patch logic) - all in memory
      const mergedAnnualUpserts = annualUpserts.map(incoming => {
        const key = `${incoming.ticker}|${incoming.asset_class}|${incoming.year}`;
        const existing = existingAnnualByKey.get(key);
        
        return {
          ticker: incoming.ticker,
          asset_class: incoming.asset_class,
          year: incoming.year,
          data_source: incoming.data_source,
          is_financial: incoming.is_financial,
          financial_type: incoming.financial_type,
          format_flags: incoming.format_flags,
          revenue: coalescePatch(incoming.revenue, existing?.revenue),
          gross_profit: coalescePatch(incoming.gross_profit, existing?.gross_profit),
          ebit: coalescePatch(incoming.ebit, existing?.ebit),
          ebitda: coalescePatch(incoming.ebitda, existing?.ebitda),
          net_income: coalescePatch(incoming.net_income, existing?.net_income),
          gross_margin: coalescePatch(incoming.gross_margin, existing?.gross_margin),
          ebit_margin: coalescePatch(incoming.ebit_margin, existing?.ebit_margin),
          ebitda_margin: coalescePatch(incoming.ebitda_margin, existing?.ebitda_margin),
          net_margin: coalescePatch(incoming.net_margin, existing?.net_margin),
          total_assets: coalescePatch(incoming.total_assets, existing?.total_assets),
          total_equity: coalescePatch(incoming.total_equity, existing?.total_equity),
          total_debt: coalescePatch(incoming.total_debt, existing?.total_debt),
          net_debt: coalescePatch(incoming.net_debt, existing?.net_debt),
          cash_and_equivalents: coalescePatch(incoming.cash_and_equivalents, existing?.cash_and_equivalents),
          dividends_paid: coalescePatch(incoming.dividends_paid, existing?.dividends_paid),
          payout_ratio: coalescePatch(incoming.payout_ratio, existing?.payout_ratio),
          roe: coalescePatch(incoming.roe, existing?.roe),
          roa: coalescePatch(incoming.roa, existing?.roa),
          roic: coalescePatch(incoming.roic, existing?.roic),
          dividend_yield: coalescePatch(incoming.dividend_yield, existing?.dividend_yield),
          p_l: coalescePatch(incoming.p_l, existing?.p_l),
          p_vp: coalescePatch(incoming.p_vp, existing?.p_vp),
          ev_ebitda: coalescePatch(incoming.ev_ebitda, existing?.ev_ebitda),
          div_liquida_ebitda: coalescePatch(incoming.div_liquida_ebitda, existing?.div_liquida_ebitda),
          liq_corrente: coalescePatch(incoming.liq_corrente, existing?.liq_corrente),
          cagr_receitas_5a: coalescePatch(incoming.cagr_receitas_5a, existing?.cagr_receitas_5a),
          cagr_lucros_5a: coalescePatch(incoming.cagr_lucros_5a, existing?.cagr_lucros_5a),
          current_price: coalescePatch(incoming.current_price, existing?.current_price),
          updated_at: new Date().toISOString(),
        };
      });

      // 6. Batch upsert annual_fundamentals
      if (mergedAnnualUpserts.length > 0) {
        const { error: annualError } = await supabase
          .from("annual_fundamentals")
          .upsert(mergedAnnualUpserts, {
            onConflict: "ticker,asset_class,year",
            ignoreDuplicates: false,
          });

        if (annualError) {
          console.error("Annual fundamentals upsert error:", annualError);
        } else {
          annualProcessed = mergedAnnualUpserts.length;
          console.log(`Successfully upserted ${annualProcessed} annual records`);
        }
      }

      // 7. Update fundamental_data with latest year's data per ticker
      const latestByTicker = new Map<string, FundamentalDataPayload>();
      for (const record of annualRecords) {
        const key = `${normalizeTicker(record.ticker)}|${normalizeAssetClass(record.asset_class)}`;
        const existing = latestByTicker.get(key);
        if (!existing || (record.fiscal_year! > (existing.fiscal_year || 0))) {
          latestByTicker.set(key, record);
        }
      }

      const fundamentalFromAnnual = Array.from(latestByTicker.values()).map(mapRobotFieldsToFundamental);

      if (fundamentalFromAnnual.length > 0) {
        // Batch fetch existing fundamental_data
        const tickersToUpdate = [...new Set(fundamentalFromAnnual.map(r => r.ticker))];
        const { data: existingFundamental } = await supabase
          .from("fundamental_data")
          .select("*")
          .in("ticker", tickersToUpdate);

        const existingFundamentalByKey = new Map<string, any>();
        for (const ex of existingFundamental || []) {
          existingFundamentalByKey.set(`${ex.ticker}|${ex.asset_class}`, ex);
        }

        const mergedFundamental = fundamentalFromAnnual.map(incoming => {
          const key = `${incoming.ticker}|${incoming.asset_class}`;
          const existing = existingFundamentalByKey.get(key);
          return {
            ticker: incoming.ticker,
            asset_class: incoming.asset_class,
            data_source: incoming.data_source,
            is_financial: incoming.is_financial,
            financial_type: incoming.financial_type,
            format_flags: incoming.format_flags,
            current_price: coalescePatch(incoming.current_price, existing?.current_price),
            day_change_percent: coalescePatch(incoming.day_change_percent, existing?.day_change_percent),
            market_cap: coalescePatch(incoming.market_cap, existing?.market_cap),
            dividend_yield: coalescePatch(incoming.dividend_yield, existing?.dividend_yield),
            p_l: coalescePatch(incoming.p_l, existing?.p_l),
            p_vp: coalescePatch(incoming.p_vp, existing?.p_vp),
            ev_ebitda: coalescePatch(incoming.ev_ebitda, existing?.ev_ebitda),
            p_ebit: coalescePatch(incoming.p_ebit, existing?.p_ebit),
            p_ebitda: coalescePatch(incoming.p_ebitda, existing?.p_ebitda),
            p_ativo: coalescePatch(incoming.p_ativo, existing?.p_ativo),
            p_cap_giro: coalescePatch(incoming.p_cap_giro, existing?.p_cap_giro),
            p_ativo_circ_liq: coalescePatch(incoming.p_ativo_circ_liq, existing?.p_ativo_circ_liq),
            payout_ratio: coalescePatch(incoming.payout_ratio, existing?.payout_ratio),
            roe: coalescePatch(incoming.roe, existing?.roe),
            roa: coalescePatch(incoming.roa, existing?.roa),
            roic: coalescePatch(incoming.roic, existing?.roic),
            m_bruta: coalescePatch(incoming.m_bruta, existing?.m_bruta),
            m_ebitda: coalescePatch(incoming.m_ebitda, existing?.m_ebitda),
            m_ebit: coalescePatch(incoming.m_ebit, existing?.m_ebit),
            m_liquida: coalescePatch(incoming.m_liquida, existing?.m_liquida),
            div_liquida_ebitda: coalescePatch(incoming.div_liquida_ebitda, existing?.div_liquida_ebitda),
            div_liquida_ebit: coalescePatch(incoming.div_liquida_ebit, existing?.div_liquida_ebit),
            div_liquida_pl: coalescePatch(incoming.div_liquida_pl, existing?.div_liquida_pl),
            passivo_ativo: coalescePatch(incoming.passivo_ativo, existing?.passivo_ativo),
            liq_corrente: coalescePatch(incoming.liq_corrente, existing?.liq_corrente),
            pl_ativo: coalescePatch(incoming.pl_ativo, existing?.pl_ativo),
            cagr_receitas_5: coalescePatch(incoming.cagr_receitas_5, existing?.cagr_receitas_5),
            cagr_lucros_5: coalescePatch(incoming.cagr_lucros_5, existing?.cagr_lucros_5),
            giro_ativos: coalescePatch(incoming.giro_ativos, existing?.giro_ativos),
            vpa: coalescePatch(incoming.vpa, existing?.vpa),
            liquidez_media_diaria: coalescePatch(incoming.liquidez_media_diaria, existing?.liquidez_media_diaria),
            patrimonio_liquido: coalescePatch(incoming.patrimonio_liquido, existing?.patrimonio_liquido),
            updated_at: new Date().toISOString(),
          };
        });

        const { data: fundamentalResult, error: fundamentalError } = await supabase
          .from("fundamental_data")
          .upsert(mergedFundamental, {
            onConflict: "ticker,asset_class",
            ignoreDuplicates: false,
          })
          .select("ticker");

        if (fundamentalError) {
          console.error("Fundamental data upsert error (from annual):", fundamentalError);
        } else {
          fundamentalProcessed = fundamentalResult?.length || 0;
          processedTickers.push(...(fundamentalResult?.map(r => r.ticker) || []));
          console.log(`Updated fundamental_data for ${fundamentalProcessed} tickers from annual records`);
        }
      }
    }

    // ==========================================
    // PROCESS CURRENT RECORDS (without fiscal_year) - OPTIMIZED BATCH
    // ==========================================
    if (currentRecords.length > 0) {
      // 1. Extract all unique tickers for batch query
      const allCurrentTickers = [...new Set(currentRecords.map(r => normalizeTicker(r.ticker)))];
      
      // 2. Batch fetch existing fundamental_data
      const { data: existingCurrentFundamental } = await supabase
        .from("fundamental_data")
        .select("*")
        .in("ticker", allCurrentTickers);

      const existingCurrentByKey = new Map<string, any>();
      for (const ex of existingCurrentFundamental || []) {
        existingCurrentByKey.set(`${ex.ticker}|${ex.asset_class}`, ex);
      }

      // 3. Prepare upserts with merge
      const upsertDataRaw = currentRecords.map(mapRobotFieldsToFundamental);

      const dedupeFundamentalMap = new Map<string, any>();
      for (const row of upsertDataRaw) {
        dedupeFundamentalMap.set(`${row.ticker}|${row.asset_class}`, row);
      }
      const upsertData = Array.from(dedupeFundamentalMap.values());

      // Collect validation warnings
      for (const row of upsertData) {
        if (row.format_flags?.percent_out_of_range?.length > 0) {
          validationWarnings.push({ ticker: row.ticker, flags: row.format_flags });
        }
      }

      const mergedCurrentFundamental = upsertData.map(incoming => {
        const key = `${incoming.ticker}|${incoming.asset_class}`;
        const existing = existingCurrentByKey.get(key);
        return {
          ...incoming,
          current_price: coalescePatch(incoming.current_price, existing?.current_price),
          day_change_percent: coalescePatch(incoming.day_change_percent, existing?.day_change_percent),
          market_cap: coalescePatch(incoming.market_cap, existing?.market_cap),
          dividend_yield: coalescePatch(incoming.dividend_yield, existing?.dividend_yield),
          p_l: coalescePatch(incoming.p_l, existing?.p_l),
          p_vp: coalescePatch(incoming.p_vp, existing?.p_vp),
          ev_ebitda: coalescePatch(incoming.ev_ebitda, existing?.ev_ebitda),
          p_ebit: coalescePatch(incoming.p_ebit, existing?.p_ebit),
          p_ebitda: coalescePatch(incoming.p_ebitda, existing?.p_ebitda),
          p_ativo: coalescePatch(incoming.p_ativo, existing?.p_ativo),
          p_cap_giro: coalescePatch(incoming.p_cap_giro, existing?.p_cap_giro),
          p_ativo_circ_liq: coalescePatch(incoming.p_ativo_circ_liq, existing?.p_ativo_circ_liq),
          payout_ratio: coalescePatch(incoming.payout_ratio, existing?.payout_ratio),
          roe: coalescePatch(incoming.roe, existing?.roe),
          roa: coalescePatch(incoming.roa, existing?.roa),
          roic: coalescePatch(incoming.roic, existing?.roic),
          m_bruta: coalescePatch(incoming.m_bruta, existing?.m_bruta),
          m_ebitda: coalescePatch(incoming.m_ebitda, existing?.m_ebitda),
          m_ebit: coalescePatch(incoming.m_ebit, existing?.m_ebit),
          m_liquida: coalescePatch(incoming.m_liquida, existing?.m_liquida),
          div_liquida_ebitda: coalescePatch(incoming.div_liquida_ebitda, existing?.div_liquida_ebitda),
          div_liquida_ebit: coalescePatch(incoming.div_liquida_ebit, existing?.div_liquida_ebit),
          div_liquida_pl: coalescePatch(incoming.div_liquida_pl, existing?.div_liquida_pl),
          passivo_ativo: coalescePatch(incoming.passivo_ativo, existing?.passivo_ativo),
          liq_corrente: coalescePatch(incoming.liq_corrente, existing?.liq_corrente),
          pl_ativo: coalescePatch(incoming.pl_ativo, existing?.pl_ativo),
          cagr_receitas_5: coalescePatch(incoming.cagr_receitas_5, existing?.cagr_receitas_5),
          cagr_lucros_5: coalescePatch(incoming.cagr_lucros_5, existing?.cagr_lucros_5),
          giro_ativos: coalescePatch(incoming.giro_ativos, existing?.giro_ativos),
          vpa: coalescePatch(incoming.vpa, existing?.vpa),
          liquidez_media_diaria: coalescePatch(incoming.liquidez_media_diaria, existing?.liquidez_media_diaria),
          patrimonio_liquido: coalescePatch(incoming.patrimonio_liquido, existing?.patrimonio_liquido),
        };
      });

      console.log(`Current records: received=${upsertDataRaw.length}, unique=${upsertData.length}`);

      const { data, error } = await supabase
        .from("fundamental_data")
        .upsert(mergedCurrentFundamental, { 
          onConflict: "ticker,asset_class",
          ignoreDuplicates: false 
        })
        .select("ticker");

      if (error) {
        console.error("Database upsert error:", error);
        return new Response(
          JSON.stringify({ error: "Database error", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      fundamentalProcessed += data?.length || 0;
      processedTickers.push(...(data?.map(r => r.ticker) || []));

      // Process annual_history if present (legacy format) - OPTIMIZED
      const annualUpsertsRaw: any[] = [];
      for (const record of currentRecords) {
        if (record.annual_history && Array.isArray(record.annual_history)) {
          const isFinancial = record.is_financial || false;
          
          for (const annualData of record.annual_history) {
            if (!annualData.year) continue;
            
            let annualRow: any = {
              ticker: normalizeTicker(record.ticker),
              asset_class: normalizeAssetClass(record.asset_class),
              data_source: record.data_source || "cvm_dfp_bot",
              is_financial: isFinancial,
              financial_type: record.financial_type || null,
              year: annualData.year,
              revenue: annualData.revenue,
              gross_profit: annualData.gross_profit,
              ebit: annualData.ebit,
              ebitda: annualData.ebitda,
              net_income: annualData.net_income,
              gross_margin: annualData.gross_margin,
              ebit_margin: annualData.ebit_margin,
              ebitda_margin: annualData.ebitda_margin,
              net_margin: annualData.net_margin,
              total_assets: annualData.total_assets,
              total_equity: annualData.total_equity,
              total_debt: annualData.total_debt,
              net_debt: annualData.net_debt,
              cash_and_equivalents: annualData.cash_and_equivalents,
              dividends_paid: annualData.dividends_paid,
              payout_ratio: annualData.payout_ratio,
              roe: annualData.roe,
              roa: annualData.roa,
              roic: annualData.roic,
              dividend_yield: annualData.dividend_yield,
              p_l: annualData.p_l,
              p_vp: annualData.p_vp,
              ev_ebitda: annualData.ev_ebitda,
              div_liquida_ebitda: annualData.div_liquida_ebitda,
              liq_corrente: annualData.liq_corrente,
              cagr_receitas_5a: annualData.cagr_receitas_5a,
              cagr_lucros_5a: annualData.cagr_lucros_5a,
              current_price: annualData.current_price,
              updated_at: new Date().toISOString(),
            };
            
            // Apply financial rules
            annualRow = processFinancialRules(annualRow, isFinancial);
            annualUpsertsRaw.push(annualRow);
          }
        }
      }

      if (annualUpsertsRaw.length > 0) {
        // Batch fetch existing for legacy annual_history
        const legacyTickers = [...new Set(annualUpsertsRaw.map(r => r.ticker))];
        const { data: existingLegacyAnnual } = await supabase
          .from("annual_fundamentals")
          .select("*")
          .in("ticker", legacyTickers);

        const existingLegacyByKey = new Map<string, any>();
        for (const ex of existingLegacyAnnual || []) {
          existingLegacyByKey.set(`${ex.ticker}|${ex.asset_class}|${ex.year}`, ex);
        }

        const dedupeAnnualMap = new Map<string, any>();
        for (const row of annualUpsertsRaw) {
          dedupeAnnualMap.set(`${row.ticker}|${row.asset_class}|${row.year}`, row);
        }
        const annualUpserts = Array.from(dedupeAnnualMap.values());

        // Merge with existing
        const mergedLegacyAnnual = annualUpserts.map(incoming => {
          const key = `${incoming.ticker}|${incoming.asset_class}|${incoming.year}`;
          const existing = existingLegacyByKey.get(key);
          return {
            ...incoming,
            revenue: coalescePatch(incoming.revenue, existing?.revenue),
            gross_profit: coalescePatch(incoming.gross_profit, existing?.gross_profit),
            ebit: coalescePatch(incoming.ebit, existing?.ebit),
            ebitda: coalescePatch(incoming.ebitda, existing?.ebitda),
            net_income: coalescePatch(incoming.net_income, existing?.net_income),
            gross_margin: coalescePatch(incoming.gross_margin, existing?.gross_margin),
            ebit_margin: coalescePatch(incoming.ebit_margin, existing?.ebit_margin),
            ebitda_margin: coalescePatch(incoming.ebitda_margin, existing?.ebitda_margin),
            net_margin: coalescePatch(incoming.net_margin, existing?.net_margin),
            total_assets: coalescePatch(incoming.total_assets, existing?.total_assets),
            total_equity: coalescePatch(incoming.total_equity, existing?.total_equity),
            total_debt: coalescePatch(incoming.total_debt, existing?.total_debt),
            net_debt: coalescePatch(incoming.net_debt, existing?.net_debt),
            cash_and_equivalents: coalescePatch(incoming.cash_and_equivalents, existing?.cash_and_equivalents),
            dividends_paid: coalescePatch(incoming.dividends_paid, existing?.dividends_paid),
            payout_ratio: coalescePatch(incoming.payout_ratio, existing?.payout_ratio),
            roe: coalescePatch(incoming.roe, existing?.roe),
            roa: coalescePatch(incoming.roa, existing?.roa),
            roic: coalescePatch(incoming.roic, existing?.roic),
            dividend_yield: coalescePatch(incoming.dividend_yield, existing?.dividend_yield),
            p_l: coalescePatch(incoming.p_l, existing?.p_l),
            p_vp: coalescePatch(incoming.p_vp, existing?.p_vp),
            ev_ebitda: coalescePatch(incoming.ev_ebitda, existing?.ev_ebitda),
            div_liquida_ebitda: coalescePatch(incoming.div_liquida_ebitda, existing?.div_liquida_ebitda),
            liq_corrente: coalescePatch(incoming.liq_corrente, existing?.liq_corrente),
            cagr_receitas_5a: coalescePatch(incoming.cagr_receitas_5a, existing?.cagr_receitas_5a),
            cagr_lucros_5a: coalescePatch(incoming.cagr_lucros_5a, existing?.cagr_lucros_5a),
            current_price: coalescePatch(incoming.current_price, existing?.current_price),
          };
        });

        const { error: annualError } = await supabase
          .from("annual_fundamentals")
          .upsert(mergedLegacyAnnual, {
            onConflict: "ticker,asset_class,year",
            ignoreDuplicates: false,
          });

        if (annualError) {
          console.error("Annual fundamentals upsert error (legacy):", annualError);
        } else {
          annualProcessed += mergedLegacyAnnual.length;
        }
      }
    }

    // ==========================================
    // PROCESS QUARTERLY HISTORY (if present)
    // ==========================================
    let quarterlyProcessed = 0;
    const quarterlyUpsertsRaw: any[] = [];
    
    for (const record of records) {
      if (record.quarterly_history && Array.isArray(record.quarterly_history)) {
        const isFinancial = record.is_financial || false;
        
        for (const quarterlyData of record.quarterly_history) {
          if (!quarterlyData.year || !quarterlyData.quarter) continue;
          
          let quarterlyRow: any = {
            ticker: normalizeTicker(record.ticker),
            asset_class: normalizeAssetClass(record.asset_class),
            data_source: record.data_source || "cvm_itr_bot",
            is_financial: isFinancial,
            year: quarterlyData.year,
            quarter: quarterlyData.quarter,
            revenue: quarterlyData.revenue,
            gross_profit: quarterlyData.gross_profit,
            ebit: quarterlyData.ebit,
            ebitda: quarterlyData.ebitda,
            net_income: quarterlyData.net_income,
            gross_margin: quarterlyData.gross_margin,
            ebit_margin: quarterlyData.ebit_margin,
            ebitda_margin: quarterlyData.ebitda_margin,
            net_margin: quarterlyData.net_margin,
            total_assets: quarterlyData.total_assets,
            total_equity: quarterlyData.total_equity,
            total_debt: quarterlyData.total_debt,
            net_debt: quarterlyData.net_debt,
            cash_and_equivalents: quarterlyData.cash_and_equivalents,
            dividends_paid: quarterlyData.dividends_paid,
            roe: quarterlyData.roe,
            roa: quarterlyData.roa,
            roic: quarterlyData.roic,
            p_l: quarterlyData.p_l,
            p_vp: quarterlyData.p_vp,
            ev_ebitda: quarterlyData.ev_ebitda,
            updated_at: new Date().toISOString(),
          };
          
          // Apply financial rules (force EBITDA null for banks/insurers)
          quarterlyRow = processFinancialRules(quarterlyRow, isFinancial);
          quarterlyUpsertsRaw.push(quarterlyRow);
        }
      }
    }

    if (quarterlyUpsertsRaw.length > 0) {
      console.log(`Processing ${quarterlyUpsertsRaw.length} quarterly records`);
      
      // Batch fetch existing quarterly data
      const quarterlyTickers = [...new Set(quarterlyUpsertsRaw.map(r => r.ticker))];
      const { data: existingQuarterly } = await supabase
        .from("quarterly_fundamentals")
        .select("*")
        .in("ticker", quarterlyTickers);

      const existingQuarterlyByKey = new Map<string, any>();
      for (const ex of existingQuarterly || []) {
        existingQuarterlyByKey.set(`${ex.ticker}|${ex.asset_class}|${ex.year}|${ex.quarter}`, ex);
      }

      // Deduplicate by ticker|asset_class|year|quarter
      const dedupeQuarterlyMap = new Map<string, any>();
      for (const row of quarterlyUpsertsRaw) {
        dedupeQuarterlyMap.set(`${row.ticker}|${row.asset_class}|${row.year}|${row.quarter}`, row);
      }
      const quarterlyUpserts = Array.from(dedupeQuarterlyMap.values());

      // Merge with existing data
      const mergedQuarterly = quarterlyUpserts.map(incoming => {
        const key = `${incoming.ticker}|${incoming.asset_class}|${incoming.year}|${incoming.quarter}`;
        const existing = existingQuarterlyByKey.get(key);
        return {
          ...incoming,
          revenue: coalescePatch(incoming.revenue, existing?.revenue),
          gross_profit: coalescePatch(incoming.gross_profit, existing?.gross_profit),
          ebit: coalescePatch(incoming.ebit, existing?.ebit),
          ebitda: coalescePatch(incoming.ebitda, existing?.ebitda),
          net_income: coalescePatch(incoming.net_income, existing?.net_income),
          gross_margin: coalescePatch(incoming.gross_margin, existing?.gross_margin),
          ebit_margin: coalescePatch(incoming.ebit_margin, existing?.ebit_margin),
          ebitda_margin: coalescePatch(incoming.ebitda_margin, existing?.ebitda_margin),
          net_margin: coalescePatch(incoming.net_margin, existing?.net_margin),
          total_assets: coalescePatch(incoming.total_assets, existing?.total_assets),
          total_equity: coalescePatch(incoming.total_equity, existing?.total_equity),
          total_debt: coalescePatch(incoming.total_debt, existing?.total_debt),
          net_debt: coalescePatch(incoming.net_debt, existing?.net_debt),
          cash_and_equivalents: coalescePatch(incoming.cash_and_equivalents, existing?.cash_and_equivalents),
          dividends_paid: coalescePatch(incoming.dividends_paid, existing?.dividends_paid),
          roe: coalescePatch(incoming.roe, existing?.roe),
          roa: coalescePatch(incoming.roa, existing?.roa),
          roic: coalescePatch(incoming.roic, existing?.roic),
          p_l: coalescePatch(incoming.p_l, existing?.p_l),
          p_vp: coalescePatch(incoming.p_vp, existing?.p_vp),
          ev_ebitda: coalescePatch(incoming.ev_ebitda, existing?.ev_ebitda),
        };
      });

      const { error: quarterlyError } = await supabase
        .from("quarterly_fundamentals")
        .upsert(mergedQuarterly, {
          onConflict: "ticker,asset_class,year,quarter",
          ignoreDuplicates: false,
        });

      if (quarterlyError) {
        console.error("Quarterly fundamentals upsert error:", quarterlyError);
      } else {
        quarterlyProcessed = mergedQuarterly.length;
        console.log(`Successfully upserted ${quarterlyProcessed} quarterly records`);
      }
    }
    // Create audit log with validation warnings
    await supabase.from("audit_logs").insert({
      action: "ingest_fundamental_data",
      details: {
        tickers: [...new Set(processedTickers)],
        fundamental_count: fundamentalProcessed,
        annual_count: annualProcessed,
        quarterly_count: quarterlyProcessed,
        source: "cvm_dfp_bot",
        format: annualRecords.length > 0 ? "fiscal_year" : "current",
        total_received: records.length,
        financial_institutions: records.filter(r => r.is_financial).map(r => r.ticker),
        validation_warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      },
    });

    console.log(`Completed: fundamental=${fundamentalProcessed}, annual=${annualProcessed}, quarterly=${quarterlyProcessed}, total_tickers=${[...new Set(processedTickers)].length}`);
    if (validationWarnings.length > 0) {
      console.log(`Validation warnings for ${validationWarnings.length} tickers (see audit_logs)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fundamental_processed: fundamentalProcessed,
        annual_processed: annualProcessed,
        quarterly_processed: quarterlyProcessed,
        tickers: [...new Set(processedTickers)],
        validation_warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
