import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Building2, Users, Percent, Calendar, FileText, ExternalLink, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FundamentalDataCardFIIProps {
  ticker: string;
}

interface RelevantFact {
  id: string;
  titulo: string;
  resumo: string | null;
  data_publicacao: string;
  url_documento: string | null;
}

interface FIIData {
  ticker: string;
  current_price: number;
  
  // Market data
  p_vp_mercado: number | null;
  p_vp_calculado: number | null;
  ultimo_rendimento: number | null;
  volume_dia: number | null;
  dividend_yield_mes: number | null;
  performance_mes: number | null;
  performance_ano: number | null;
  
  // CVM data
  patrimonio_liquido: number | null;
  valor_patrimonial_cota: number | null;
  num_cotistas: number | null;
  taxa_vacancia: number | null;
  tipo_fii: string | null;
  segmento: string | null;
  gestor: string | null;
  administrador: string | null;
  data_referencia_cvm: string | null;
  
  // Dividends
  dividendos_1m: { valor: number; percentual: number };
  dividendos_3m: { valor: number; percentual: number };
  dividendos_6m: { valor: number; percentual: number };
  dividendos_12m: { valor: number; percentual: number };
  dividends: Array<{
    valor_por_cota: number;
    data_pagamento: string;
    data_base: string | null;
    tipo: string;
  }>;
  
  // Relevant facts
  relevant_facts: RelevantFact[];
  
  // Sources
  sources: string[];
  last_sync: string | null;
}

