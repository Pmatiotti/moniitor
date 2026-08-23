import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBrokerName } from "@/lib/broker-normalization";
import { inferSubClass, inferFixedIncomeSubClass } from "@/lib/subclass-inference";

interface Asset {
  asset_class: string;
  sub_class: string | null;
  broker: string | null;
  quantity: number;
  current_price: number;
  invested_amount: number | null;
  asset_name: string;
  ticker: string;
  rate: string | null;
}

interface ClientAllocationChartsProps {
  clientId: string;
}

export const ClientAllocationCharts = ({ clientId }: ClientAllocationChartsProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, [clientId]);

  const fetchAssets = async () => {
    try {
      // Primeiro tenta buscar por client_id (clientes manuais)
      let { data, error } = await supabase
        .from("assets")
        .select("asset_class, sub_class, broker, quantity, current_price, invested_amount, asset_name, ticker, rate")
        .eq("client_id", clientId);

      if (error) throw error;

      // Fallback: buscar por user_id (clientes vinculados)
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from("assets")
          .select("asset_class, sub_class, broker, quantity, current_price, invested_amount, asset_name, ticker, rate")
          .eq("user_id", clientId)
          .is("client_id", null);

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      setAssets(data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
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

  const calculateValue = (asset: Asset) => {
    const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                               asset.invested_amount && Number(asset.invested_amount) > 0;
    return usesInvestedAmount 
      ? Number(asset.current_price) 
      : Number(asset.current_price) * Number(asset.quantity);
  };

  // Alocação por classe
  const allocationByClass = assets.reduce((acc, asset) => {
    const value = calculateValue(asset);
    const existing = acc.find(item => item.name === asset.asset_class);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: asset.asset_class, value });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const totalValue = allocationByClass.reduce((sum, item) => sum + item.value, 0);
  const classData = allocationByClass.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
  }));

  // Alocação por subclasse (com inferência automática)
  // IMPORTANTE: Para Renda Fixa, SEMPRE usar indexador (ignorar sub_class do banco que pode ter veículo)
  const allocationBySubClass = assets.reduce((acc, asset) => {
    let subClass: string | null;
    
    if (asset.asset_class === 'Renda Fixa') {
      // Para Renda Fixa, inferir pelo indexador (rate) com fallback para nome
      subClass = inferFixedIncomeSubClass(asset.rate, asset.asset_name);
    } else {
      // Para outras classes, usar sub_class do banco ou inferir
      subClass = asset.sub_class || 
        inferSubClass(asset.asset_class, asset.asset_name, asset.ticker, asset.rate);
    }
    
    if (!subClass) return acc;
    
    const value = calculateValue(asset);
    const existing = acc.find(item => item.name === subClass);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: subClass, value });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Alocação por corretora
  const allocationByBroker = assets.reduce((acc, asset) => {
    const broker = normalizeBrokerName(asset.broker) || "Não informado";
    const value = calculateValue(asset);
    const existing = acc.find(item => item.name === broker);
    if (existing) {
      existing.value += value;
    } else {
      acc.push({ name: broker, value });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Nenhum ativo para exibir alocação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alocação por Classe de Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${formatCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`,
                    props.payload.name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alocação por Corretora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationByBroker}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {allocationByBroker.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return [`${formatCurrency(value)} (${percentage.toFixed(1)}%)`, props.payload.name];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {allocationBySubClass.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Detalhada (Subclasses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={allocationBySubClass}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};