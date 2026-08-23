import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dividend } from "@/pages/Dividends";
import { PeriodFilterOptions } from "@/lib/dividend-filter";

interface DividendsByAssetChartProps {
  dividends: Dividend[];
  periodFilter?: PeriodFilterOptions;
}

export const DividendsByAssetChart = ({ dividends, periodFilter }: DividendsByAssetChartProps) => {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Dividends are already filtered by parent component
  const filteredDividends = dividends;

  // Group by ticker
  const groupedData = filteredDividends.reduce((acc, div) => {
    const ticker = div.ticker;
    if (!acc[ticker]) {
      acc[ticker] = 0;
    }
    acc[ticker] += Number(div.amount);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(groupedData)
    .map(([ticker, amount]) => ({
      ticker,
      amount
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10); // Top 10 assets

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proventos por ativo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="ticker" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar dataKey="amount" name="Valor" fill="hsl(var(--chart-1))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
