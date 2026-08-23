import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Target, Calendar } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number | null;
  deadline: string | null;
}

interface ClientGoalsSummaryCardProps {
  clientId: string;
}

export const ClientGoalsSummaryCard = ({ clientId }: ClientGoalsSummaryCardProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        // Primeiro tenta buscar por client_id (clientes manuais)
        let { data, error } = await supabase
          .from("financial_goals")
          .select("id, title, target_amount, current_amount, deadline")
          .eq("client_id", clientId)
          .eq("status", "active")
          .order("deadline", { ascending: true });

        if (error) throw error;

        // Fallback: buscar por user_id (clientes vinculados)
        if (!data || data.length === 0) {
          const fallback = await supabase
            .from("financial_goals")
            .select("id, title, target_amount, current_amount, deadline")
            .eq("user_id", clientId)
            .is("client_id", null)
            .eq("status", "active")
            .order("deadline", { ascending: true });

          if (fallback.error) throw fallback.error;
          data = fallback.data;
        }

        setGoals(data || []);
      } catch (error) {
        console.error("Error fetching client goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [clientId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return null;
  }

  // Calculate overall progress
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  // Find next goal by deadline
  const goalsWithDeadline = goals.filter(g => g.deadline);
  const nextGoal = goalsWithDeadline.length > 0 ? goalsWithDeadline[0] : null;
  const daysToNextGoal = nextGoal?.deadline 
    ? differenceInDays(new Date(nextGoal.deadline), new Date())
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas Financeiras
          <span className="text-xs font-normal text-muted-foreground">
            ({goals.length} ativa{goals.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">{overallProgress.toFixed(0)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(totalCurrent)}</span>
            <span>{formatCurrency(totalTarget)}</span>
          </div>
        </div>

        {/* Next goal */}
        {nextGoal && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Próxima Meta
            </div>
            <div className="text-sm font-medium truncate">{nextGoal.title}</div>
            {daysToNextGoal !== null && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {daysToNextGoal > 0 
                  ? `em ${daysToNextGoal} dias`
                  : daysToNextGoal === 0
                  ? 'Hoje!'
                  : `${Math.abs(daysToNextGoal)} dias atrás`
                }
                {nextGoal.deadline && (
                  <span className="ml-1">
                    ({format(new Date(nextGoal.deadline), "MMM yyyy", { locale: ptBR })})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
