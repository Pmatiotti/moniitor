import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateTWR } from "@/lib/performance-calculations";

interface PerformanceData {
  twr: number;
  last30DaysTwr: number;
  hasData: boolean;
  daysOfData: number;
}

export const PerformanceWidget = () => {
  const [data, setData] = useState<PerformanceData>({
    twr: 0,
    last30DaysTwr: 0,
    hasData: false,
    daysOfData: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar todos os snapshots ordenados por data
      const { data: snapshots, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: true });

      if (error || !snapshots || snapshots.length < 2) {
        setData({ twr: 0, last30DaysTwr: 0, hasData: false, daysOfData: snapshots?.length || 0 });
        return;
      }

      // Buscar cash flows para cálculo correto do TWR
      const { data: cashFlows } = await supabase
        .from('portfolio_cash_flows')
        .select('*')
        .eq('user_id', user.id)
        .order('flow_date', { ascending: true });

      const formattedCashFlows = (cashFlows || []).map(cf => ({
        amount: cf.flow_type === 'deposit' ? -Number(cf.amount) : Number(cf.amount),
        date: cf.flow_date
      }));

      // Calcular TWR total usando a metodologia GIPS
      const formattedSnapshots = snapshots.map(s => ({
        id: s.id,
        user_id: s.user_id,
        snapshot_date: s.snapshot_date,
        total_value: Number(s.total_value),
        total_invested: Number(s.total_invested),
        assets_breakdown: (s.assets_breakdown as Record<string, any>) || null,
        created_at: s.created_at,
        daily_return_percent: s.daily_return_percent ? Number(s.daily_return_percent) : null,
        cumulative_return_percent: s.cumulative_return_percent ? Number(s.cumulative_return_percent) : null
      }));

      const twr = calculateTWR(formattedSnapshots, formattedCashFlows);

      // Calcular TWR dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const last30DaysSnapshots = formattedSnapshots.filter(s => s.snapshot_date >= thirtyDaysAgoStr);
      const last30DaysCashFlows = formattedCashFlows.filter(cf => cf.date >= thirtyDaysAgoStr);
      
      const last30DaysTwr = last30DaysSnapshots.length >= 2 
        ? calculateTWR(last30DaysSnapshots, last30DaysCashFlows)
        : 0;

      setData({
        twr,
        last30DaysTwr,
        hasData: true,
        daysOfData: snapshots.length
      });
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover-lift group">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>Rentabilidade TWR</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">Time-Weighted Return: mede a qualidade das suas escolhas, excluindo o efeito de aportes.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Link to="/performance">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalhes
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {data.hasData ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Desde o início</p>
                <div className={`text-2xl font-bold flex items-center gap-2 ${
                  data.twr >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {data.twr >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {formatPercent(data.twr)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                <div className={`text-lg font-semibold ${
                  data.last30DaysTwr >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {formatPercent(data.last30DaysTwr)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.daysOfData} dia(s) de dados • Padrão GIPS
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Sem dados de performance ainda
            </p>
            <p className="text-xs text-muted-foreground">
              {data.daysOfData < 2 ? 'Necessário 2+ snapshots para calcular TWR' : 'Atualize os preços do portfólio'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
