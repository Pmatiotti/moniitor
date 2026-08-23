import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, AlertCircle } from "lucide-react";
import { Client } from "@/pages/CRM";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { PlanData } from "@/types/financial-plan";

interface CashFlowProjectionProps {
  client: Client;
  onSaveAsPlan?: (data: PlanData) => void;
}

export const CashFlowProjection = ({ client, onSaveAsPlan }: CashFlowProjectionProps) => {
  const [monthlyIncome, setMonthlyIncome] = useState(
    client.monthly_income?.toString() || "10000"
  );
  const [monthlyExpenses, setMonthlyExpenses] = useState("7000");
  const [incomeGrowth, setIncomeGrowth] = useState("5");
  const [expenseGrowth, setExpenseGrowth] = useState("4");
  const [years, setYears] = useState("10");
  
  // Retirement parameters
  const [currentAge, setCurrentAge] = useState("45");
  const [retirementAge, setRetirementAge] = useState("65");
  const [lifeExpectancy, setLifeExpectancy] = useState("85");
  const [autoCalcRetirementExpenses, setAutoCalcRetirementExpenses] = useState(true);
  const [retirementExpenses, setRetirementExpenses] = useState("7000");
  const [investmentReturn, setInvestmentReturn] = useState("8");
  
  const [projection, setProjection] = useState<any[]>([]);

  // Auto-calculate retirement expenses when checkbox is checked
  useEffect(() => {
    if (autoCalcRetirementExpenses) {
      const curAge = Number(currentAge);
      const retAge = Number(retirementAge);
      const yearsToRetirement = Math.max(0, retAge - curAge);
      const growthRate = Number(expenseGrowth) / 100;
      const currentExp = Number(monthlyExpenses);
      const calculatedExpenses = currentExp * Math.pow(1 + growthRate, yearsToRetirement);
      setRetirementExpenses(Math.round(calculatedExpenses).toString());
    }
  }, [autoCalcRetirementExpenses, monthlyExpenses, expenseGrowth, currentAge, retirementAge]);

  const calculateProjection = () => {
    const income = Number(monthlyIncome);
    const expenses = Number(monthlyExpenses);
    const incomeRate = Number(incomeGrowth) / 100;
    const expenseRate = Number(expenseGrowth) / 100;
    const age = Number(currentAge);
    const retAge = Number(retirementAge);
    const lifeExp = Number(lifeExpectancy);
    const retExpenses = Number(retirementExpenses);
    const returnRate = Number(investmentReturn) / 100;

    const data = [];
    let currentIncome = income * 12;
    let currentExpenses = expenses * 12;
    let wealth = Number(client.portfolio_value) || 0;
    
    // Fase de Acumulação (até aposentadoria)
    const yearsToRetirement = retAge - age;
    for (let year = 0; year <= yearsToRetirement; year++) {
      const currentAgeCalc = age + year;
      const annualSavings = currentIncome - currentExpenses;
      
      // Aplicar rentabilidade sobre o patrimônio
      wealth = wealth * (1 + returnRate);
      // Adicionar poupança do ano
      wealth += annualSavings;

      data.push({
        year,
        age: currentAgeCalc,
        income: Math.round(currentIncome),
        expenses: Math.round(currentExpenses),
        savings: Math.round(annualSavings),
        wealth: Math.round(wealth),
        phase: 'Acumulação',
      });

      // Crescimento para o próximo ano
      if (year < yearsToRetirement) {
        currentIncome *= 1 + incomeRate;
        currentExpenses *= 1 + expenseRate;
      }
    }
    
    // Fase de Usufruto (aposentadoria)
    const retirementYears = lifeExp - retAge;
    const annualRetExpenses = retExpenses * 12;
    
    for (let year = 1; year <= retirementYears; year++) {
      const currentAgeCalc = retAge + year;
      
      // Aplicar rentabilidade
      wealth = wealth * (1 + returnRate);
      // Subtrair despesas da aposentadoria
      wealth -= annualRetExpenses;
      
      // Não deixar o patrimônio ficar negativo
      if (wealth < 0) wealth = 0;

      data.push({
        year: yearsToRetirement + year,
        age: currentAgeCalc,
        income: 0,
        expenses: Math.round(annualRetExpenses),
        savings: Math.round(-annualRetExpenses),
        wealth: Math.round(wealth),
        phase: 'Usufruto',
      });
    }

    setProjection(data);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const lastYear = projection[projection.length - 1];
  const retirementYear = projection.find(p => p.age === Number(retirementAge));
  const finalWealth = lastYear?.wealth || 0;
  const isSustainable = finalWealth > 0;

  const handleSaveAsPlan = () => {
    if (projection.length === 0 || !onSaveAsPlan) return;

    const recommendations: PlanData["recommendations"] = [];
    
    if (!isSustainable) {
      recommendations.push({
        title: "Plano Insustentável",
        description: `O patrimônio se esgota antes dos ${lifeExpectancy} anos. Considere aumentar aportes ou reduzir despesas na aposentadoria.`,
        priority: "high",
      });
    }

    if (Number(monthlyExpenses) > Number(monthlyIncome) * 0.7) {
      recommendations.push({
        title: "Taxa de Poupança Baixa",
        description: "Despesas representam mais de 70% da renda. Considere revisar orçamento.",
        priority: "medium",
      });
    }

    onSaveAsPlan({
      plan_type: "cashflow",
      title: `Projeção de Fluxo de Caixa - ${client.name}`,
      description: `Projeção financeira dos ${currentAge} aos ${lifeExpectancy} anos com aposentadoria aos ${retirementAge}.`,
      parameters: {
        "Idade Atual": currentAge,
        "Idade Aposentadoria": retirementAge,
        "Expectativa de Vida": lifeExpectancy,
        "Renda Mensal Atual": formatCurrency(Number(monthlyIncome)),
        "Despesas Mensais Atuais": formatCurrency(Number(monthlyExpenses)),
        "Despesas na Aposentadoria": formatCurrency(Number(retirementExpenses)),
        "Patrimônio na Aposentadoria": formatCurrency(retirementYear?.wealth || 0),
        "Patrimônio Final": formatCurrency(finalWealth),
        "Retorno Investimentos": `${investmentReturn}%`,
        "Sustentabilidade": isSustainable ? "Sim" : "Não",
      },
      recommendations,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Projeção de Fluxo de Caixa e Aposentadoria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fase de Acumulação */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-primary">Fase de Acumulação</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-income">Renda Mensal (R$)</Label>
            <Input
              id="monthly-income"
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly-expenses">Despesas Mensais (R$)</Label>
            <Input
              id="monthly-expenses"
              type="number"
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(e.target.value)}
            />
          </div>
            <div className="space-y-2">
              <Label htmlFor="income-growth">Crescimento Renda (%/ano)</Label>
              <Input
                id="income-growth"
                type="number"
                step="0.1"
                value={incomeGrowth}
                onChange={(e) => setIncomeGrowth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-growth">Crescimento Despesas (%/ano)</Label>
              <Input
                id="expense-growth"
                type="number"
                step="0.1"
                value={expenseGrowth}
                onChange={(e) => setExpenseGrowth(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Fase de Usufruto / Aposentadoria */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-destructive">Fase de Usufruto (Aposentadoria)</h3>
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
              <Label htmlFor="life-expectancy">Expectativa de Vida</Label>
              <Input
                id="life-expectancy"
                type="number"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(e.target.value)}
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
                  id="auto-calc-expenses-cf"
                  checked={autoCalcRetirementExpenses}
                  onCheckedChange={(checked) => setAutoCalcRetirementExpenses(checked === true)}
                />
                <label
                  htmlFor="auto-calc-expenses-cf"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Calcular com crescimento automático
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="investment-return">Retorno Investimentos (%/ano)</Label>
              <Input
                id="investment-return"
                type="number"
                step="0.1"
                value={investmentReturn}
                onChange={(e) => setInvestmentReturn(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button onClick={calculateProjection} className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          Gerar Projeção
        </Button>

        {projection.length > 0 && (
          <div className="space-y-6 pt-6 border-t">
            {/* Alert if not sustainable */}
            {!isSustainable && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Atenção: Plano Insustentável</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Com os parâmetros atuais, o patrimônio se esgotará aos {projection.find(p => p.wealth === 0)?.age || lifeExpectancy} anos. 
                    Considere aumentar aportes, reduzir despesas na aposentadoria, ou ajustar expectativa de vida.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-primary/10">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">
                    Patrimônio na Aposentadoria (idade {retirementAge})
                  </div>
                  <div className="text-xl font-bold text-primary">
                    {formatCurrency(retirementYear?.wealth || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className={isSustainable ? "bg-success/10" : "bg-destructive/10"}>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">
                    Patrimônio Final (idade {lifeExpectancy})
                  </div>
                  <div className={`text-xl font-bold ${isSustainable ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(finalWealth)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">
                    Total Sacado na Aposentadoria
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency((Number(lifeExpectancy) - Number(retirementAge)) * Number(retirementExpenses) * 12)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Wealth Evolution Chart with Retirement Line */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Evolução Patrimonial Completa (Acumulação + Usufruto)</h4>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="age" 
                    label={{ value: "Idade", position: "insideBottom", offset: -5 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(age) => `Idade: ${age}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <ReferenceLine 
                    x={Number(retirementAge)} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="3 3"
                    label={{ value: 'Aposentadoria', position: 'top' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="wealth"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    name="Patrimônio"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Annual Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Detalhamento por Idade</h4>
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Idade</th>
                      <th className="p-2 text-left">Fase</th>
                      <th className="p-2 text-right">Renda</th>
                      <th className="p-2 text-right">Despesas</th>
                      <th className="p-2 text-right">Saldo</th>
                      <th className="p-2 text-right">Patrimônio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`border-t ${row.age === Number(retirementAge) ? 'bg-destructive/5' : ''}`}
                      >
                        <td className="p-2">{row.age}</td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            row.phase === 'Acumulação' 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {row.phase}
                          </span>
                        </td>
                        <td className="p-2 text-right text-green-600">
                          {formatCurrency(row.income)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          {formatCurrency(row.expenses)}
                        </td>
                        <td className={`p-2 text-right font-medium ${
                          row.savings >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(row.savings)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          {formatCurrency(row.wealth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
