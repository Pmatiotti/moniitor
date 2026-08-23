import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Loader2 } from "lucide-react";

interface UpcomingDividend {
  ticker: string;
  payment_date: string;
  expected_amount: number;
  dividend_type: string;
  quantity: number;
}

interface ClientUpcomingDividendsWidgetProps {
  clientId: string;
}

export const ClientUpcomingDividendsWidget = ({ clientId }: ClientUpcomingDividendsWidgetProps) => {
  const [dividends, setDividends] = useState<UpcomingDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchUpcomingDividends();
  }, [clientId]);

  const fetchUpcomingDividends = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 90);
      const futureDate = thirtyDaysLater.toISOString().split("T")[0];

      // Primeiro tenta buscar por client_id (clientes manuais)
      let { data, error } = await supabase
        .from("upcoming_dividends")
        .select("ticker, payment_date, expected_amount, dividend_type, quantity")
        .eq("client_id", clientId)
        .gte("payment_date", today)
        .lte("payment_date", futureDate)
        .order("payment_date");

      if (error) throw error;

      // Fallback: buscar por user_id (clientes vinculados)
      if (!data || data.length === 0) {
        const fallback = await supabase
          .from("upcoming_dividends")
          .select("ticker, payment_date, expected_amount, dividend_type, quantity")
          .eq("user_id", clientId)
          .is("client_id", null)
          .gte("payment_date", today)
          .lte("payment_date", futureDate)
          .order("payment_date");

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      // Fallback: call edge function for real-time data if nothing in DB
      if (!data || data.length === 0) {
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
            'fetch-upcoming-dividends',
            { body: { clientId } }
          );
          if (!edgeError && edgeData?.upcomingDividends?.length > 0) {
            data = edgeData.upcomingDividends.map((d: any) => ({
              ticker: d.ticker,
              payment_date: d.payment_date,
              expected_amount: d.expected_total || 0,
              dividend_type: d.dividend_type || 'Dividendo',
              quantity: d.quantity || 0,
            }));
          }
        } catch (e) {
          console.error("Error calling fetch-upcoming-dividends:", e);
        }
      }

      const upcomingDividends: UpcomingDividend[] = (data || []).map((div) => ({
        ticker: div.ticker,
        payment_date: div.payment_date,
        expected_amount: Number((div as any).expected_amount ?? 0),
        dividend_type: div.dividend_type || "Dividendo",
        quantity: Number((div as any).quantity ?? 0),
      }));

      setDividends(upcomingDividends);
      setTotalAmount(upcomingDividends.reduce((sum, d) => sum + d.expected_amount, 0));
    } catch (error) {
      console.error("Error fetching upcoming dividends:", error);
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

  const getDividendTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Dividendo: "bg-green-500/10 text-green-700 dark:text-green-400",
      "Rendimento": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      JCP: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    };
    return colors[type] || "bg-muted text-muted-foreground";
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Proventos (90 dias)
          </CardTitle>
          {totalAmount > 0 && (
            <Badge variant="outline" className="font-semibold text-green-600">
              {formatCurrency(totalAmount)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {dividends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum provento previsto nos próximos 30 dias
          </p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {dividends.slice(0, 10).map((div, index) => (
              <div
                key={`${div.ticker}-${div.payment_date}-${index}`}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{div.ticker}</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getDividendTypeColor(div.dividend_type)}`}
                    >
                      {div.dividend_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(div.payment_date)} • {div.quantity.toLocaleString("pt-BR")} cotas
                  </p>
                </div>
                <p className="text-sm font-semibold text-green-600">
                  {formatCurrency(div.expected_amount)}
                </p>
              </div>
            ))}
            {dividends.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                +{dividends.length - 10} proventos adicionais
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
