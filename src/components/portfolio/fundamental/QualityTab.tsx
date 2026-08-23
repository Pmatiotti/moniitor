import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface QualityTabProps {
  ticker: string;
  metrics: any;
  formatPercent: (value?: number) => string;
}

export const QualityTab = ({ ticker, metrics, formatPercent }: QualityTabProps) => {
  const [incomeStatements, setIncomeStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQualityData();
  }, [ticker]);

  const loadQualityData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('income_statements')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('period_end', { ascending: true })
        .limit(8);

      if (error) throw error;
      setIncomeStatements(data || []);
    } catch (error: any) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `T${quarter} ${year}`;
  };

  // Calculate growth metrics
  const calculateGrowth = (data: any[], field: string) => {
    if (data.length < 2) return null;
    const latest = data[data.length - 1][field];
    const previous = data[data.length - 2][field];
    if (!latest || !previous) return null;
    return ((latest - previous) / Math.abs(previous)) * 100;
  };

  const revenueGrowth = calculateGrowth(incomeStatements, 'total_revenue');
  const earningsGrowth = calculateGrowth(incomeStatements, 'net_income');

  // Prepare chart data
  const roeData = incomeStatements.map(item => ({
    period: formatDate(item.period_end),
    roe: metrics?.roe,
  }));

  const marginData = incomeStatements.map(item => ({
    period: formatDate(item.period_end),
    margemBruta: item.gross_margin,
    margemOperacional: item.operating_margin,
    margemLiquida: item.net_margin,
  }));

  const revenueGrowthData = incomeStatements.map((item, idx) => {
    if (idx === 0) return { period: formatDate(item.period_end), crescimento: 0 };
    const prev = incomeStatements[idx - 1];
    const growth = prev.total_revenue ? 
      ((item.total_revenue - prev.total_revenue) / Math.abs(prev.total_revenue)) * 100 : 0;
    return {
      period: formatDate(item.period_end),
      crescimento: growth,
    };
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando dados de qualidade...</div>;
  }

  if (incomeStatements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="font-semibold mb-2">Dados históricos não disponíveis</p>
        <p className="text-sm">A API Brapi possui cobertura limitada de demonstrativos financeiros.</p>
        <p className="text-sm mt-2">Disponível para este ativo: métricas básicas como P/L, Market Cap e cotação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(metrics?.roe)}</p>
            <p className="text-xs text-muted-foreground mt-1">Retorno sobre Patrimônio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(metrics?.roa)}</p>
            <p className="text-xs text-muted-foreground mt-1">Retorno sobre Ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cresc. Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${revenueGrowth && revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth ? `${revenueGrowth.toFixed(1)}%` : '-'}
              </p>
              {revenueGrowth && (revenueGrowth >= 0 ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Crescimento YoY</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cresc. Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${earningsGrowth && earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {earningsGrowth ? `${earningsGrowth.toFixed(1)}%` : '-'}
              </p>
              {earningsGrowth && (earningsGrowth >= 0 ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Crescimento YoY</p>
          </CardContent>
        </Card>
      </div>

      {/* Margins Evolution */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Margens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marginData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value?.toFixed(2)}%`} />
                <Legend />
                <Line type="monotone" dataKey="margemBruta" stroke="#3b82f6" name="Margem Bruta" strokeWidth={2} />
                <Line type="monotone" dataKey="margemOperacional" stroke="#f59e0b" name="Margem Operacional" strokeWidth={2} />
                <Line type="monotone" dataKey="margemLiquida" stroke="#22c55e" name="Margem Líquida" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Growth */}
      <Card>
        <CardHeader>
          <CardTitle>Crescimento da Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value.toFixed(2)}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="crescimento" 
                  stroke="hsl(var(--primary))" 
                  name="Crescimento (%)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};