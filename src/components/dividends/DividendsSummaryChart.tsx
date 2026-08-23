import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Dividend } from "@/pages/Dividends";
import { PeriodFilterOptions } from "@/lib/dividend-filter";

interface DividendsSummaryChartProps {
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

export const DividendsSummaryChart = ({ dividends, periodFilter }: DividendsSummaryChartProps) => {
  const [viewMode, setViewMode] = useState<'tipo' | 'classe' | 'mercado'>('tipo');
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Dividends are already filtered by parent component
  const filteredDividends = dividends;

  // Group by type, class, or market
  const summaryData = viewMode === 'tipo' 
    ? filteredDividends.reduce((acc, div) => {
        const type = div.dividend_type || 'outros';
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type] += Number(div.amount);
        return acc;
      }, {} as Record<string, number>)
    : viewMode === 'classe'
    ? (() => {
        // Group by asset_class from database
        const byClass = filteredDividends.reduce((acc, div) => {
          const assetClass = div.asset_class || 'Outros';
          if (!acc[assetClass]) {
            acc[assetClass] = 0;
          }
          acc[assetClass] += Number(div.amount);
          return acc;
        }, {} as Record<string, number>);
        
        return byClass;
      })()
    : (() => {
        // Group by market_type from database
        const byMarket = filteredDividends.reduce((acc, div) => {
          const marketType = div.market_type || 'Outros';
          if (!acc[marketType]) {
            acc[marketType] = 0;
          }
          acc[marketType] += Number(div.amount);
          return acc;
        }, {} as Record<string, number>);
        
        return byMarket;
      })();

  const chartData = Object.entries(summaryData).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
    percentage: ((value / filteredDividends.reduce((sum, d) => sum + Number(d.amount), 0)) * 100).toFixed(1)
  }));

  const chartColors = viewMode === 'tipo' 
    ? COLORS 
    : viewMode === 'classe'
    ? {
        'fii': 'hsl(210, 70%, 60%)',
        'ações': 'hsl(142, 55%, 55%)',
        'debenture': 'hsl(30, 65%, 60%)',
        'cri': 'hsl(340, 75%, 65%)',
        'cra': 'hsl(270, 50%, 65%)',
        'fidc': 'hsl(180, 60%, 55%)',
        'outros': 'hsl(220, 15%, 50%)',
      }
    : {
        'renda fixa': 'hsl(210, 70%, 60%)',
        'renda variável': 'hsl(142, 55%, 55%)',
        'outros': 'hsl(220, 15%, 50%)',
      };

  const total = filteredDividends.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>RESUMO</CardTitle>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'tipo' | 'classe' | 'mercado')}>
            <SelectTrigger className="w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="tipo">Tipo</SelectItem>
              <SelectItem value="classe">Classe</SelectItem>
              <SelectItem value="mercado">Mercado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                >
                  {chartData.map((entry) => (
                    <Cell 
                      key={entry.name} 
                      fill={chartColors[entry.name.toLowerCase() as keyof typeof chartColors] || 'hsl(var(--chart-1))'} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground">Total de proventos</p>
              <p className="text-lg font-bold">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5" 
                    style={{ backgroundColor: chartColors[item.name.toLowerCase() as keyof typeof chartColors] || 'hsl(var(--chart-1))' }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.name} ({item.percentage}%)</span>
                  </div>
                </div>
                <span className="text-sm font-bold whitespace-nowrap">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
