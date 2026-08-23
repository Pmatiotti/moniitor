import { useMemo } from "react";
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
} from "recharts";

interface FIIVPHistoryChartProps {
  data: FIIData;
}

export function FIIVPHistoryChart({ data }: FIIVPHistoryChartProps) {
  const chartData = useMemo(() => {
    if (!data.vp_history || data.vp_history.length === 0) return [];

    return data.vp_history
      .filter(v => v.valor_patrimonial_cota != null)
      .map(v => {
        const date = new Date(v.data_referencia);
        return {
          date: date.toLocaleDateString("pt-BR", { 
            month: "short", 
            year: "2-digit" 
          }),
          fullDate: v.data_referencia,
          vp: v.valor_patrimonial_cota,
          numCotistas: v.num_cotistas,
        };
      });
  }, [data.vp_history]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sem histórico de valor patrimonial disponível
      </div>
    );
  }

  // Calculate min/max for better scaling
  const vpValues = chartData.map(d => d.vp!).filter(v => v > 0);
  const minVP = Math.min(...vpValues);
  const maxVP = Math.max(...vpValues);

  return (
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
            domain={[minVP * 0.9, maxVP * 1.1]}
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
                  <p className="font-medium">VP: {formatCurrency(item.vp)}</p>
                  {item.numCotistas && (
                    <p className="text-xs text-muted-foreground">
                      {item.numCotistas.toLocaleString("pt-BR")} cotistas
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="vp"
            name="Valor Patrimonial"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
