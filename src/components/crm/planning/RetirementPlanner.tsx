import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, Sparkles, Loader2, FileText } from "lucide-react";
import { Client } from "@/pages/CRM";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PlanData } from "@/types/financial-plan";

interface RetirementPlannerProps {
  client: Client;
  onSaveAsPlan?: (data: PlanData) => void;
}

export const RetirementPlanner = ({ client, onSaveAsPlan }: RetirementPlannerProps) => {
  const [currentAge, setCurrentAge] = useState("45");
  const [retirementAge, setRetirementAge] = useState("65");
  const [desiredIncome, setDesiredIncome] = useState(
    client.monthly_income?.toString() || "10000"
  );
  const [currentExpenses, setCurrentExpenses] = useState("7000");
  const [expenseGrowthRate, setExpenseGrowthRate] = useState("3");
  const [autoCalcRetirementExpenses, setAutoCalcRetirementExpenses] = useState(true);
  const [retirementExpenses, setRetirementExpenses] = useState("7000");
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState("10000");
  const [inflationRate, setInflationRate] = useState("4.5");
  const [returnRate, setReturnRate] = useState("10");
  const [finalAge, setFinalAge] = useState("100");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Auto-calculate retirement expenses when checkbox is checked
  useEffect(() => {
    if (autoCalcRetirementExpenses) {
      const curAge = Number(currentAge);
      const retAge = Number(retirementAge);
      const yearsToRetirement = Math.max(0, retAge - curAge);
      const growthRate = Number(expenseGrowthRate) / 100;
      const currentExp = Number(currentExpenses);
      const calculatedExpenses = currentExp * Math.pow(1 + growthRate, yearsToRetirement);
      setRetirementExpenses(Math.round(calculatedExpenses).toString());
    }
  }, [autoCalcRetirementExpenses, currentExpenses, expenseGrowthRate, currentAge, retirementAge]);

  const calculateRetirement = () => {
    const currentPortfolio = Number(client.portfolio_value) || 0;
    const monthlyIncome = Number(desiredIncome);
    const withdrawal = Number(monthlyWithdrawal);
    const retAge = Number(retirementAge);
    const curAge = Number(currentAge);
    const endAge = Number(finalAge);
    const yearsToRetirement = retAge - curAge;
    const monthsToRetirement = yearsToRetirement * 12;
    const monthlyReturn = Number(returnRate) / 100 / 12;
    const yearlyReturn = Math.pow(1 + monthlyReturn, 12) - 1;

    // Calcular patrimônio necessário (regra dos 4%)
    const annualIncome = monthlyIncome * 12;
    const requiredPortfolio = annualIncome / 0.04;

    // Projetar crescimento do portfólio atual
    const futureValue = currentPortfolio * Math.pow(1 + monthlyReturn, monthsToRetirement);

    // Calcular aporte mensal necessário
    const deficit = requiredPortfolio - futureValue;
    let monthlyContribution = 0;
    
    if (deficit > 0) {
      monthlyContribution = deficit / (((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn));
    }

    // Gerar projeção ano a ano até os 100 anos
    const projection = [];
    let portfolio = currentPortfolio;
    const annualWithdrawal = withdrawal * 12;
    
    for (let age = curAge; age <= endAge; age++) {
      const isRetired = age >= retAge;
      
      projection.push({
        year: age,
        portfolio: Math.max(0, Math.round(portfolio)),
        target: Math.round(requiredPortfolio),
        phase: isRetired ? "Aposentadoria" : "Acumulação",
      });
      
      if (age < endAge) {
        if (isRetired) {
          // Fase de aposentadoria: rendimentos - resgates
          portfolio = portfolio * (1 + yearlyReturn) - annualWithdrawal;
        } else {
          // Fase de acumulação: aportes + rendimentos
          portfolio = (portfolio + monthlyContribution * 12) * (1 + yearlyReturn);
        }
      }
    }

    // Calcular idade em que o patrimônio zera
    const portfolioZeroAge = projection.find(p => p.portfolio <= 0)?.year || null;
    const yearsOfIncome = portfolioZeroAge 
      ? portfolioZeroAge - retAge 
      : endAge - retAge;

    setAnalysis({
      currentPortfolio,
      requiredPortfolio,
      futureValue,
      monthlyContribution,
      deficit: Math.max(0, deficit),
      projection,
      isOnTrack: futureValue >= requiredPortfolio,
      completionPercentage: (futureValue / requiredPortfolio) * 100,
      portfolioZeroAge,
      yearsOfIncome,
      monthlyWithdrawal: withdrawal,
    });
  };

  const analyzeWithAI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("retirement-analysis", {
        body: {
          client_id: client.id,
          current_age: Number(currentAge),
          retirement_age: Number(retirementAge),
          desired_income: Number(desiredIncome),
          current_portfolio: Number(client.portfolio_value) || 0,
          inflation_rate: Number(inflationRate),
          return_rate: Number(returnRate),
        },
      });

      if (error) throw error;

      toast.success("Análise gerada com IA!");
      setAnalysis({ ...analysis, ai_insights: data.insights });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erro ao gerar análise com IA");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSaveAsPlan = () => {
    if (!analysis || !onSaveAsPlan) return;

    const recommendations: PlanData["recommendations"] = [];
    
    if (!analysis.isOnTrack) {
      recommendations.push({
        title: "Aumentar Aportes Mensais",
        description: `Recomendamos aporte mensal de ${formatCurrency(analysis.monthlyContribution)} para atingir a meta.`,
        priority: "high",
      });
    }
    
    if (analysis.portfolioZeroAge) {
      recommendations.push({
        title: "Rever Estratégia de Retirada",
        description: `Com os parâmetros atuais, o patrimônio se esgota aos ${analysis.portfolioZeroAge} anos. Considere reduzir o resgate mensal.`,
        priority: "high",
      });
    }

    onSaveAsPlan({
      plan_type: "retirement",
      title: `Aposentadoria aos ${retirementAge} anos - ${client.name}`,
      description: `Planejamento de aposentadoria com projeção de ${Number(retirementAge) - Number(currentAge)} anos até a aposentadoria.`,
      parameters: {
        "Idade Atual": currentAge,
        "Idade Aposentadoria": retirementAge,
        "Renda Desejada": formatCurrency(Number(desiredIncome)),
        "Resgate Mensal": formatCurrency(Number(monthlyWithdrawal)),
        "Patrimônio Atual": formatCurrency(Number(client.portfolio_value) || 0),
        "Patrimônio Necessário": formatCurrency(analysis.requiredPortfolio),
        "Aporte Mensal Recomendado": formatCurrency(analysis.monthlyContribution),
        "Retorno Esperado": `${returnRate}%`,
        "Inflação": `${inflationRate}%`,
        "Status": analysis.isOnTrack ? "No Caminho" : "Necessita Ajustes",
        "Anos de Renda": `${analysis.yearsOfIncome} anos`,
      },
      recommendations,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Planejamento de Aposentadoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-age">Idade Atual</Label>
              <Input
                id="current-age"
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirement-age">Idade Aposentadoria</Label>
              <Input
                id="retirement-age"
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired-income">Renda Desejada (R$/mês)</Label>
              <Input
                id="desired-income"
                type="number"
                value={desiredIncome}
                onChange={(e) => setDesiredIncome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-expenses">Despesas Mensais Atuais (R$/mês)</Label>
              <Input
                id="current-expenses"
                type="number"
                value={currentExpenses}
                onChange={(e) => setCurrentExpenses(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-growth">Crescimento Despesas (%/ano)</Label>
              <Input
                id="expense-growth"
                type="number"
                step="0.1"
                value={expenseGrowthRate}
                onChange={(e) => setExpenseGrowthRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retirement-expenses">Despesas na Aposentadoria (R$/mês)</Label>
              <Input
                id="retirement-expenses"
                type="number"
                value={retirementExpenses}
                onChange={(e) => setRetirementExpenses(e.target.value)}
                disabled={autoCalcRetirementExpenses}
                className={autoCalcRetirementExpenses ? "bg-muted" : ""}
              />
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox
                  id="auto-calc-expenses"
                  checked={autoCalcRetirementExpenses}
                  onCheckedChange={(checked) => setAutoCalcRetirementExpenses(checked === true)}
                />
                <label
                  htmlFor="auto-calc-expenses"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Calcular com crescimento automático
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inflation">Inflação Anual (%)</Label>
              <Input
                id="inflation"
                type="number"
                step="0.1"
                value={inflationRate}
                onChange={(e) => setInflationRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return">Retorno Esperado (%)</Label>
              <Input
                id="return"
                type="number"
                step="0.1"
                value={returnRate}
                onChange={(e) => setReturnRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-withdrawal">Resgate Mensal (R$/mês)</Label>
              <Input
                id="monthly-withdrawal"
                type="number"
                value={monthlyWithdrawal}
                onChange={(e) => setMonthlyWithdrawal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-age">Projeção até (anos)</Label>
              <Input
                id="final-age"
                type="number"
                value={finalAge}
                onChange={(e) => setFinalAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-portfolio">Patrimônio Atual</Label>
              <Input
                id="current-portfolio"
                type="text"
                value={formatCurrency(Number(client.portfolio_value) || 0)}
                disabled
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={calculateRetirement} className="flex-1">
              <TrendingUp className="mr-2 h-4 w-4" />
              Calcular Plano
            </Button>
            <Button
              onClick={analyzeWithAI}
              variant="outline"
              disabled={!analysis || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Análise com IA
            </Button>
          </div>

          {/* Results */}
          {analysis && (
            <div className="space-y-6 pt-6 border-t">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">Status do Plano</h4>
                  <p className="text-sm text-muted-foreground">
                    {Number(retirementAge) - Number(currentAge)} anos até aposentadoria
                  </p>
                </div>
                <Badge
                  variant={analysis.isOnTrack ? "default" : "destructive"}
                  className="text-sm py-1 px-3"
                >
                  {analysis.isOnTrack ? "No Caminho Certo" : "Necessita Ajustes"}
                </Badge>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">
                    {analysis.completionPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.min(analysis.completionPercentage, 100)} />
              </div>

              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">
                      Patrimônio Necessário
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(analysis.requiredPortfolio)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">
                      Resgate Mensal na Aposentadoria
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(analysis.monthlyWithdrawal)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">
                      Aporte Mensal Recomendado
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(analysis.monthlyContribution)}
                    </div>
                  </CardContent>
                </Card>
                {analysis.portfolioZeroAge && (
                  <Card className="border-destructive">
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">
                        Patrimônio Zera aos
                      </div>
                      <div className="text-2xl font-bold text-destructive">
                        {analysis.portfolioZeroAge} anos
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ({analysis.yearsOfIncome} anos de renda)
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Projection Chart */}
              {analysis.projection && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Projeção Patrimonial até {finalAge} anos
                    <span className="text-muted-foreground font-normal ml-2">
                      (Resgate de {formatCurrency(analysis.monthlyWithdrawal)}/mês após {retirementAge} anos)
                    </span>
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={analysis.projection}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="year" 
                        label={{ value: 'Idade', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          value >= 1000000 
                            ? `${(value / 1000000).toFixed(1)}M` 
                            : `${(value / 1000).toFixed(0)}k`
                        }
                        label={{ value: 'Patrimônio (R$)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "portfolio" ? "Patrimônio" : "Meta"
                        ]}
                        labelFormatter={(label) => `Idade: ${label} anos`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="portfolio"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Patrimônio"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Meta (Regra 4%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-xs text-muted-foreground justify-center">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary"></div>
                      Fase de Acumulação (aportes)
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-orange-500"></div>
                      Fase de Aposentadoria (resgates de {formatCurrency(analysis.monthlyWithdrawal)}/mês)
                    </span>
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {analysis.ai_insights && (
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Insights Personalizados com IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2 whitespace-pre-line">
                      {analysis.ai_insights}
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
    </div>
  );
};
