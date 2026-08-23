import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import { EditGoalDialog } from "@/components/goals/EditGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { ContributionCapacityCard } from "@/components/goals/ContributionCapacityCard";
import { GoalProjectionCard } from "@/components/goals/GoalProjectionCard";
import { DividendsProjectionCard } from "@/components/goals/DividendsProjectionCard";
import { GoalNotificationsCard } from "@/components/goals/GoalNotificationsCard";
import { AchievementsCard } from "@/components/goals/AchievementsCard";
import { AIQuickAction } from "@/components/ai/AIQuickAction";

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

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch goals created by the user and goals created by advisors for the user
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Erro ao carregar metas",
        description: "Não foi possível carregar suas metas financeiras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      const { error } = await supabase
        .from("financial_goals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Meta excluída",
        description: "A meta foi removida com sucesso.",
      });

      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir meta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setEditDialogOpen(true);
  };

  const handleSyncProgress = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('sync-goal-progress', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Progresso sincronizado!",
        description: "As metas foram atualizadas com base no seu portfolio.",
      });

      fetchGoals();
      checkAchievements();
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const checkAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for first goal achievement
      if (goals.length === 1) {
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_type", "first_goal")
          .single();

        if (!existing) {
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_type: "first_goal",
          });
        }
      }

      // Check for completed goals achievement
      const completedGoals = goals.filter(g => g.status === "completed");
      if (completedGoals.length >= 3) {
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_type", "three_goals_completed")
          .single();

        if (!existing) {
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_type: "three_goals_completed",
          });
        }
      }
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Metas Financeiras</h1>
            <p className="text-muted-foreground">Defina e acompanhe seus objetivos financeiros</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncProgress} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Button>
          </div>
        </div>

        {goals.length > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total das Metas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalTarget)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {goals.length} meta{goals.length !== 1 ? 's' : ''} ativa{goals.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(totalCurrent)} de {formatCurrency(totalTarget)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <ContributionCapacityCard />
              <AchievementsCard />
              <GoalNotificationsCard />
            </div>
            
            {selectedGoal && (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <GoalProjectionCard goal={selectedGoal} />
                <DividendsProjectionCard goal={selectedGoal} />
              </div>
            )}

            {/* AI Quick Actions para Goals */}
            {goals.length > 0 && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Análises Inteligentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <AIQuickAction
                      label="Otimizar Aportes"
                      prompt={`Analise minhas ${goals.length} metas e sugira a melhor estratégia de aportes mensais para atingi-las`}
                      contextData={{ goals, stats: { totalTarget, totalCurrent } }}
                      variant="outline"
                    />
                    <AIQuickAction
                      label="Priorizar Metas"
                      prompt={`Com base nas minhas metas, qual devo priorizar primeiro? Considere prazos, valores e importância`}
                      contextData={{ goals }}
                      variant="outline"
                    />
                    <AIQuickAction
                      label="Calcular Viabilidade"
                      prompt={`Avalie se minhas metas são realistas considerando meu perfil financeiro e prazos estabelecidos`}
                      contextData={{ goals, stats: { totalTarget, totalCurrent, overallProgress } }}
                      variant="outline"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : goals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma meta criada</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                Comece definindo suas metas financeiras para acompanhar seu progresso
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => {
                  handleEdit(g);
                  setSelectedGoal(g);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <AddGoalDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={fetchGoals}
        />

        <EditGoalDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchGoals}
          goal={selectedGoal}
        />
      </div>
    </AppLayout>
  );
};

export default Goals;
