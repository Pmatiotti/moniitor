import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const ContributionCapacityCard = () => {
  const [capacity, setCapacity] = useState<number | null>(null);
  const [avgIncome, setAvgIncome] = useState(0);
  const [avgExpense, setAvgExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeContributionCapacity();
  }, []);

  const analyzeContributionCapacity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get transactions from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", sixMonthsAgo.toISOString().split('T')[0]);

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate average income and expenses
      const income = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Get number of months with transactions
      const monthsSet = new Set(
        transactions.map(t => {
          const date = new Date(t.transaction_date);
          return `${date.getFullYear()}-${date.getMonth()}`;
        })
      );
      const monthsCount = Math.max(monthsSet.size, 1);

      const monthlyIncome = income / monthsCount;
      const monthlyExpense = expenses / monthsCount;
      const monthlyCapacity = Math.max(monthlyIncome - monthlyExpense, 0);

      setAvgIncome(monthlyIncome);
      setAvgExpense(monthlyExpense);
      setCapacity(monthlyCapacity);
    } catch (error) {
      console.error("Error analyzing contribution capacity:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Capacidade de Aporte
        </CardTitle>
      </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (capacity === null) {
    return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Capacidade de Aporte
        </CardTitle>
      </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Registre suas transações para calcular sua capacidade de aporte mensal
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const savingsRate = avgIncome > 0 ? (capacity / avgIncome) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Capacidade de Aporte
          </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Calculado com base na média de receitas e despesas dos últimos 6 meses
                </p>
              </TooltipContent>
            </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-semibold text-primary mb-2">
            {formatCurrency(capacity)}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Disponível mensalmente para investir
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Receita Média</span>
            </div>
            <p className="text-base font-semibold text-green-600">
              {formatCurrency(avgIncome)}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Despesa Média</span>
            </div>
            <p className="text-base font-semibold text-red-600">
              {formatCurrency(avgExpense)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Taxa de Poupança</span>
            <span className="text-base font-semibold">{savingsRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(savingsRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {savingsRate >= 20 
              ? "Excelente! Você está poupando uma boa parte da sua renda."
              : savingsRate >= 10
              ? "Bom começo! Tente aumentar sua taxa de poupança gradualmente."
              : "Tente reduzir despesas ou aumentar receitas para poupar mais."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};