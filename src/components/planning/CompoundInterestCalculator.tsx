import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export const CompoundInterestCalculator = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [years, setYears] = useState("");
  const [result, setResult] = useState<{
    finalAmount: number;
    totalContributed: number;
    totalInterest: number;
  } | null>(null);

  const calculate = () => {
    const initial = parseFloat(initialAmount) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const rate = parseFloat(annualRate) / 100 / 12;
    const months = parseFloat(years) * 12;

    // Fórmula de juros compostos com aportes mensais
    // FV = P(1 + r)^n + PMT * (((1 + r)^n - 1) / r)
    const futureValueInitial = initial * Math.pow(1 + rate, months);
    const futureValueMonthly = monthly * ((Math.pow(1 + rate, months) - 1) / rate);
    const finalAmount = futureValueInitial + futureValueMonthly;
    const totalContributed = initial + monthly * months;
    const totalInterest = finalAmount - totalContributed;

    setResult({
      finalAmount,
      totalContributed,
      totalInterest,
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
          <TrendingUp className="h-5 w-5" />
          Juros Compostos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initial">Valor Inicial (R$)</Label>
            <Input
              id="initial"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="ex: 10000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly">Aporte Mensal (R$)</Label>
            <Input
              id="monthly"
              type="number"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="ex: 1000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Taxa Anual (%)</Label>
            <Input
              id="rate"
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="ex: 12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Período (anos)</Label>
            <Input
              id="years"
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="ex: 10"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full">
          Calcular
        </Button>

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Valor Final:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(result.finalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm">Total Investido:</span>
              <span className="font-semibold">{formatCurrency(result.totalContributed)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
              <span className="text-sm">Rendimento:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(result.totalInterest)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
