import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, Target, Brain, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LimitReachedProps {
  type: 'assets' | 'goals' | 'ai';
  current: number;
  limit: number;
}

const messages = {
  assets: {
    title: 'Limite de ativos atingido',
    description: 'Você atingiu o limite de ativos no plano gratuito.',
    icon: Package,
  },
  goals: {
    title: 'Limite de metas atingido',
    description: 'Você atingiu o limite de metas no plano gratuito.',
    icon: Target,
  },
  ai: {
    title: 'Limite de perguntas atingido',
    description: 'Você atingiu o limite de perguntas à IA neste mês.',
    icon: Brain,
  },
};

export const LimitReached = ({ type, current, limit }: LimitReachedProps) => {
  const navigate = useNavigate();
  const { title, description, icon: Icon } = messages[type];

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm">
              {description}
            </p>
            <p className="text-xs text-muted-foreground">
              Uso: <span className="font-medium text-foreground">{current}</span> de{' '}
              <span className="font-medium text-foreground">{limit}</span>
            </p>
          </div>

          <Button 
            onClick={() => navigate('/subscription')}
            className="gap-2"
          >
            Fazer Upgrade
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Inline version for dialogs/modals
export const LimitReachedInline = ({ type, limit }: { type: 'assets' | 'goals' | 'ai'; limit: number }) => {
  const navigate = useNavigate();
  const { title, icon: Icon } = messages[type];

  return (
    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <Icon className="h-5 w-5 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          Limite de {limit} no plano gratuito
        </p>
      </div>
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => navigate('/subscription')}
      >
        Upgrade
      </Button>
    </div>
  );
};
