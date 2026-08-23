import { TooltipProps } from "recharts";

export const DividendsCustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filter out entries with zero values
  const nonZeroPayload = payload.filter(entry => Number(entry.value) > 0);

  if (nonZeroPayload.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold mb-2">{payload[0].payload.period}</p>
      {nonZeroPayload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
};
