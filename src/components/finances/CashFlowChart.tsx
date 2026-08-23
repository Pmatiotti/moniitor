import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export function CashFlowChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCashFlowData();
  }, []);

  const fetchCashFlowData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthsData: MonthlyData[] = [];

      // Get last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const firstDay = startOfMonth(date);
        const lastDay = endOfMonth(date);

        const { data: transactions } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("user_id", user.id)
          .gte("transaction_date", firstDay.toISOString())
          .lte("transaction_date", lastDay.toISOString());

        const income = transactions
          ?.filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const expense = transactions
          ?.filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        monthsData.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          income,
          expense,
          balance: income - expense,
        });
      }

      setData(monthsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa - Últimos 6 Meses</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="income" name="Receitas" fill="#10b981" />
            <Bar dataKey="expense" name="Despesas" fill="#ef4444" />
            <Bar dataKey="balance" name="Saldo" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
