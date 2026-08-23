import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GitCompare } from "lucide-react";

export const ScenarioSimulator = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [years, setYears] = useState("");
  const [optimisticRate, setOptimisticRate] = useState("");
  const [realisticRate, setRealisticRate] = useState("");
  const [pessimisticRate, setPessimisticRate] = useState("");
  const [chartData, setChartData] = useState<any[]>([]);

  const calculateScenario = (rate: number) => {
    const initial = parseFloat(initialAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const monthlyRate = rate / 100 / 12;
    const months = parseFloat(years) * 12;

    const values = [];
    let currentValue = initial;

    for (let month = 0; month <= months; month++) {
      if (month > 0) {
        currentValue = currentValue * (1 + monthlyRate) + monthly;
      }
      values.push({ month, value: currentValue });
    }

    return values;
  };

  const simulate = () => {
    const optimistic = calculateScenario(parseFloat(optimisticRate));
    const realistic = calculateScenario(parseFloat(realisticRate));
    const pessimistic = calculateScenario(parseFloat(pessimisticRate));

    const data = optimistic.map((opt, index) => ({
      year: (opt.month / 12).toFixed(1),
      Otimista: opt.value,
      Realista: realistic[index].value,
      Pessimista: pessimistic[index].value,
    }));

    setChartData(data);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Simulador de Cenários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scenario-initial">Valor Inicial (R$)</Label>
            <Input
              id="scenario-initial"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="ex: 10000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-monthly">Aporte Mensal (R$)</Label>
            <Input
              id="scenario-monthly"
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="ex: 1000"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="scenario-years">Período (anos)</Label>
            <Input
              id="scenario-years"
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="ex: 10"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-semibold text-sm">Taxas de Retorno Anuais</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="optimistic" className="text-green-600">Otimista (%)</Label>
              <Input
                id="optimistic"
                type="number"
                step="0.1"
                value={optimisticRate}
                onChange={(e) => setOptimisticRate(e.target.value)}
                className="border-green-500/50"
                placeholder="ex: 15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realistic" className="text-blue-600">Realista (%)</Label>
              <Input
                id="realistic"
                type="number"
                step="0.1"
                value={realisticRate}
                onChange={(e) => setRealisticRate(e.target.value)}
                className="border-blue-500/50"
                placeholder="ex: 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pessimistic" className="text-amber-600">Pessimista (%)</Label>
              <Input
                id="pessimistic"
                type="number"
                step="0.1"
                value={pessimisticRate}
                onChange={(e) => setPessimisticRate(e.target.value)}
                className="border-amber-500/50"
                placeholder="ex: 5"
              />
            </div>
          </div>
        </div>

        <Button onClick={simulate} className="w-full">
          Simular Cenários
        </Button>

        {chartData.length > 0 && (
          <div className="pt-4 border-t">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year" 
                  label={{ value: 'Anos', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Otimista" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="Realista" 
                  stroke="hsl(221, 83%, 53%)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="Pessimista" 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cenário Otimista</p>
                <p className="font-bold text-green-600">
                  {formatCurrency(chartData[chartData.length - 1].Otimista)}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cenário Realista</p>
                <p className="font-bold text-blue-600">
                  {formatCurrency(chartData[chartData.length - 1].Realista)}
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Cenário Pessimista</p>
                <p className="font-bold text-amber-600">
                  {formatCurrency(chartData[chartData.length - 1].Pessimista)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
