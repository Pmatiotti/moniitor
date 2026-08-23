import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export const MonthlyContributionCalculator = () => {
  const [initialAmount, setInitialAmount] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [years, setYears] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [result, setResult] = useState<{
    monthlyContribution: number;
    totalContributed: number;
    totalInterest: number;
  } | null>(null);

  const calculate = () => {
    const initial = parseFloat(initialAmount) || 0;
    const target = parseFloat(targetAmount);
    const months = parseFloat(years) * 12;
    const rate = parseFloat(annualRate) / 100 / 12;

    if (!target || target <= initial) {
      alert("O valor alvo deve ser maior que o valor inicial");
      return;
    }

    // Calcular o aporte mensal necessário
    // FV = PV(1+r)^n + PMT * (((1+r)^n - 1) / r)
    // Resolver para PMT
    const futureValueOfInitial = initial * Math.pow(1 + rate, months);
    const remainingAmount = target - futureValueOfInitial;
    
    const monthlyContribution = remainingAmount / (((Math.pow(1 + rate, months) - 1) / rate));
    const totalContributed = initial + monthlyContribution * months;
    const totalInterest = target - totalContributed;

    setResult({
      monthlyContribution,
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
          <DollarSign className="h-5 w-5" />
          Aporte Necessário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contribution-initial">Valor Inicial (R$)</Label>
            <Input
              id="contribution-initial"
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="ex: 10000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-target">Valor Alvo (R$)</Label>
            <Input
              id="contribution-target"
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="ex: 100000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-years">Período (anos)</Label>
            <Input
              id="contribution-years"
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="ex: 10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution-rate">Taxa Anual (%)</Label>
            <Input
              id="contribution-rate"
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="ex: 12"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full">
          Calcular Aporte
        </Button>

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Aporte Mensal:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(result.monthlyContribution)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm">Total a Investir:</span>
              <span className="font-semibold">{formatCurrency(result.totalContributed)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
              <span className="text-sm">Rendimento Total:</span>
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
