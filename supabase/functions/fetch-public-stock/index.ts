import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Campos que o robô CVM preenche e devem ser priorizados sobre Brapi
const CVM_PRIORITY_FIELDS = [
  'roe', 'roa', 'roic',
  'm_bruta', 'm_ebitda', 'm_liquida', 'm_ebit',
  'div_liquida_ebitda', 'div_liquida_pl', 'div_liquida_ebit',
  'liq_corrente', 'passivo_ativo', 'pl_ativo',
  'giro_ativos',
  'cagr_receitas_5', 'cagr_lucros_5',
  'patrimonio_liquido', 'vpa',
];

// Campos que Brapi fornece e não existem no CVM
const BRAPI_EXCLUSIVE_FIELDS = [
  'current_price', 'day_change_percent', 'market_cap',
  'week_52_high', 'week_52_low',
];

interface DividendRecord {
  paymentDate: string;
  rate: number;
  type: string;
  relatedTo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, saveToCache = true } = await req.json();
    
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tickerUpper = ticker.toUpperCase().replace('.SA', '');
    console.log(`[ENRICH] Starting enrichment for ${tickerUpper}, saveToCache: ${saveToCache}`);

    // =====================================================
    // STEP 1: Buscar dados existentes do BD (robô CVM)
    // =====================================================
    const { data: dbData, error: dbError } = await supabase
      .from('fundamental_data')
      .select('*')
      .eq('ticker', tickerUpper)
      .eq('asset_class', 'acoes')
      .maybeSingle();

    if (dbError) {
      console.error('[ENRICH] Error fetching from DB:', dbError);
    }

    const existingData = dbData as Record<string, unknown> | null;
    console.log(`[ENRICH] DB data found: ${existingData ? 'YES' : 'NO'}`);

    // =====================================================
    // STEP 2: Buscar dados do Brapi (preço e mercado)
    // =====================================================
    const quoteUrl = `https://brapi.dev/api/quote/${tickerUpper}?token=${BRAPI_API_KEY}&fundamental=true&modules=defaultKeyStatistics,financialData,summaryProfile`;
    console.log(`[ENRICH] Calling BRAPI for quote/fundamentals...`);
    
    let brapiData: Record<string, unknown> | null = null;
    let dividendsHistory: DividendRecord[] = [];
    let calculatedDY: number | null = null;
    let ultimoDividendo: number | null = null;
    let dataUltimoDividendo: string | null = null;
    let totalDividendos12m: number | null = null;
    let currentPrice = 0;
    
    try {
      const quoteResponse = await fetch(quoteUrl);
      
      if (quoteResponse.ok) {
        const quoteJson = await quoteResponse.json();
        
        if (quoteJson.results && quoteJson.results.length > 0) {
          const stock = quoteJson.results[0];
          const financialData = stock.financialData || {};
          const defaultKeyStats = stock.defaultKeyStatistics || {};
          const summaryProfile = stock.summaryProfile || {};
          currentPrice = stock.regularMarketPrice ?? 0;
          
          console.log(`[ENRICH] BRAPI quote data received for ${stock.symbol || tickerUpper}`);

          brapiData = {
            ticker: stock.symbol || tickerUpper,
            asset_class: 'acoes',
            
            // Market data (Brapi is the source of truth)
            current_price: currentPrice ?? null,
            day_change_percent: stock.regularMarketChangePercent ?? null,
            market_cap: stock.marketCap ?? null,
            week_52_high: stock.fiftyTwoWeekHigh ?? null,
            week_52_low: stock.fiftyTwoWeekLow ?? null,
            
            // Company profile data
            company_name: stock.longName || stock.shortName || null,
            sector: summaryProfile.sector || null,
            industry: summaryProfile.industry || null,
            business_summary: summaryProfile.longBusinessSummary || null,
            website: summaryProfile.website || null,
            full_time_employees: summaryProfile.fullTimeEmployees || null,
            
            // Valuation ratios from Brapi
            p_l: defaultKeyStats.priceToEarnings ?? defaultKeyStats.forwardPE ?? null,
            p_vp: defaultKeyStats.priceToBook ?? null,
            ev_ebitda: defaultKeyStats.enterpriseToEbitda ?? null,
            p_ebit: defaultKeyStats.enterpriseToRevenue ?? null,
            
            // Dividends from Brapi (will be overwritten if we fetch separately)
            dividend_yield: stock.dividendYield != null ? stock.dividendYield * 100 : null,
            payout_ratio: defaultKeyStats.payoutRatio != null ? defaultKeyStats.payoutRatio * 100 : null,
            
            // Profitability (fallback if CVM doesn't have)
            roe: financialData.returnOnEquity != null ? financialData.returnOnEquity * 100 : null,
            roa: financialData.returnOnAssets != null ? financialData.returnOnAssets * 100 : null,
            
            // Margins (fallback if CVM doesn't have)
            m_bruta: financialData.grossMargins != null ? financialData.grossMargins * 100 : null,
            m_ebitda: financialData.ebitdaMargins != null ? financialData.ebitdaMargins * 100 : null,
            m_liquida: financialData.profitMargins != null ? financialData.profitMargins * 100 : null,
            
            // Debt (fallback if CVM doesn't have)
            div_liquida_pl: financialData.debtToEquity ?? null,
            liq_corrente: financialData.currentRatio ?? null,
            
            // Growth (fallback if CVM doesn't have)
            cagr_receitas_5: financialData.revenueGrowth != null ? financialData.revenueGrowth * 100 : null,
            cagr_lucros_5: financialData.earningsGrowth != null ? financialData.earningsGrowth * 100 : null,
          };
        }
      } else {
        console.warn(`[ENRICH] BRAPI quote returned status ${quoteResponse.status}`);
      }
    } catch (brapiError) {
      console.error('[ENRICH] Error fetching quote from BRAPI:', brapiError);
    }

    // =====================================================
    // STEP 2.5: Buscar dividendos separadamente (evita 417)
    // =====================================================
    const dividendsUrl = `https://brapi.dev/api/quote/${tickerUpper}?token=${BRAPI_API_KEY}&dividends=true`;
    console.log(`[ENRICH] Calling BRAPI for dividends...`);
    
    try {
      const dividendsResponse = await fetch(dividendsUrl);
      
      if (dividendsResponse.ok) {
        const dividendsJson = await dividendsResponse.json();
        
        if (dividendsJson.results && dividendsJson.results.length > 0) {
          const stock = dividendsJson.results[0];
          const cashDividends = stock.dividendsData?.cashDividends || [];
          
          console.log(`[ENRICH] Found ${cashDividends.length} dividend records`);

          if (cashDividends.length > 0) {
            // Filtrar últimos 12 meses - APENAS DIVIDENDOS JÁ PAGOS
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Incluir todo o dia de hoje
            
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const last12MonthsPaid = cashDividends.filter((d: any) => {
              try {
                const paymentDate = new Date(d.paymentDate);
                // Data deve ser >= 1 ano atrás E <= hoje (já pago, não futuro)
                return !isNaN(paymentDate.getTime()) && 
                       paymentDate >= oneYearAgo && 
                       paymentDate <= today;
              } catch {
                return false;
              }
            });

            console.log(`[ENRICH] Paid dividends in last 12 months: ${last12MonthsPaid.length}`);

            // Calcular DY real (soma 12m PAGOS / preço atual * 100)
            const priceForCalc = currentPrice > 0 ? currentPrice : (stock.regularMarketPrice ?? 0);
            const total12M = last12MonthsPaid.reduce((sum: number, d: any) => sum + (d.rate || 0), 0);
            totalDividendos12m = total12M > 0 ? total12M : null;
            
            if (priceForCalc > 0 && total12M > 0) {
              calculatedDY = (total12M / priceForCalc) * 100;
              console.log(`[ENRICH] Calculated DY: ${calculatedDY.toFixed(2)}% (${total12M.toFixed(4)} / ${priceForCalc.toFixed(2)})`);
            }

            // Último dividendo JÁ PAGO (não futuro)
            const lastPaidDividend = last12MonthsPaid[0]; // Array já filtrado, ordenado desc
            if (lastPaidDividend) {
              ultimoDividendo = lastPaidDividend.rate ?? null;
              dataUltimoDividendo = lastPaidDividend.paymentDate ?? null;
              console.log(`[ENRICH] Last PAID dividend: R$ ${ultimoDividendo} on ${dataUltimoDividendo}`);
            }

            // Mapear histórico para retorno (apenas pagos, ordenado desc)
            dividendsHistory = last12MonthsPaid
              .map((d: any) => ({
                paymentDate: d.paymentDate,
                rate: d.rate,
                type: d.type || 'Dividendo',
                relatedTo: d.relatedTo,
              }))
              .sort((a: DividendRecord, b: DividendRecord) => 
                new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
              );
          }
        }
      } else {
        console.warn(`[ENRICH] BRAPI dividends returned status ${dividendsResponse.status}`);
      }
    } catch (dividendsError) {
      console.error('[ENRICH] Error fetching dividends from BRAPI:', dividendsError);
    }

    // =====================================================
    // STEP 3: Merge - CVM tem prioridade para indicadores
    // =====================================================
    const mergedData: Record<string, unknown> = {
      ticker: tickerUpper,
      asset_class: 'acoes',
      is_live_data: !!brapiData,
      data_source: existingData?.data_source || 'brapi_realtime',
      updated_at: new Date().toISOString(),
    };

    // Se não temos dados de nenhuma fonte, retornar erro
    if (!existingData && !brapiData) {
      return new Response(
        JSON.stringify({ error: 'No data found for ticker' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Campos exclusivos do Brapi (sempre usar Brapi se disponível)
    for (const field of BRAPI_EXCLUSIVE_FIELDS) {
      mergedData[field] = brapiData?.[field] ?? existingData?.[field] ?? null;
    }

    // Campos prioritários do CVM (usar CVM se tiver, senão Brapi)
    for (const field of CVM_PRIORITY_FIELDS) {
      const cvmValue = existingData?.[field];
      const brapiValue = brapiData?.[field];
      
      // Priorizar CVM se tiver valor válido
      if (cvmValue !== null && cvmValue !== undefined) {
        mergedData[field] = cvmValue;
      } else {
        mergedData[field] = brapiValue ?? null;
      }
    }

    // Campos de valuation - usar Brapi mas calcular se possível
    const marketCap = mergedData.market_cap as number | null;
    const patrimonioLiquido = mergedData.patrimonio_liquido as number | null;
    
    // P/L - usar Brapi ou calcular com market_cap / lucro líquido anual
    mergedData.p_l = brapiData?.p_l ?? existingData?.p_l ?? null;
    
    // P/VP - usar Brapi ou calcular com market_cap / patrimônio líquido
    if (brapiData?.p_vp) {
      mergedData.p_vp = brapiData.p_vp;
    } else if (marketCap && patrimonioLiquido && patrimonioLiquido > 0) {
      mergedData.p_vp = marketCap / patrimonioLiquido;
      console.log(`[ENRICH] Calculated P/VP: ${mergedData.p_vp}`);
    } else {
      mergedData.p_vp = existingData?.p_vp ?? null;
    }

    // EV/EBITDA - usar Brapi
    mergedData.ev_ebitda = brapiData?.ev_ebitda ?? existingData?.ev_ebitda ?? null;
    
    // P/EBIT - usar DB ou Brapi
    mergedData.p_ebit = existingData?.p_ebit ?? brapiData?.p_ebit ?? null;
    mergedData.p_ebitda = existingData?.p_ebitda ?? brapiData?.p_ebitda ?? null;
    
    // Dividend yield - priorizar calculado (12m)
    mergedData.dividend_yield = calculatedDY ?? brapiData?.dividend_yield ?? existingData?.dividend_yield ?? null;
    
    // Payout ratio - usar dados da API ou calcular
    let payoutRatio: number | null = (brapiData?.payout_ratio as number | null) ?? (existingData?.payout_ratio as number | null) ?? null;
    
    // Se não temos payout da API, calcular via LPA
    // Agora que filtramos apenas dividendos PAGOS (12m), o período está alinhado com P/L (TTM)
    if (payoutRatio === null && totalDividendos12m && totalDividendos12m > 0) {
      // Opção 1: Usar LPA real do robô CVM (se existir)
      const lpaFromDb = existingData?.lpa as number | null;
      
      // Opção 2: Estimar LPA via P/L (LPA = Preço / P/L, ambos são TTM)
      const pl = mergedData.p_l as number | null;
      const price = mergedData.current_price as number | null;
      
      let lpa = lpaFromDb;
      if (!lpa && pl && pl > 0 && price && price > 0) {
        lpa = price / pl;
        console.log(`[ENRICH] Estimated LPA from P/L: ${lpa.toFixed(4)}`);
      }
      
      if (lpa && lpa > 0) {
        payoutRatio = (totalDividendos12m / lpa) * 100;
        console.log(`[ENRICH] Calculated payout: ${payoutRatio.toFixed(2)}%`);
        
        // Sanity check: payout acima de 150% é suspeito
        if (payoutRatio > 150) {
          console.log(`[ENRICH] Warning: Payout > 150%, may indicate data issue`);
        }
      }
    }
    
    mergedData.payout_ratio = payoutRatio;
    
    // Dados de dividendos para UI
    mergedData.ultimo_dividendo = ultimoDividendo;
    mergedData.data_ultimo_dividendo = dataUltimoDividendo;
    mergedData.total_dividendos_12m = totalDividendos12m;
    mergedData.dividends_history = dividendsHistory;

    // VPA - calcular se temos patrimônio e não temos VPA
    if (!mergedData.vpa && patrimonioLiquido && marketCap) {
      // Estimar qtd ações pelo preço atual
      const currentPrice = mergedData.current_price as number | null;
      if (currentPrice && currentPrice > 0) {
        const estimatedShares = marketCap / currentPrice;
        if (estimatedShares > 0) {
          mergedData.vpa = patrimonioLiquido / estimatedShares;
          console.log(`[ENRICH] Calculated VPA: ${mergedData.vpa}`);
        }
      }
    }

    console.log(`[ENRICH] Merge complete. Key metrics:`);
    console.log(`  - current_price: ${mergedData.current_price}`);
    console.log(`  - market_cap: ${mergedData.market_cap}`);
    console.log(`  - p_l: ${mergedData.p_l}`);
    console.log(`  - p_vp: ${mergedData.p_vp}`);
    console.log(`  - roe: ${mergedData.roe}`);
    console.log(`  - m_liquida: ${mergedData.m_liquida}`);
    console.log(`  - dividend_yield (calculated): ${mergedData.dividend_yield}`);
    console.log(`  - ultimo_dividendo: ${mergedData.ultimo_dividendo}`);
    console.log(`  - dividends_history count: ${dividendsHistory.length}`);

    // =====================================================
    // STEP 4: Salvar dividends_summary (sempre que temos histórico) e cache completo (se solicitado)
    // =====================================================
    
    // Sempre salvar dividends_summary se temos histórico de dividendos
    if (dividendsHistory.length > 0) {
      try {
        const existingSummary = existingData?.dividends_summary;
        const summaryIsEmpty = !existingSummary || Object.keys(existingSummary).length === 0;
        
        if (summaryIsEmpty) {
          const dividendsSummary = {
            total_12m: totalDividendos12m,
            history: dividendsHistory,
            last: dividendsHistory[0] || null,
            calculated_at: new Date().toISOString(),
            source: 'brapi',
          };
          
          const { error: summaryError } = await supabase
            .from('fundamental_data')
            .update({ 
              dividends_summary: dividendsSummary,
              updated_at: new Date().toISOString(),
            })
            .eq('ticker', tickerUpper)
            .eq('asset_class', 'acoes');
          
          if (summaryError) {
            console.error('[ENRICH] Error saving dividends_summary:', summaryError);
          } else {
            console.log(`[ENRICH] Saved dividends_summary for ${tickerUpper} (${dividendsHistory.length} payments, total: ${totalDividendos12m})`);
          }
        }
      } catch (summaryError) {
        console.error('[ENRICH] Error saving dividends_summary:', summaryError);
      }
    }
    
    if (saveToCache && brapiData) {
      try {
        // Montar payload de upsert - sempre atualizar preço, preservar CVM
        const upsertPayload: Record<string, unknown> = {
          ticker: tickerUpper,
          asset_class: 'acoes',
          updated_at: new Date().toISOString(),
        };

        // Campos de preço/mercado - sempre atualizar
        for (const field of BRAPI_EXCLUSIVE_FIELDS) {
          if (brapiData[field] !== null && brapiData[field] !== undefined) {
            upsertPayload[field] = brapiData[field];
          }
        }

        // Campos de indicadores - só preencher se vazio no banco
        const indicatorFields = [
          'p_l', 'p_vp', 'ev_ebitda', 'p_ebit', 'p_ebitda',
          'dividend_yield', 'payout_ratio',
          ...CVM_PRIORITY_FIELDS
        ];

        for (const field of indicatorFields) {
          const dbValue = existingData?.[field];
          const isEmpty = dbValue === null || dbValue === undefined;
          
          if (isEmpty) {
            const newValue = mergedData[field];
            if (newValue !== null && newValue !== undefined) {
              upsertPayload[field] = newValue;
            }
          }
        }

        // Atualizar campos de dividendos se calculamos
        if (calculatedDY !== null) {
          upsertPayload.dividend_yield = calculatedDY;
        }
        if (ultimoDividendo !== null) {
          upsertPayload.ultimo_dividendo = ultimoDividendo;
        }
        if (dataUltimoDividendo !== null) {
          upsertPayload.data_ultimo_dividendo = dataUltimoDividendo;
        }

        // Se não tinha data_source, definir
        if (!existingData?.data_source) {
          upsertPayload.data_source = 'brapi_realtime';
        }

        const { error: upsertError } = await supabase
          .from('fundamental_data')
          .upsert(upsertPayload, {
            onConflict: 'ticker,asset_class',
          });

        if (upsertError) {
          console.error('[ENRICH] Error caching data:', upsertError);
        } else {
          console.log(`[ENRICH] Cached enriched data for ${tickerUpper}`);
        }
      } catch (cacheError) {
        console.error('[ENRICH] Error saving to cache:', cacheError);
      }
    }

    // =====================================================
    // STEP 5: Retornar dados enriquecidos
    // =====================================================
    return new Response(
      JSON.stringify(mergedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ENRICH] Error in fetch-public-stock:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
