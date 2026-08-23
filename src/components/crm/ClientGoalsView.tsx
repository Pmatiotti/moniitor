import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  goal_type: string;
  status: string;
}

interface ClientGoalsViewProps {
  clientId: string;
}

export const ClientGoalsView = ({ clientId }: ClientGoalsViewProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, [clientId]);

  const fetchGoals = async () => {
    try {
      // Buscar metas por client_id (clientes manuais) OU user_id (clientes vinculados)
      const { data: goalsByClientId, error: clientError } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("client_id", clientId)
        .order("deadline", { ascending: true, nullsFirst: false });

      if (clientError) throw clientError;

      // Se não encontrou metas por client_id, buscar por user_id (cliente vinculado)
      if (!goalsByClientId || goalsByClientId.length === 0) {
        const { data: goalsByUserId, error: userError } = await supabase
          .from("financial_goals")
          .select("*")
          .eq("user_id", clientId)
          .order("deadline", { ascending: true, nullsFirst: false });

        if (userError) throw userError;
        setGoals(goalsByUserId || []);
      } else {
        setGoals(goalsByClientId);
      }
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      in_progress: "default",
      completed: "secondary",
      cancelled: "outline",
    };
    const labels: Record<string, string> = {
      in_progress: "Em progresso",
      completed: "Concluída",
      cancelled: "Cancelada",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case "savings":
        return <Target className="h-5 w-5" />;
      case "investment":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhuma meta cadastrada para este cliente ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const progress = goal.target_amount > 0 
          ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 
          : 0;

        return (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getGoalTypeIcon(goal.goal_type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(goal.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">
                    {formatCurrency(Number(goal.current_amount))}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(goal.target_amount))}
                  </span>
                </div>
              </div>

              {goal.deadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Prazo: {format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {progress >= 100 && goal.status === 'in_progress' && (
                <div className="bg-success/10 text-success border border-success/20 rounded-lg p-3 text-sm">
                  🎉 Meta atingida! Considere atualizar o status para "Concluída".
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};