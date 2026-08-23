import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Check, 
  Circle, 
  UserCheck, 
  TrendingUp, 
  Building2, 
  Wallet, 
  Target,
  ChevronRight,
  Sparkles,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  action: () => void;
  actionLabel: string;
}

interface OnboardingChecklistProps {
  onComplete?: () => void;
  userName?: string;
}

export const OnboardingChecklist = ({ onComplete, userName }: OnboardingChecklistProps) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingProgress();
  }, []);

  const checkOnboardingProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed, full_name')
        .eq('id', user.id)
        .single();

      // Check assets
      const { count: assetsCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check patrimony
      const { count: patrimonyCount } = await supabase
        .from('patrimony_assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check Pluggy connections
      const { count: pluggyCount } = await supabase
        .from('pluggy_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check goals
      const { count: goalsCount } = await supabase
        .from('financial_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const onboardingSteps: OnboardingStep[] = [
        {
          id: 'account',
          title: 'Criar conta',
          description: 'Sua conta foi criada com sucesso',
          icon: <Check className="h-4 w-4" />,
          isComplete: true,
          action: () => {},
          actionLabel: 'Concluído'
        },
        {
          id: 'profile',
          title: 'Completar perfil',
          description: 'Adicione suas informações pessoais',
          icon: <UserCheck className="h-4 w-4" />,
          isComplete: profile?.profile_completed ?? false,
          action: () => navigate('/profile'),
          actionLabel: 'Completar'
        },
        {
          id: 'assets',
          title: 'Adicionar investimentos',
          description: 'Cadastre seus ativos na carteira',
          icon: <TrendingUp className="h-4 w-4" />,
          isComplete: (assetsCount ?? 0) > 0,
          action: () => navigate('/portfolio'),
          actionLabel: 'Adicionar'
        },
        {
          id: 'patrimony',
          title: 'Cadastrar patrimônio',
          description: 'Imóveis, veículos e participações',
          icon: <Building2 className="h-4 w-4" />,
          isComplete: (patrimonyCount ?? 0) > 0,
          action: () => navigate('/patrimony'),
          actionLabel: 'Cadastrar'
        },
        {
          id: 'pluggy',
          title: 'Conectar banco',
          description: 'Sincronize suas contas automaticamente',
          icon: <Wallet className="h-4 w-4" />,
          isComplete: (pluggyCount ?? 0) > 0,
          action: () => navigate('/finances'),
          actionLabel: 'Conectar'
        },
        {
          id: 'goals',
          title: 'Definir meta financeira',
          description: 'Crie objetivos para acompanhar',
          icon: <Target className="h-4 w-4" />,
          isComplete: (goalsCount ?? 0) > 0,
          action: () => navigate('/goals'),
          actionLabel: 'Criar'
        }
      ];

      setSteps(onboardingSteps);
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleSkipOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        onComplete?.();
      }
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary animate-pulse">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Bem-vindo{userName ? `, ${userName}` : ''}! 
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete os passos abaixo para começar
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSkipOnboarding}
            className="text-muted-foreground hover:text-foreground"
          >
            Pular
          </Button>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedSteps}/{totalSteps} completos</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all",
                step.isComplete 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-muted/50 hover:bg-muted border border-transparent"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                step.isComplete 
                  ? "bg-green-500 text-white" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {step.isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  step.isComplete && "line-through text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              
              {!step.isComplete && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={step.action}
                  className="flex-shrink-0"
                >
                  {step.actionLabel}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              
              {step.isComplete && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ Concluído
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