export const FundamentalDataCardFII = ({ ticker }: FundamentalDataCardFIIProps) => {
  const [data, setData] = useState<FIIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);

  useEffect(() => {
    fetchData();
  }, [ticker]);

  useEffect(() => {
    if (timeUntilRefresh > 0) {
      const timer = setInterval(() => {
        setTimeUntilRefresh((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeUntilRefresh]);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      const cacheKey = `fundamental_fii_complete_${ticker}`;

      // Skip cache and rate limit checks if force refresh
      if (!forceRefresh) {
        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);

        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < 10 * 60 * 1000) { // 10 minutes cache
            console.log('Using cached complete FII data');
            setData(JSON.parse(cached));
            setTimeUntilRefresh(Math.ceil((10 * 60 * 1000 - age) / 1000));
            setLoading(false);
            return;
          }
        }

        // Check rate limit
        const lastFetch = localStorage.getItem(`${cacheKey}_last_fetch`);
        if (lastFetch) {
          const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
          if (timeSinceLastFetch < 2 * 60 * 1000) { // 2 minutes rate limit
            const waitTime = Math.ceil((2 * 60 * 1000 - timeSinceLastFetch) / 1000);
            setTimeUntilRefresh(waitTime);
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              setData(JSON.parse(cached));
            }
            setLoading(false);
            return;
          }
        }
      }

      // Try to fetch complete data first (includes CVM data)
      console.log('Fetching complete FII data for:', ticker);
      const { data: completeData, error: completeError } = await supabase.functions.invoke(
        "fetch-fii-complete-data",
        {
          body: { ticker },
        }
      );

      let fiiData: FIIData;

      if (completeError || !completeData?.success) {
        console.warn('Complete data fetch failed, falling back to Yahoo:', completeError);
        
        // Fallback to Yahoo only
        const { data: yahooData, error: yahooError } = await supabase.functions.invoke(
          "fetch-yahoo-fii-data",
          {
            body: { ticker },
          }
        );

        if (yahooError) {
          throw yahooError;
        }

        fiiData = processYahooData(yahooData);
      } else {
        console.log('Complete FII data received, sources:', completeData.sources);
        fiiData = processCompleteData(completeData);
      }
      
      setData(fiiData);
      localStorage.setItem(cacheKey, JSON.stringify(fiiData));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      localStorage.setItem(`${cacheKey}_last_fetch`, Date.now().toString());
      setTimeUntilRefresh(10 * 60); // 10 minutes
    } catch (error) {
      console.error("Error fetching FII data:", error);
      
      // Try to use cached data as last resort
      const cacheKey = `fundamental_fii_complete_${ticker}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.log('Using cached data as fallback after error');
        setData(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  const processCompleteData = (rawData: any): FIIData => {
    return {
      ticker: rawData.ticker,
      current_price: rawData.current_price || 0,
      p_vp_mercado: rawData.p_vp_mercado,
      p_vp_calculado: rawData.p_vp_calculado,
      ultimo_rendimento: rawData.ultimo_dividendo,
      volume_dia: rawData.avg_volume,
      dividend_yield_mes: rawData.current_price > 0 && rawData.ultimo_dividendo > 0 
        ? (rawData.ultimo_dividendo / rawData.current_price) * 100 
        : null,
      performance_mes: rawData.performance_mes,
      performance_ano: rawData.performance_ano,
      patrimonio_liquido: rawData.patrimonio_liquido,
      valor_patrimonial_cota: rawData.valor_patrimonial_cota,
      num_cotistas: rawData.num_cotistas,
      taxa_vacancia: rawData.taxa_vacancia,
      tipo_fii: rawData.tipo_fii,
      segmento: rawData.segmento,
      gestor: rawData.gestor,
      administrador: rawData.administrador,
      data_referencia_cvm: rawData.data_referencia_cvm,
      dividendos_1m: rawData.dividendos_1m || { valor: 0, percentual: 0 },
      dividendos_3m: rawData.dividendos_3m || { valor: 0, percentual: 0 },
      dividendos_6m: rawData.dividendos_6m || { valor: 0, percentual: 0 },
      dividendos_12m: rawData.dividendos_12m || { valor: 0, percentual: 0 },
      dividends: rawData.dividends || [],
      relevant_facts: rawData.relevant_facts || [],
      sources: rawData.sources || [],
      last_sync: new Date().toISOString(),
    };
  };

  const processYahooData = (rawData: any): FIIData => {
    const currentPrice = rawData.current_price || 0;
    const dividends = rawData.dividends_summary || {};
    const historicalPrices = rawData.historical_prices || [];
    const lastDividend = rawData.ultimo_dividendo || 0;
    
    let performanceMes = null;
    let performanceAno = null;
    
    if (historicalPrices.length > 0) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthAgoPrice = historicalPrices.find((p: any) => new Date(p.date * 1000) <= thirtyDaysAgo);
      
      if (monthAgoPrice && monthAgoPrice.close > 0) {
        performanceMes = ((currentPrice - monthAgoPrice.close) / monthAgoPrice.close) * 100;
      }
      
      const oldestPrice = historicalPrices[historicalPrices.length - 1];
      if (oldestPrice && oldestPrice.close > 0) {
        performanceAno = ((currentPrice - oldestPrice.close) / oldestPrice.close) * 100;
      }
    }

    return {
      ticker: rawData.ticker,
      current_price: currentPrice,
      p_vp_mercado: rawData.p_vp,
      p_vp_calculado: null,
      ultimo_rendimento: lastDividend,
      volume_dia: rawData.avg_volume,
      dividend_yield_mes: currentPrice > 0 && lastDividend > 0 
        ? (lastDividend / currentPrice) * 100 
        : null,
      performance_mes: performanceMes,
      performance_ano: performanceAno,
      patrimonio_liquido: null,
      valor_patrimonial_cota: null,
      num_cotistas: null,
      taxa_vacancia: null,
      tipo_fii: null,
      segmento: null,
      gestor: null,
      administrador: null,
      data_referencia_cvm: null,
      dividendos_1m: {
        valor: dividends.ultimo?.valor || 0,
        percentual: dividends.ultimo?.dyPercent || 0,
      },
      dividendos_3m: {
        valor: dividends.tresMeses?.valor || 0,
        percentual: dividends.tresMeses?.dyPercent || 0,
      },
      dividendos_6m: {
        valor: dividends.seisMeses?.valor || 0,
        percentual: dividends.seisMeses?.dyPercent || 0,
      },
      dividendos_12m: {
        valor: dividends.dozeMeses?.valor || 0,
        percentual: dividends.dozeMeses?.dyPercent || 0,
      },
      dividends: [],
      relevant_facts: [],
      sources: ['yahoo_finance'],
      last_sync: new Date().toISOString(),
    };
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatLargeCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    if (value >= 1_000_000_000) {
      return `R$ ${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toFixed(2)}M`;
    }
    return formatCurrency(value);
  };

  const formatPercent = (value: number | null, decimals = 2) => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(decimals)}%`;
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getChangeIcon = (value: number | null) => {
    if (value === null || value === undefined) return <Minus className="h-4 w-4" />;
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4" />;
  };

  const getChangeColor = (value: number | null) => {
    if (value === null || value === undefined) return "text-muted-foreground";
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getPVPColor = (value: number | null) => {
    if (value === null) return "text-muted-foreground";
    if (value < 0.95) return "text-green-600";
    if (value > 1.05) return "text-red-600";
    return "text-yellow-600";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Indicadores do FII {ticker}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Indicadores do FII {ticker}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  const hasCVMData = data.patrimonio_liquido !== null || data.num_cotistas !== null;
  const bestPVP = data.p_vp_calculado ?? data.p_vp_mercado;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              Indicadores do FII {ticker}
              {data.tipo_fii && (
                <Badge variant="outline" className="text-xs">
                  {data.tipo_fii}
                </Badge>
              )}
              {data.segmento && (
                <Badge variant="secondary" className="text-xs">
                  {data.segmento}
                </Badge>
              )}
            </CardTitle>
            {data.sources.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Fontes: {data.sources.map(s => s === 'cvm' ? 'CVM' : s === 'yahoo_finance' ? 'Yahoo Finance' : s).join(', ')}
                {data.data_referencia_cvm && ` • CVM: ${formatDate(data.data_referencia_cvm)}`}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const cacheKey = `fundamental_fii_complete_${ticker}`;
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(`${cacheKey}_time`);
              localStorage.removeItem(`${cacheKey}_last_fetch`);
              fetchData(true);
            }}
            disabled={loading}
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {timeUntilRefresh > 0 && (
              <span className="ml-2 text-xs">
                {Math.floor(timeUntilRefresh / 60)}:{String(timeUntilRefresh % 60).padStart(2, "0")}
              </span>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="dividendos">Dividendos</TabsTrigger>
              <TabsTrigger value="fundamentos">Fundamentos</TabsTrigger>
              <TabsTrigger value="fatos">Fatos</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Preço Atual */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Preço Atual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.current_price)}</div>
                    {data.valor_patrimonial_cota && (
                      <p className="text-xs text-muted-foreground mt-1">
                        VP: {formatCurrency(data.valor_patrimonial_cota)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* P/VP */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      P/VP {data.p_vp_calculado ? "(Calculado)" : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getPVPColor(bestPVP)}`}>
                      {bestPVP !== null ? bestPVP.toFixed(2) : "-"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bestPVP !== null 
                        ? (bestPVP < 0.95 ? "Com desconto" : bestPVP > 1.05 ? "Com prêmio" : "Próximo ao VP")
                        : "Dados indisponíveis"
                      }
                    </p>
                  </CardContent>
                </Card>

                {/* DY 12M */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      DY 12 Meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercent(data.dividendos_12m.percentual)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(data.dividendos_12m.valor)} por cota
                    </p>
                  </CardContent>
                </Card>

                {/* Performance Mês */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Performance Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(data.performance_mes)}`}>
                      {getChangeIcon(data.performance_mes)}
                      {formatPercent(data.performance_mes)}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Ano */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Performance Ano
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(data.performance_ano)}`}>
                      {getChangeIcon(data.performance_ano)}
                      {formatPercent(data.performance_ano)}
                    </div>
                  </CardContent>
                </Card>

                {/* Volume */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Volume Médio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(data.volume_dia)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Cotas/dia</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="dividendos" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Dividendos por Período */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Último Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.dividendos_1m.valor)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercent(data.dividendos_1m.percentual)} DY
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      3 Meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.dividendos_3m.valor)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercent(data.dividendos_3m.percentual)} DY
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      6 Meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.dividendos_6m.valor)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercent(data.dividendos_6m.percentual)} DY
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      12 Meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.dividendos_12m.valor)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercent(data.dividendos_12m.percentual)} DY
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Histórico de Dividendos */}
              {data.dividends && data.dividends.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Histórico de Dividendos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data.dividends.slice(0, 12).map((div, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                          <div>
                            <span className="text-sm font-medium">{formatCurrency(div.valor_por_cota)}</span>
                            <span className="text-xs text-muted-foreground ml-2">por cota</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm">{formatDate(div.data_pagamento)}</span>
                            {div.data_base && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Data-Com: {formatDate(div.data_base)})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fundamentos" className="mt-4">
              {hasCVMData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Patrimônio Líquido */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Patrimônio Líquido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatLargeCurrency(data.patrimonio_liquido)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Fonte: CVM</p>
                    </CardContent>
                  </Card>

                  {/* VP por Cota */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Valor Patrimonial/Cota
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(data.valor_patrimonial_cota)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.p_vp_calculado && `P/VP Calculado: ${data.p_vp_calculado.toFixed(2)}`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Número de Cotistas */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Cotistas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(data.num_cotistas)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Investidores</p>
                    </CardContent>
                  </Card>

                  {/* Taxa de Vacância */}
                  {data.taxa_vacancia !== null && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Taxa de Vacância
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${data.taxa_vacancia > 10 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPercent(data.taxa_vacancia)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data.taxa_vacancia <= 5 ? "Baixa" : data.taxa_vacancia <= 10 ? "Moderada" : "Alta"}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gestor */}
                  {data.gestor && (
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Gestora
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-medium">{data.gestor}</div>
                        {data.administrador && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Administrador: {data.administrador}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Dados fundamentalistas da CVM não disponíveis para este FII.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Execute a sincronização com a CVM para obter dados completos.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fatos" className="mt-4">
              {data.relevant_facts && data.relevant_facts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Fatos Relevantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {data.relevant_facts.map((fact) => {
                        const isRecent = new Date(fact.data_publicacao) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return (
                          <div key={fact.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {isRecent && <Badge variant="default" className="text-xs">Novo</Badge>}
                                  <span className="text-xs text-muted-foreground">{formatDate(fact.data_publicacao)}</span>
                                </div>
                                <h4 className="font-medium text-sm">{fact.titulo}</h4>
                                {fact.resumo && <p className="text-xs text-muted-foreground mt-1">{fact.resumo}</p>}
                              </div>
                              {fact.url_documento && (
                                <a href={fact.url_documento} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum fato relevante recente.</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Comunicados serão exibidos automaticamente quando disponíveis.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
