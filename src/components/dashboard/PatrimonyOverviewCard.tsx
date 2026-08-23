import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Wallet, Briefcase, Car, FileText, Gem, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Link } from "react-router-dom";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  investimentos: { label: "Investimentos", icon: Wallet, color: "hsl(var(--primary))" },
  imovel: { label: "Imóveis", icon: Building2, color: "hsl(var(--chart-1))" },
  participacao_societaria: { label: "Participações", icon: Briefcase, color: "hsl(var(--chart-2))" },
  bem_movel: { label: "Bens Móveis", icon: Car, color: "hsl(var(--chart-3))" },
  direitos: { label: "Direitos", icon: FileText, color: "hsl(var(--chart-4))" },
  outros: { label: "Outros", icon: Gem, color: "hsl(var(--chart-5))" },
};

export const PatrimonyOverviewCard = () => {
  // Fetch patrimony assets
  const { data: patrimonyAssets } = useQuery({
    queryKey: ['dashboard-patrimony-assets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('patrimony_assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('client_id', null);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch investment assets
  const { data: investmentAssets } = useQuery({
    queryKey: ['dashboard-investment-assets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .is('client_id', null);

      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total investments
  const totalInvestments = (investmentAssets || []).reduce((acc: number, asset: any) => {
    const value = asset.current_price 
      ? asset.quantity * asset.current_price 
      : asset.invested_amount || (asset.quantity * asset.average_price);
    return acc + value;
  }, 0);

  // Calculate patrimony by category
  const categoryTotals: Record<string, number> = (patrimonyAssets || []).reduce((acc: Record<string, number>, asset: any) => {
    const category = asset.category || 'outros';
    acc[category] = (acc[category] || 0) + (asset.current_value || asset.acquisition_value || 0);
    return acc;
  }, {});

  // Add investments
  categoryTotals['investimentos'] = totalInvestments;

  const totalPatrimony = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const pieData = Object.entries(categoryTotals)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: CATEGORY_CONFIG[category]?.label || category,
      value,
      color: CATEGORY_CONFIG[category]?.color || "hsl(var(--muted))",
    }))
    .sort((a, b) => b.value - a.value);

  if (totalPatrimony === 0) {
    return null;
  }

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Patrimônio Consolidado
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/patrimony" className="flex items-center gap-1 text-xs">
              Ver detalhes
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  label={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    padding: '8px 12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with values */}
          <div className="space-y-2">
            <div className="mb-3">
              <p className="text-2xl font-bold">{formatCurrency(totalPatrimony)}</p>
              <p className="text-xs text-muted-foreground">Patrimônio Total</p>
            </div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {pieData.map((item, index) => {
                const percentage = ((item.value / totalPatrimony) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
