import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact, formatAxisTick } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";

interface QuarterlyData {
  year: number;
  quarter: number;
  revenue?: number;
  net_income?: number;
  gross_margin?: number;
  net_margin?: number;
  ebitda_margin?: number;
  total_debt?: number;
  net_debt?: number;
  cash_and_equivalents?: number;
  is_financial?: boolean;
  format_flags?: {
    ebitda_applicable?: boolean;
  } | null;
}

interface QuarterlyHistoryChartsProps {
  ticker: string;
  assetClass: string;
  isFinancial?: boolean;
}

const formatQuarterLabel = (year: number, quarter: number) => {
  return `T${quarter} ${year.toString().slice(-2)}`;
};

export function QuarterlyHistoryCharts({ ticker, assetClass, isFinancial = false }: QuarterlyHistoryChartsProps) {
  const [data, setData] = useState<QuarterlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEbitda, setShowEbitda] = useState(true);

  useEffect(() => {
    const fetchQuarterlyData = async () => {
      setLoading(true);
      
      // Fetch last 8 quarters (2 years)
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 2;
      
      const { data: quarterlyData, error } = await supabase
        .from("quarterly_fundamentals")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .eq("asset_class", assetClass)
        .gte("year", startYear)
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });

      if (error) {
        console.error("Erro ao buscar histórico trimestral:", error);
      } else if (quarterlyData && quarterlyData.length > 0) {
        setData(quarterlyData as QuarterlyData[]);
        // Check if any record indicates financial institution
        const anyFinancial = quarterlyData.some((d: any) => 
          d.is_financial || d.format_flags?.ebitda_applicable === false
        );
        setShowEbitda(!isFinancial && !anyFinancial);
      }
      setLoading(false);
    };

    fetchQuarterlyData();
  }, [ticker, assetClass, isFinancial]);

  // Transform data for charts with formatted labels
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      label: formatQuarterLabel(d.year, d.quarter),
    }));
  }, [data]);

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    // Database stores percentages as decimals (0.xx), multiply by 100 for display
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Dados trimestrais ainda não disponíveis para este ativo.</p>
          <p className="text-sm mt-2">Serão preenchidos pelo robô de ITR em breve.</p>
        </CardContent>
      </Card>
    );
  }

  // Check if current year data is partial
  const currentYear = new Date().getFullYear();
  const currentYearData = data.filter(d => d.year === currentYear);
  const isPartialYear = currentYearData.length > 0 && currentYearData.length < 4;

  return (
    <div className="space-y-6">
      {isPartialYear && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Dados parciais de {currentYear} ({currentYearData.length} trimestre{currentYearData.length > 1 ? 's' : ''})
          </Badge>
        </div>
      )}
      
      {/* Receita vs Lucro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Receita vs Lucro Líquido (Trimestral)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(var(--muted-foreground))" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={formatAxisTick} />
              <Tooltip 
                formatter={(value) => formatCurrencyCompact(value as number)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
              />
              <Legend />
              <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" />
              <Bar dataKey="net_income" name="Lucro Líquido" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Margens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Margens (Trimestral)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(var(--muted-foreground))" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <Tooltip 
                formatter={formatPercent}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
              />
              <Legend />
              <Line type="monotone" dataKey="gross_margin" name="M. Bruta" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
              {showEbitda && (
                <Line type="monotone" dataKey="ebitda_margin" name="M. EBITDA" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
              )}
              <Line type="monotone" dataKey="net_margin" name="M. Líquida" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Dívida e Caixa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Dívida vs Caixa (Trimestral)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(var(--muted-foreground))" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={formatAxisTick} />
              <Tooltip 
                formatter={(value) => formatCurrencyCompact(value as number)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
              />
              <Legend />
              <Bar dataKey="net_debt" name="Dívida Líquida" fill="hsl(var(--destructive))" />
              <Bar dataKey="cash_and_equivalents" name="Caixa" fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
