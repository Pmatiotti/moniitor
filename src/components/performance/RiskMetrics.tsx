import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, TrendingDown, Zap, BarChart2 } from "lucide-react";
import { evaluateSharpeRatio, evaluateVolatility, evaluateDrawdown } from "@/lib/performance-calculations";

interface RiskMetricsProps {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  sortino?: number;
  calmarRatio?: number;
  hasData?: boolean;
}

export const RiskMetrics = ({ 
  volatility, 
  sharpeRatio, 
  maxDrawdown,
  sortino = 0,
  calmarRatio = 0,
  hasData = true
}: RiskMetricsProps) => {
  const riskLevel = evaluateVolatility(volatility);
  const sharpeRating = evaluateSharpeRatio(sharpeRatio);
  const drawdownSeverity = evaluateDrawdown(maxDrawdown);

  const getSortinoRating = (ratio: number) => {
    if (ratio > 2) return { rating: "Excelente", color: "text-success" };
    if (ratio > 1) return { rating: "Bom", color: "text-info" };
    if (ratio > 0) return { rating: "Aceitável", color: "text-warning" };
    return { rating: "Ruim", color: "text-destructive" };
  };

  const sortinoRating = getSortinoRating(sortino);

  if (!hasData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-5 w-5" />
                Aguardando Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Crie snapshots diários para visualizar métricas de risco reais.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Análise de Volatilidade
              <Badge variant="outline" className="ml-auto">Real</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Nível de Risco</span>
                <span className={`text-sm font-medium ${riskLevel.color}`}>
                  {riskLevel.level}
                </span>
              </div>
              <Progress value={riskLevel.progress} className="h-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{volatility.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Volatilidade anualizada
              </p>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>Calculada como desvio padrão dos retornos diários × √252.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Índice Sharpe
              <Badge variant="outline" className="ml-auto">Real</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Classificação</span>
                <span className={`text-sm font-medium ${sharpeRating.color}`}>
                  {sharpeRating.rating}
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{sharpeRatio.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Retorno ajustado ao risco (vs CDI)
              </p>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>Mede o retorno excedente por unidade de risco. Valores acima de 1 são considerados bons.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Drawdown Máximo
              <Badge variant="outline" className="ml-auto">Real</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Severidade</span>
                <span className={`text-sm font-medium ${drawdownSeverity.color}`}>
                  {drawdownSeverity.severity}
                </span>
              </div>
              <Progress value={Math.min(Math.abs(maxDrawdown), 100)} className="h-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">-{maxDrawdown.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Maior queda do pico ao vale
              </p>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>A maior queda percentual do portfólio de um pico até o vale seguinte.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Índice Sortino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{sortino.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Similar ao Sharpe, mas considera apenas volatilidade negativa
                </p>
              </div>
              <span className={`text-sm font-medium ${sortinoRating.color}`}>
                {sortinoRating.rating}
              </span>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>Penaliza apenas quedas, não oscilações positivas. Mais justo para ativos com upside assimétrico.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Índice Calmar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">{calmarRatio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Retorno anualizado dividido pelo máximo drawdown
                </p>
              </div>
              <span className={`text-sm font-medium ${calmarRatio >= 1 ? 'text-success' : calmarRatio >= 0.5 ? 'text-warning' : 'text-destructive'}`}>
                {calmarRatio >= 1 ? 'Bom' : calmarRatio >= 0.5 ? 'Moderado' : 'Baixo'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>Mede quanto retorno você obteve para cada unidade de risco de drawdown.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
