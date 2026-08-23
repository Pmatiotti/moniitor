import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FinancialsTabProps {
  ticker: string;
}

export const FinancialsTab = ({ ticker }: FinancialsTabProps) => {
  const [incomeStatements, setIncomeStatements] = useState<any[]>([]);
  const [balanceSheets, setBalanceSheets] = useState<any[]>([]);
  const [cashFlows, setCashFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, [ticker]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Load income statements
      const { data: income, error: incomeError } = await supabase
        .from('income_statements')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('period_end', { ascending: false })
        .limit(8);

      if (incomeError) throw incomeError;
      setIncomeStatements(income || []);

      // Load balance sheets
      const { data: balance, error: balanceError } = await supabase
        .from('balance_sheets')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('period_end', { ascending: false })
        .limit(8);

      if (balanceError) throw balanceError;
      setBalanceSheets(balance || []);

      // Load cash flows
      const { data: cash, error: cashError } = await supabase
        .from('cash_flows')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('period_end', { ascending: false })
        .limit(8);

      if (cashError) throw cashError;
      setCashFlows(cash || []);

    } catch (error: any) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const year = date.getFullYear();
    return `T${quarter} ${year}`;
  };

  // Prepare chart data
  const revenueData = incomeStatements.reverse().map(item => ({
    period: formatDate(item.period_end),
    receita: item.total_revenue / 1000000, // Em milhões
    lucro: item.net_income / 1000000,
  }));

  const marginData = incomeStatements.map(item => ({
    period: formatDate(item.period_end),
    margemBruta: item.gross_margin,
    margemOperacional: item.operating_margin,
    margemLiquida: item.net_margin,
  }));

  const cashFlowData = cashFlows.reverse().map(item => ({
    period: formatDate(item.period_end),
    operacional: item.operating_cash_flow / 1000000,
    investimento: item.investing_cash_flow / 1000000,
    financiamento: item.financing_cash_flow / 1000000,
  }));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando dados financeiros...</div>;
  }

  if (incomeStatements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="font-semibold mb-2">Dados financeiros históricos não disponíveis</p>
        <p className="text-sm">A API Brapi não fornece demonstrativos financeiros completos para este ativo.</p>
        <p className="text-sm">Disponível principalmente para: métricas gerais, cotação e alguns indicadores fundamentalistas.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="income" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="income">DRE</TabsTrigger>
        <TabsTrigger value="balance">Balanço</TabsTrigger>
        <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
      </TabsList>

      <TabsContent value="income" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Demonstração do Resultado (DRE)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `R$ ${value.toFixed(0)}M`} />
                  <Legend />
                  <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" name="Receita" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" stroke="#22c55e" name="Lucro Líquido" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marginData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value?.toFixed(2)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="margemBruta" stroke="#3b82f6" name="Margem Bruta" />
                  <Line type="monotone" dataKey="margemOperacional" stroke="#f59e0b" name="Margem Operacional" />
                  <Line type="monotone" dataKey="margemLiquida" stroke="#22c55e" name="Margem Líquida" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="balance" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Balanço Patrimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balanceSheets.slice(0, 4).map((balance, idx) => (
                <div key={idx} className="border-b pb-4">
                  <h4 className="font-semibold mb-2">{formatDate(balance.period_end)}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ativos Totais</p>
                      <p className="font-semibold">{formatCurrency(balance.total_assets)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Passivos Totais</p>
                      <p className="font-semibold">{formatCurrency(balance.total_liabilities)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Patrimônio Líquido</p>
                      <p className="font-semibold">{formatCurrency(balance.total_equity)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dívida de Longo Prazo</p>
                      <p className="font-semibold">{formatCurrency(balance.long_term_debt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cashflow" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `R$ ${value.toFixed(0)}M`} />
                  <Legend />
                  <Bar dataKey="operacional" fill="#22c55e" name="Operacional" />
                  <Bar dataKey="investimento" fill="#f59e0b" name="Investimento" />
                  <Bar dataKey="financiamento" fill="#ef4444" name="Financiamento" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};