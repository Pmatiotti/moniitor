import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Award, Target, TrendingUp, Zap, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Achievement {
  id: string;
  achievement_type: string;
  goal_id: string | null;
  earned_at: string;
}

interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_goal',
    title: 'Primeiro Passo',
    description: 'Criou sua primeira meta financeira',
    icon: <Target className="h-6 w-6" />,
    color: 'text-blue-600',
  },
  {
    type: 'goal_completed',
    title: 'Meta Alcançada',
    description: 'Completou uma meta financeira',
    icon: <Trophy className="h-6 w-6" />,
    color: 'text-amber-600',
  },
  {
    type: 'three_goals_completed',
    title: 'Conquistas Múltiplas',
    description: 'Completou 3 metas financeiras',
    icon: <Award className="h-6 w-6" />,
    color: 'text-purple-600',
  },
  {
    type: 'ahead_of_schedule',
    title: 'À Frente do Tempo',
    description: 'Atingiu uma meta antes do prazo',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-green-600',
  },
  {
    type: 'consistent_contributor',
    title: 'Disciplina Financeira',
    description: 'Manteve aportes regulares por 6 meses',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'text-indigo-600',
  },
  {
    type: 'high_saver',
    title: 'Poupador Master',
    description: 'Taxa de poupança acima de 30%',
    icon: <Star className="h-6 w-6" />,
    color: 'text-yellow-600',
  },
];

export const AchievementsCard = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    calculateScore();
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get goals
      const { data: goals } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id);

      // Get transactions (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", sixMonthsAgo.toISOString().split('T')[0]);

      // Get achievements
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);

      let totalScore = 0;

      // Score from goals (10 points per goal, 50 for completed)
      if (goals) {
        totalScore += goals.filter(g => g.status === 'in_progress').length * 10;
        totalScore += goals.filter(g => g.status === 'completed').length * 50;
      }

      // Score from achievements (25 points each)
      totalScore += (userAchievements?.length || 0) * 25;

      // Score from consistent transactions (up to 50 points)
      if (transactions && transactions.length > 0) {
        const monthsSet = new Set(
          transactions.map(t => {
            const date = new Date(t.transaction_date);
            return `${date.getFullYear()}-${date.getMonth()}`;
          })
        );
        const consistency = Math.min(monthsSet.size / 6, 1) * 50;
        totalScore += Math.round(consistency);
      }

      setScore(totalScore);
    } catch (error) {
      console.error("Error calculating score:", error);
    }
  };

  const getScoreLevel = (score: number) => {
    if (score < 50) return { level: 'Iniciante', color: 'text-gray-600', progress: (score / 50) * 100 };
    if (score < 150) return { level: 'Bronze', color: 'text-amber-700', progress: ((score - 50) / 100) * 100 };
    if (score < 300) return { level: 'Prata', color: 'text-gray-400', progress: ((score - 150) / 150) * 100 };
    if (score < 500) return { level: 'Ouro', color: 'text-yellow-500', progress: ((score - 300) / 200) * 100 };
    return { level: 'Diamante', color: 'text-cyan-500', progress: 100 };
  };

  const scoreLevel = getScoreLevel(score);

  const hasAchievement = (type: string) => {
    return achievements.some(a => a.achievement_type === type);
  };

  if (loading) {
    return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5" />
          Conquistas
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5" />
          Conquistas & Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Trophy className={`h-10 w-10 ${scoreLevel.color}`} />
            <div className="text-center">
              <div className={`text-3xl font-bold ${scoreLevel.color}`}>
                {scoreLevel.level}
              </div>
              <div className="text-sm text-muted-foreground">
                {score} pontos
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={scoreLevel.progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Progresso para o próximo nível
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="text-sm font-semibold">Badges Desbloqueados</h4>
            <div className="grid grid-cols-3 gap-3">
              {ACHIEVEMENT_DEFINITIONS.map((def) => {
                const earned = hasAchievement(def.type);
                return (
                  <Tooltip key={def.type}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          earned
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-muted/30 border-muted opacity-50'
                        }`}
                      >
                        <div className={earned ? def.color : 'text-muted-foreground'}>
                          {def.icon}
                        </div>
                        <span className="text-[10px] text-center font-medium leading-tight line-clamp-2">
                          {def.title}
                        </span>
                        {earned && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{def.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
        </div>

        {achievements.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Últimas Conquistas</h4>
            <div className="space-y-2">
              {achievements.slice(0, 3).map((achievement) => {
                const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === achievement.achievement_type);
                if (!def) return null;

                return (
                  <div key={achievement.id} className="flex items-center gap-3 text-sm">
                    <div className={def.color}>
                      {def.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{def.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(achievement.earned_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};