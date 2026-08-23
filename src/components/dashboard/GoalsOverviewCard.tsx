import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, ArrowRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  goal_type: string;
}

export const GoalsOverviewCard = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("deadline", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
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
            <Target className="h-5 w-5" />
            Metas Financeiras
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

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              Você ainda não criou nenhuma meta financeira
            </p>
            <Button onClick={() => navigate("/goals")}>
              Criar Meta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const nextGoal = goals.find(g => g.deadline) || goals[0];
  const nextGoalProgress = nextGoal 
    ? (nextGoal.current_amount / nextGoal.target_amount) * 100 
    : 0;

  const daysToNextGoal = nextGoal?.deadline
    ? Math.ceil((new Date(nextGoal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas Financeiras
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/goals")}>
            Ver todas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatCurrency(totalCurrent)}</span>
            <span>{formatCurrency(totalTarget)}</span>
          </div>
        </div>

        {nextGoal && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Próxima Meta</span>
              {daysToNextGoal !== null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{daysToNextGoal} dias</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <h4 className="font-medium">{nextGoal.title}</h4>
                <span className="text-sm text-muted-foreground">{nextGoalProgress.toFixed(1)}%</span>
              </div>
              <Progress value={nextGoalProgress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{formatCurrency(nextGoal.current_amount)}</span>
                <span className="font-medium">{formatCurrency(nextGoal.target_amount)}</span>
              </div>
              {nextGoal.deadline && (
                <p className="text-xs text-muted-foreground">
                  Prazo: {format(new Date(nextGoal.deadline), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        )}

        {goals.length > 1 && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              +{goals.length - 1} meta{goals.length - 1 !== 1 ? 's' : ''} ativa{goals.length - 1 !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};