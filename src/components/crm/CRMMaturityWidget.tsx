import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, AlertTriangle, User, Calendar } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMMaturityWidgetProps {
  clientIds: string[];
  onClientSelect?: (clientId: string) => void;
}

interface MaturityItem {
  id: string;
  ticker: string;
  asset_name: string;
  maturity_date: string;
  invested_amount: number;
  current_value: number;
  client_id: string;
  client_name: string;
  days_until: number;
  rate: string | null;
}

export const CRMMaturityWidget = ({ clientIds, onClientSelect }: CRMMaturityWidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [maturities, setMaturities] = useState<MaturityItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (clientIds.length > 0) {
      fetchMaturities();
    } else {
      setLoading(false);
    }
  }, [clientIds]);

  const fetchMaturities = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysLater = addDays(new Date(), 90).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("assets")
        .select("id, ticker, asset_name, maturity_date, invested_amount, current_price, average_price, quantity, rate, client_id, clients(name)")
        .in("client_id", clientIds)
        .eq("asset_class", "Renda Fixa")
        .not("maturity_date", "is", null)
        .gte("maturity_date", today)
        .lte("maturity_date", ninetyDaysLater)
        .order("maturity_date");

      if (error) throw error;

      const now = new Date();
      const items: MaturityItem[] = (data || []).map(item => {
        const clientData = item.clients as any;
        const currentValue = (Number(item.current_price) || Number(item.average_price) || 0) * Number(item.quantity);
        return {
          id: item.id,
          ticker: item.ticker,
          asset_name: item.asset_name,
          maturity_date: item.maturity_date || '',
          invested_amount: Number(item.invested_amount) || 0,
          current_value: currentValue,
          client_id: item.client_id || '',
          client_name: clientData?.name || 'Cliente',
          days_until: differenceInDays(parseISO(item.maturity_date || ''), now),
          rate: item.rate,
        };
      });

      setMaturities(items);
      setTotalAmount(items.reduce((sum, m) => sum + m.current_value, 0));
    } catch (error) {
      console.error("Erro ao buscar vencimentos:", error);
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

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return <Badge variant="destructive">Urgente</Badge>;
    if (days <= 30) return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Próximo</Badge>;
    return <Badge variant="secondary">{days} dias</Badge>;
  };

  const urgentMaturities = maturities.filter(m => m.days_until <= 30);
  const upcomingMaturities = maturities.filter(m => m.days_until > 30);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Vencimentos de Renda Fixa (90 dias)
          </span>
          <Badge variant="secondary" className="font-bold">
            {formatCurrency(totalAmount)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {maturities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum vencimento nos próximos 90 dias
          </p>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto">
            {/* Urgent Section */}
            {urgentMaturities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Próximos 30 dias ({urgentMaturities.length})
                </div>
                {urgentMaturities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.asset_name || item.ticker}</span>
                        {getUrgencyBadge(item.days_until)}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => onClientSelect?.(item.client_id)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <User className="h-3 w-3" />
                          {item.client_name}
                        </button>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.maturity_date)}
                        </span>
                        {item.rate && (
                          <span className="text-xs text-muted-foreground">
                            {item.rate}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-sm whitespace-nowrap ml-2">
                      {formatCurrency(item.current_value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Section */}
            {upcomingMaturities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  31-90 dias ({upcomingMaturities.length})
                </div>
                {upcomingMaturities.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.asset_name || item.ticker}</span>
                        {getUrgencyBadge(item.days_until)}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => onClientSelect?.(item.client_id)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <User className="h-3 w-3" />
                          {item.client_name}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.maturity_date)}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm whitespace-nowrap ml-2">
                      {formatCurrency(item.current_value)}
                    </span>
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
