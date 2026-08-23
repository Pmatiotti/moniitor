import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NetWorthChartProps {
  clientId?: string;
}

export const NetWorthChart = ({ clientId }: NetWorthChartProps) => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ["net-worth-history", clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Try to get historical data
      let query = supabase
        .from("net_worth_history")
        .select("*")
        .order("snapshot_date", { ascending: true })
        .limit(12);

      if (clientId) {
        query = query.eq("client_id", clientId);
      } else {
        query = query.eq("user_id", user.id).is("client_id", null);
      }

      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
        // Return empty - we'll show a message to generate first snapshot
        return [];
      }

      return data.map((item: any) => ({
        date: format(new Date(item.snapshot_date), "MMM/yy", { locale: ptBR }),
        ativos: item.total_assets + item.total_investments,
        passivos: item.total_liabilities,
        patrimonio: item.net_worth,
      }));
    },
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Patrimonial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Patrimonial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <p>Nenhum histórico disponível ainda.</p>
              <p className="text-sm mt-2">
                O histórico será construído automaticamente ao longo do tempo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução Patrimonial</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={historyData}>
            <defs>
              <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPassivos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={70}
            />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value)
              }
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="ativos"
              name="Ativos"
              stroke="hsl(var(--chart-1))"
              fillOpacity={1}
              fill="url(#colorAtivos)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="passivos"
              name="Passivos"
              stroke="hsl(var(--destructive))"
              fillOpacity={1}
              fill="url(#colorPassivos)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="patrimonio"
              name="Patrimônio Líquido"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorPatrimonio)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
