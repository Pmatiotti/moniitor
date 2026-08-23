import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility functions for indicator calculations
function safeDiv(numerator?: number | null, denominator?: number | null): number | null {
  if (numerator == null || denominator == null) return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

function toPercent(value: number | null): number | null {
  if (value == null) return null;
  return value * 100;
}

// CAGR: (final / initial)^(1/n) - 1
function calcCAGR(initial?: number | null, final?: number | null, years: number = 5): number | null {
  if (initial == null || final == null) return null;
  if (initial <= 0 || final <= 0) return null;
  if (years <= 0) return null;
  return Math.pow(final / initial, 1 / years) - 1;
}

// Helper functions for FII processing
function sum(arr: number[]): number {
  return arr.reduce((acc, v) => acc + v, 0);
}

function parseISO(dateStr: string): Date {
  return new Date(dateStr);
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

type CashDividend = {
  paymentDate: string;
  rate: number;
};

function buildFiiDashboardFromBrapi(quote: any, currentPrice: number | null) {
  const now = new Date();

  const marketCap: number | null = quote.marketCap ?? null;
  const defaultKeyStatistics = quote.defaultKeyStatistics || {};
  const bookValue: number | null = defaultKeyStatistics.bookValue ?? null;

  const dividendsData = quote.dividendsData || {};
  const cashDividends: CashDividend[] = dividendsData.cashDividends || [];
  const historical: any[] = quote.historicalDataPrice || [];

  // Sort dividends by payment date (most recent first)
  const cashDivSorted = [...cashDividends].sort(
    (a, b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime()
  );

  const lastDividend = cashDivSorted[0];

  // Filter by time windows
  const cutoff3m = monthsAgo(3);
  const cutoff6m = monthsAgo(6);
  const cutoff12m = monthsAgo(12);

  const divLast3m = cashDivSorted.filter(
    d => parseISO(d.paymentDate) >= cutoff3m && parseISO(d.paymentDate) <= now
  );
  const divLast6m = cashDivSorted.filter(
    d => parseISO(d.paymentDate) >= cutoff6m && parseISO(d.paymentDate) <= now
  );
  const divLast12m = cashDivSorted.filter(
    d => parseISO(d.paymentDate) >= cutoff12m && parseISO(d.paymentDate) <= now
  );

  const sum3m = sum(divLast3m.map(d => d.rate));
  const sum6m = sum(divLast6m.map(d => d.rate));
  const sum12m = sum(divLast12m.map(d => d.rate));
  const sumAll = sum(cashDivSorted.map(d => d.rate));

  const lastDividendValue = lastDividend ? lastDividend.rate : null;

  // Dividend Yields (%)
  const dyLast: number | null =
    currentPrice && lastDividendValue != null
      ? (lastDividendValue / currentPrice) * 100
      : null;

  const dy3m: number | null =
    currentPrice && sum3m > 0 ? (sum3m / currentPrice) * 100 : null;

  const dy6m: number | null =
    currentPrice && sum6m > 0 ? (sum6m / currentPrice) * 100 : null;

  const dy12m: number | null =
    currentPrice && sum12m > 0 ? (sum12m / currentPrice) * 100 : null;

  const dyAll: number | null =
    currentPrice && sumAll > 0 ? (sumAll / currentPrice) * 100 : null;

  // Average daily volume (last 3 months)
  const histCutoff = cutoff3m;
  const recentHist = historical.filter(h => {
    if (!h.date) return false;
    const d = new Date(h.date * 1000);
    return d >= histCutoff && d <= now;
  });

  const avgDailyVolume = recentHist.length
    ? sum(recentHist.map(h => h.volume || 0)) / recentHist.length
    : null;

  const avgPrice =
    recentHist.length
      ? sum(recentHist.map(h => h.close || currentPrice || 0)) / recentHist.length
      : currentPrice;

  const avgDailyLiquidityBRL =
    avgDailyVolume != null && avgPrice != null
      ? avgDailyVolume * avgPrice
      : null;

  const patrimonioLiquido = marketCap;
  const valorPatrimonialPorCota = bookValue;

  const pVp: number | null =
    currentPrice != null && valorPatrimonialPorCota != null
      ? safeDiv(currentPrice, valorPatrimonialPorCota)
      : null;

  // Monthly return
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let priceAtMonthStart: number | null = null;

  const histSortedAsc = [...historical].sort((a, b) => a.date - b.date);
  for (const h of histSortedAsc) {
    const d = new Date(h.date * 1000);
    if (d >= firstDayOfMonth) {
      priceAtMonthStart = h.close ?? h.open ?? null;
      break;
    }
  }

  const monthReturn: number | null =
    priceAtMonthStart && currentPrice
      ? (currentPrice / priceAtMonthStart - 1) * 100
      : null;

  // Dividend series for chart
  const dividendSeries = cashDivSorted.map(d => {
    const dt = parseISO(d.paymentDate);
    const refPrice = currentPrice;
    const yieldPct =
      refPrice && d.rate != null ? (d.rate / refPrice) * 100 : null;

    return {
      payment_date: dt.toISOString().slice(0, 10),
      dividend_rate: d.rate,
      yield_percent: yieldPct,
      price_at_date: refPrice,
    };
  });

  return {
    liquidez_media_diaria: avgDailyLiquidityBRL,
    ultimo_rendimento: lastDividendValue,
    patrimonio_liquido: patrimonioLiquido,
    valor_patrimonial: valorPatrimonialPorCota,
    rentabilidade_mes: monthReturn,
    p_vp: pVp,
    dy: dy12m,
    dividends_summary: {
      ultimo: {
        valor: lastDividendValue,
        dyPercent: dyLast,
      },
      tresMeses: {
        valor: sum3m,
        dyPercent: dy3m,
      },
      seisMeses: {
        valor: sum6m,
        dyPercent: dy6m,
      },
      dozeMeses: {
        valor: sum12m,
        dyPercent: dy12m,
      },
      desdeIPO: {
        valor: sumAll,
        dyPercent: dyAll,
      },
    },
    dividendSeries,
  };
}

function buildMissingIndicatorsFromBrapi(quote: any) {
  const financialData = quote.financialData || {};
  const defaultKeyStatistics = quote.defaultKeyStatistics || {};
  const balanceSheetHistory = quote.balanceSheetHistory?.balanceSheetStatements || [];
  const incomeStatementHistory = quote.incomeStatementHistory?.incomeStatementHistory || [];

  // Base data
  const currentPrice: number | null = financialData.currentPrice ?? quote.regularMarketPrice ?? null;
  const marketCap: number | null = quote.marketCap ?? financialData.marketCap ?? null;
  const ebitda: number | null = financialData.ebitda ?? null;
  const totalRevenueTTM: number | null = financialData.totalRevenue ?? null;

  // EBIT calculation
  let ebit: number | null = null;
  if (incomeStatementHistory && incomeStatementHistory.length > 0) {
    const lastIs = incomeStatementHistory[0];
    ebit = lastIs.ebit ?? lastIs.operatingIncome ?? null;
  }
  if (ebit == null && financialData.operatingMargins != null && totalRevenueTTM != null) {
    ebit = totalRevenueTTM * financialData.operatingMargins;
  }

  const totalDebt: number | null = financialData.totalDebt ?? null;
  const totalCash: number | null = financialData.totalCash ?? null;
  const netDebt: number | null = (totalDebt != null && totalCash != null) ? (totalDebt - totalCash) : null;

  // Most recent balance sheet
  const lastBs = balanceSheetHistory.length > 0 ? balanceSheetHistory[0] : {};
  const totalAssets: number | null = lastBs.totalAssets ?? null;
  const totalLiab: number | null = lastBs.totalLiab ?? null;
  const equity: number | null = lastBs.totalStockholderEquity ?? lastBs.shareholdersEquity ?? null;
  const currentAssets: number | null = lastBs.totalCurrentAssets ?? lastBs.currentAssets ?? null;
  const currentLiabilities: number | null = lastBs.totalCurrentLiabilities ?? lastBs.currentLiabilities ?? null;

  // Working capital
  const workingCapital: number | null = (currentAssets != null && currentLiabilities != null) 
    ? (currentAssets - currentLiabilities) 
    : null;

  // Capital invested for ROIC
  const capitalInvested: number | null = (totalDebt != null && equity != null && totalCash != null)
    ? (totalDebt + equity - totalCash)
    : null;

  const TAX_RATE = 0.34;
  const nopat: number | null = (ebit != null) ? ebit * (1 - TAX_RATE) : null;

  // CAGR calculations
  function getYearlySeriesFromIS(field: string): number[] {
    if (!incomeStatementHistory || incomeStatementHistory.length === 0) return [];
    return incomeStatementHistory
      .map((item: any) => item[field])
      .filter((v: any) => typeof v === "number");
  }

  const revenueSeries = getYearlySeriesFromIS("totalRevenue").length > 0
    ? getYearlySeriesFromIS("totalRevenue")
    : getYearlySeriesFromIS("netRevenue");

  const profitSeries = getYearlySeriesFromIS("netIncome").length > 0
    ? getYearlySeriesFromIS("netIncome")
    : getYearlySeriesFromIS("netEarnings");

  let cagrRevenue5Y: number | null = null;
  if (revenueSeries.length >= 5) {
    cagrRevenue5Y = calcCAGR(revenueSeries[4], revenueSeries[0], 5);
  }

  let cagrProfit5Y: number | null = null;
  if (profitSeries.length >= 5) {
    cagrProfit5Y = calcCAGR(profitSeries[4], profitSeries[0], 5);
  }

  // Calculate missing indicators
  const pegRatio: number | null = defaultKeyStatistics.pegRatio ?? null;
  const pEbitda: number | null = marketCap != null && ebitda != null ? safeDiv(marketCap, ebitda) : null;
  const pEbit: number | null = marketCap != null && ebit != null ? safeDiv(marketCap, ebit) : null;
  const pAtivo: number | null = marketCap != null && totalAssets != null ? safeDiv(marketCap, totalAssets) : null;
  const pAtivoCircLiq: number | null = marketCap != null && workingCapital != null ? safeDiv(marketCap, workingCapital) : null;
  const pCapGiro: number | null = pAtivoCircLiq;

  const enterpriseValue: number | null = defaultKeyStatistics.enterpriseValue 
    ?? (marketCap != null && netDebt != null ? marketCap + netDebt : null);
  const evEbit: number | null = enterpriseValue != null && ebit != null ? safeDiv(enterpriseValue, ebit) : null;

  const divLiqEbitda: number | null = netDebt != null && ebitda != null ? safeDiv(netDebt, ebitda) : null;
  const divLiqEbit: number | null = netDebt != null && ebit != null ? safeDiv(netDebt, ebit) : null;
  const plAtivos: number | null = equity != null && totalAssets != null ? safeDiv(equity, totalAssets) : null;
  const passivosAtivos: number | null = totalLiab != null && totalAssets != null ? safeDiv(totalLiab, totalAssets) : null;

  const mEbit: number | null = ebit != null && totalRevenueTTM != null ? safeDiv(ebit, totalRevenueTTM) : null;

  const roic: number | null = nopat != null && capitalInvested != null ? safeDiv(nopat, capitalInvested) : null;
  const giroAtivos: number | null = totalRevenueTTM != null && totalAssets != null ? safeDiv(totalRevenueTTM, totalAssets) : null;

  return {
    valuation: {
      pegRatio,
      pEbitda,
      pEbit,
      pAtivo,
      pAtivoCircLiq,
      pCapGiro,
      evEbit,
    },
    endividamento: {
      divLiqEbitda,
      divLiqEbit,
      plAtivos,
      passivosAtivos,
    },
    eficiencia: {
      mEbit,
    },
    rentabilidade: {
      roic,
      giroAtivos,
    },
    crescimento: {
      cagrReceitas5Anos: cagrRevenue5Y,
      cagrLucros5Anos: cagrProfit5Y,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker } = await req.json();
    
    if (!ticker || typeof ticker !== 'string' || ticker.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BRAPI_API_KEY = Deno.env.get('BRAPI_API_KEY');
    if (!BRAPI_API_KEY) {
      console.error('BRAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching fundamental data for ${ticker}`);

    // FIIs and stocks have different data availability
    // For FIIs: Request fundamental data with dividends and historical prices
    // For stocks: Use progressive fallback with module groups
    let quoteUrl: string;
    let quoteResponse: Response;
    let stockData: any = null;
    
    if (ticker.endsWith('11')) {
      // FII - request range for historical data and dividends
      quoteUrl = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_API_KEY}&range=1y&interval=1d&fundamental=true&dividends=true`;
      console.log(`Calling Brapi URL for FII: ${quoteUrl.replace(BRAPI_API_KEY, 'HIDDEN')}`);
      quoteResponse = await fetch(quoteUrl);
      
      if (!quoteResponse.ok) {
        throw new Error(`Brapi API error for FII: ${quoteResponse.status}`);
      }
      
      const quoteData = await quoteResponse.json();
      if (quoteData.results && quoteData.results.length > 0) {
        stockData = quoteData.results[0];
      }
    } else {
      // Stock - use progressive fallback strategy for module groups
      // Group 1: All modules (may fail with 417 for some tickers)
      const allModules = 'summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistory,incomeStatementHistory,dividendsData';
      // Group 2: Core modules for valuation and profitability (more reliable)
      const coreModules = 'defaultKeyStatistics,financialData,dividendsData';
      // Group 3: Minimal modules
      const minimalModules = 'defaultKeyStatistics,financialData';
      
      const moduleGroups = [allModules, coreModules, minimalModules];
      let lastError: string | null = null;
      
      for (let i = 0; i < moduleGroups.length; i++) {
        const modules = moduleGroups[i];
        quoteUrl = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_API_KEY}&fundamental=true&modules=${modules}`;
        console.log(`[Attempt ${i + 1}/${moduleGroups.length}] Calling Brapi with modules: ${modules}`);
        
        try {
          quoteResponse = await fetch(quoteUrl);
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            if (quoteData.results && quoteData.results.length > 0) {
              stockData = quoteData.results[0];
              console.log(`✓ Success with module group ${i + 1}`);
              break;
            }
          } else {
            lastError = `HTTP ${quoteResponse.status}`;
            console.log(`✗ Failed with module group ${i + 1}: ${lastError}`);
          }
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
          console.log(`✗ Fetch error with module group ${i + 1}: ${lastError}`);
        }
      }
      
      // Final fallback: basic request without modules
      if (!stockData) {
        console.log(`All module groups failed, trying basic fundamental request`);
        quoteUrl = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_API_KEY}&fundamental=true`;
        quoteResponse = await fetch(quoteUrl);
        
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          if (quoteData.results && quoteData.results.length > 0) {
            stockData = quoteData.results[0];
            console.log(`✓ Success with basic fundamental request`);
          }
        } else {
          throw new Error(`All Brapi requests failed. Last error: ${lastError || quoteResponse.status}`);
        }
      }
      
      // Try to fetch dividends separately if not already in stockData
      if (stockData && !stockData.dividendsData) {
        try {
          const divUrl = `https://brapi.dev/api/quote/${ticker}?token=${BRAPI_API_KEY}&modules=dividendsData`;
          console.log(`Fetching dividends separately...`);
          const divResponse = await fetch(divUrl);
          if (divResponse.ok) {
            const divData = await divResponse.json();
            if (divData.results && divData.results.length > 0) {
              stockData.dividendsData = divData.results[0].dividendsData;
              console.log(`✓ Dividends data fetched separately`);
            }
          }
        } catch (divError) {
          console.log(`Could not fetch dividends separately: ${divError}`);
        }
      }
    }
    
    if (!stockData) {
      return new Response(
        JSON.stringify({ error: 'No data found for ticker' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const financialData = stockData.financialData || {};
    const defaultKeyStats = stockData.defaultKeyStatistics || {};
    
    // Detect if it's a FII
    const symbol = stockData.symbol || ticker.toUpperCase();
    const isFII = symbol.length === 6 && symbol.endsWith("11");
    
    console.log(`Processing ${symbol}, isFII: ${isFII}`);
    
    // Calculate missing indicators
    const missingIndicators = buildMissingIndicatorsFromBrapi(stockData);
    console.log('Calculated indicators:', JSON.stringify(missingIndicators, null, 2));
    
    // For FIIs, build special dashboard data
    let fiiDashboard = null;
    if (isFII) {
      console.log('Building FII dashboard data');
      fiiDashboard = buildFiiDashboardFromBrapi(stockData, stockData.regularMarketPrice || null);
      console.log('FII Dashboard:', JSON.stringify(fiiDashboard, null, 2));
    }
    
    // Log the actual structure from Brapi for debugging
    console.log('=== BRAPI DATA STRUCTURE ===');
    console.log('stockData.symbol:', stockData.symbol);
    console.log('stockData.regularMarketPrice:', stockData.regularMarketPrice);
    console.log('stockData.priceEarnings:', stockData.priceEarnings);
    console.log('stockData.priceToBook:', stockData.priceToBook);
    console.log('stockData.earningsPerShare:', stockData.earningsPerShare);
    console.log('defaultKeyStats exists:', !!defaultKeyStats);
    if (Object.keys(defaultKeyStats).length > 0) {
      console.log('defaultKeyStats.dividendYield:', defaultKeyStats.dividendYield);
      console.log('defaultKeyStats.trailingPE:', defaultKeyStats.trailingPE);
      console.log('defaultKeyStats.priceToBook:', defaultKeyStats.priceToBook);
      console.log('defaultKeyStats.lastDividendValue:', defaultKeyStats.lastDividendValue);
      console.log('defaultKeyStats.bookValue:', defaultKeyStats.bookValue);
    }
    console.log('financialData exists:', !!financialData);
    if (Object.keys(financialData).length > 0) {
      console.log('financialData.returnOnEquity:', financialData.returnOnEquity);
      console.log('financialData.returnOnAssets:', financialData.returnOnAssets);
      console.log('financialData.profitMargins:', financialData.profitMargins);
      console.log('financialData.debtToEquity:', financialData.debtToEquity);
    }
    
    // Update stock_metrics table with comprehensive data
    const metricsData = {
      ticker: ticker.toUpperCase(),
      market_cap: stockData.marketCap || null,
      enterprise_value: missingIndicators.valuation.evEbit != null 
        ? (financialData.enterpriseValue || stockData.enterpriseValue || null)
        : (financialData.enterpriseValue || stockData.enterpriseValue || null),
      ev_to_ebitda: financialData.enterpriseToEbitda || null,
      price_to_earnings: stockData.priceEarnings || defaultKeyStats?.trailingPE || null,
      price_to_book: stockData.priceToBook || defaultKeyStats?.priceToBook || null,
      price_to_sales: financialData.priceToSales || null,
      roe: financialData.returnOnEquity ? financialData.returnOnEquity * 100 : null,
      roa: financialData.returnOnAssets ? financialData.returnOnAssets * 100 : null,
      roic: missingIndicators.rentabilidade.roic ? missingIndicators.rentabilidade.roic * 100 : null,
      gross_margin: financialData.grossMargins ? financialData.grossMargins * 100 : null,
      operating_margin: financialData.operatingMargins ? financialData.operatingMargins * 100 : null,
      net_margin: financialData.profitMargins ? financialData.profitMargins * 100 : null,
      asset_turnover: missingIndicators.rentabilidade.giroAtivos || null,
      inventory_turnover: null,
      current_ratio: financialData.currentRatio || null,
      quick_ratio: financialData.quickRatio || null,
      debt_to_equity: financialData.debtToEquity || null,
      debt_to_assets: missingIndicators.endividamento.passivosAtivos || null,
      interest_coverage: null,
      revenue_growth_yoy: financialData?.revenueGrowth ? financialData.revenueGrowth * 100 : null,
      earnings_growth_yoy: financialData?.earningsGrowth ? financialData.earningsGrowth * 100 : null,
      // Fix dividend_yield - check if already in percentage (>1 means already %)
      dividend_yield: defaultKeyStats?.dividendYield 
        ? (defaultKeyStats.dividendYield > 1 ? defaultKeyStats.dividendYield : defaultKeyStats.dividendYield * 100) 
        : null,
      payout_ratio: defaultKeyStats?.payoutRatio ? defaultKeyStats.payoutRatio * 100 : null,
      last_updated: new Date().toISOString(),
    };

    const { error: metricsError } = await supabase
      .from('stock_metrics')
      .upsert(metricsData, { onConflict: 'ticker' });

    if (metricsError) {
      console.error('Error updating stock_metrics:', metricsError);
    }

    // Normalize asset_class to prevent duplicates - always use 'Renda Variável' for stocks
    const normalizedAssetClass = isFII ? 'FIIs' : 'Renda Variável';
    
    // Delete any records with different asset_class to prevent duplicates
    const { error: cleanupError } = await supabase
      .from('fundamental_data')
      .delete()
      .eq('ticker', ticker.toUpperCase())
      .neq('asset_class', normalizedAssetClass);
    
    if (cleanupError) {
      console.log('Cleanup old records (may not exist):', cleanupError.message);
    }
    
    // Update fundamental_data table with correct field mapping
    const fundamentalData = {
      ticker: ticker.toUpperCase(),
      asset_class: normalizedAssetClass,
      current_price: stockData.regularMarketPrice || null,
      previous_close: stockData.previousClose || stockData.regularMarketPreviousClose || null,
      day_change_percent: stockData.regularMarketChangePercent || null,
      week_52_high: stockData.fiftyTwoWeekHigh || null,
      week_52_low: stockData.fiftyTwoWeekLow || null,
      market_cap: stockData.marketCap || null,
      pe_ratio: stockData.priceEarnings || defaultKeyStats?.trailingPE || null,
      pb_ratio: stockData.priceToBook || defaultKeyStats?.priceToBook || null,
      // Fix dividend_yield - check if already in percentage (>1 means already %)
      dividend_yield: defaultKeyStats?.dividendYield 
        ? (defaultKeyStats.dividendYield > 1 ? defaultKeyStats.dividendYield : defaultKeyStats.dividendYield * 100) 
        : null,
      avg_volume: stockData.averageDailyVolume10Day || stockData.regularMarketVolume || null,
      roe: financialData?.returnOnEquity ? financialData.returnOnEquity * 100 : null,
      roa: financialData?.returnOnAssets ? financialData.returnOnAssets * 100 : null,
      profit_margin: financialData?.profitMargins ? financialData.profitMargins * 100 : null,
      
      // FII specific fields
      liquidez_media_diaria: fiiDashboard?.liquidez_media_diaria || stockData.averageDailyVolume10Day || stockData.regularMarketVolume || null,
      ultimo_rendimento: fiiDashboard?.ultimo_rendimento || defaultKeyStats?.lastDividendValue || null,
      patrimonio_liquido: fiiDashboard?.patrimonio_liquido || financialData?.totalAssets || null,
      valor_patrimonial: fiiDashboard?.valor_patrimonial || defaultKeyStats?.bookValue || null,
      rentabilidade_mes: fiiDashboard?.rentabilidade_mes || (defaultKeyStats?.ytdReturn ? defaultKeyStats.ytdReturn * 100 : null),
      data_ultimo_dividendo: defaultKeyStats?.lastDividendDate || null,
      ultimo_dividendo: defaultKeyStats?.lastDividendValue || null,
      dividends_summary: fiiDashboard?.dividends_summary || null,
      
      // Valuation indicators - fix DY calculation to avoid double multiplication
      dy: defaultKeyStats?.dividendYield 
        ? (defaultKeyStats.dividendYield > 1 ? defaultKeyStats.dividendYield : defaultKeyStats.dividendYield * 100) 
        : null,
      p_l: stockData.priceEarnings || defaultKeyStats?.trailingPE || null,
      peg_ratio: missingIndicators.valuation.pegRatio || null,
      ev_ebitda: defaultKeyStats?.enterpriseToEbitda || null,
      p_ebitda: missingIndicators.valuation.pEbitda || null,
      p_ebit: missingIndicators.valuation.pEbit || null,
      vpa: defaultKeyStats?.bookValue || null,
      p_ativo: missingIndicators.valuation.pAtivo || null,
      p_cap_giro: missingIndicators.valuation.pCapGiro || null,
      p_ativo_circ_liq: missingIndicators.valuation.pAtivoCircLiq || null,
      p_vp: fiiDashboard?.p_vp || stockData.priceToBook || defaultKeyStats?.priceToBook || null,
      
      // Debt indicators - from financialData
      div_liquida_pl: financialData?.debtToEquity || null,
      div_liquida_ebitda: missingIndicators.endividamento.divLiqEbitda || null,
      div_liquida_ebit: missingIndicators.endividamento.divLiqEbit || null,
      pl_ativo: missingIndicators.endividamento.plAtivos || null,
      passivo_ativo: missingIndicators.endividamento.passivosAtivos || null,
      liq_corrente: financialData?.currentRatio || null,
      
      // Efficiency indicators - from financialData
      m_bruta: financialData?.grossMargins ? financialData.grossMargins * 100 : null,
      m_ebitda: financialData?.ebitdaMargins ? financialData.ebitdaMargins * 100 : null,
      m_ebit: missingIndicators.eficiencia.mEbit ? missingIndicators.eficiencia.mEbit * 100 : null,
      m_liquida: financialData?.profitMargins ? financialData.profitMargins * 100 : null,
      
      // Profitability indicators - from financialData
      roe_percent: financialData?.returnOnEquity ? financialData.returnOnEquity * 100 : null,
      roa_percent: financialData?.returnOnAssets ? financialData.returnOnAssets * 100 : null,
      roic: missingIndicators.rentabilidade.roic ? missingIndicators.rentabilidade.roic * 100 : null,
      giro_ativos: missingIndicators.rentabilidade.giroAtivos || null,
      
      // Growth indicators - from financialData
      cagr_receitas_5: missingIndicators.crescimento.cagrReceitas5Anos ? missingIndicators.crescimento.cagrReceitas5Anos * 100 : null,
      cagr_lucros_5: missingIndicators.crescimento.cagrLucros5Anos ? missingIndicators.crescimento.cagrLucros5Anos * 100 : null,
      
      data_source: 'Brapi',
      last_updated: new Date().toISOString(),
    };

    // Use ticker only for upsert since we now have unique constraint on ticker
    const { error: fundError } = await supabase
      .from('fundamental_data')
      .upsert(fundamentalData, { onConflict: 'ticker' });

    if (fundError) {
      console.error('Error updating fundamental_data:', fundError);
    }

    // Store historical financial data from Brapi's incomeStatementHistory and balanceSheetHistory
    const incomeStatementHistory = stockData.incomeStatementHistory?.incomeStatementHistory || [];
    const balanceSheetHistory = stockData.balanceSheetHistory?.balanceSheetStatements || [];
    const cashFlowHistory = stockData.cashflowStatementHistory?.cashflowStatements || [];
    
    console.log(`Found ${incomeStatementHistory.length} income statement periods`);
    console.log(`Found ${balanceSheetHistory.length} balance sheet periods`);
    console.log(`Found ${cashFlowHistory.length} cash flow periods`);
    
    // Store Income Statements from history
    for (const period of incomeStatementHistory.slice(0, 8)) {
      if (!period.endDate) continue;
      
      const periodEnd = period.endDate.split('T')[0];
      const totalRevenue = period.totalRevenue || null;
      const grossProfit = period.grossProfit || null;
      const operatingIncome = period.operatingIncome || null;
      const netIncome = period.netIncome || null;
      const ebit = period.ebit || operatingIncome || null;
      
      const incomeData = {
        ticker: ticker.toUpperCase(),
        period_end: periodEnd,
        period_type: 'annual',
        total_revenue: totalRevenue,
        cost_of_revenue: period.costOfRevenue || null,
        gross_profit: grossProfit,
        operating_expenses: period.operatingExpense || period.totalOperatingExpenses || null,
        operating_income: operatingIncome,
        ebitda: period.ebitda || null,
        ebit: ebit,
        net_income: netIncome,
        earnings_per_share: period.dilutedEPS || period.basicEPS || null,
        gross_margin: grossProfit && totalRevenue ? (grossProfit / totalRevenue) * 100 : null,
        operating_margin: operatingIncome && totalRevenue ? (operatingIncome / totalRevenue) * 100 : null,
        net_margin: netIncome && totalRevenue ? (netIncome / totalRevenue) * 100 : null,
      };

      const { error: incError } = await supabase
        .from('income_statements')
        .upsert(incomeData, { onConflict: 'ticker,period_end,period_type' });
      
      if (incError) {
        console.error(`Error storing income statement for ${periodEnd}:`, incError);
      } else {
        console.log(`✓ Stored income statement for ${periodEnd}`);
      }
    }

    // Store Balance Sheets from history
    for (const period of balanceSheetHistory.slice(0, 8)) {
      if (!period.endDate) continue;
      
      const periodEnd = period.endDate.split('T')[0];
      
      const balanceData = {
        ticker: ticker.toUpperCase(),
        period_end: periodEnd,
        period_type: 'annual',
        total_assets: period.totalAssets || null,
        current_assets: period.totalCurrentAssets || null,
        cash_and_equivalents: period.cash || period.cashAndCashEquivalents || null,
        accounts_receivable: period.netReceivables || period.accountsReceivable || null,
        inventory: period.inventory || null,
        total_liabilities: period.totalLiab || period.totalLiabilities || null,
        current_liabilities: period.totalCurrentLiabilities || null,
        long_term_debt: period.longTermDebt || null,
        short_term_debt: period.shortLongTermDebt || period.shortTermDebt || null,
        total_equity: period.totalStockholderEquity || period.stockholdersEquity || null,
        retained_earnings: period.retainedEarnings || null,
      };

      const { error: bsError } = await supabase
        .from('balance_sheets')
        .upsert(balanceData, { onConflict: 'ticker,period_end,period_type' });
      
      if (bsError) {
        console.error(`Error storing balance sheet for ${periodEnd}:`, bsError);
      } else {
        console.log(`✓ Stored balance sheet for ${periodEnd}`);
      }
    }

    // Store Cash Flows from history
    for (const period of cashFlowHistory.slice(0, 8)) {
      if (!period.endDate) continue;
      
      const periodEnd = period.endDate.split('T')[0];
      
      const cashFlowData = {
        ticker: ticker.toUpperCase(),
        period_end: periodEnd,
        period_type: 'annual',
        operating_cash_flow: period.totalCashFromOperatingActivities || null,
        investing_cash_flow: period.totalCashflowsFromInvestingActivities || null,
        capital_expenditure: period.capitalExpenditures || null,
        financing_cash_flow: period.totalCashFromFinancingActivities || null,
        dividends_paid: period.dividendsPaid || null,
        net_change_in_cash: period.changeInCash || null,
        free_cash_flow: period.freeCashFlow || null,
      };

      const { error: cfError } = await supabase
        .from('cash_flows')
        .upsert(cashFlowData, { onConflict: 'ticker,period_end,period_type' });
      
      if (cfError) {
        console.error(`Error storing cash flow for ${periodEnd}:`, cfError);
      } else {
        console.log(`✓ Stored cash flow for ${periodEnd}`);
      }
    }
    
    // Fallback: If no history modules, try with old format
    if (incomeStatementHistory.length === 0 && (stockData.financialsQuarterly || stockData.financialsAnnual)) {
      console.log('Using legacy financials format...');
      const financials = stockData.financialsQuarterly || stockData.financialsAnnual || [];
      
      for (const period of financials.slice(0, 8)) {
        if (!period.date) continue;
        
        const periodType = stockData.financialsQuarterly ? 'quarterly' : 'annual';
        const periodEnd = new Date(period.date).toISOString().split('T')[0];

        if (period.totalRevenue || period.netIncome) {
          const incomeData = {
            ticker: ticker.toUpperCase(),
            period_end: periodEnd,
            period_type: periodType,
            total_revenue: period.totalRevenue || null,
            cost_of_revenue: period.costOfRevenue || null,
            gross_profit: period.grossProfit || null,
            operating_expenses: period.operatingExpenses || null,
            operating_income: period.operatingIncome || null,
            ebitda: period.ebitda || null,
            ebit: period.ebit || null,
            net_income: period.netIncome || null,
            earnings_per_share: period.earningsPerShare || null,
            gross_margin: period.grossProfit && period.totalRevenue 
              ? (period.grossProfit / period.totalRevenue) * 100 
              : null,
            operating_margin: period.operatingIncome && period.totalRevenue
              ? (period.operatingIncome / period.totalRevenue) * 100
              : null,
            net_margin: period.netIncome && period.totalRevenue
              ? (period.netIncome / period.totalRevenue) * 100
              : null,
          };

          await supabase
            .from('income_statements')
            .upsert(incomeData, { onConflict: 'ticker,period_end,period_type' });
        }

        if (period.totalAssets || period.totalLiabilities) {
          const balanceData = {
            ticker: ticker.toUpperCase(),
            period_end: periodEnd,
            period_type: periodType,
            total_assets: period.totalAssets || null,
            current_assets: period.totalCurrentAssets || null,
            cash_and_equivalents: period.cash || null,
            accounts_receivable: period.accountsReceivable || null,
            inventory: period.inventory || null,
            total_liabilities: period.totalLiab || null,
            current_liabilities: period.totalCurrentLiabilities || null,
            long_term_debt: period.longTermDebt || null,
            short_term_debt: period.shortTermDebt || null,
            total_equity: period.totalStockholderEquity || null,
            retained_earnings: period.retainedEarnings || null,
          };

          await supabase
            .from('balance_sheets')
            .upsert(balanceData, { onConflict: 'ticker,period_end,period_type' });
        }

        if (period.operatingCashFlow || period.investingCashFlow) {
          const cashFlowData = {
            ticker: ticker.toUpperCase(),
            period_end: periodEnd,
            period_type: periodType,
            operating_cash_flow: period.totalCashFromOperatingActivities || null,
            investing_cash_flow: period.totalCashflowsFromInvestingActivities || null,
            capital_expenditure: period.capitalExpenditures || null,
            financing_cash_flow: period.totalCashFromFinancingActivities || null,
            dividends_paid: period.dividendsPaid || null,
            net_change_in_cash: period.changeInCash || null,
            free_cash_flow: period.freeCashFlow || null,
          };

          await supabase
            .from('cash_flows')
            .upsert(cashFlowData, { onConflict: 'ticker,period_end,period_type' });
        }
      }
    }

    console.log(`Successfully fetched and stored fundamental data for ${ticker}`);
    
    // Store FII dividend history if available
    if (isFII && fiiDashboard?.dividendSeries && fiiDashboard.dividendSeries.length > 0) {
      console.log(`Storing ${fiiDashboard.dividendSeries.length} dividend records`);
      for (const div of fiiDashboard.dividendSeries) {
        const { error: divError } = await supabase
          .from("fii_dividends_history")
          .upsert({
            ticker: symbol,
            payment_date: div.payment_date,
            dividend_rate: div.dividend_rate,
            price_at_date: div.price_at_date,
            yield_percent: div.yield_percent,
          }, {
            onConflict: 'ticker,payment_date'
          });
        
        if (divError) {
          console.error('Error storing dividend history:', divError);
        }
      }
    }
    
    // Return appropriate response based on asset type
    if (isFII && fiiDashboard) {
      return new Response(
        JSON.stringify({ 
          success: true,
          ticker: ticker.toUpperCase(),
          current_price: stockData.regularMarketPrice || 0,
          p_vp: fiiDashboard.p_vp,
          ultimo_dividendo: fiiDashboard.ultimo_rendimento,
          avg_volume: stockData.averageDailyVolume10Day || stockData.regularMarketVolume,
          dividends_summary: fiiDashboard.dividends_summary,
          historical_prices: stockData.historicalDataPrice || [],
          message: 'FII data fetched successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        ticker: ticker.toUpperCase(),
        message: 'Fundamental data updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-fundamental-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});