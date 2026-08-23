import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export const TimeToGoalCalculator = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [result, setResult] = useState<{
    months: number;
    years: number;
    totalContributed: number;
  } | null>(null);

  const calculate = () => {
    const initial = parseFloat(initialAmount) || 0;
    const target = parseFloat(targetAmount);
    const monthly = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(annualRate) / 100 / 12;

    if (!target || target <= initial) {
      alert("O valor alvo deve ser maior que o valor inicial");
      return;
    }

    // Calcular o número de meses necessários usando a fórmula de juros compostos
    // FV = PV(1+r)^n + PMT * (((1+r)^n - 1) / r)
    // Resolver para n (número de períodos)
    
    let months = 0;
    let currentValue = initial;
    const maxMonths = 1200; // 100 anos (limite de segurança)

    while (currentValue < target && months < maxMonths) {
      currentValue = currentValue * (1 + rate) + monthly;
      months++;
    }

    if (months >= maxMonths) {
      alert("Meta muito distante com esses parâmetros. Aumente o aporte ou a taxa.");
      return;
    }

    const totalContributed = initial + monthly * months;

    setResult({
      months,
      years: months / 12,
      totalContributed,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Tempo para Meta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time-initial">Valor Inicial (R$)</Label>
            <Input
              id="time-initial"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="ex: 10000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Valor Alvo (R$)</Label>
            <Input
              id="target"
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="ex: 100000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-monthly">Aporte Mensal (R$)</Label>
            <Input
              id="time-monthly"
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="ex: 1000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-rate">Taxa Anual (%)</Label>
            <Input
              id="time-rate"
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="ex: 12"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full">
          Calcular Tempo
        </Button>

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Tempo Necessário:</span>
              <span className="text-lg font-bold text-primary">
                {result.years.toFixed(1)} anos
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm">Equivalente a:</span>
              <span className="font-semibold">{result.months} meses</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
              <span className="text-sm">Total a Investir:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(result.totalContributed)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
