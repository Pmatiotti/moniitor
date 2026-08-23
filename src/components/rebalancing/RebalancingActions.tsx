import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface RebalancingAction {
  assetClass: string;
  currentValue: number;
  targetValue: number;
  difference: number;
  percentageDiff: number;
  action: 'buy' | 'sell' | 'hold';
  suggestedAmount: number;
}

interface RebalancingActionsProps {
  actions: RebalancingAction[];
}

export const RebalancingActions = ({ actions }: RebalancingActionsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getBarColor = (action: string) => {
    switch (action) {
      case 'buy':
        return '#22c55e'; // green
      case 'sell':
        return '#ef4444'; // red
      case 'hold':
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'buy':
        return 'Comprar';
      case 'sell':
        return 'Vender';
      case 'hold':
        return 'Manter';
      default:
        return action;
    }
  };

  const chartData = actions.map(action => ({
    name: action.assetClass,
    diferenca: action.percentageDiff,
    valor: action.suggestedAmount,
    acao: getActionLabel(action.action),
    atual: action.currentValue,
    alvo: action.targetValue,
    action: action.action,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
          <p className="font-semibold text-sm">{data.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">
              Ação: <span className="font-medium text-foreground">{data.acao}</span>
            </p>
            <p className="text-muted-foreground">
              Atual: <span className="font-medium text-foreground">{formatCurrency(data.atual)}</span>
            </p>
            <p className="text-muted-foreground">
              Alvo: <span className="font-medium text-foreground">{formatCurrency(data.alvo)}</span>
            </p>
            <p className="text-muted-foreground">
              Diferença: <span className={`font-medium ${data.diferenca > 0 ? 'text-green-600' : data.diferenca < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {data.diferenca > 0 ? '+' : ''}{data.diferenca.toFixed(1)}%
              </span>
            </p>
            {data.action !== 'hold' && (
              <p className="text-muted-foreground">
                Valor: <span className="font-bold text-foreground">{formatCurrency(Math.abs(data.valor))}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5" />
          Ações Recomendadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sua carteira está perfeitamente balanceada!</p>
            <p className="text-sm mt-2">Nenhuma ação necessária no momento.</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  className="text-xs"
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  className="text-xs"
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="diferenca" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.action)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
