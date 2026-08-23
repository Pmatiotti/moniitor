import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BenchmarkData {
  month: string;
  portfolio: number;
  benchmark: number;
}

interface BenchmarkInfo {
  name: string;
  return: number;
  color: string;
}

const BENCHMARK_RATES: Record<string, number[]> = {
  'CDI': [0.9, 1.8, 2.7, 3.6, 4.5, 5.5, 6.4, 7.3, 8.3, 9.2, 10.2, 11.1],
  'IPCA': [0.5, 1.0, 1.6, 2.1, 2.7, 3.2, 3.8, 4.4, 5.0, 5.6, 6.2, 6.8],
  'IBOV': [0.0, 1.8, 5.4, 4.1, 8.2, 10.5, 12.1, 10.8, 14.2, 16.5, 18.9, 21.2],
  'DOLAR': [0.0, -2.1, -1.5, 0.8, 2.3, 3.7, 2.9, 1.8, 3.5, 4.2, 5.8, 7.1],
};

export const BenchmarkComparison = () => {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('CDI');
  const [data, setData] = useState<BenchmarkData[]>([]);
  const [portfolioReturn, setPortfolioReturn] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparisonData();
  }, [selectedBenchmark]);

  const fetchComparisonData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assets, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      if (error) throw error;

      // Usar a MESMA lógica do Dashboard
      let totalInvested = 0;
      let totalValue = 0;

      assets?.forEach((asset) => {
        const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                   asset.invested_amount && Number(asset.invested_amount) > 0;
        
        const assetValue = usesInvestedAmount 
          ? Number(asset.current_price) 
          : Number(asset.current_price || asset.average_price) * Number(asset.quantity);
        
        const assetCost = usesInvestedAmount 
          ? Number(asset.invested_amount) 
          : Number(asset.average_price) * Number(asset.quantity);

        totalInvested += assetCost;
        totalValue += assetValue;
      });

      const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

      setPortfolioReturn(totalReturn);

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const benchmarkRates = BENCHMARK_RATES[selectedBenchmark] || BENCHMARK_RATES['CDI'];
      
      const chartData: BenchmarkData[] = monthNames.map((month, index) => ({
        month,
        portfolio: (totalReturn / 12) * (index + 1),
        benchmark: benchmarkRates[index],
      }));

      setData(chartData);
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setLoading(false);
    }
  };

  const benchmarkReturn = data.length > 0 ? data[data.length - 1].benchmark : 0;
  const difference = portfolioReturn - benchmarkReturn;

  const benchmarkInfo: BenchmarkInfo = {
    name: selectedBenchmark,
    return: benchmarkReturn,
    color: "hsl(var(--warning))",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Selecione o Benchmark</h3>
        <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CDI">CDI</SelectItem>
            <SelectItem value="IPCA">IPCA</SelectItem>
            <SelectItem value="IBOV">IBOVESPA</SelectItem>
            <SelectItem value="DOLAR">Dólar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seu Portfólio</CardTitle>
            {portfolioReturn >= 0 ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Retorno no período (12 meses)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{benchmarkInfo.name}</CardTitle>
            {benchmarkReturn >= 0 ? (
              <TrendingUp className="h-4 w-4" style={{ color: benchmarkInfo.color }} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{ color: benchmarkInfo.color }} />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: benchmarkInfo.color }}>
              {benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Retorno no período (12 meses)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparação de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="portfolio" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Seu Portfólio"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="benchmark" 
                stroke={benchmarkInfo.color}
                strokeWidth={2}
                name={benchmarkInfo.name}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Análise Comparativa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`flex items-start gap-4 p-4 border rounded-lg ${difference >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
              {difference >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success mt-0.5" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div>
                <h4 className="font-medium mb-1">
                  {difference >= 0 ? 'Performance Superior' : 'Performance Inferior'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Seu portfólio {difference >= 0 ? 'superou' : 'ficou abaixo d'} o {benchmarkInfo.name} em{' '}
                  <span className={`font-semibold ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {difference >= 0 ? '+' : ''}{difference.toFixed(2)}%
                  </span>{' '}
                  no período analisado.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Sobre o {benchmarkInfo.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedBenchmark === 'CDI' && 'O CDI é a taxa de juros de referência do mercado brasileiro, utilizada em empréstimos entre bancos.'}
                  {selectedBenchmark === 'IPCA' && 'O IPCA é o índice oficial de inflação do Brasil, medindo a variação de preços para o consumidor.'}
                  {selectedBenchmark === 'IBOV' && 'O Ibovespa é o principal índice da bolsa brasileira, medindo o desempenho das principais ações.'}
                  {selectedBenchmark === 'DOLAR' && 'A variação do dólar americano em relação ao real brasileiro.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
