import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Client } from "@/pages/CRM";
import { PlanData } from "@/types/financial-plan";

interface RiskAnalysisProps {
  client: Client;
  onSaveAsPlan?: (data: PlanData) => void;
}

export const RiskAnalysis = ({ client, onSaveAsPlan }: RiskAnalysisProps) => {
  const [lifeInsurance, setLifeInsurance] = useState("");
  const [healthInsurance, setHealthInsurance] = useState("");
  const [incomeProtection, setIncomeProtection] = useState("");
  const [emergencyFund, setEmergencyFund] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeRisk = () => {
    const portfolio = Number(client.portfolio_value) || 0;
    const monthlyIncome = Number(client.monthly_income) || 0;
    const lifeSum = Number(lifeInsurance) || 0;
    const healthSum = Number(healthInsurance) || 0;
    const incomeSum = Number(incomeProtection) || 0;
    const emergency = Number(emergencyFund) || 0;

    // Análise de Reserva de Emergência (ideal: 6-12 meses de despesas)
    const recommendedEmergency = monthlyIncome * 6;
    const emergencyScore = Math.min((emergency / recommendedEmergency) * 100, 100);

    // Análise de Seguro de Vida (ideal: 5-10x renda anual)
    const recommendedLife = monthlyIncome * 12 * 7;
    const lifeScore = Math.min((lifeSum / recommendedLife) * 100, 100);

    // Análise de Seguro Saúde (binário: tem ou não tem)
    const healthScore = healthSum > 0 ? 100 : 0;

    // Análise de Seguro de Renda (ideal: 70% do salário)
    const recommendedIncome = monthlyIncome * 0.7 * 12;
    const incomeScore = Math.min((incomeSum / recommendedIncome) * 100, 100);

    // Score Geral
    const overallScore = (emergencyScore + lifeScore + healthScore + incomeScore) / 4;

    // Gaps e Recomendações
    const gaps = [];
    
    if (emergencyScore < 80) {
      gaps.push({
        type: "emergency",
        title: "Reserva de Emergência Insuficiente",
        current: emergency,
        recommended: recommendedEmergency,
        gap: recommendedEmergency - emergency,
        severity: emergencyScore < 50 ? "high" : "medium",
      });
    }

    if (lifeScore < 80) {
      gaps.push({
        type: "life",
        title: "Cobertura de Seguro de Vida Baixa",
        current: lifeSum,
        recommended: recommendedLife,
        gap: recommendedLife - lifeSum,
        severity: lifeScore < 50 ? "high" : "medium",
      });
    }

    if (healthScore < 80) {
      gaps.push({
        type: "health",
        title: "Sem Cobertura de Saúde Adequada",
        current: healthSum,
        recommended: monthlyIncome * 0.1 * 12, // 10% da renda
        gap: monthlyIncome * 0.1 * 12,
        severity: "high",
      });
    }

    if (incomeScore < 80) {
      gaps.push({
        type: "income",
        title: "Proteção de Renda Insuficiente",
        current: incomeSum,
        recommended: recommendedIncome,
        gap: recommendedIncome - incomeSum,
        severity: "medium",
      });
    }

    setAnalysis({
      overallScore,
      emergencyScore,
      lifeScore,
      healthScore,
      incomeScore,
      gaps,
      recommendations: {
        emergency: recommendedEmergency,
        life: recommendedLife,
        income: recommendedIncome,
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "Adequado", variant: "default" as const };
    if (score >= 50) return { label: "Atenção", variant: "secondary" as const };
    return { label: "Crítico", variant: "destructive" as const };
  };

  const handleSaveAsPlan = () => {
    if (!analysis || !onSaveAsPlan) return;

    onSaveAsPlan({
      plan_type: "risk",
      title: `Análise de Riscos e Proteção - ${client.name}`,
      description: `Avaliação completa da cobertura de proteção patrimonial e pessoal.`,
      parameters: {
        "Score de Proteção": `${analysis.overallScore.toFixed(0)}%`,
        "Reserva de Emergência": `${analysis.emergencyScore.toFixed(0)}%`,
        "Seguro de Vida": `${analysis.lifeScore.toFixed(0)}%`,
        "Seguro Saúde": `${analysis.healthScore.toFixed(0)}%`,
        "Proteção de Renda": `${analysis.incomeScore.toFixed(0)}%`,
        "Valor Seguro Vida": formatCurrency(Number(lifeInsurance) || 0),
        "Reserva Atual": formatCurrency(Number(emergencyFund) || 0),
        "Reserva Recomendada": formatCurrency(analysis.recommendations.emergency),
      },
      recommendations: analysis.gaps.map((gap: any) => ({
        title: gap.title,
        description: `Déficit de ${formatCurrency(gap.gap)}. Recomendado: ${formatCurrency(gap.recommended)}.`,
        priority: gap.severity === "high" ? "high" : "medium",
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Análise de Riscos e Proteção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="life-insurance">Seguro de Vida (R$)</Label>
            <Input
              id="life-insurance"
              type="number"
              value={lifeInsurance}
              onChange={(e) => setLifeInsurance(e.target.value)}
              placeholder="Capital segurado"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="health-insurance">Seguro Saúde (R$/ano)</Label>
            <Input
              id="health-insurance"
              type="number"
              value={healthInsurance}
              onChange={(e) => setHealthInsurance(e.target.value)}
              placeholder="Valor anual do plano"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="income-protection">Seguro de Renda (R$/ano)</Label>
            <Input
              id="income-protection"
              type="number"
              value={incomeProtection}
              onChange={(e) => setIncomeProtection(e.target.value)}
              placeholder="Cobertura anual"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency-fund">Reserva de Emergência (R$)</Label>
            <Input
              id="emergency-fund"
              type="number"
              value={emergencyFund}
              onChange={(e) => setEmergencyFund(e.target.value)}
              placeholder="Valor disponível"
            />
          </div>
        </div>

        <Button onClick={analyzeRisk} className="w-full">
          <Shield className="mr-2 h-4 w-4" />
          Analisar Proteção
        </Button>

        {analysis && (
          <div className="space-y-6 pt-6 border-t">
            {/* Overall Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">Score de Proteção</h4>
                  <p className="text-sm text-muted-foreground">
                    Avaliação geral da cobertura
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore.toFixed(0)}
                  </div>
                  <Badge {...getScoreBadge(analysis.overallScore)}>
                    {getScoreBadge(analysis.overallScore).label}
                  </Badge>
                </div>
              </div>
              <Progress value={analysis.overallScore} />
            </div>

            {/* Individual Scores */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">
                      Reserva de Emergência
                    </div>
                    <Badge {...getScoreBadge(analysis.emergencyScore)}>
                      {analysis.emergencyScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analysis.emergencyScore} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">Seguro de Vida</div>
                    <Badge {...getScoreBadge(analysis.lifeScore)}>
                      {analysis.lifeScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analysis.lifeScore} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">Seguro Saúde</div>
                    <Badge {...getScoreBadge(analysis.healthScore)}>
                      {analysis.healthScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analysis.healthScore} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-muted-foreground">Proteção de Renda</div>
                    <Badge {...getScoreBadge(analysis.incomeScore)}>
                      {analysis.incomeScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={analysis.incomeScore} className="h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Gaps and Recommendations */}
            {analysis.gaps.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h4 className="font-semibold">Lacunas Identificadas</h4>
                </div>
                {analysis.gaps.map((gap: any, index: number) => (
                  <Card
                    key={index}
                    className={
                      gap.severity === "high"
                        ? "bg-destructive/10 border-destructive/20"
                        : "bg-warning/10 border-warning/20"
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-sm">{gap.title}</div>
                            <Badge
                              variant={
                                gap.severity === "high" ? "destructive" : "secondary"
                              }
                              className="text-xs"
                            >
                              {gap.severity === "high" ? "Alta" : "Média"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Atual: {formatCurrency(gap.current)}</div>
                            <div>Recomendado: {formatCurrency(gap.recommended)}</div>
                            <div className="font-medium">
                              Déficit: {formatCurrency(gap.gap)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {analysis.gaps.length === 0 && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <h4 className="font-semibold">Proteção Adequada!</h4>
                      <p className="text-sm text-muted-foreground">
                        O cliente possui cobertura adequada em todos os aspectos avaliados.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {onSaveAsPlan && (
              <Button onClick={handleSaveAsPlan} variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Salvar como Plano
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
