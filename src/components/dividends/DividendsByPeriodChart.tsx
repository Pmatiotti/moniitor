import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { Dividend } from "@/pages/Dividends";
import { useState } from "react";
import { DividendsCustomTooltip } from "./DividendsCustomTooltip";
import { PeriodFilterOptions } from "@/lib/dividend-filter";

interface DividendsByPeriodChartProps {
  dividends: Dividend[];
  periodFilter?: PeriodFilterOptions;
}

const COLORS = {
  'dividendo': 'hsl(210, 70%, 60%)',
  'jcp': 'hsl(30, 65%, 60%)',
  'rendimento': 'hsl(142, 55%, 55%)',
  'amortização': 'hsl(270, 50%, 65%)',
  'cupom': 'hsl(340, 75%, 65%)',
};

export const DividendsByPeriodChart = ({ dividends, periodFilter }: DividendsByPeriodChartProps) => {
  const [groupBy, setGroupBy] = useState('month');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Dividends are already filtered by parent component
  const filteredDividends = dividends;

  const groupedData = filteredDividends.reduce((acc, div) => {
    const date = new Date(div.payment_date);
    const key = groupBy === 'month' 
      ? `${date.toLocaleString('pt-BR', { month: 'short' })}/${String(date.getFullYear()).slice(2)}`
      : date.getFullYear().toString();
    
    if (!acc[key]) {
      acc[key] = {
        period: key,
        date: date,
        dividendo: 0,
        jcp: 0,
        rendimento: 0,
        amortização: 0,
        cupom: 0,
      };
    }
    
    const type = div.dividend_type.toLowerCase();
    acc[key][type as keyof typeof acc[typeof key]] += Number(div.amount);
    return acc;
  }, {} as Record<string, any>);

  // Sort by actual date and take last 12 periods
  const chartData = Object.values(groupedData)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-12)
    .map(({ date, ...rest }) => rest); // Remove date field from final data

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Proventos por período</CardTitle>
          <div className="flex gap-2">
            <Select defaultValue="classe">
              <SelectTrigger className="w-32 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="classe">Classe</SelectItem>
                <SelectItem value="tipo">Tipo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-32 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Visualize a distribuição de proventos em suas carteiras e remuneração ao qual recebeu em cada período.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="period" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<DividendsCustomTooltip />} />
            <Legend />
            <Bar dataKey="dividendo" name="Dividendo" fill={COLORS.dividendo} stackId="a" />
            <Bar dataKey="jcp" name="JCP" fill={COLORS.jcp} stackId="a" />
            <Bar dataKey="rendimento" name="Rendimento" fill={COLORS.rendimento} stackId="a" />
            <Bar dataKey="amortização" name="Amortização" fill={COLORS.amortização} stackId="a" />
            <Bar dataKey="cupom" name="Cupom" fill={COLORS.cupom} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
