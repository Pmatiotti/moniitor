import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const PluggyInvestments = () => {
  const { data: investments, isLoading } = useQuery({
    queryKey: ["pluggy-investments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_investments")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir investimentos de clientes
        .order("amount", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: portfolios } = useQuery({
    queryKey: ["pluggy-portfolios"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_investment_portfolios")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir portfólios de clientes

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalInvested = investments?.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0) || 0;
  const totalGain = portfolios?.reduce((sum, p) => sum + (Number(p.total_gain) || 0), 0) || 0;
  const gainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Group investments by type
  const investmentsByType = investments?.reduce((acc, inv) => {
    const type = inv.investment_type || "Outros";
    if (!acc[type]) {
      acc[type] = {
        total: 0,
        count: 0,
        investments: []
      };
    }
    acc[type].total += Number(inv.amount) || 0;
    acc[type].count += 1;
    acc[type].investments.push(inv);
    return acc;
  }, {} as Record<string, { total: number; count: number; investments: any[] }>);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'EQUITY': 'Ações',
      'MUTUAL_FUND': 'Fundos',
      'SECURITY': 'Títulos',
      'ETF': 'ETFs',
      'FIXED_INCOME': 'Renda Fixa',
      'PENSION': 'Previdência',
      'COE': 'COE',
      'CRYPTO': 'Criptomoedas',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!investments || investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Investimentos Conectados
          </CardTitle>
          <CardDescription>
            Nenhum investimento conectado automaticamente
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
            <p className="text-xs text-muted-foreground">
              {investments.length} investimento(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
            {totalGain >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
            </div>
            <p className={`text-xs ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gainPercent > 0 ? '+' : ''}{gainPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteiras</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolios?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Contas de investimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investments by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
          <CardDescription>Seus investimentos agrupados por categoria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {investmentsByType && Object.entries(investmentsByType).map(([type, data]) => {
            const percentage = totalInvested > 0 ? (data.total / totalInvested) * 100 : 0;
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTypeLabel(type)}</span>
                    <Badge variant="outline">{data.count}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(data.total)}</div>
                    <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Individual Investments */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Investimentos</CardTitle>
          <CardDescription>Lista completa dos seus investimentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {investments.map((investment) => (
              <div
                key={investment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{investment.investment_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(investment.investment_type)}
                    </Badge>
                    {investment.ticker && (
                      <Badge variant="secondary" className="text-xs">
                        {investment.ticker}
                      </Badge>
                    )}
                  </div>
                  {investment.quantity && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Quantidade: {Number(investment.quantity).toLocaleString('pt-BR')}
                      {investment.current_price && (
                        <span className="ml-2">
                          @ {formatCurrency(Number(investment.current_price))}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {formatCurrency(Number(investment.amount))}
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
