import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, LineChart, BarChart3 } from "lucide-react";

interface IndicatorHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  indicatorKey: string;
  indicatorLabel: string;
  isPercentage?: boolean;
}

// Mapeamento de indicadores para campos na tabela annual_fundamentals
const annualIndicatorMapping: Record<string, { field: string; isPercentage: boolean }> = {
  // Margens
  "gross_margin": { field: "gross_margin", isPercentage: true },
  "m_bruta": { field: "gross_margin", isPercentage: true },
  "ebitda_margin": { field: "ebitda_margin", isPercentage: true },
  "m_ebitda": { field: "ebitda_margin", isPercentage: true },
  "ebit_margin": { field: "ebit_margin", isPercentage: true },
  "m_ebit": { field: "ebit_margin", isPercentage: true },
  "net_margin": { field: "net_margin", isPercentage: true },
  "m_liquida": { field: "net_margin", isPercentage: true },
  
  // Rentabilidade
  "roe": { field: "roe", isPercentage: true },
  "roa": { field: "roa", isPercentage: true },
  "roic": { field: "roic", isPercentage: true },
  
  // Valuation
  "dividend_yield": { field: "dividend_yield", isPercentage: true },
  "p_l": { field: "p_l", isPercentage: false },
  "p_vp": { field: "p_vp", isPercentage: false },
  "ev_ebitda": { field: "ev_ebitda", isPercentage: false },
  
  // Endividamento
  "div_liquida_ebitda": { field: "div_liquida_ebitda", isPercentage: false },
  "liq_corrente": { field: "liq_corrente", isPercentage: false },
  "payout_ratio": { field: "payout_ratio", isPercentage: true },
  
  // Crescimento
  "cagr_receitas_5a": { field: "cagr_receitas_5a", isPercentage: true },
  "cagr_lucros_5a": { field: "cagr_lucros_5a", isPercentage: true },
  
  // Valores absolutos
  "revenue": { field: "revenue", isPercentage: false },
  "net_income": { field: "net_income", isPercentage: false },
  "ebitda": { field: "ebitda", isPercentage: false },
  "ebit": { field: "ebit", isPercentage: false },
  "gross_profit": { field: "gross_profit", isPercentage: false },
  "total_assets": { field: "total_assets", isPercentage: false },
  "total_equity": { field: "total_equity", isPercentage: false },
  "net_debt": { field: "net_debt", isPercentage: false },
  "dividends_paid": { field: "dividends_paid", isPercentage: false },
};

interface ChartDataPoint {
  year: number | string;
  value: number;
  displayYear: string;
}

interface Stats {
  average: number;
  current: number;
  min: { value: number; year: number | string };
  max: { value: number; year: number | string };
  diffFromAverage: number;
}

export const IndicatorHistoryDialog = ({
  isOpen,
  onClose,
  ticker,
  indicatorKey,
  indicatorLabel,
  isPercentage = false,
}: IndicatorHistoryDialogProps) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (isOpen && ticker) {
      loadHistoricalData();
    }
  }, [isOpen, ticker, indicatorKey]);

  const loadHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const mapping = annualIndicatorMapping[indicatorKey];
      
      if (!mapping) {
        setError(`Indicador "${indicatorKey}" não suportado para histórico`);
        setLoading(false);
        return;
      }

      // Buscar de annual_fundamentals
      const { data: annualData, error: annualError } = await supabase
        .from("annual_fundamentals")
        .select(`year, ${mapping.field}`)
        .eq("ticker", ticker.toUpperCase())
        .order("year", { ascending: true });

      if (annualError) throw annualError;

      if (!annualData || annualData.length === 0) {
        setError("Dados históricos não disponíveis para este indicador");
        setLoading(false);
        return;
      }

      // Filtrar apenas anos com dados válidos
      const validData = annualData.filter(
        (item: any) => item[mapping.field] !== null && item[mapping.field] !== undefined
      );

      if (validData.length === 0) {
        setError("Dados históricos não disponíveis para este indicador");
        setLoading(false);
        return;
      }

      // Formatar dados para o gráfico
      const currentYear = new Date().getFullYear();
      const chartData: ChartDataPoint[] = validData.map((item: any) => ({
        year: item.year,
        value: Number(item[mapping.field]) || 0,
        displayYear: item.year === currentYear ? "ATUAL" : String(item.year),
      }));

      setData(chartData);

      // Calcular estatísticas
      const values = chartData.map((d) => d.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const current = chartData[chartData.length - 1]?.value || 0;
      
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const minItem = chartData.find((d) => d.value === minValue);
      const maxItem = chartData.find((d) => d.value === maxValue);

      setStats({
        average,
        current,
        min: { value: minValue, year: minItem?.year || 0 },
        max: { value: maxValue, year: maxItem?.year || 0 },
        diffFromAverage: average !== 0 ? ((current - average) / Math.abs(average)) * 100 : 0,
      });

    } catch (err) {
      console.error("Error loading historical data:", err);
      setError("Erro ao carregar dados históricos");
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, forAxis = false) => {
    const mapping = annualIndicatorMapping[indicatorKey];
    const showAsPercent = isPercentage || mapping?.isPercentage;
    
    if (showAsPercent) {
      return forAxis ? `${value.toFixed(0)}%` : `${value.toFixed(2)}%`;
    }
    
    if (Math.abs(value) >= 1000000000) {
      return `R$ ${(value / 1000000000).toFixed(forAxis ? 0 : 1)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(forAxis ? 0 : 1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `R$ ${(value / 1000).toFixed(forAxis ? 0 : 1)}K`;
    }
    return forAxis ? value.toFixed(1) : value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-lg font-bold text-primary">
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {indicatorLabel} - histórico
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-[350px] w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
              <p className="text-lg">{error}</p>
              <p className="text-sm mt-2">
                Os dados históricos serão populados pelo robô de integração.
              </p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Média</p>
                    <p className="text-2xl font-bold mt-1">{formatValue(stats.average)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Atual</p>
                    <p className="text-2xl font-bold mt-1">{formatValue(stats.current)}</p>
                    <p className={`text-xs mt-1 flex items-center gap-1 ${
                      stats.diffFromAverage >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {stats.diffFromAverage >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stats.diffFromAverage >= 0 ? "+" : ""}{stats.diffFromAverage.toFixed(1)}% da média
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Menor Valor</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{formatValue(stats.min.value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">({stats.min.year})</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 relative">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Maior Valor</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">{formatValue(stats.max.value)}</p>
                    <p className="text-xs text-muted-foreground mt-1">({stats.max.year})</p>
                    
                    {/* Chart Type Toggle */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant={chartType === "line" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setChartType("line")}
                      >
                        <LineChart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={chartType === "bar" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setChartType("bar")}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <AreaChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="colorValueHistory" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="displayYear" 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => formatValue(value, true)}
                        width={70}
                      />
                      {stats && (
                        <ReferenceLine
                          y={stats.average}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          label={{
                            value: "Média",
                            position: "right",
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                      )}
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorValueHistory)"
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={data}
                      margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="displayYear" 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => formatValue(value, true)}
                        width={70}
                      />
                      {stats && (
                        <ReferenceLine
                          y={stats.average}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          label={{
                            value: "Média",
                            position: "right",
                            fill: "hsl(var(--muted-foreground))",
                            fontSize: 11,
                          }}
                        />
                      )}
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};