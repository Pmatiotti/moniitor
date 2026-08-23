import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { getBrokerColor } from "@/lib/broker-colors";
import { normalizeBrokerName } from "@/lib/broker-normalization";

interface BrokerAllocation {
  name: string;
  value: number;
  percentage: number;
}

export const BrokerDistributionCard = () => {
  const [brokerAllocation, setBrokerAllocation] = useState<BrokerAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    fetchBrokerData();
  }, []);

  const fetchBrokerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      if (assets && assets.length > 0) {
        const brokerMap = new Map<string, number>();
        let total = 0;

        assets.forEach((asset) => {
          // Normalizar o nome do broker para consolidar variações
          const broker = normalizeBrokerName(asset.broker) || "Não informado";
          
          // Calcular valor do ativo (Renda Fixa, Fundos de Investimento e Previdência usam invested_amount)
          const usesInvestedAmount = (
            asset.asset_class === "Renda Fixa" || 
            asset.asset_class === "Fundos de Investimento" || 
            asset.asset_class === "Previdência"
          ) && asset.invested_amount && Number(asset.invested_amount) > 0;
          
          const assetValue = usesInvestedAmount 
            ? Number(asset.current_price) 
            : Number(asset.current_price || asset.average_price) * Number(asset.quantity);
          
          total += assetValue;
          
          // Acumular por broker
          const currentValue = brokerMap.get(broker) || 0;
          brokerMap.set(broker, currentValue + assetValue);
        });

        // Converter para array e calcular percentuais
        const brokerData: BrokerAllocation[] = Array.from(brokerMap.entries())
          .map(([name, value]) => ({
            name,
            value,
            percentage: total > 0 ? (value / total) * 100 : 0,
          }))
          .sort((a, b) => b.value - a.value); // Ordenar por valor decrescente

        setBrokerAllocation(brokerData);
        setTotalValue(total);
      }
    } catch (error) {
      console.error("Error fetching broker data:", error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Instituição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (brokerAllocation.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Instituição</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum dado disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Instituição</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={brokerAllocation}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {brokerAllocation.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBrokerColor(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                const percentage = props.payload.percentage?.toFixed(1) || '0';
                return [`${formatCurrency(value)} (${percentage}%)`, props.payload.name];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {brokerAllocation.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
