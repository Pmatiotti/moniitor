import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SectorData {
  name: string;
  value: number;
  percentage: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--muted))',
];

export const SectorAllocation = () => {
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSectorAllocation();
  }, []);

  const fetchSectorAllocation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assets, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      if (error) throw error;

      // Group by sector and calculate totals
      const sectorMap = new Map<string, number>();
      let totalValue = 0;

      assets?.forEach(asset => {
        const sector = asset.sector || "Não classificado";
        const value = Number(asset.current_price) * Number(asset.quantity);
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + value);
        totalValue += value;
      });

      // Convert to array and calculate percentages
      const data = Array.from(sectorMap.entries()).map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalValue) * 100
      })).sort((a, b) => b.value - a.value);

      setSectorData(data);
    } catch (error) {
      console.error("Error fetching sector allocation:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sectorData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  const percentage = props.payload.percentage?.toFixed(1) || '0';
                  return [`${formatCurrency(value)} (${percentage}%)`, props.payload.name];
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectorData.map((sector, index) => (
              <div key={sector.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{sector.name}</span>
                  <span className="text-muted-foreground">
                    {sector.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {formatCurrency(sector.value)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
