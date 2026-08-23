import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicStockNavbar } from "@/components/layout/PublicStockNavbar";
import { PublicStockHeader } from "@/components/public/PublicStockHeader";
import { PublicIndicatorSection, Indicator } from "@/components/public/PublicIndicatorSection";
import { PublicStockCTA } from "@/components/public/PublicStockCTA";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, DollarSign, PiggyBank, Percent, Scale, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockPillarsSummary, type StockPillarSummary } from "@/components/public/StockPillarsSummary";
import { StockRadarChart } from "@/components/public/StockRadarChart";
import { StockChecklist } from "@/components/public/StockChecklist";
import { UnifiedHistoryCharts } from "@/components/public/UnifiedHistoryCharts";
import { StockPriceEvolutionChart } from "@/components/public/StockPriceEvolutionChart";
import { calculateStockPillars, type StockPillarScores } from "@/lib/stock-pillars";
import { StockWatchlistButton } from "@/components/public/StockWatchlistButton";
import { StockNotes } from "@/components/public/StockNotes";
import { StockCompareDialog } from "@/components/public/StockCompareDialog";
import { StockComparisonPanel } from "@/components/public/StockComparisonPanel";
import { PublicDividendsSection, type DividendHistoryItem } from "@/components/public/PublicDividendsSection";
import { CompanyOverview } from "@/components/public/CompanyOverview";
import { QuickStockSearch } from "@/components/public/QuickStockSearch";
import { IndicatorHistoryDialog } from "@/components/portfolio/IndicatorHistoryDialog";

export interface FundamentalData {
  ticker: string;
  asset_class: string;
  current_price: number | null;
  day_change_percent: number | null;
  market_cap: number | null;
  dividend_yield: number | null;
  p_l: number | null;
  p_vp: number | null;
  ev_ebitda: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  m_bruta: number | null;
  m_ebitda: number | null;
  m_liquida: number | null;
  div_liquida_ebitda: number | null;
  div_liquida_pl: number | null;
  liq_corrente: number | null;
  cagr_receitas_5: number | null;
  cagr_lucros_5: number | null;
  payout_ratio: number | null;
  giro_ativos: number | null;
  updated_at: string | null;
  is_live_data?: boolean;
  // Financial institution fields
  is_financial?: boolean;
  financial_type?: string | null;
  format_flags?: {
    ebitda_applicable?: boolean;
    percent_out_of_range?: string[];
    null_critical_fields?: string[];
  } | null;
  // Dividend history fields
  ultimo_dividendo?: number | null;
  data_ultimo_dividendo?: string | null;
  total_dividendos_12m?: number | null;
  dividends_history?: DividendHistoryItem[] | null;
  // Company profile fields
  company_name?: string | null;
  sector?: string | null;
  industry?: string | null;
  business_summary?: string | null;
  website?: string | null;
  full_time_employees?: number | null;
}

