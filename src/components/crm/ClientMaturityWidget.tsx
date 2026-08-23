import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, AlertTriangle, Loader2 } from "lucide-react";

interface MaturityItem {
  id: string;
  ticker: string;
  asset_name: string;
  maturity_date: string;
  current_price: number;
  rate: string | null;
  days_until: number;
}

interface ClientMaturityWidgetProps {
  clientId: string;
}

export const ClientMaturityWidget = ({ clientId }: ClientMaturityWidgetProps) => {
  const [maturities, setMaturities] = useState<MaturityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchMaturities();
  }, [clientId]);

  const fetchMaturities = async () => {
    try {
      const today = new Date();
      const ninetyDaysLater = new Date();
      ninetyDaysLater.setDate(today.getDate() + 90);

      // Primeiro tenta buscar por client_id (clientes manuais)
      let { data, error } = await supabase
        .from("assets")
        .select("id, ticker, asset_name, maturity_date, current_price, rate")
        .eq("client_id", clientId)
        .eq("asset_class", "Renda Fixa")
        .not("maturity_date", "is", null)
        .gte("maturity_date", today.toISOString().split("T")[0])
        .lte("maturity_date", ninetyDaysLater.toISOString().split("T")[0])
        .order("maturity_date");

      if (error) throw error;

      // Fallback: buscar por user_id (clientes vinculados)
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from("assets")
          .select("id, ticker, asset_name, maturity_date, current_price, rate")
          .eq("user_id", clientId)
          .is("client_id", null)
          .eq("asset_class", "Renda Fixa")
          .not("maturity_date", "is", null)
          .gte("maturity_date", today.toISOString().split("T")[0])
          .lte("maturity_date", ninetyDaysLater.toISOString().split("T")[0])
          .order("maturity_date");

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      const items: MaturityItem[] = (data || []).map((asset) => {
        const maturityDate = new Date(asset.maturity_date);
        const diffTime = maturityDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: asset.id,
          ticker: asset.ticker,
          asset_name: asset.asset_name,
          maturity_date: asset.maturity_date,
          current_price: Number(asset.current_price) || 0,
          rate: asset.rate,
          days_until: daysUntil,
        };
      });

      setMaturities(items);
      setTotalAmount(items.reduce((sum, item) => sum + item.current_price, 0));
    } catch (error) {
      console.error("Error fetching maturities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 30) {
      return <Badge variant="destructive" className="text-xs">Urgente</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{days}d</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const urgentMaturities = maturities.filter((m) => m.days_until <= 30);
  const upcomingMaturities = maturities.filter((m) => m.days_until > 30);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Vencimentos RF (90 dias)
          </CardTitle>
          {totalAmount > 0 && (
            <Badge variant="outline" className="font-semibold">
              {formatCurrency(totalAmount)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {maturities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum vencimento nos próximos 90 dias
          </p>
        ) : (
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {urgentMaturities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Próximos 30 dias
                </div>
                {urgentMaturities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.ticker}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(item.maturity_date)}
                        {item.rate && ` • ${item.rate}`}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold">{formatCurrency(item.current_price)}</p>
                      {getUrgencyBadge(item.days_until)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcomingMaturities.length > 0 && (
              <div className="space-y-2">
                {urgentMaturities.length > 0 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    31-90 dias
                  </div>
                )}
                {upcomingMaturities.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.ticker}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(item.maturity_date)}
                        {item.rate && ` • ${item.rate}`}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold">{formatCurrency(item.current_price)}</p>
                      {getUrgencyBadge(item.days_until)}
                    </div>
                  </div>
                ))}
                {upcomingMaturities.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{upcomingMaturities.length - 5} vencimentos adicionais
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
