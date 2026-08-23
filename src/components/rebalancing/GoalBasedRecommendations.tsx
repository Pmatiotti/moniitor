import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Target, TrendingUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

interface GoalBasedRecommendationsProps {
  totalValue: number;
  goals?: Goal[];
}

export const GoalBasedRecommendations = ({ totalValue, goals = [] }: GoalBasedRecommendationsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const analyzeGoalsRisk = () => {
    if (goals.length === 0) return null;

    // Categorize goals by time horizon
    const shortTermGoals = goals.filter(g => {
      if (!g.deadline) return false;
      const monthsRemaining = Math.ceil(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsRemaining <= 12;
    });

    const mediumTermGoals = goals.filter(g => {
      if (!g.deadline) return false;
      const monthsRemaining = Math.ceil(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsRemaining > 12 && monthsRemaining <= 60;
    });

    const longTermGoals = goals.filter(g => {
      if (!g.deadline) return false;
      const monthsRemaining = Math.ceil(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return monthsRemaining > 60;
    });

    // Calculate total amounts needed
    const shortTermTotal = shortTermGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0);
    const mediumTermTotal = mediumTermGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0);
    const longTermTotal = longTermGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0);

    const totalNeeded = shortTermTotal + mediumTermTotal + longTermTotal;
    const totalCurrentGoals = goals.reduce((sum, g) => sum + g.current_amount, 0);

    return {
      shortTerm: { count: shortTermGoals.length, amount: shortTermTotal },
      mediumTerm: { count: mediumTermGoals.length, amount: mediumTermTotal },
      longTerm: { count: longTermGoals.length, amount: longTermTotal },
      totalNeeded,
      totalCurrentGoals,
    };
  };

  const getRecommendations = () => {
    const analysis = analyzeGoalsRisk();
    if (!analysis) return [];

    const recommendations: string[] = [];
    const total = analysis.totalNeeded;

    if (total === 0) {
      return ["Você não possui metas ativas com prazos definidos."];
    }

    // Short term recommendations (< 1 year)
    if (analysis.shortTerm.amount > 0) {
      const shortTermPercent = (analysis.shortTerm.amount / total) * 100;
      recommendations.push(
        `📊 ${shortTermPercent.toFixed(0)}% para Curto Prazo (<1 ano): Priorize Renda Fixa (Pré/Pós fixado, Inflação). Mínimo de risco.`
      );
    }

    // Medium term recommendations (1-5 years)
    if (analysis.mediumTerm.amount > 0) {
      const mediumTermPercent = (analysis.mediumTerm.amount / total) * 100;
      recommendations.push(
        `📈 ${mediumTermPercent.toFixed(0)}% para Médio Prazo (1-5 anos): Balanceie entre Renda Fixa (60%) e Multimercado/FIIs (40%). Risco moderado.`
      );
    }

    // Long term recommendations (> 5 years)
    if (analysis.longTerm.amount > 0) {
      const longTermPercent = (analysis.longTerm.amount / total) * 100;
      recommendations.push(
        `🚀 ${longTermPercent.toFixed(0)}% para Longo Prazo (>5 anos): Foque em Ações (Large/Mid Caps), REITs e Stocks. Maior potencial de retorno.`
      );
    }

    // Overall allocation suggestion
    const conservativePercent = ((analysis.shortTerm.amount + analysis.mediumTerm.amount * 0.6) / total) * 100;
    const moderatePercent = (analysis.mediumTerm.amount * 0.4 / total) * 100;
    const aggressivePercent = (analysis.longTerm.amount / total) * 100;

    recommendations.push(
      `\n💡 Alocação Sugerida Total:\n` +
      `• Conservadora (RF): ~${conservativePercent.toFixed(0)}%\n` +
      `• Moderada (Fundos/FIIs): ~${moderatePercent.toFixed(0)}%\n` +
      `• Agressiva (Ações/Exterior): ~${aggressivePercent.toFixed(0)}%`
    );

    return recommendations;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recomendações Baseadas em Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Crie metas financeiras para receber recomendações personalizadas de alocação
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = analyzeGoalsRisk();
  const recommendations = getRecommendations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recomendações Baseadas em Metas
          </CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Sugestões de alocação baseadas nos prazos e valores das suas metas financeiras
                </p>
              </TooltipContent>
            </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {analysis && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1 text-center">
              <div className="text-sm text-muted-foreground">Curto Prazo</div>
              <div className="text-lg font-bold text-blue-600">{analysis.shortTerm.count}</div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(analysis.shortTerm.amount)}
              </div>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-sm text-muted-foreground">Médio Prazo</div>
              <div className="text-lg font-bold text-amber-600">{analysis.mediumTerm.count}</div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(analysis.mediumTerm.amount)}
              </div>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-sm text-muted-foreground">Longo Prazo</div>
              <div className="text-lg font-bold text-green-600">{analysis.longTerm.count}</div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(analysis.longTerm.amount)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t">
          {recommendations.map((rec, index) => (
            <div 
              key={index} 
              className="text-sm p-3 rounded-lg bg-muted/50 whitespace-pre-line"
            >
              {rec}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>
            💡 Dica: Ajuste sua alocação alvo acima considerando estas recomendações para 
            alinhar seus investimentos com suas metas financeiras.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};