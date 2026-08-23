import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { useState } from "react";

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
}

interface AllocationChartProps {
  data: AllocationData[];
  title: string;
  colors: string[];
  onSliceClick?: (subClass: string) => void;
}

export const AllocationChart = ({ data, title, colors, onSliceClick }: AllocationChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleClick = (data: any, index: number) => {
    if (onSliceClick) {
      onSliceClick(data.name);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onClick={handleClick}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              const percentage = props.payload.percentage?.toFixed(1) || '0';
              return [`${formatCurrency(value)} (${percentage}%)`, props.payload.name];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {onSliceClick && (
        <p className="text-xs text-center text-muted-foreground">
          Clique em uma fatia para ver detalhes
        </p>
      )}
    </div>
  );
};
