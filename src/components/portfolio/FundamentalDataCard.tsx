import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, DollarSign, Percent, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { FundamentalDataExpanded } from "./FundamentalDataExpanded";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { FundamentalDataCardFII } from "./FundamentalDataCardFII";
import { isFIITicker } from "@/lib/ticker-detection";

interface FundamentalDataCardProps {
  ticker: string;
  assetClass: string;
  currency: string;
}

interface FundamentalData {
  current_price?: number;
  previous_close?: number;
  day_change_percent?: number;
  week_52_high?: number;
  week_52_low?: number;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  p_vp?: number;
  dividend_yield?: number;
  dy?: number;
  avg_volume?: number;
  patrimonio_liquido?: number;
  ultimo_dividendo?: number;
  data_ultimo_dividendo?: string;
  last_updated?: string;
  roe?: number;
  roic?: number;
  net_margin?: number;
  gross_margin?: number;
  ev_to_ebitda?: number;
  debt_to_equity?: number;
}

const indicatorExplanations: Record<string, string> = {
  "Preço Atual": "Preço atual da ação no mercado",
  "Cotação Atual": "Valor atual da cota do FII no mercado",
  "Variação Dia": "Percentual de variação do preço no dia",
  "P/L (P/E)": "Preço sobre Lucro - Indica quantos anos levaria para recuperar o investimento com base no lucro atual",
  "P/VP": "Preço sobre Valor Patrimonial - Compara o preço da ação com seu valor patrimonial",
  "Dividend Yield": "Rendimento de dividendos - Percentual de retorno anual com base nos dividendos pagos",
  "DY": "Dividend Yield - Rendimento de dividendos em percentual",
  "Valor de Mercado": "Valor total da empresa na bolsa (preço da ação × número de ações)",
  "Máx. 52 Semanas": "Maior preço atingido nos últimos 12 meses",
  "Mín. 52 Semanas": "Menor preço atingido nos últimos 12 meses",
  "Volume Médio": "Média diária de ações negociadas",
  "ROE": "Retorno sobre Patrimônio Líquido - Mede a eficiência da empresa em gerar lucro com o capital dos acionistas",
  "ROIC": "Retorno sobre Capital Investido - Mede a eficiência da empresa em gerar retorno com todo o capital investido",
  "Margem Líquida": "Percentual do lucro líquido em relação à receita total",
  "Margem Bruta": "Percentual do lucro bruto em relação à receita total",
  "EV/EBITDA": "Valor da Firma sobre EBITDA - Indica quantos anos de geração operacional de caixa seriam necessários para pagar o valor da empresa",
  "Dívida/PL": "Relação entre dívida total e patrimônio líquido - Indica o nível de alavancagem da empresa"
};

