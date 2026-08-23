import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, Calendar } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

interface GoalProjectionCardProps {
  goal: Goal;
}

export const GoalProjectionCard = ({ goal }: GoalProjectionCardProps) => {
  const [monthlyContribution, setMonthlyContribution] = useState<string>("");
  const [annualRate, setAnnualRate] = useState<string>("10");
  const [projection, setProjection] = useState<{
    monthsToGoal: number;
    totalContributed: number;
    totalInterest: number;
  } | null>(null);
  const [suggestedContribution, setSuggestedContribution] = useState<number | null>(null);

  useEffect(() => {
    // Get suggested contribution from user's capacity
    fetchSuggestedContribution();
  }, []);

  const fetchSuggestedContribution = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", sixMonthsAgo.toISOString().split('T')[0]);

      if (transactions && transactions.length > 0) {
        const income = transactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const expenses = transactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const monthsSet = new Set(
          transactions.map(t => {
            const date = new Date(t.transaction_date);
            return `${date.getFullYear()}-${date.getMonth()}`;
          })
        );
        const monthsCount = Math.max(monthsSet.size, 1);

        const monthlyCapacity = Math.max((income - expenses) / monthsCount, 0);
        setSuggestedContribution(monthlyCapacity);
        setMonthlyContribution(monthlyCapacity.toFixed(2));
      }
    } catch (error) {
      console.error("Error fetching suggested contribution:", error);
    }
  };

  const calculateProjection = () => {
    const contribution = parseFloat(monthlyContribution);
    const rate = parseFloat(annualRate) / 100;
    const monthlyRate = rate / 12;

    if (isNaN(contribution) || contribution <= 0 || isNaN(rate)) {
      return;
    }

    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) {
      setProjection({
        monthsToGoal: 0,
        totalContributed: 0,
        totalInterest: 0,
      });
      return;
    }

    // Calculate months to reach goal with compound interest
    let months = 0;
    let currentValue = goal.current_amount;
    let totalContributed = 0;

    while (currentValue < goal.target_amount && months < 600) { // Max 50 years
      currentValue = currentValue * (1 + monthlyRate) + contribution;
      totalContributed += contribution;
      months++;
    }

    const totalInterest = goal.target_amount - goal.current_amount - totalContributed;

    setProjection({
      monthsToGoal: months,
      totalContributed,
      totalInterest,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const yearsToGoal = projection ? Math.floor(projection.monthsToGoal / 12) : 0;
  const monthsRemainder = projection ? projection.monthsToGoal % 12 : 0;

  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const monthsUntilDeadline = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  const willMeetDeadline = projection && monthsUntilDeadline 
    ? projection.monthsToGoal <= monthsUntilDeadline 
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Projeção da Meta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthlyContribution">
            Aporte Mensal
            {suggestedContribution && (
              <span className="text-xs text-muted-foreground ml-2">
                (Sugerido: {formatCurrency(suggestedContribution)})
              </span>
            )}
          </Label>
          <Input
            id="monthlyContribution"
            type="number"
            step="0.01"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualRate">Taxa Anual (%)</Label>
          <Input
            id="annualRate"
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            placeholder="10.0"
          />
        </div>

        <Button onClick={calculateProjection} className="w-full">
          <TrendingUp className="mr-2 h-4 w-4" />
          Calcular Projeção
        </Button>

        {projection && (
          <div className="space-y-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h4 className="text-lg font-semibold">Tempo Estimado</h4>
              </div>
              <div className="text-3xl font-bold text-primary">
                {yearsToGoal > 0 && `${yearsToGoal} ${yearsToGoal === 1 ? 'ano' : 'anos'}`}
                {yearsToGoal > 0 && monthsRemainder > 0 && ' e '}
                {monthsRemainder > 0 && `${monthsRemainder} ${monthsRemainder === 1 ? 'mês' : 'meses'}`}
                {projection.monthsToGoal === 0 && 'Meta já atingida!'}
              </div>
              
              {willMeetDeadline !== null && goal.deadline && (
                <div className={`mt-2 text-sm ${willMeetDeadline ? 'text-green-600' : 'text-amber-600'}`}>
                  {willMeetDeadline 
                    ? '✓ Você atingirá a meta antes do prazo!'
                    : '⚠ Aumente o aporte para atingir a meta no prazo'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Investido</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(projection.totalContributed)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Juros Ganhos</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(projection.totalInterest)}
                </p>
              </div>
            </div>

            <div className="pt-2 text-center text-sm text-muted-foreground">
              <p>
                Com aportes mensais de <strong>{formatCurrency(parseFloat(monthlyContribution))}</strong> e 
                rendimento de <strong>{annualRate}% a.a.</strong>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};