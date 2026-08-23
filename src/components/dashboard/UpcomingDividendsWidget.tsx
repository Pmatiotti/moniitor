import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, TrendingUp, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UpcomingDividend {
  ticker: string;
  dividend_type: string;
  amount_per_share?: number;
  rate?: number;
  expected_total?: number;
  expected_amount?: number;
  payment_date: string;
  ex_date: string | null;
  quantity: number;
  source: string;
}

export const UpcomingDividendsWidget = () => {
  const navigate = useNavigate();
  const [dividends, setDividends] = useState<UpcomingDividend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingDividends();
  }, []);

  const fetchUpcomingDividends = async () => {
    try {
      // First, try to get from the database table (populated by scheduled job)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbDividends, error: dbError } = await supabase
          .from('upcoming_dividends')
          .select('ticker, dividend_type, rate, expected_amount, payment_date, ex_date, quantity, source')
          .eq('user_id', user.id)
          .is('client_id', null) // Excluir proventos de clientes
          .gte('payment_date', new Date().toISOString().split('T')[0])
          .order('payment_date', { ascending: true });
        
        if (!dbError && dbDividends && dbDividends.length > 0) {
          // Map database format to expected format
          const mappedDividends = dbDividends.map(d => ({
            ...d,
            amount_per_share: d.rate,
            expected_total: d.expected_amount,
          }));
          setDividends(mappedDividends as UpcomingDividend[]);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: call edge function for real-time data
      const { data, error } = await supabase.functions.invoke('fetch-upcoming-dividends');
      if (error) throw error;
      setDividends(data?.upcomingDividends || []);
    } catch (error) {
      console.error("Error fetching upcoming dividends:", error);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getDaysUntil = (date: string) => {
    const paymentDate = new Date(date);
    const today = new Date();
    const diffTime = paymentDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtrar apenas proventos do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthDividends = dividends.filter(d => {
    const payDate = new Date(d.payment_date);
    return payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;
  });

  const getExpectedTotal = (d: UpcomingDividend) => d.expected_total ?? d.expected_amount ?? 0;
  const totalExpected = monthDividends.reduce((sum, d) => sum + getExpectedTotal(d), 0);

  if (loading) {
    return (
      <Card className="hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            Proventos do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            Proventos do Mês
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/dividends')}
          >
            Ver todos
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {monthDividends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum provento previsto para este mês
          </p>
        ) : (
          <>
            {/* Total Preview */}
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Previsto</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalExpected)}
              </span>
            </div>

            {/* Dividends List - Max 5 items */}
            <div className="space-y-2">
              {monthDividends.slice(0, 5).map((dividend, index) => {
                const daysUntil = getDaysUntil(dividend.payment_date);
                
                return (
                  <div 
                    key={`${dividend.ticker}-${dividend.payment_date}-${index}`}
                    className="flex items-center justify-between p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">
                        {dividend.ticker}
                      </span>
                      <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                        {dividend.dividend_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-medium">
                          {formatCurrency(getExpectedTotal(dividend))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(dividend.payment_date)}
                          {daysUntil >= 0 && daysUntil <= 7 && (
                            <span className="ml-1 text-primary">
                              ({daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {monthDividends.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate('/dividends')}
              >
                + {monthDividends.length - 5} proventos adicionais
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};