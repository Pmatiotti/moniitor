import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, Calendar, User } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMUpcomingDividendsWidgetProps {
  clientIds: string[];
  onClientSelect?: (clientId: string) => void;
}

interface UpcomingDividend {
  ticker: string;
  payment_date: string;
  expected_amount: number;
  dividend_type: string;
  client_id: string;
  client_name: string;
}

export const CRMUpcomingDividendsWidget = ({ clientIds, onClientSelect }: CRMUpcomingDividendsWidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [dividends, setDividends] = useState<UpcomingDividend[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (clientIds.length > 0) {
      fetchUpcomingDividends();
    } else {
      setLoading(false);
    }
  }, [clientIds]);

  const fetchUpcomingDividends = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysLater = addDays(new Date(), 90).toISOString().split('T')[0];

      // Fonte unificada: upcoming_dividends (filtrado por client_id)
      const [{ data: upcomingData, error: divError }, { data: clientsData, error: clientsError }] = await Promise.all([
        supabase
          .from("upcoming_dividends")
          .select("ticker, payment_date, expected_amount, dividend_type, client_id")
          .in("client_id", clientIds)
          .gte("payment_date", today)
          .lte("payment_date", ninetyDaysLater)
          .order("payment_date"),
        supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds),
      ]);

      if (divError) throw divError;
      if (clientsError) throw clientsError;

      const clientNameById = new Map<string, string>();
      (clientsData || []).forEach((c) => clientNameById.set(c.id, c.name));

      const dividendsWithClients: UpcomingDividend[] = (upcomingData || []).map((div) => ({
        ticker: div.ticker,
        payment_date: div.payment_date,
        expected_amount: Number((div as any).expected_amount ?? 0),
        dividend_type: div.dividend_type || "Provento",
        client_id: (div as any).client_id || "",
        client_name: clientNameById.get((div as any).client_id || "") || "Cliente",
      }));

      setDividends(dividendsWithClients);
      setTotalAmount(dividendsWithClients.reduce((sum, d) => sum + d.expected_amount, 0));
    } catch (error) {
      console.error("Erro ao buscar dividendos:", error);
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
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getDividendTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('jcp')) return 'bg-blue-500/10 text-blue-600';
    if (typeLower.includes('dividendo')) return 'bg-green-500/10 text-green-600';
    if (typeLower.includes('rendimento')) return 'bg-purple-500/10 text-purple-600';
    return 'bg-muted text-muted-foreground';
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Proventos Próximos (90 dias)
          </span>
          <Badge variant="secondary" className="font-bold">
            {formatCurrency(totalAmount)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dividends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum provento programado
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {dividends.slice(0, 10).map((div, index) => (
              <div
                key={`${div.ticker}-${div.client_id}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs font-medium">{formatDate(div.payment_date)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{div.ticker}</div>
                    <button
                      onClick={() => onClientSelect?.(div.client_id)}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <User className="h-3 w-3" />
                      {div.client_name}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getDividendTypeColor(div.dividend_type)}>
                    {div.dividend_type}
                  </Badge>
                  <span className="font-semibold text-sm text-green-600">
                    {formatCurrency(div.expected_amount)}
                  </span>
                </div>
              </div>
            ))}
            {dividends.length > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{dividends.length - 10} proventos adicionais
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
