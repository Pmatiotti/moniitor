import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, TrendingUp, Shield } from "lucide-react";

interface CRMAssetConcentrationCardProps {
  clientIds: string[];
}

interface ConcentrationItem {
  ticker: string;
  clientCount: number;
  totalClients: number;
  percentage: number;
  totalValue: number;
}

export const CRMAssetConcentrationCard = ({ clientIds }: CRMAssetConcentrationCardProps) => {
  const [loading, setLoading] = useState(true);
  const [concentrations, setConcentrations] = useState<ConcentrationItem[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    if (clientIds.length > 0) {
      fetchConcentration();
    } else {
      setLoading(false);
    }
  }, [clientIds]);

  const fetchConcentration = async () => {
    setLoading(true);
    try {
      const { data: assets, error } = await supabase
        .from("assets")
        .select("ticker, client_id, quantity, current_price, average_price")
        .in("client_id", clientIds);

      if (error) throw error;

      if (!assets || assets.length === 0) {
        setLoading(false);
        return;
      }

      const uniqueClients = new Set(assets.map(a => a.client_id));
      const total = uniqueClients.size;
      setTotalClients(total);

      // Count clients per ticker and total value
      const tickerData: Record<string, { clients: Set<string>; value: number }> = {};
      
      assets.forEach(asset => {
        if (!tickerData[asset.ticker]) {
          tickerData[asset.ticker] = { clients: new Set(), value: 0 };
        }
        tickerData[asset.ticker].clients.add(asset.client_id || '');
        const price = Number(asset.current_price) || Number(asset.average_price) || 0;
        tickerData[asset.ticker].value += price * Number(asset.quantity);
      });

      // Calculate concentration percentages
      const items: ConcentrationItem[] = Object.entries(tickerData)
        .map(([ticker, data]) => ({
          ticker,
          clientCount: data.clients.size,
          totalClients: total,
          percentage: (data.clients.size / total) * 100,
          totalValue: data.value,
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 10);

      setConcentrations(items);
    } catch (error) {
      console.error("Erro ao calcular concentração:", error);
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

  const getConcentrationLevel = (percentage: number) => {
    if (percentage >= 80) return { level: "Muito Alta", color: "text-destructive", icon: AlertTriangle };
    if (percentage >= 60) return { level: "Alta", color: "text-orange-500", icon: AlertTriangle };
    if (percentage >= 40) return { level: "Moderada", color: "text-yellow-500", icon: TrendingUp };
    return { level: "Saudável", color: "text-green-500", icon: Shield };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-destructive";
    if (percentage >= 60) return "bg-orange-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (clientIds.length === 0 || concentrations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhum ativo para análise de concentração
          </p>
        </CardContent>
      </Card>
    );
  }

  const highConcentration = concentrations.filter(c => c.percentage >= 60);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Análise de Concentração
          </span>
          <Badge variant="outline">
            {totalClients} clientes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {highConcentration.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              <strong>{highConcentration.length} ativo(s)</strong> com alta concentração entre clientes. 
              Considere diversificação para reduzir risco sistêmico.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ativos mais presentes nas carteiras dos clientes:
          </p>

          {concentrations.map((item) => {
            const { level, color } = getConcentrationLevel(item.percentage);
            return (
              <div key={item.ticker} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.ticker}</span>
                    <span className={`text-xs ${color}`}>({level})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {item.clientCount}/{item.totalClients} clientes
                    </span>
                    <span className="font-semibold">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full ${getProgressColor(item.percentage)} transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor total: {formatCurrency(item.totalValue)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Insight:</strong> Alta correlação entre carteiras pode representar risco sistêmico. 
            Ativos presentes em mais de 60% dos clientes merecem atenção especial em momentos de volatilidade.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
