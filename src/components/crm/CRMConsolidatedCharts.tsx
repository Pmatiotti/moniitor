import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Loader2, PieChartIcon, Building2, Globe, TrendingUp } from "lucide-react";
import { inferSubClass, inferFixedIncomeSubClass } from "@/lib/subclass-inference";

interface CRMConsolidatedChartsProps {
  clientIds: string[];
}

interface AssetData {
  asset_class: string;
  sub_class: string | null;
  broker: string | null;
  currency: string | null;
  ticker: string;
  asset_name: string;
  rate: string | null;
  quantity: number;
  current_price: number | null;
  average_price: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(47.9 95.8% 53.1%)",
  "hsl(346.8 77.2% 49.8%)",
];

export const CRMConsolidatedCharts = ({ clientIds }: CRMConsolidatedChartsProps) => {
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<{ name: string; value: number }[]>([]);
  const [subClassData, setSubClassData] = useState<{ name: string; value: number }[]>([]);
  const [brokerData, setBrokerData] = useState<{ name: string; value: number }[]>([]);
  const [countryData, setCountryData] = useState<{ name: string; value: number }[]>([]);
  const [topAssets, setTopAssets] = useState<{ name: string; value: number }[]>([]);
  const [totalAUM, setTotalAUM] = useState(0);

  useEffect(() => {
    if (clientIds.length > 0) {
      fetchConsolidatedData();
    } else {
      setLoading(false);
    }
  }, [clientIds]);

  const fetchConsolidatedData = async () => {
    setLoading(true);
    try {
      const { data: assets, error } = await supabase
        .from("assets")
        .select("asset_class, sub_class, broker, currency, ticker, asset_name, rate, quantity, current_price, average_price")
        .in("client_id", clientIds);

      if (error) throw error;

      if (!assets || assets.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate value for each asset
      const assetsWithValue = assets.map((asset: AssetData) => ({
        ...asset,
        value: (Number(asset.current_price) || Number(asset.average_price) || 0) * Number(asset.quantity),
      }));

      const total = assetsWithValue.reduce((sum, a) => sum + a.value, 0);
      setTotalAUM(total);

      // Aggregate by class
      const classTotals: Record<string, number> = {};
      assetsWithValue.forEach((a) => {
        const className = a.asset_class || "Outros";
        classTotals[className] = (classTotals[className] || 0) + a.value;
      });
      setClassData(
        Object.entries(classTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Aggregate by subclass (with inference)
      // IMPORTANTE: Para Renda Fixa, SEMPRE usar indexador com fallback para nome
      const subClassTotals: Record<string, number> = {};
      assetsWithValue.forEach((a) => {
        let subClass: string | null;
        
        if (a.asset_class === 'Renda Fixa') {
          // Para Renda Fixa, inferir pelo indexador (rate) com fallback para nome
          subClass = inferFixedIncomeSubClass(a.rate, a.asset_name);
        } else {
          // Para outras classes, usar sub_class do banco ou inferir
          subClass = a.sub_class || 
            inferSubClass(a.asset_class, a.asset_name, a.ticker, a.rate);
        }
        
        if (subClass) {
          subClassTotals[subClass] = (subClassTotals[subClass] || 0) + a.value;
        }
      });
      setSubClassData(
        Object.entries(subClassTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Aggregate by broker
      const brokerTotals: Record<string, number> = {};
      assetsWithValue.forEach((a) => {
        const broker = a.broker || "Não informado";
        brokerTotals[broker] = (brokerTotals[broker] || 0) + a.value;
      });
      setBrokerData(
        Object.entries(brokerTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      );

      // Aggregate by country (based on currency)
      const countryTotals: Record<string, number> = {};
      assetsWithValue.forEach((a) => {
        let country = "Brasil";
        if (a.currency === "USD") country = "EUA";
        else if (a.currency === "EUR") country = "Europa";
        countryTotals[country] = (countryTotals[country] || 0) + a.value;
      });
      setCountryData(
        Object.entries(countryTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Top 10 assets by value
      const tickerTotals: Record<string, number> = {};
      assetsWithValue.forEach((a) => {
        tickerTotals[a.ticker] = (tickerTotals[a.ticker] || 0) + a.value;
      });
      setTopAssets(
        Object.entries(tickerTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      );
    } catch (error) {
      console.error("Erro ao buscar dados consolidados:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value)} ({formatPercent(payload[0].value, totalAUM)})
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clientIds.length === 0 || classData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhum ativo encontrado nos clientes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Visão Consolidada - {formatCurrency(totalAUM)}
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Class Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Alocação por Classe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={classData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={false}
                >
                  {classData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Broker Distribution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Distribuição por Corretora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={brokerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={false}
                >
                  {brokerData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Country/Region Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Exposição Geográfica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={false}
                >
                  {countryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subclass Distribution Bar Chart */}
        {subClassData.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição Detalhada (Subclasses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subClassData}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top 10 Assets Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Ativos Consolidados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topAssets} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={10} />
                <YAxis type="category" dataKey="name" width={60} fontSize={11} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
