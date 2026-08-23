import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Activity,
  Target,
  PieChart,
  Users,
} from "lucide-react";

interface HealthScore {
  overall_score: number;
  portfolio_health?: number;
  engagement_score?: number;
  risk_alignment?: number;
  diversification_score?: number;
}

interface ClientHealthScoreProps {
  score: HealthScore;
  compact?: boolean;
}

export const ClientHealthScore = ({ score, compact = false }: ClientHealthScoreProps) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-blue-600";
    if (value >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (value: number) => {
    if (value >= 80) return "bg-green-100";
    if (value >= 60) return "bg-blue-100";
    if (value >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return "Excelente";
    if (value >= 60) return "Bom";
    if (value >= 40) return "Atenção";
    return "Crítico";
  };

  const getScoreIcon = (value: number) => {
    if (value >= 60) return <CheckCircle2 className="h-5 w-5" />;
    if (value >= 40) return <AlertCircle className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center h-16 w-16 rounded-full ${getScoreBg(
            score.overall_score
          )}`}
        >
          <span className={`text-2xl font-bold ${getScoreColor(score.overall_score)}`}>
            {score.overall_score}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Score de Saúde</p>
          <p className={`text-lg font-bold ${getScoreColor(score.overall_score)}`}>
            {getScoreLabel(score.overall_score)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Score de Saúde do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Geral */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center h-20 w-20 rounded-full ${getScoreBg(
                score.overall_score
              )}`}
            >
              <span className={`text-3xl font-bold ${getScoreColor(score.overall_score)}`}>
                {score.overall_score}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Score Geral</p>
              <div className="flex items-center gap-2">
                {getScoreIcon(score.overall_score)}
                <p className={`text-xl font-bold ${getScoreColor(score.overall_score)}`}>
                  {getScoreLabel(score.overall_score)}
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant={score.overall_score >= 60 ? "default" : "destructive"}
            className="text-sm"
          >
            {score.overall_score >= 80 && "🔥 Top Performance"}
            {score.overall_score >= 60 && score.overall_score < 80 && "✓ Estável"}
            {score.overall_score >= 40 && score.overall_score < 60 && "⚠ Requer Atenção"}
            {score.overall_score < 40 && "🚨 Ação Imediata"}
          </Badge>
        </div>

        {/* Componentes Individuais */}
        <div className="space-y-4">
          {score.portfolio_health !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Saúde do Portfólio</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(score.portfolio_health)}`}>
                  {score.portfolio_health}%
                </span>
              </div>
              <Progress value={score.portfolio_health} className="h-2" />
            </div>
          )}

          {score.diversification_score !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Diversificação</span>
                </div>
                <span
                  className={`text-sm font-bold ${getScoreColor(
                    score.diversification_score
                  )}`}
                >
                  {score.diversification_score}%
                </span>
              </div>
              <Progress value={score.diversification_score} className="h-2" />
            </div>
          )}

          {score.risk_alignment !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Alinhamento de Risco</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(score.risk_alignment)}`}>
                  {score.risk_alignment}%
                </span>
              </div>
              <Progress value={score.risk_alignment} className="h-2" />
            </div>
          )}

          {score.engagement_score !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Engajamento</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(score.engagement_score)}`}>
                  {score.engagement_score}%
                </span>
              </div>
              <Progress value={score.engagement_score} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
