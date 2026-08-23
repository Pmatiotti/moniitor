import { useState, useMemo } from "react";
import { type FIIData } from "@/pages/PublicFII";
import { formatCurrency } from "@/lib/format-utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";

interface FIIPriceChartProps {
  data: FIIData;
}

type PeriodFilter = "5d" | "1m" | "6m" | "12m";

export function FIIPriceChart({ data }: FIIPriceChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>("6m");

  const chartData = useMemo(() => {
    if (!data.price_history || data.price_history.length === 0) return [];

    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case "5d":
        cutoffDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case "1m":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "6m":
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
      default:
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    return data.price_history
      .filter(p => new Date(p.date) >= cutoffDate)
      .map(p => ({
        date: new Date(p.date).toLocaleDateString("pt-BR", { 
          day: "2-digit", 
          month: "short" 
        }),
        close: p.close,
        fullDate: p.date,
      }));
  }, [data.price_history, period]);

  // Calculate min/max for the selected period
  const { minPrice, maxPrice } = useMemo(() => {
    if (chartData.length === 0) return { minPrice: 0, maxPrice: 0 };
    const prices = chartData.map(d => d.close);
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  }, [chartData]);

  if (!data.price_history || data.price_history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sem histórico de cotações disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex gap-2">
        <Button
          variant={period === "5d" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("5d")}
        >
          5 dias
        </Button>
        <Button
          variant={period === "1m" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("1m")}
        >
          1 mês
        </Button>
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
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minPrice * 0.95, maxPrice * 1.05]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-muted-foreground">{item.fullDate}</p>
                    <p className="font-medium">{formatCurrency(item.close)}</p>
                  </div>
                );
              }}
            />
            {/* Reference lines for 52 week high/low */}
            {data.week_52_high && (
              <ReferenceLine
                y={data.week_52_high}
                stroke="hsl(var(--chart-2))"
                strokeDasharray="5 5"
                label={{ value: "Máx 52s", position: "right", fontSize: 10 }}
              />
            )}
            {data.week_52_low && (
              <ReferenceLine
                y={data.week_52_low}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{ value: "Mín 52s", position: "right", fontSize: 10 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="close"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