export default function PublicStock() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<FundamentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLiveData, setIsLiveData] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState<Pick<
    FundamentalData,
    "current_price" | "day_change_percent" | "market_cap" | "updated_at" | "is_live_data" | "dividend_yield" | "ultimo_dividendo" | "data_ultimo_dividendo" | "total_dividendos_12m" | "dividends_history" | "payout_ratio"
  > | null>(null);
  const [pillarScores, setPillarScores] = useState<StockPillarScores | null>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<FundamentalData | null>(null);
  const [compareQuoteData, setCompareQuoteData] = useState<Pick<
    FundamentalData,
    "current_price" | "day_change_percent" | "market_cap" | "updated_at" | "is_live_data"
  > | null>(null);
  const [compareIsLiveData, setCompareIsLiveData] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [comparePillarScores, setComparePillarScores] = useState<StockPillarScores | null>(null);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<{
    key: string;
    label: string;
    isPercentage: boolean;
  } | null>(null);

  const tickerUpper = ticker?.toUpperCase() || "";

  const QUOTE_TTL_MS = 15 * 60 * 1000; // 15 minutos
  const quoteTTLKey = tickerUpper ? `public_stock_quote_last_fetch_${tickerUpper}` : null;
  const quotePayloadKey = tickerUpper ? `public_stock_quote_payload_${tickerUpper}` : null;

  // Carregar payload do localStorage ao montar
  useEffect(() => {
    if (!quotePayloadKey) return;
    try {
      const stored = localStorage.getItem(quotePayloadKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          console.log('[DEBUG] Loaded quoteData from localStorage:', Object.keys(parsed));
          setQuoteData(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [quotePayloadKey]);

  // Dados de dividendos combinados: prioriza live (quoteData) sobre cache (data) com fallback para dividends_summary
  const dividendData = useMemo(() => {
    // Fallback para dividends_summary do banco (jsonb com history e total)
    const dbSummary = (data as any)?.dividends_summary as {
      total_12m?: number;
      history?: DividendHistoryItem[];
    } | null;

    const result = {
      dividendYield: quoteData?.dividend_yield ?? data?.dividend_yield ?? null,
      ultimoDividendo: quoteData?.ultimo_dividendo ?? data?.ultimo_dividendo ?? null,
      dataUltimoDividendo: quoteData?.data_ultimo_dividendo ?? data?.data_ultimo_dividendo ?? null,
      totalDividendos12m: quoteData?.total_dividendos_12m ?? dbSummary?.total_12m ?? null,
      payoutRatio: quoteData?.payout_ratio ?? data?.payout_ratio ?? null,
      dividendsHistory: quoteData?.dividends_history ?? dbSummary?.history ?? [],
    };
    console.log('[DEBUG] dividendData computed:', {
      source: quoteData?.dividend_yield !== undefined ? 'quoteData (live)' : 'data (cache)',
      dividendYield: result.dividendYield,
      ultimoDividendo: result.ultimoDividendo,
      totalDividendos12m: result.totalDividendos12m,
      payoutRatio: result.payoutRatio,
      historyCount: result.dividendsHistory?.length ?? 0,
      quoteDataKeys: quoteData ? Object.keys(quoteData) : [],
      hasDbSummary: !!dbSummary,
    });
    return result;
  }, [quoteData, data]);

  // Verifica se precisa buscar dados de dividendos (independente do TTL de preço)
  const needsDividendEnrichment = useMemo(() => {
    // Se já temos histórico de dividendos carregado, não precisa
    if (quoteData?.dividends_history && quoteData.dividends_history.length > 0) return false;
    // Se o banco tem dados de total_dividendos, não precisa (improvável, mas safety)
    if (data?.total_dividendos_12m != null) return false;
    // Precisa buscar dividendos
    return true;
  }, [quoteData, data]);

  const isMarketHours = useCallback((d: Date) => {
    const hour = d.getHours();
    // Requisições de preço fazem sentido no pregão: 10h–18h (horário local do usuário)
    return hour >= 10 && hour < 18;
  }, []);

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      setLoading(true);
      setNotFound(false);
      setIsLiveData(false);
      setQuoteData(null);
      setPillarScores(null);
      
      // 1. Try to fetch from database first
      const { data: fundamentalData, error } = await supabase
        .from("fundamental_data")
        .select("*")
        .eq("ticker", tickerUpper)
        // Só B3: prioriza classe canônica do robô (acoes) e mantém compatibilidade com legados PT.
        // IMPORTANT: NÃO incluir 'stock' aqui para não misturar registros.
        .in("asset_class", ["acoes", "Ação", "Ações", "Renda Variável"])
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar dados do banco:", error);
      }
      
      if (fundamentalData) {
        setData(fundamentalData as FundamentalData);
        const scores = calculateStockPillars(fundamentalData as FundamentalData);
        setPillarScores(scores);
      } else {
        setData(null);
      }

      // 2) Sempre ao abrir: buscar cotação (preço + variação) em tempo real,
      // mas sem gravar no banco (saveToCache=false). Aplicamos TTL local de 15min
      // apenas para evitar spam/limite caso o usuário recarregue muito.
      const now = Date.now();
      const nowDate = new Date(now);
      const ttlExpired = (() => {
        if (!quoteTTLKey) return true;
        try {
          const last = Number(localStorage.getItem(quoteTTLKey));
          if (!Number.isFinite(last) || last <= 0) return true;
          return now - last > QUOTE_TTL_MS;
        } catch {
          return true;
        }
      })();

      // Se já temos base no banco, só atualizamos “preço” durante o pregão.
      const allowQuoteRefresh = !fundamentalData || isMarketHours(nowDate);

      // Verificar se precisa buscar dados de dividendos (falta total ou histórico)
      const missingDividendData = (() => {
        // 1. Verificar se localStorage tem dados completos
        if (quotePayloadKey) {
          try {
            const stored = localStorage.getItem(quotePayloadKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.dividends_history?.length > 0 && parsed?.total_dividendos_12m != null) {
                return false;
              }
            }
          } catch { /* ignore */ }
        }
        
        // 2. Verificar se o banco tem dividends_summary preenchido
        const dbSummary = (fundamentalData as any)?.dividends_summary;
        if (dbSummary && typeof dbSummary === 'object') {
          if (dbSummary.history?.length > 0 && dbSummary.total_12m != null) {
            return false;
          }
        }
        
        // 3. Se não tem em nenhum lugar, PRECISA buscar (não usar payout_ratio como proxy!)
        return true;
      })();

      const shouldFetchQuote = ttlExpired || missingDividendData;
      console.log('[DEBUG] Fetch decision:', { ttlExpired, missingDividendData, shouldFetchQuote, allowQuoteRefresh });

      if (shouldFetchQuote && (allowQuoteRefresh || missingDividendData)) {
        setIsFetchingQuote(true);
        try {
          const { data: liveData, error: liveError } = await supabase.functions.invoke(
            "fetch-public-stock",
            { body: { ticker: tickerUpper, saveToCache: false } }
          );

          if (liveError) {
            console.error("Erro ao buscar cotação em tempo real:", liveError);
            // Se já temos dados do banco, não é "not found" — só falha de atualização.
            if (!fundamentalData) setNotFound(true);
          } else if (liveData && !liveData.error) {
            console.log('[DEBUG] Live data received from API:', {
              dividend_yield: liveData.dividend_yield,
              ultimo_dividendo: liveData.ultimo_dividendo,
              total_dividendos_12m: liveData.total_dividendos_12m,
              dividends_history_count: liveData.dividends_history?.length,
            });
            // Persistência somente UI: não upsertamos.
            setQuoteData({
              current_price: liveData.current_price ?? null,
              day_change_percent: liveData.day_change_percent ?? null,
              market_cap: liveData.market_cap ?? null,
              updated_at: liveData.updated_at ?? null,
              is_live_data: true,
              // Dividend data from live fetch
              dividend_yield: liveData.dividend_yield ?? null,
              ultimo_dividendo: liveData.ultimo_dividendo ?? null,
              data_ultimo_dividendo: liveData.data_ultimo_dividendo ?? null,
              total_dividendos_12m: liveData.total_dividendos_12m ?? null,
              dividends_history: liveData.dividends_history ?? null,
              payout_ratio: liveData.payout_ratio ?? null,
            });
            setIsLiveData(true);
            try {
              if (quoteTTLKey) localStorage.setItem(quoteTTLKey, String(now));
              // Persistir o payload completo no localStorage
              if (quotePayloadKey) {
                const payloadToStore = {
                  current_price: liveData.current_price ?? null,
                  day_change_percent: liveData.day_change_percent ?? null,
                  market_cap: liveData.market_cap ?? null,
                  updated_at: liveData.updated_at ?? null,
                  is_live_data: true,
                  dividend_yield: liveData.dividend_yield ?? null,
                  ultimo_dividendo: liveData.ultimo_dividendo ?? null,
                  data_ultimo_dividendo: liveData.data_ultimo_dividendo ?? null,
                  total_dividendos_12m: liveData.total_dividendos_12m ?? null,
                  dividends_history: liveData.dividends_history ?? null,
                  payout_ratio: liveData.payout_ratio ?? null,
                };
                localStorage.setItem(quotePayloadKey, JSON.stringify(payloadToStore));
                console.log('[DEBUG] Saved quoteData to localStorage');
              }
            } catch {
              // ignore
            }

            // Se não havia dado no banco, usamos o retorno para renderizar a página.
            if (!fundamentalData) {
              setData(liveData as FundamentalData);
            }
          } else {
            console.log("Ação não encontrada na BRAPI:", liveData?.error);
            if (!fundamentalData) setNotFound(true);
          }
        } catch (err) {
          console.error("Erro na chamada da edge function (cotação):", err);
          if (!fundamentalData) setNotFound(true);
        } finally {
          setIsFetchingQuote(false);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [ticker, tickerUpper, isMarketHours]);

  // SEO meta tags
  useEffect(() => {
    if (tickerUpper) {
      document.title = `${tickerUpper} - Indicadores Fundamentalistas | MONIITOR`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Análise fundamentalista completa de ${tickerUpper}. Veja P/L, P/VP, ROE, margens, endividamento e mais indicadores. Dados atualizados automaticamente.`
        );
      }
    }
    
    return () => {
      document.title = "MONIITOR - Gestão Patrimonial Inteligente";
    };
  }, [tickerUpper]);

  const buildIndicators = useCallback((d: FundamentalData | null) => {
    // Check if EBITDA fields should be hidden (financial institutions)
    const isFinancial = d?.is_financial || false;
    const ebitdaApplicable = d?.format_flags?.ebitda_applicable !== false && !isFinancial;
    
    const valuation: Indicator[] = [
      { label: "P/L", value: d?.p_l, format: "number" as const, indicatorKey: "p_l" },
      { label: "P/VP", value: d?.p_vp, format: "number" as const, indicatorKey: "p_vp" },
      // Only show EV/EBITDA for non-financial companies
      ...(ebitdaApplicable ? [{ label: "EV/EBITDA", value: d?.ev_ebitda, format: "number" as const, indicatorKey: "ev_ebitda" }] : []),
      { label: "Dividend Yield", value: d?.dividend_yield, format: "percent" as const, indicatorKey: "dividend_yield" },
      { label: "Payout", value: d?.payout_ratio, format: "percent" as const, indicatorKey: "payout_ratio" },
    ];

    const profitability: Indicator[] = [
      { label: "ROE", value: d?.roe, format: "percent" as const, indicatorKey: "roe" },
      { label: "ROA", value: d?.roa, format: "percent" as const, indicatorKey: "roa" },
      { label: "ROIC", value: d?.roic, format: "percent" as const, indicatorKey: "roic" },
    ];

    // Only show Margem EBITDA for non-financial companies
    const margins: Indicator[] = [
      { label: "Margem Bruta", value: d?.m_bruta, format: "percent" as const, indicatorKey: "m_bruta" },
      ...(ebitdaApplicable ? [{ label: "Margem EBITDA", value: d?.m_ebitda, format: "percent" as const, indicatorKey: "m_ebitda" }] : []),
      { label: "Margem Líquida", value: d?.m_liquida, format: "percent" as const, indicatorKey: "m_liquida" },
    ];

    // Only show Dív. Líq./EBITDA for non-financial companies
    const debt: Indicator[] = [
      ...(ebitdaApplicable ? [{ label: "Dív. Líq./EBITDA", value: d?.div_liquida_ebitda, format: "number" as const, indicatorKey: "div_liquida_ebitda" }] : []),
      { label: "Dív. Líq./PL", value: d?.div_liquida_pl, format: "number" as const, indicatorKey: "div_liquida_pl" },
      { label: "Liquidez Corrente", value: d?.liq_corrente, format: "number" as const, indicatorKey: "liq_corrente" },
    ];

    const growth: Indicator[] = [
      { label: "CAGR Receita (5a)", value: d?.cagr_receitas_5, format: "percent" as const, indicatorKey: "cagr_receitas_5a" },
      { label: "CAGR Lucro (5a)", value: d?.cagr_lucros_5, format: "percent" as const, indicatorKey: "cagr_lucros_5a" },
    ];

    const efficiency: Indicator[] = [
      { label: "Giro do Ativo", value: d?.giro_ativos, format: "number" as const, indicatorKey: "giro_ativos" },
    ];

    return {
      valuation,
      performance: [...profitability, ...margins, ...growth, ...efficiency],
      health: debt,
      dividends: valuation.filter((i) => ["Dividend Yield", "Payout"].includes(i.label)),
    };
  }, []);

  const baseIndicatorGroups = useMemo(() => buildIndicators(data), [buildIndicators, data]);
  const compareIndicatorGroups = useMemo(() => buildIndicators(compareData), [buildIndicators, compareData]);

  // Handler for indicator clicks to open history dialog
  const handleIndicatorClick = useCallback((indicator: Indicator) => {
    if (!indicator.indicatorKey) return;
    setSelectedIndicator({
      key: indicator.indicatorKey,
      label: indicator.label,
      isPercentage: indicator.format === "percent",
    });
    setHistoryDialogOpen(true);
  }, []);

  const formatMaybeNumber = (value: number | null | undefined, format: "number" | "percent" | "currency") => {
    if (value === null || value === undefined) return "—";
    // Database stores percentages as decimals (0.xx), multiply by 100 for display
    if (format === "percent") return `${(value * 100).toFixed(2)}%`;
    if (format === "currency") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }
    return value.toFixed(2);
  };

  const getValuationTone = (): StockPillarSummary["tone"] => {
    // Heurística simples (não é recomendação): P/L muito alto pode indicar “caro”, muito baixo pode indicar risco ou barato.
    const pl = data?.p_l;
    if (pl === null || pl === undefined) return "neutral";
    if (pl <= 0) return "negative";
    if (pl > 25) return "neutral";
    return "positive";
  };

  const getPerformanceTone = (): StockPillarSummary["tone"] => {
    const roe = data?.roe;
    if (roe === null || roe === undefined) return "neutral";
    if (roe < 0) return "negative";
    if (roe >= 10) return "positive";
    return "neutral";
  };

  const getHealthTone = (): StockPillarSummary["tone"] => {
    const debt = data?.div_liquida_ebitda;
    const liq = data?.liq_corrente;

    // Se não há dados suficientes, neutro.
    if ((debt === null || debt === undefined) && (liq === null || liq === undefined)) return "neutral";

    // Dívida alta ou liquidez baixa → risco.
    if ((debt !== null && debt !== undefined && debt > 3) || (liq !== null && liq !== undefined && liq < 1)) {
      return "negative";
    }

    return "positive";
  };

  const getDividendTone = (): StockPillarSummary["tone"] => {
    const dy = data?.dividend_yield;
    if (dy === null || dy === undefined) return "neutral";
    if (dy <= 0) return "negative";
    if (dy >= 4) return "positive";
    return "neutral";
  };

  const summaryItems: StockPillarSummary[] = useMemo(() => [
    {
      key: "valuation",
      title: "Valuation",
      tone: getValuationTone(),
      score: pillarScores?.valuation.score,
      highlights: [
        { label: "P/L", value: formatMaybeNumber(data?.p_l, "number") },
        { label: "P/VP", value: formatMaybeNumber(data?.p_vp, "number") },
        { label: "EV/EBITDA", value: formatMaybeNumber(data?.ev_ebitda, "number") },
      ],
    },
    {
      key: "performance",
      title: "Performance",
      tone: getPerformanceTone(),
      score: pillarScores?.performance.score,
      highlights: [
        { label: "ROE", value: formatMaybeNumber(data?.roe, "percent") },
        { label: "Margem Líquida", value: formatMaybeNumber(data?.m_liquida, "percent") },
        { label: "ROA", value: formatMaybeNumber(data?.roa, "percent") },
      ],
    },
    {
      key: "financial_health",
      title: "Saúde Financeira",
      tone: getHealthTone(),
      score: pillarScores?.health.score,
      highlights: [
        { label: "Dív. Líq./EBITDA", value: formatMaybeNumber(data?.div_liquida_ebitda, "number") },
        { label: "Liquidez Corrente", value: formatMaybeNumber(data?.liq_corrente, "number") },
        { label: "Dív. Líq./PL", value: formatMaybeNumber(data?.div_liquida_pl, "number") },
      ],
    },
    {
      key: "dividends",
      title: "Dividendos",
      tone: getDividendTone(),
      score: pillarScores?.dividends.score,
      highlights: [
        { label: "Dividend Yield", value: formatMaybeNumber(data?.dividend_yield, "percent") },
        { label: "Payout", value: formatMaybeNumber(data?.payout_ratio, "percent") },
      ],
    },
  ], [data, pillarScores]);

  const compareSummaryItems: StockPillarSummary[] = useMemo(() => {
    const d = compareData;
    const scores = comparePillarScores;
    if (!d) return [];
    return [
      {
        key: "valuation",
        title: "Valuation",
        tone: "neutral",
        score: scores?.valuation.score,
        highlights: [
          { label: "P/L", value: formatMaybeNumber(d?.p_l, "number") },
          { label: "P/VP", value: formatMaybeNumber(d?.p_vp, "number") },
          { label: "EV/EBITDA", value: formatMaybeNumber(d?.ev_ebitda, "number") },
        ],
      },
      {
        key: "performance",
        title: "Performance",
        tone: "neutral",
        score: scores?.performance.score,
        highlights: [
          { label: "ROE", value: formatMaybeNumber(d?.roe, "percent") },
          { label: "Margem Líquida", value: formatMaybeNumber(d?.m_liquida, "percent") },
          { label: "ROA", value: formatMaybeNumber(d?.roa, "percent") },
        ],
      },
      {
        key: "financial_health",
        title: "Saúde Financeira",
        tone: "neutral",
        score: scores?.health.score,
        highlights: [
          { label: "Dív. Líq./EBITDA", value: formatMaybeNumber(d?.div_liquida_ebitda, "number") },
          { label: "Liquidez Corrente", value: formatMaybeNumber(d?.liq_corrente, "number") },
          { label: "Dív. Líq./PL", value: formatMaybeNumber(d?.div_liquida_pl, "number") },
        ],
      },
      {
        key: "dividends",
        title: "Dividendos",
        tone: "neutral",
        score: scores?.dividends.score,
        highlights: [
          { label: "Dividend Yield", value: formatMaybeNumber(d?.dividend_yield, "percent") },
          { label: "Payout", value: formatMaybeNumber(d?.payout_ratio, "percent") },
        ],
      },
    ];
  }, [compareData, comparePillarScores]);

  const loadCompare = useCallback(async (t: string) => {
    const target = t.trim().toUpperCase();
    if (!target) return;
    if (target === tickerUpper) return;

    setCompareLoading(true);
    setCompareTicker(target);
    setCompareIsLiveData(false);
    setCompareQuoteData(null);
    setComparePillarScores(null);

    try {
      // 1) Banco primeiro
      const { data: fundamentalData, error } = await supabase
        .from("fundamental_data")
        .select("*")
        .eq("ticker", target)
        .in("asset_class", ["acoes", "Ação", "Ações", "Renda Variável"])
        .maybeSingle();

      if (error) console.error("Erro ao buscar comparado do banco:", error);

      if (fundamentalData) {
        setCompareData(fundamentalData as FundamentalData);
        setComparePillarScores(calculateStockPillars(fundamentalData as FundamentalData));
      } else {
        setCompareData(null);
      }

      // 2) Cotação em tempo real (UI-only)
      const now = Date.now();
      const nowDate = new Date(now);
      const ttlKey = `public_stock_quote_last_fetch_${target}`;
      const shouldFetchQuote = (() => {
        try {
          const last = Number(localStorage.getItem(ttlKey));
          if (!Number.isFinite(last) || last <= 0) return true;
          return now - last > QUOTE_TTL_MS;
        } catch {
          return true;
        }
      })();

      const allowQuoteRefresh = !fundamentalData || isMarketHours(nowDate);

      if (shouldFetchQuote && allowQuoteRefresh) {
        const { data: liveData, error: liveError } = await supabase.functions.invoke(
          "fetch-public-stock",
          { body: { ticker: target, saveToCache: false } }
        );

        if (!liveError && liveData && !liveData.error) {
          setCompareQuoteData({
            current_price: liveData.current_price ?? null,
            day_change_percent: liveData.day_change_percent ?? null,
            market_cap: liveData.market_cap ?? null,
            updated_at: liveData.updated_at ?? null,
            is_live_data: true,
          });
          setCompareIsLiveData(true);
          try {
            localStorage.setItem(ttlKey, String(now));
          } catch {
            // ignore
          }

          // Se não havia base no banco, usamos retorno para comparar.
          if (!fundamentalData) {
            setCompareData(liveData as FundamentalData);
            setComparePillarScores(calculateStockPillars(liveData as FundamentalData));
          }
        }
      }
    } finally {
      setCompareLoading(false);
    }
  }, [QUOTE_TTL_MS, tickerUpper, isMarketHours]);

  // Loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const notFoundContent = (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-foreground mb-4">
        Ativo não encontrado
      </h1>
      <p className="text-muted-foreground mb-8">
        O ticker <span className="font-semibold">{tickerUpper}</span> não foi encontrado em nossa base de dados.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Estamos constantemente atualizando nossa base. Volte em breve!
      </p>
      <Link to="/ticker">
        <Button>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ver todos os ativos
        </Button>
      </Link>
    </div>
  );

  const mainContent = (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link 
          to="/ticker" 
          className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </Link>
        <QuickStockSearch currentTicker={tickerUpper} />
      </nav>

      {/* Topo: header (esquerda) + gráfico (direita) - layout próximo */}
      <div className="grid gap-4 lg:gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="min-w-[280px] max-w-[360px]">
          {/* Header com preço e variação */}
          {loading ? (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-10 w-40 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          ) : (
            <PublicStockHeader
              ticker={tickerUpper}
              currentPrice={quoteData?.current_price ?? data?.current_price}
              dayChangePercent={quoteData?.day_change_percent ?? data?.day_change_percent}
              marketCap={quoteData?.market_cap ?? data?.market_cap}
              updatedAt={quoteData?.updated_at ?? data?.updated_at}
              isLiveData={isLiveData}
            />
          )}

          {/* Ações do header */}
          {!loading && !notFound && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)} disabled={!tickerUpper || compareLoading}>
                <Scale className="mr-2 h-4 w-4" />
                Comparar
              </Button>

              {isAuthenticated && (
                <StockWatchlistButton ticker={tickerUpper} assetClass={data?.asset_class || "acoes"} />
              )}
            </div>
          )}
        </div>

        {/* Gráfico ao lado do ticker (somente desktop) - expande para preencher */}
        {!notFound && (
          <div className="hidden lg:block">
            <StockPriceEvolutionChart ticker={tickerUpper} variant="hero" />
          </div>
        )}
      </div>

       {!notFound && (
         <>
           <StockPillarsSummary items={summaryItems} />
           
           {pillarScores && (
             <div className="mt-8 grid md:grid-cols-2 gap-6 items-start">
               <StockRadarChart scores={pillarScores} />
               <StockChecklist scores={pillarScores} />
             </div>
           )}
           
           {/* Overview da Empresa */}
           {(quoteData as any)?.company_name || (quoteData as any)?.sector || (quoteData as any)?.business_summary ? (
             <div className="mt-8">
               <CompanyOverview
                 companyName={(quoteData as any)?.company_name}
                 sector={(quoteData as any)?.sector}
                 industry={(quoteData as any)?.industry}
                 businessSummary={(quoteData as any)?.business_summary}
                 website={(quoteData as any)?.website}
                 employees={(quoteData as any)?.full_time_employees}
               />
             </div>
           ) : null}
           
            {/* Seção de Dividendos */}
            <div className="mt-8">
              <PublicDividendsSection
                dividendYield={dividendData.dividendYield}
                ultimoDividendo={dividendData.ultimoDividendo}
                dataUltimoDividendo={dividendData.dataUltimoDividendo}
                totalDividendos12m={dividendData.totalDividendos12m}
                payoutRatio={dividendData.payoutRatio}
                dividendsHistory={dividendData.dividendsHistory}
                loading={loading || isFetchingQuote}
              />
            </div>
           
           {/* Histórico Unificado */}
           <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Evolução Histórica</h2>
              <div className="space-y-6">
                 {/* No desktop o gráfico fica ao lado do ticker; aqui mostramos apenas no mobile */}
                 <div className="lg:hidden">
                   <StockPriceEvolutionChart ticker={tickerUpper} />
                 </div>
                 <UnifiedHistoryCharts ticker={tickerUpper} assetClass={data?.asset_class || "acoes"} isFinancial={data?.is_financial} />
              </div>
           </div>
         
         {/* Notas do usuário (só aparece se logado) */}
         {isAuthenticated && (
           <div className="mt-8">
             <StockNotes ticker={tickerUpper} assetClass={data?.asset_class || "acoes"} />
           </div>
         )}
         </>
       )}

      {/* Seções de indicadores */}
      <div className="grid gap-6 mt-12">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Indicadores Detalhados</h2>
        <PublicIndicatorSection
          title="Valuation"
          icon={<DollarSign className="h-5 w-5" />}
          indicators={baseIndicatorGroups.valuation}
          loading={loading}
          categoryColor="orange"
          onIndicatorClick={handleIndicatorClick}
        />

        <PublicIndicatorSection
           title="Performance"
           icon={<TrendingUp className="h-5 w-5" />}
           indicators={baseIndicatorGroups.performance}
           loading={loading}
           categoryColor="purple"
           onIndicatorClick={handleIndicatorClick}
         />

         <PublicIndicatorSection
           title="Financial Health"
           icon={<PiggyBank className="h-5 w-5" />}
            indicators={baseIndicatorGroups.health}
           loading={loading}
           categoryColor="blue"
           onIndicatorClick={handleIndicatorClick}
         />


          {compareTicker && compareData && (
            <StockComparisonPanel
              baseTicker={tickerUpper}
              compareTicker={compareTicker}
              baseScores={pillarScores}
              compareScores={comparePillarScores}
              baseIndicatorGroups={baseIndicatorGroups}
              compareIndicatorGroups={compareIndicatorGroups}
              onClear={() => {
                setCompareTicker(null);
                setCompareData(null);
                setCompareQuoteData(null);
                setComparePillarScores(null);
              }}
            />
          )}
      </div>

      <StockCompareDialog
        open={compareOpen}
        onOpenChange={(o) => {
          setCompareOpen(o);
          if (!o) {
            // não limpar comparação ao fechar o diálogo
          }
        }}
        baseTicker={tickerUpper}
        onCompare={(t) => loadCompare(t)}
      />

      {/* Indicator History Dialog */}
      <IndicatorHistoryDialog
        isOpen={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        ticker={tickerUpper}
        indicatorKey={selectedIndicator?.key || ""}
        indicatorLabel={selectedIndicator?.label || ""}
        isPercentage={selectedIndicator?.isPercentage}
      />
    </>
  );

  // Authenticated user: AppLayout without CTA
  if (isAuthenticated) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          {notFound ? notFoundContent : mainContent}
        </div>
      </AppLayout>
    );
  }

  // Non-authenticated user: Public layout with CTA and footer
  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <PublicStockNavbar />
        <main className="container mx-auto px-4 py-16">
          {notFoundContent}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicStockNavbar />
      
      <main className="container mx-auto px-4 py-8">
        {mainContent}

        {/* CTA para cadastro */}
        <PublicStockCTA />
      </main>

      {/* Footer simples */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MONIITOR. Todos os direitos reservados.</p>
          <p className="mt-2">
            Os dados apresentados são apenas para fins informativos e não constituem recomendação de investimento.
          </p>
        </div>
      </footer>
    </div>
  );
}
