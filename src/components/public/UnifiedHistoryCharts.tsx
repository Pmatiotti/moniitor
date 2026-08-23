import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact, formatAxisTick } from "@/lib/format-utils";

type PeriodFilter = "10y" | "5y" | "1y";

interface UnifiedData {
  label: string;
  sortKey: number;
  year: number;
  quarter?: number;
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

interface UnifiedHistoryChartsProps {
  ticker: string;
  assetClass: string;
  isFinancial?: boolean;
}

export function UnifiedHistoryCharts({ ticker, assetClass, isFinancial = false }: UnifiedHistoryChartsProps) {
  const [data, setData] = useState<UnifiedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEbitda, setShowEbitda] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("10y");

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Calculate start year based on filter (fetch all data, filter later for responsiveness)
      const startYear = currentYear - 10;

      // Fetch annual data (complete years only - up to previous year)
      const { data: annualData, error: annualError } = await supabase
        .from("annual_fundamentals")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .eq("asset_class", assetClass)
        .gte("year", startYear)
        .lte("year", currentYear - 1)
        .order("year", { ascending: true });

      // Fetch quarterly data (current and previous year for partial data)
      const { data: quarterlyData, error: quarterlyError } = await supabase
        .from("quarterly_fundamentals")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .eq("asset_class", assetClass)
        .gte("year", currentYear - 1)
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });

      if (annualError) {
        console.error("Erro ao buscar histórico anual:", annualError);
      }
      if (quarterlyError) {
        console.error("Erro ao buscar histórico trimestral:", quarterlyError);
      }

      // Merge and format data
      const mergedData: UnifiedData[] = [];

      // Add annual data with year as label
      if (annualData) {
        annualData.forEach((d: any) => {
          mergedData.push({
            ...d,
            label: String(d.year),
            sortKey: d.year * 10, // e.g., 20240 for 2024
          });
        });
      }

      // Add quarterly data with QT format (e.g., "1T25")
      if (quarterlyData) {
        // Filter out quarters that belong to years we already have annual data for
        const annualYears = new Set(annualData?.map((d: any) => d.year) || []);
        
        quarterlyData.forEach((d: any) => {
          // Only include quarterly data for years NOT in annual data
          // This ensures we show quarters only for the current/partial year
          if (!annualYears.has(d.year)) {
            mergedData.push({
              ...d,
              label: `${d.quarter}T${String(d.year).slice(-2)}`,
              sortKey: d.year * 10 + d.quarter, // e.g., 20251 for 1T25
            });
          }
        });
      }

      // Sort by sortKey for chronological order
      mergedData.sort((a, b) => a.sortKey - b.sortKey);

      setData(mergedData);

      // Check if any record indicates financial institution
      const allData = [...(annualData || []), ...(quarterlyData || [])];
      const anyFinancial = allData.some((d: any) => 
        d.is_financial || d.format_flags?.ebitda_applicable === false
      );
      setShowEbitda(!isFinancial && !anyFinancial);

      setLoading(false);
    };

    fetchData();
  }, [ticker, assetClass, isFinancial, currentYear]);

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    let startYear: number;
    
    switch (periodFilter) {
      case "1y":
        startYear = currentYear - 1;
        break;
      case "5y":
        startYear = currentYear - 5;
        break;
      case "10y":
      default:
        startYear = currentYear - 10;
        break;
    }

    return data.filter(d => d.year >= startYear);
  }, [data, periodFilter, currentYear]);

  // Check if we have data for each chart type
  const hasRevenueData = filteredData.some(d => d.revenue != null || d.net_income != null);
  const hasMarginsData = filteredData.some(d => d.gross_margin != null || d.net_margin != null);
  const hasDebtData = filteredData.some(d => d.net_debt != null || d.cash_and_equivalents != null);

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
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
          Histórico ainda não disponível. Será preenchido pelo robô em breve.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={periodFilter === "10y" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("10y")}
        >
          10 anos
        </Button>
        <Button
          variant={periodFilter === "5y" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("5y")}
        >
          5 anos
        </Button>
        <Button
          variant={periodFilter === "1y" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter("1y")}
        >
          Último ano
        </Button>
      </div>

      {/* Receita vs Lucro */}
      {hasRevenueData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Receita vs Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={filteredData.length > 12 ? -45 : 0}
                  textAnchor={filteredData.length > 12 ? "end" : "middle"}
                  height={filteredData.length > 12 ? 60 : 30}
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
      )}

      {/* Margens */}
      {hasMarginsData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Margens</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={filteredData.length > 12 ? -45 : 0}
                  textAnchor={filteredData.length > 12 ? "end" : "middle"}
                  height={filteredData.length > 12 ? 60 : 30}
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
      )}

      {/* Dívida e Caixa */}
      {hasDebtData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Dívida vs Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={filteredData.length > 12 ? -45 : 0}
                  textAnchor={filteredData.length > 12 ? "end" : "middle"}
                  height={filteredData.length > 12 ? 60 : 30}
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
      )}
    </div>
  );
}
