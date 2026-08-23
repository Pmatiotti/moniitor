import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Calendar, Percent } from "lucide-react";
import { format, subMonths, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = '1m' | '3m' | '6m' | '12m' | 'all';

interface AssetEvolutionChartProps {
  assetId: string;
  assetName: string;
  investedAmount?: number;
  currency?: string;
}

export const AssetEvolutionChart = ({ 
  assetId, 
  assetName, 
  investedAmount,
  currency = 'BRL' 
}: AssetEvolutionChartProps) => {
  const [period, setPeriod] = useState<Period>('3m');
  const [showBenchmark, setShowBenchmark] = useState<'none' | 'cdi' | 'ipca'>('cdi');

  const startDate = useMemo(() => {
    const today = new Date();
    switch (period) {
      case '1m': return subMonths(today, 1);
      case '3m': return subMonths(today, 3);
      case '6m': return subMonths(today, 6);
      case '12m': return subMonths(today, 12);
      default: return subMonths(today, 60); // 5 years max
    }
  }, [period]);

  const { data: history, isLoading } = useQuery({
    queryKey: ['asset-value-history', assetId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_value_history')
        .select('reference_date, value_accrual, daily_return_percent, cumulative_return_percent')
        .eq('asset_id', assetId)
        .gte('reference_date', startDate.toISOString().split('T')[0])
        .order('reference_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ['benchmark-data', showBenchmark, period],
    queryFn: async () => {
      if (showBenchmark === 'none') return [];
      
      const benchmarkType = showBenchmark.toUpperCase();
      const { data, error } = await supabase
        .from('economic_indicators')
        .select('reference_date, daily_rate')
        .eq('indicator_type', benchmarkType)
        .gte('reference_date', startDate.toISOString().split('T')[0])
        .order('reference_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: showBenchmark !== 'none'
  });

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Build benchmark cumulative map
    const benchmarkCumulative: Record<string, number> = {};
    if (benchmarkData && benchmarkData.length > 0) {
      let cumulative = 0;
      benchmarkData.forEach(b => {
        cumulative += Number(b.daily_rate) || 0;
        benchmarkCumulative[b.reference_date] = cumulative;
      });
    }

    return history.map(h => ({
      date: h.reference_date,
      dateFormatted: format(parseISO(h.reference_date), 'dd/MM', { locale: ptBR }),
      value: Number(h.value_accrual),
      return: Number(h.cumulative_return_percent) || 0,
      benchmark: benchmarkCumulative[h.reference_date] || null
    }));
  }, [history, benchmarkData]);

  const stats = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;

    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const periodReturn = last.return - first.return;
    const totalDays = chartData.length;
    const annualizedReturn = totalDays >= 30 
      ? (Math.pow(1 + periodReturn / 100, 365 / totalDays) - 1) * 100 
      : null;
    
    const benchmarkReturn = showBenchmark !== 'none' && last.benchmark !== null && first.benchmark !== null
      ? last.benchmark - first.benchmark
      : null;

    return {
      periodReturn,
      annualizedReturn,
      benchmarkReturn,
      vs: benchmarkReturn !== null ? periodReturn - benchmarkReturn : null,
      currentValue: last.value,
      startValue: first.value
    };
  }, [chartData, showBenchmark]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 border rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground">{format(parseISO(data.date), "dd 'de' MMMM", { locale: ptBR })}</p>
          <p className="font-semibold">{formatCurrency(data.value)}</p>
          <p className={`text-sm ${data.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rentabilidade: {data.return.toFixed(2)}%
          </p>
          {data.benchmark !== null && (
            <p className="text-sm text-muted-foreground">
              {showBenchmark.toUpperCase()}: {data.benchmark.toFixed(2)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Evolução do Ativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>Ainda não há histórico disponível para este ativo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Evolução: {assetName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex gap-1">
              {(['1m', '3m', '6m', '12m', 'all'] as Period[]).map(p => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className="px-2 py-1 h-7"
                >
                  {p === 'all' ? 'Tudo' : p.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Benchmark selector */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Comparar com:</span>
          <div className="flex gap-1">
            {(['none', 'cdi', 'ipca'] as const).map(b => (
              <Button
                key={b}
                variant={showBenchmark === b ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowBenchmark(b)}
                className="px-2 py-1 h-6 text-xs"
              >
                {b === 'none' ? 'Nenhum' : b.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Valor Atual</p>
              <p className="text-lg font-semibold">{formatCurrency(stats.currentValue)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Rentabilidade no Período</p>
              <p className={`text-lg font-semibold flex items-center gap-1 ${stats.periodReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.periodReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {stats.periodReturn.toFixed(2)}%
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Rentabilidade Anualizada</p>
              <p className="text-lg font-semibold">
                {stats.annualizedReturn !== null ? `${stats.annualizedReturn.toFixed(2)}%` : '—'}
              </p>
            </div>
            {stats.vs !== null && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">vs {showBenchmark.toUpperCase()}</p>
                <p className={`text-lg font-semibold ${stats.vs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.vs >= 0 ? '+' : ''}{stats.vs.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              
              {/* Benchmark line */}
              {showBenchmark !== 'none' && (
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                  name={showBenchmark.toUpperCase()}
                />
              )}
              
              {/* Asset return line */}
              <Area
                type="monotone"
                dataKey="return"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorValue)"
                name="Rentabilidade"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
