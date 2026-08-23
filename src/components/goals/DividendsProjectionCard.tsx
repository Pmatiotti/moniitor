import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Coins, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

interface DividendsProjectionCardProps {
  goal: Goal;
}

export const DividendsProjectionCard = ({ goal }: DividendsProjectionCardProps) => {
  const [monthlyDividends, setMonthlyDividends] = useState<number>(0);
  const [annualProjection, setAnnualProjection] = useState<number>(0);
  const [contributionToGoal, setContributionToGoal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateDividendsProjection();
  }, [goal.id]);

  const calculateDividendsProjection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get linked assets for this goal
      const { data: mappings } = await supabase
        .from("goal_portfolio_mappings")
        .select("asset_id, asset_class, sub_class")
        .eq("goal_id", goal.id);

      if (!mappings || mappings.length === 0) {
        setLoading(false);
        return;
      }

      // Get user's personal assets (exclude client assets)
      const { data: assets } = await supabase
        .from("assets")
        .select("id, ticker, quantity, asset_class")
        .eq("user_id", user.id)
        .is("client_id", null);

      if (!assets) {
        setLoading(false);
        return;
      }

      // Filter assets linked to this goal
      const linkedAssetIds = mappings
        .filter(m => m.asset_id)
        .map(m => m.asset_id);
      
      const linkedAssets = assets.filter(a => linkedAssetIds.includes(a.id));

      if (linkedAssets.length === 0) {
        setLoading(false);
        return;
      }

      // Get historical dividends for these assets (last 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: dividends } = await supabase
        .from("dividends")
        .select("ticker, amount, payment_date")
        .eq("user_id", user.id)
        .in("ticker", linkedAssets.map(a => a.ticker))
        .gte("payment_date", oneYearAgo.toISOString().split('T')[0]);

      if (!dividends || dividends.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate average monthly dividends
      const totalDividends = dividends.reduce((sum, d) => sum + Number(d.amount), 0);
      const avgMonthly = totalDividends / 12;
      const annualEstimate = avgMonthly * 12;

      setMonthlyDividends(avgMonthly);
      setAnnualProjection(annualEstimate);

      // Calculate how dividends contribute to the goal
      const remaining = goal.target_amount - goal.current_amount;
      const monthsToGoal = remaining > 0 && avgMonthly > 0
        ? Math.ceil(remaining / avgMonthly)
        : 0;

      // Calculate total dividend contribution until deadline or projected completion
      const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
      const monthsUntilDeadline = deadlineDate
        ? Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))
        : monthsToGoal;

      const effectiveMonths = Math.min(monthsToGoal || monthsUntilDeadline, monthsUntilDeadline);
      const totalContribution = avgMonthly * effectiveMonths;

      setContributionToGoal(totalContribution);
    } catch (error) {
      console.error("Error calculating dividends projection:", error);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Projeção de Dividendos
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

  if (monthlyDividends === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Projeção de Dividendos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum ativo gerador de dividendos vinculado a esta meta ou sem histórico
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contributionPercent = goal.target_amount > 0 
    ? (contributionToGoal / goal.target_amount) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Projeção de Dividendos
          </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Baseado na média dos últimos 12 meses dos ativos vinculados a esta meta
                </p>
              </TooltipContent>
            </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm text-muted-foreground">Dividendos Mensais</span>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {formatCurrency(monthlyDividends)}
          </div>
          <p className="text-sm text-muted-foreground">
            ~{formatCurrency(annualProjection)} por ano
          </p>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Contribuição para Meta</span>
            <span className="text-sm font-medium">{contributionPercent.toFixed(1)}%</span>
          </div>

          <div className="space-y-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(contributionToGoal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dividendos projetados até {goal.deadline 
                  ? new Date(goal.deadline).toLocaleDateString('pt-BR') 
                  : 'atingir a meta'}
              </p>
            </div>
          </div>

          <div className="pt-3 text-center">
            <p className="text-xs text-muted-foreground">
              {contributionPercent >= 50
                ? "Excelente! Os dividendos cobrem mais da metade da meta."
                : contributionPercent >= 25
                ? "Bom! Os dividendos ajudarão significativamente."
                : contributionPercent > 0
                ? "Os dividendos darão uma ajuda extra para sua meta."
                : "Considere adicionar ativos que geram dividendos."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};