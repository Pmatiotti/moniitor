import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

export const GoalsSidebarWidget = () => {
  const [primaryGoal, setPrimaryGoal] = useState<Goal | null>(null);
  const [totalGoals, setTotalGoals] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrimaryGoal();
  }, []);

  const fetchPrimaryGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all active goals
      const { data: goals, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .order("deadline", { ascending: true, nullsFirst: false });

      if (error) throw error;

      setTotalGoals(goals?.length || 0);

      // Set the goal with nearest deadline as primary
      if (goals && goals.length > 0) {
        setPrimaryGoal(goals[0]);
      }
    } catch (error) {
      console.error("Error fetching primary goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="px-3 py-2 border-b">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-2 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!primaryGoal) {
    return (
      <div className="px-3 py-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Metas</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => navigate("/goals")}
        >
          <Plus className="mr-2 h-3 w-3" />
          Criar Meta
        </Button>
      </div>
    );
  }

  const progress = (primaryGoal.current_amount / primaryGoal.target_amount) * 100;
  const daysRemaining = primaryGoal.deadline
    ? Math.ceil((new Date(primaryGoal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="px-3 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/goals")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs font-medium truncate">
                  {primaryGoal.title}
                </span>
              </div>
              {totalGoals > 1 && (
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  +{totalGoals - 1}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCurrency(primaryGoal.current_amount)}
                </span>
                <span className="font-medium">
                  {progress.toFixed(0)}%
                </span>
              </div>

              {daysRemaining !== null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>{daysRemaining} dias</span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{primaryGoal.title}</p>
            <p className="text-sm">
              Meta: {formatCurrency(primaryGoal.target_amount)}
            </p>
            <p className="text-sm">
              Atual: {formatCurrency(primaryGoal.current_amount)}
            </p>
            {daysRemaining !== null && (
              <p className="text-sm">
                Faltam {daysRemaining} dias para o prazo
              </p>
            )}
            {totalGoals > 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                Clique para ver todas as {totalGoals} metas
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
  );
};