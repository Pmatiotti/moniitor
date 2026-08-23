import { useState, useMemo } from "react";
import { type FIIData } from "@/pages/PublicFII";
import { formatCurrency } from "@/lib/format-utils";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

interface FIIDividendsChartProps {
  data: FIIData;
}

type PeriodFilter = "6m" | "12m" | "all";

export function FIIDividendsChart({ data }: FIIDividendsChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>("12m");

  const chartData = useMemo(() => {
    if (!data.dividends || data.dividends.length === 0) return [];

    const now = new Date();
    let cutoffDate: Date | null = null;

    if (period === "6m") {
      cutoffDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    } else if (period === "12m") {
      cutoffDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
    }

    // Filter and sort dividends
    const filtered = data.dividends
      .filter(d => !cutoffDate || new Date(d.data_pagamento) >= cutoffDate)
      .sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime());

    // Group by month
    const grouped = new Map<string, { total: number; count: number }>();
    
    filtered.forEach(div => {
      const date = new Date(div.data_pagamento);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      const existing = grouped.get(monthKey) || { total: 0, count: 0 };
      grouped.set(monthKey, {
        total: existing.total + div.valor_por_cota,
        count: existing.count + 1,
      });
    });

    // Convert to chart format
    return Array.from(grouped.entries()).map(([month, { total }]) => {
      const dyPercent = data.current_price > 0 ? (total / data.current_price) * 100 : 0;
      const [year, monthNum] = month.split("-");
      const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString("pt-BR", { 
        month: "short", 
        year: "2-digit" 
      });
      
      return {
        month: monthName,
        valor: total,
        dyPercent,
      };
    });
  }, [data.dividends, data.current_price, period]);

  if (!data.dividends || data.dividends.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sem histórico de dividendos disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex gap-2">
        <Button
          variant={period === "6m" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("6m")}
        >
          6 meses
        </Button>
        <Button
          variant={period === "12m" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("12m")}
        >
          12 meses
        </Button>
        <Button
          variant={period === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("all")}
        >
          Desde o IPO
        </Button>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="font-medium">{item.month}</p>
                    <p className="text-sm">Dividendo: {formatCurrency(item.valor)}</p>
                    <p className="text-sm text-emerald-500">DY: {item.dyPercent.toFixed(2)}%</p>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="valor"
              name="Dividendo (R$)"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="dyPercent"
              name="Dividend Yield (%)"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
