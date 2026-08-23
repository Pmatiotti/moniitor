import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Calendar, DollarSign, BarChart3, Percent, CalendarClock } from "lucide-react";

interface DividendsStats {
  currentMonth: number;
  currentYear: number;
  monthlyAverage: number;
  yearOverYearGrowth: number;
  fiiYieldMensal?: number;
  acoesYieldMensal?: number;
  nextDividend?: {
    ticker: string;
    amount: number;
    date: string;
  };
}

export const DividendsOverviewCard = () => {
  const [stats, setStats] = useState<DividendsStats>({
    currentMonth: 0,
    currentYear: 0,
    monthlyAverage: 0,
    yearOverYearGrowth: 0,
    fiiYieldMensal: undefined,
    acoesYieldMensal: undefined,
    nextDividend: undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDividendsStats();
  }, []);

  const fetchDividendsStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const previousYear = currentYear - 1;

      // Calcular mês anterior
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Fetch all dividends for current and previous year
      const { data: dividends } = await supabase
        .from("dividends")
        .select("*")
        .eq("user_id", user.id)
        .gte("payment_date", `${previousYear}-01-01`)
        .order("payment_date", { ascending: true });

      // Fetch assets to calculate portfolio value for FII and Ações
      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      if (dividends && dividends.length > 0) {
        // Current month total
        const currentMonthTotal = dividends
          .filter(d => {
            const date = new Date(d.payment_date);
            return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
          })
          .reduce((sum, d) => sum + Number(d.amount), 0);

        // Current year total
        const currentYearTotal = dividends
          .filter(d => new Date(d.payment_date).getFullYear() === currentYear)
          .reduce((sum, d) => sum + Number(d.amount), 0);

        // Previous year total
        const previousYearTotal = dividends
          .filter(d => new Date(d.payment_date).getFullYear() === previousYear)
          .reduce((sum, d) => sum + Number(d.amount), 0);

        // Monthly average (current year)
        const monthlyAverage = currentYearTotal / currentMonth;

        // Year-over-year growth
        const yearOverYearGrowth = previousYearTotal > 0
          ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100
          : 0;

        // Calculate yields for FII and Ações (mês anterior)
        let fiiYieldMensal: number | undefined = undefined;
        let acoesYieldMensal: number | undefined = undefined;

        if (assets && assets.length > 0 && dividends) {
          // Calculate FII portfolio value (buscar por sub_class)
          const fiiAssets = assets.filter(a => 
            a.sub_class === "Fundos Imobiliário" || 
            a.asset_class === "FII"
          );
          const fiiPortfolioValue = fiiAssets.reduce((sum, a) => {
            const value = Number(a.current_price || a.average_price) * Number(a.quantity);
            return sum + value;
          }, 0);

          const fiiDividendsLastMonth = dividends
            .filter(d => {
              const date = new Date(d.payment_date);
              return date.getFullYear() === lastMonthYear && 
                     date.getMonth() + 1 === lastMonth &&
                     d.asset_class === "FII";
            })
            .reduce((sum, d) => sum + Number(d.amount), 0);

          // Só mostra yield se houver posição atual de FII
          if (fiiPortfolioValue > 0) {
            if (fiiDividendsLastMonth > 0) {
              fiiYieldMensal = (fiiDividendsLastMonth / fiiPortfolioValue) * 100;
            } else {
              // Se tem FII mas não teve dividendo no mês passado, mostra 0%
              fiiYieldMensal = 0;
            }
          }

          // Calculate Ações portfolio value (buscar por asset_class)
          const acoesAssets = assets.filter(a => a.asset_class === "Ações");
          const acoesPortfolioValue = acoesAssets.reduce((sum, a) => {
            const value = Number(a.current_price || a.average_price) * Number(a.quantity);
            return sum + value;
          }, 0);

          const acoesDividendsLastMonth = dividends
            .filter(d => {
              const date = new Date(d.payment_date);
              return date.getFullYear() === lastMonthYear && 
                     date.getMonth() + 1 === lastMonth &&
                     d.asset_class === "Ações";
            })
            .reduce((sum, d) => sum + Number(d.amount), 0);

          // Só mostra yield se houver posição atual de Ações
          if (acoesPortfolioValue > 0) {
            if (acoesDividendsLastMonth > 0) {
              acoesYieldMensal = (acoesDividendsLastMonth / acoesPortfolioValue) * 100;
            } else {
              // Se tem Ações mas não teve dividendo no mês passado, mostra 0%
              acoesYieldMensal = 0;
            }
          }
        }

        // Fetch next upcoming dividend
        let nextDividend: DividendsStats['nextDividend'] = undefined;
        
        const { data: upcomingData } = await supabase
          .from('upcoming_dividends')
          .select('ticker, expected_amount, payment_date')
          .eq('user_id', user.id)
          .gte('payment_date', new Date().toISOString().split('T')[0])
          .order('payment_date', { ascending: true })
          .limit(1);

        if (upcomingData && upcomingData.length > 0) {
          nextDividend = {
            ticker: upcomingData[0].ticker,
            amount: Number(upcomingData[0].expected_amount),
            date: upcomingData[0].payment_date,
          };
        }

        setStats({
          currentMonth: currentMonthTotal,
          currentYear: currentYearTotal,
          monthlyAverage,
          yearOverYearGrowth,
          fiiYieldMensal,
          acoesYieldMensal,
          nextDividend,
        });
      }
    } catch (error) {
      console.error("Error fetching dividends stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const StatItem = ({ 
    icon: Icon, 
    label, 
    value, 
    isPercentage = false,
    trend 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    isPercentage?: boolean;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-base font-bold truncate">
            {isPercentage ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : formatCurrency(value)}
          </p>
          {trend && trend !== 'neutral' && (
            <TrendingUp 
              className={`h-3.5 w-3.5 shrink-0 ${
                trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="overflow-hidden hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
            Proventos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover-lift">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </div>
          Proventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <StatItem
          icon={Calendar}
          label="Mês Atual"
          value={stats.currentMonth}
        />
        <StatItem
          icon={DollarSign}
          label="Total no Ano"
          value={stats.currentYear}
        />
        <StatItem
          icon={BarChart3}
          label="Média Mensal"
          value={stats.monthlyAverage}
        />
        <StatItem
          icon={TrendingUp}
          label="Crescimento Anual"
          value={stats.yearOverYearGrowth}
          isPercentage
          trend={stats.yearOverYearGrowth > 0 ? 'up' : stats.yearOverYearGrowth < 0 ? 'down' : 'neutral'}
        />
        {stats.fiiYieldMensal !== undefined && (
          <StatItem
            icon={Percent}
            label="Yield Médio FII"
            value={stats.fiiYieldMensal}
            isPercentage
          />
        )}
        {stats.acoesYieldMensal !== undefined && (
          <StatItem
            icon={Percent}
            label="Yield Médio Ações"
            value={stats.acoesYieldMensal}
            isPercentage
          />
        )}
        {stats.nextDividend && (
          <div className="flex items-start gap-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">Próximo Provento</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold truncate">
                  {stats.nextDividend.ticker}
                </p>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(stats.nextDividend.amount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.nextDividend.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