export const FundamentalDataCard = ({ ticker, assetClass, currency }: FundamentalDataCardProps) => {
  const isFII = isFIITicker(ticker);

  const [data, setData] = useState<FundamentalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (ticker && !(isFII && currency === 'BRL')) {
      fetchData();
      updateTimeUntilRefresh();
    }
  }, [ticker]);

  useEffect(() => {
    if (isFII && currency === 'BRL') return;
    const interval = setInterval(updateTimeUntilRefresh, 1000);
    return () => clearInterval(interval);
  }, [ticker, isFII, currency]);

  // If it's a FII (ticker ends with 11) and BRL, render the specific FII component
  if (isFII && currency === 'BRL') {
    return <FundamentalDataCardFII ticker={ticker} />;
  }

  const updateTimeUntilRefresh = () => {
    const lastCallKey = `last_api_call_${ticker}`;
    const lastCall = localStorage.getItem(lastCallKey);
    if (lastCall) {
      const secondsSinceCall = (Date.now() - parseInt(lastCall)) / 1000;
      const remainingSeconds = Math.max(0, 120 - secondsSinceCall);
      setTimeUntilRefresh(Math.ceil(remainingSeconds));
    } else {
      setTimeUntilRefresh(0);
    }
  };

  const mergeData = (fundamentalData: any, stockMetrics: any): FundamentalData => {
    const merged: FundamentalData = {};

    // Real-time data from fundamental_data (priority)
    if (fundamentalData) {
      merged.current_price = fundamentalData.current_price;
      merged.previous_close = fundamentalData.previous_close;
      merged.day_change_percent = fundamentalData.day_change_percent;
      merged.week_52_high = fundamentalData.week_52_high;
      merged.week_52_low = fundamentalData.week_52_low;
      merged.avg_volume = fundamentalData.avg_volume;
      merged.p_vp = fundamentalData.p_vp;
      merged.patrimonio_liquido = fundamentalData.patrimonio_liquido;
      merged.ultimo_dividendo = fundamentalData.ultimo_dividendo;
      merged.data_ultimo_dividendo = fundamentalData.data_ultimo_dividendo;
      merged.last_updated = fundamentalData.last_updated;
      merged.dy = fundamentalData.dy;
    }

    // P/L: stock_metrics > fundamental_data
    merged.pe_ratio = stockMetrics?.price_to_earnings || fundamentalData?.pe_ratio;
    // P/VP: stock_metrics > fundamental_data
    merged.pb_ratio = stockMetrics?.price_to_book || fundamentalData?.pb_ratio;
    // DY: stock_metrics > fundamental_data
    merged.dividend_yield = stockMetrics?.dividend_yield || fundamentalData?.dividend_yield;
    // Market Cap: stock_metrics > fundamental_data
    merged.market_cap = stockMetrics?.market_cap || fundamentalData?.market_cap;

    // Exclusive from stock_metrics
    if (stockMetrics) {
      merged.roe = stockMetrics.roe;
      merged.roic = stockMetrics.roic;
      merged.net_margin = stockMetrics.net_margin;
      merged.gross_margin = stockMetrics.gross_margin;
      merged.ev_to_ebitda = stockMetrics.ev_to_ebitda;
      merged.debt_to_equity = stockMetrics.debt_to_equity;

      // If fundamental_data had no last_updated, use stock_metrics
      if (!merged.last_updated && stockMetrics.last_updated) {
        merged.last_updated = stockMetrics.last_updated;
      }
    }

    return merged;
  };

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Parallel fetch: fundamental_data + stock_metrics
      const [fundamentalResult, metricsResult] = await Promise.all([
        supabase
          .from('fundamental_data')
          .select('*')
          .eq('ticker', ticker)
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('stock_metrics')
          .select('*')
          .eq('ticker', ticker)
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const cachedFundamental = fundamentalResult.data;
      const cachedMetrics = metricsResult.data;

      // If we have cached data and it's fresh enough, use merged result
      if (cachedFundamental?.last_updated) {
        const minutesSinceUpdate = (Date.now() - new Date(cachedFundamental.last_updated).getTime()) / (1000 * 60);
        if (minutesSinceUpdate < 15) {
          setData(mergeData(cachedFundamental, cachedMetrics));
          setLoading(false);
          return;
        }
      } else if (cachedMetrics) {
        // No fundamental_data but we have stock_metrics - show what we have
        // Still try to fetch fresh data below, but don't block
      }

      // Check rate limiting
      const lastCallKey = `last_api_call_${ticker}`;
      const lastCall = localStorage.getItem(lastCallKey);
      if (!forceRefresh && lastCall) {
        const minutesSinceCall = (Date.now() - parseInt(lastCall)) / (1000 * 60);
        if (minutesSinceCall < 2) {
          if (cachedFundamental || cachedMetrics) {
            setData(mergeData(cachedFundamental, cachedMetrics));
            setLoading(false);
            const secondsRemaining = Math.ceil((2 - minutesSinceCall) * 60);
            updateTimeUntilRefresh();
            toast({
              title: "⏱️ Aguarde para atualizar",
              description: `Aguarde ${secondsRemaining}s ou clique em "Forçar" para atualizar agora.`,
              variant: "default",
            });
            return;
          }
        }
      }

      // Store timestamp before making call
      localStorage.setItem(lastCallKey, Date.now().toString());

      const edgeFunction = currency === 'USD' ? 'fetch-fmp-stock-data' : 'fetch-fundamental-data';
      console.log(`Using ${edgeFunction} for ${ticker} (currency: ${currency})`);

      const { data: marketData, error } = await supabase.functions.invoke(edgeFunction, {
        body: { ticker, force_refresh: forceRefresh }
      });

      if (error) {
        console.error('Edge function error:', error);
        if (cachedFundamental || cachedMetrics) {
          setData(mergeData(cachedFundamental, cachedMetrics));
          toast({
            title: "Usando dados em cache",
            description: "Não foi possível atualizar. Mostrando dados anteriores.",
            variant: "default",
          });
          return;
        }
        throw error;
      }

      if (!marketData) {
        console.error('No data returned from edge function');
        if (cachedFundamental || cachedMetrics) {
          setData(mergeData(cachedFundamental, cachedMetrics));
          toast({
            title: "Usando dados em cache",
            description: "API não retornou dados. Mostrando dados anteriores.",
          });
          return;
        }
        throw new Error('Nenhum dado retornado pela API');
      }

      // Fetch fresh fundamental_data after the edge function updates it
      const { data: freshData } = await supabase
        .from('fundamental_data')
        .select('*')
        .eq('ticker', ticker)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (freshData) {
        setData(mergeData(freshData, cachedMetrics));
        updateTimeUntilRefresh();
        toast({
          title: "✅ Dados atualizados",
          description: "Indicadores fundamentalistas carregados com sucesso.",
        });
      } else if (cachedFundamental || cachedMetrics) {
        setData(mergeData(cachedFundamental, cachedMetrics));
        toast({
          title: "Usando dados em cache",
          description: "Não foi possível obter dados atualizados.",
        });
      } else {
        throw new Error('Nenhum dado disponível para este ativo');
      }
    } catch (error: any) {
      console.error('Error fetching fundamental data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Não foi possível buscar os dados de mercado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value?: number, decimals = 2) => {
    if (!value) return '-';
    return value.toFixed(decimals);
  };

  const formatMarketCap = (value?: number) => {
    if (!value) return '-';
    if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(2)}M`;
    return formatCurrency(value);
  };

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}%`;
  };

  const getChangeColor = (value?: number) => {
    if (!value) return 'text-muted-foreground';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (value?: number) => {
    if (!value) return null;
    return value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const IndicatorTooltip = ({ label, explanation }: { label: string; explanation?: string }) => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <HelpCircle className="h-3 w-3 cursor-help" />
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <p className="text-sm">{explanation || indicatorExplanations[label] || label}</p>
      </HoverCardContent>
    </HoverCard>
  );

  if (loading && !data) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">
          Carregando indicadores de <strong>{ticker}</strong>...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Nenhum dado disponível para <strong>{ticker}</strong>
        </p>
        <Button onClick={() => fetchData(true)} disabled={loading}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const hasStockMetricsExtras = data.roe !== undefined && data.roe !== null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            {isExpanded ? 'Ocultar detalhes' : 'Ver todos os indicadores'}
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          {timeUntilRefresh > 0 && (
            <Badge variant="outline" className="text-xs">
              {Math.floor(timeUntilRefresh / 60)}:{(timeUntilRefresh % 60).toString().padStart(2, '0')}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={loading || timeUntilRefresh > 0}
            title={timeUntilRefresh > 0 ? `Aguarde ${timeUntilRefresh}s` : 'Atualizar (usa cache se disponível)'}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Atualizar</span>
          </Button>
          {timeUntilRefresh > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              title="Forçar atualização (ignora cache e rate limit)"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''} text-primary`} />
              <span className="ml-2">Forçar</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Preço Atual */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {isFII ? 'Cotação Atual' : 'Preço Atual'}
            <IndicatorTooltip label={isFII ? 'Cotação Atual' : 'Preço Atual'} />
          </p>
          <p className="text-lg font-semibold">{formatCurrency(data.current_price)}</p>
        </div>

        {/* Variação */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Variação Dia
            <IndicatorTooltip label="Variação Dia" />
          </p>
          <p className={`text-lg font-semibold flex items-center gap-1 ${getChangeColor(data.day_change_percent)}`}>
            {getChangeIcon(data.day_change_percent)}
            {formatNumber(data.day_change_percent)}%
          </p>
        </div>

        {/* P/L para ações */}
        {!isFII && data.pe_ratio && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              P/L (P/E)
              <IndicatorTooltip label="P/L (P/E)" />
            </p>
            <p className="text-lg font-semibold">{formatNumber(data.pe_ratio)}</p>
          </div>
        )}

        {/* P/VP apenas para FIIs */}
        {isFII && (data.p_vp || data.pb_ratio) && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              P/VP (P/B)
              <IndicatorTooltip label="P/VP" />
            </p>
            <p className="text-lg font-semibold">{formatNumber(data.p_vp || data.pb_ratio)}</p>
          </div>
        )}

        {/* Valor Patrimonial (apenas para FIIs) */}
        {isFII && data.patrimonio_liquido && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor Patrimonial</p>
            <p className="text-lg font-semibold">{formatCurrency(data.patrimonio_liquido)}</p>
          </div>
        )}

        {/* Dividend Yield */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Dividend Yield
            <IndicatorTooltip label="Dividend Yield" />
          </p>
          <p className="text-lg font-semibold">
            {isFII 
              ? (data.dy ? `${formatNumber(data.dy)}%` : '-')
              : (data.dividend_yield ? `${formatNumber(data.dividend_yield)}%` : '-')
            }
          </p>
        </div>

        {/* Último Provento */}
        {data.ultimo_dividendo && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Último {isFII ? 'Provento' : 'Dividendo'}</p>
            <p className="text-lg font-semibold">{formatCurrency(data.ultimo_dividendo)}</p>
            {data.data_ultimo_dividendo && (
              <p className="text-xs text-muted-foreground">{data.data_ultimo_dividendo}</p>
            )}
          </div>
        )}

        {/* Market Cap (apenas para ações) */}
        {!isFII && data.market_cap && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Valor de Mercado
              <IndicatorTooltip label="Valor de Mercado" />
            </p>
            <p className="text-lg font-semibold">{formatMarketCap(data.market_cap)}</p>
          </div>
        )}

        {/* ROE - from stock_metrics */}
        {data.roe != null && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ROE
              <IndicatorTooltip label="ROE" />
            </p>
            <p className="text-lg font-semibold">{formatPercent(data.roe)}</p>
          </div>
        )}

        {/* Margem Líquida - from stock_metrics */}
        {data.net_margin != null && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Margem Líquida
              <IndicatorTooltip label="Margem Líquida" />
            </p>
            <p className="text-lg font-semibold">{formatPercent(data.net_margin)}</p>
          </div>
        )}

        {/* 52W High */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Máx. 52 Semanas
            <IndicatorTooltip label="Máx. 52 Semanas" />
          </p>
          <p className="text-lg font-semibold">{formatCurrency(data.week_52_high)}</p>
        </div>

        {/* 52W Low */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Mín. 52 Semanas
            <IndicatorTooltip label="Mín. 52 Semanas" />
          </p>
          <p className="text-lg font-semibold">{formatCurrency(data.week_52_low)}</p>
        </div>

        {/* Volume */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Volume Médio
            <IndicatorTooltip label="Volume Médio" />
          </p>
          <p className="text-lg font-semibold">
            {data.avg_volume ? (data.avg_volume / 1000000).toFixed(2) + 'M' : '-'}
          </p>
        </div>
      </div>

      {/* Extra indicators from stock_metrics */}
      {hasStockMetricsExtras && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
          {data.gross_margin != null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Margem Bruta
                <IndicatorTooltip label="Margem Bruta" />
              </p>
              <p className="text-base font-semibold">{formatPercent(data.gross_margin)}</p>
            </div>
          )}
          {data.roic != null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                ROIC
                <IndicatorTooltip label="ROIC" />
              </p>
              <p className="text-base font-semibold">{formatPercent(data.roic)}</p>
            </div>
          )}
          {data.ev_to_ebitda != null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                EV/EBITDA
                <IndicatorTooltip label="EV/EBITDA" />
              </p>
              <p className="text-base font-semibold">{formatNumber(data.ev_to_ebitda)}</p>
            </div>
          )}
          {data.debt_to_equity != null && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Dívida/PL
                <IndicatorTooltip label="Dívida/PL" />
              </p>
              <p className="text-base font-semibold">{formatNumber(data.debt_to_equity)}</p>
            </div>
          )}
        </div>
      )}

      <CollapsibleContent>
        <FundamentalDataExpanded data={data} isFII={isFII} />
      </CollapsibleContent>

      {data.last_updated && (
        <div className="pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            Atualizado: {new Date(data.last_updated).toLocaleString('pt-BR')}
          </Badge>
        </div>
      )}
    </Collapsible>
  );
};
