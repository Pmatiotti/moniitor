import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PortfolioSnapshot } from "@/lib/performance-calculations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChartData {
  date: string;
  dateLabel: string;
  portfolio: number;
  benchmark: number;
  value: number;
}

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  period: string;
}

const BENCHMARK_COLORS: Record<string, string> = {
  'CDI': '#eab308',
  'IPCA': '#22c55e',
  'IBOV': '#3b82f6',
  'DOLAR': '#06b6d4',
  'IPCA+6': '#ec4899',
};

const BENCHMARK_LABELS: Record<string, string> = {
  'CDI': 'CDI',
  'IPCA': 'IPCA',
  'IBOV': 'IBOV',
  'DOLAR': 'Dólar',
  'IPCA+6': 'IPCA+6%',
};

export const PerformanceChart = ({ snapshots, period }: PerformanceChartProps) => {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('CDI');
  const [benchmarkData, setBenchmarkData] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [availableBenchmarks, setAvailableBenchmarks] = useState<string[]>([]);

  // Determine firstSnapshotDate for filtering benchmark data
  const firstSnapshotDate = useMemo(() => {
    if (snapshots.length === 0) return null;
    const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    return sorted[0].snapshot_date;
  }, [snapshots]);

  // Fetch available benchmarks on mount
  useEffect(() => {
    const fetchAvailableBenchmarks = async () => {
      const startDate = firstSnapshotDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data: types } = await supabase
        .from('economic_indicators')
        .select('indicator_type')
        .gte('reference_date', startDate);
      
      if (types && types.length > 0) {
        const available = [...new Set(types.map(t => t.indicator_type))];
        setAvailableBenchmarks(available);
        // If selected benchmark is not available, switch to first available
        if (!available.includes(selectedBenchmark) && available.length > 0) {
          setSelectedBenchmark(available[0]);
        }
      }
    };
    
    fetchAvailableBenchmarks();
  }, [firstSnapshotDate]);

  // Fetch benchmark data whenever selectedBenchmark or firstSnapshotDate changes
  useEffect(() => {
    fetchBenchmarkData();
  }, [selectedBenchmark, firstSnapshotDate]);

  const fetchBenchmarkData = async () => {
    try {
      setLoading(true);
      
      // Only fetch if we have snapshots to compare against
      const startDate = firstSnapshotDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      console.log('[PerformanceChart] Fetching benchmark:', selectedBenchmark, 'from', startDate, 'to', endDate);

      // Fetch only the selected benchmark to avoid 1000-row limit issues
      const { data: indicators, error } = await supabase
        .from('economic_indicators')
        .select('indicator_type, reference_date, daily_rate')
        .eq('indicator_type', selectedBenchmark)
        .gte('reference_date', startDate)
        .lte('reference_date', endDate)
        .order('reference_date', { ascending: true })
        .limit(2000);

      if (error) throw error;

      console.log('[PerformanceChart] Fetched', indicators?.length || 0, 'records for', selectedBenchmark);

      // Organize data by benchmark type and date
      const organized: Record<string, Record<string, number>> = {};
      const benchmarksWithData = new Set<string>();
      
      if (indicators && indicators.length > 0) {
        indicators.forEach((item) => {
          const type = item.indicator_type;
          if (!organized[type]) {
            organized[type] = {};
          }
          // daily_rate is already in decimal form (e.g., 0.00045 = 0.045%)
          organized[type][item.reference_date] = item.daily_rate || 0;
          benchmarksWithData.add(type);
        });
      }

      setBenchmarkData(organized);
      setAvailableBenchmarks(prev => {
        const newSet = new Set(prev);
        benchmarksWithData.forEach(b => newSet.add(b));
        return Array.from(newSet);
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados de benchmark:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utility function for robust date comparisons using timestamps
  const toTime = (dateStr: string): number => new Date(dateStr).getTime();

  // Track last benchmark date for UI indicator
  const lastBenchmarkDate = useMemo(() => {
    const benchmarkDataForSelected = benchmarkData[selectedBenchmark];
    if (!benchmarkDataForSelected || Object.keys(benchmarkDataForSelected).length === 0) {
      return null;
    }
    const dates = Object.keys(benchmarkDataForSelected).sort();
    return dates[dates.length - 1] || null;
  }, [benchmarkData, selectedBenchmark]);

  const chartData = useMemo(() => {
    if (snapshots.length === 0) return [];
    
    // Don't calculate if benchmark data isn't loaded yet
    const benchmarkDataForSelected = benchmarkData[selectedBenchmark];
    if (!benchmarkDataForSelected || Object.keys(benchmarkDataForSelected).length === 0) {
      console.log('[PerformanceChart] No benchmark data for:', selectedBenchmark);
      return [];
    }

    const sortedSnapshots = [...snapshots].sort(
      (a, b) => toTime(a.snapshot_date) - toTime(b.snapshot_date)
    );

    if (sortedSnapshots.length === 0) return [];

    // Get the first snapshot date - this is our base (0%)
    const firstSnapshotDate = sortedSnapshots[0].snapshot_date;
    const startTime = toTime(firstSnapshotDate);
    
    // Build sorted benchmark points with cumulative factors (pre-calculated)
    const benchmarkDates = Object.keys(benchmarkDataForSelected).sort();
    
    // Debug: Log benchmark data info
    console.log('[PerformanceChart] Benchmark info:', {
      benchmark: selectedBenchmark,
      totalDates: benchmarkDates.length,
      firstDate: benchmarkDates[0],
      lastDate: benchmarkDates[benchmarkDates.length - 1],
      firstSnapshotDate,
      sampleRate: benchmarkDataForSelected[benchmarkDates[0]]
    });
    
    // Pre-calculate cumulative factors for ALL benchmark dates
    // This builds an array where each entry has the cumulative return up to that date
    const cumulativeFactors: { time: number; dateKey: string; factor: number; dailyRate: number }[] = [];
    let runningFactor = 1;
    
    for (const dateKey of benchmarkDates) {
      const time = toTime(dateKey);
      const rawRate = benchmarkDataForSelected[dateKey];
      const dailyRate = Number(rawRate);
      
      // Only accumulate if we have valid data AND date is AFTER first snapshot
      if (Number.isFinite(dailyRate) && time > startTime) {
        runningFactor *= (1 + dailyRate);
      }
      
      cumulativeFactors.push({ time, dateKey, factor: runningFactor, dailyRate: Number.isFinite(dailyRate) ? dailyRate : 0 });
    }
    
    // Get the last benchmark point for extrapolation
    const lastBenchmarkPoint = cumulativeFactors[cumulativeFactors.length - 1];
    const lastBenchmarkTime = lastBenchmarkPoint?.time || 0;
    const lastKnownRate = lastBenchmarkPoint?.dailyRate || 0;
    const lastKnownFactor = lastBenchmarkPoint?.factor || 1;
    
    // Debug: Log cumulative factor info
    console.log('[PerformanceChart] Cumulative factors:', {
      totalPoints: cumulativeFactors.length,
      lastFactor: lastBenchmarkPoint?.factor,
      lastRate: lastKnownRate,
      expectedReturn: lastBenchmarkPoint ? ((lastBenchmarkPoint.factor - 1) * 100).toFixed(4) + '%' : 'N/A'
    });

    // Helper: count business days between two dates (simplified - just weekdays)
    const countBusinessDays = (startDate: string, endDate: string): number => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;
      const current = new Date(start);
      current.setDate(current.getDate() + 1); // Start from day after
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    };

    return sortedSnapshots.map((snapshot, index) => {
      // --- Portfolio: Calculate TWR using daily_return_percent ---
      let twrFactor = 1;
      for (let i = 1; i <= index; i++) {
        const dailyReturn = sortedSnapshots[i].daily_return_percent;
        if (dailyReturn !== null && dailyReturn !== undefined && Number.isFinite(dailyReturn)) {
          twrFactor *= (1 + dailyReturn / 100);
        }
      }
      const portfolioReturn = (twrFactor - 1) * 100;
      
      // --- Benchmark: Find the cumulative factor for this snapshot date ---
      const snapTime = toTime(snapshot.snapshot_date);
      
      let benchmarkFactor = 1;
      
      // If snapshot is beyond the last benchmark data, EXTRAPOLATE using last known rate
      if (snapTime > lastBenchmarkTime && lastKnownRate > 0) {
        const lastBenchmarkDateStr = lastBenchmarkPoint?.dateKey || '';
        const daysBeyond = countBusinessDays(lastBenchmarkDateStr, snapshot.snapshot_date);
        
        // Extrapolate: lastFactor * (1 + lastDailyRate)^daysBeyond
        benchmarkFactor = lastKnownFactor * Math.pow(1 + lastKnownRate, daysBeyond);
        
        console.log('[PerformanceChart] Extrapolating benchmark:', {
          snapshotDate: snapshot.snapshot_date,
          lastBenchmarkDate: lastBenchmarkDateStr,
          daysBeyond,
          extrapolatedFactor: benchmarkFactor
        });
      } else {
        // Find the last benchmark point with time <= snapTime
        for (let i = cumulativeFactors.length - 1; i >= 0; i--) {
          if (cumulativeFactors[i].time <= snapTime) {
            benchmarkFactor = cumulativeFactors[i].factor;
            break;
          }
        }
      }
      
      const benchmarkReturn = (benchmarkFactor - 1) * 100;

      return {
        date: snapshot.snapshot_date,
        dateLabel: format(new Date(snapshot.snapshot_date), "dd/MM", { locale: ptBR }),
        portfolio: portfolioReturn,
        benchmark: benchmarkReturn,
        value: snapshot.total_value
      };
    });
  }, [snapshots, selectedBenchmark, benchmarkData, period]);

  // Calculate dynamic Y-axis domain for auto-zoom
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    
    const allValues = chartData.flatMap(d => [d.portfolio, d.benchmark]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Add 15% margin for better visualization
    const range = maxValue - minValue;
    const margin = Math.max(range * 0.15, 0.05); // Minimum 0.05 p.p. margin
    
    return [
      Math.floor((minValue - margin) * 100) / 100,
      Math.ceil((maxValue + margin) * 100) / 100
    ];
  }, [chartData]);

  if (loading || Object.keys(benchmarkData).length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <p className="text-lg font-medium">Nenhum snapshot disponível</p>
        <p className="text-sm">Crie snapshots diários para ver a evolução do portfólio</p>
      </div>
    );
  }

  if (snapshots.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <p className="text-lg font-medium">Apenas 1 snapshot disponível</p>
        <p className="text-sm">Crie mais snapshots para visualizar a evolução</p>
      </div>
    );
  }

  const lastData = chartData[chartData.length - 1];
  const portfolioWins = lastData && lastData.portfolio > lastData.benchmark;
  const benchmarkLabel = BENCHMARK_LABELS[selectedBenchmark] || selectedBenchmark;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{snapshots.length} snapshots</Badge>
          {lastBenchmarkDate && (
            <Badge variant="secondary" className="text-xs">
              {BENCHMARK_LABELS[selectedBenchmark] || selectedBenchmark} até {format(new Date(lastBenchmarkDate), "dd/MM", { locale: ptBR })}
            </Badge>
          )}
          {availableBenchmarks.length === 0 && (
            <Badge variant="secondary" className="text-warning">
              Sem dados de benchmark
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Comparar com:</span>
          <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Benchmark" />
            </SelectTrigger>
            <SelectContent>
              {availableBenchmarks.includes('CDI') && (
                <SelectItem value="CDI">CDI</SelectItem>
              )}
              {availableBenchmarks.includes('IPCA') && (
                <SelectItem value="IPCA">IPCA</SelectItem>
              )}
              {availableBenchmarks.includes('IBOV') && (
                <SelectItem value="IBOV">IBOV</SelectItem>
              )}
              {availableBenchmarks.includes('DOLAR') && (
                <SelectItem value="DOLAR">Dólar</SelectItem>
              )}
              {availableBenchmarks.includes('IPCA+6') && (
                <SelectItem value="IPCA+6">IPCA+6%</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="dateLabel" 
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
            tickMargin={10}
          />
          <YAxis 
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
            domain={yAxisDomain}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
            tickCount={6}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              
              const portfolioData = payload.find(p => p.dataKey === 'portfolio');
              const benchmarkDataPoint = payload.find(p => p.dataKey === 'benchmark');
              const portfolio = (portfolioData?.value as number) || 0;
              const benchmark = (benchmarkDataPoint?.value as number) || 0;
              const diff = portfolio - benchmark;
              
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-foreground mb-2">Data: {label}</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Carteira:</span>{' '}
                      <span className="font-bold text-primary">
                        {portfolio >= 0 ? '+' : ''}{portfolio.toFixed(2)}%
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">{benchmarkLabel}:</span>{' '}
                      <span className="font-bold" style={{ color: BENCHMARK_COLORS[selectedBenchmark] }}>
                        {benchmark >= 0 ? '+' : ''}{benchmark.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                  <div className={`mt-2 pt-2 border-t border-border text-sm font-medium ${diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {diff >= 0 ? '▲ Superando' : '▼ Abaixo'}: {diff >= 0 ? '+' : ''}{diff.toFixed(2)} p.p.
                  </div>
                </div>
              );
            }}
          />
          <Legend 
            formatter={(value) => value === 'portfolio' ? 'Seu Portfólio' : benchmarkLabel}
          />
          <Area 
            type="monotone" 
            dataKey="portfolio" 
            fill="url(#colorPortfolio)" 
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="portfolio" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            name="portfolio"
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="benchmark" 
            stroke={BENCHMARK_COLORS[selectedBenchmark]}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="benchmark"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4 pt-4">
        <div className={`p-4 rounded-lg border ${portfolioWins ? 'bg-success/10 border-success/30' : 'bg-primary/5 border-primary/20'}`}>
          <p className="text-sm text-muted-foreground mb-1">Seu Portfólio</p>
          <p className={`text-2xl font-bold ${portfolioWins ? 'text-success' : 'text-primary'}`}>
            {lastData ? `${lastData.portfolio >= 0 ? '+' : ''}${lastData.portfolio.toFixed(2)}%` : '0%'}
          </p>
        </div>
        <div className={`p-4 rounded-lg border ${!portfolioWins ? 'bg-warning/10 border-warning/30' : ''}`} 
             style={portfolioWins ? { backgroundColor: `${BENCHMARK_COLORS[selectedBenchmark]}15` } : {}}>
          <p className="text-sm text-muted-foreground mb-1">{benchmarkLabel}</p>
          <p className="text-2xl font-bold" style={{ color: portfolioWins ? BENCHMARK_COLORS[selectedBenchmark] : 'inherit' }}>
            {lastData ? `${lastData.benchmark >= 0 ? '+' : ''}${lastData.benchmark.toFixed(2)}%` : '0%'}
          </p>
        </div>
      </div>

      {lastData && (
        <div className="text-center pt-2">
          <p className={`text-sm font-medium ${portfolioWins ? 'text-success' : 'text-warning'}`}>
            {portfolioWins 
              ? `Seu portfólio superou o ${benchmarkLabel} em ${(lastData.portfolio - lastData.benchmark).toFixed(2)} p.p.`
              : `Seu portfólio ficou ${(lastData.benchmark - lastData.portfolio).toFixed(2)} p.p. abaixo do ${benchmarkLabel}`
            }
          </p>
        </div>
      )}
    </div>
  );
};
