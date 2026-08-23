import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CalendarClock, TrendingUp } from "lucide-react";
import type { UpcomingDividend } from "@/pages/Dividends";

interface UpcomingDividendsCardProps {
  upcomingDividends: UpcomingDividend[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const UpcomingDividendsCard = ({ 
  upcomingDividends, 
  loading = false,
  onRefresh 
}: UpcomingDividendsCardProps) => {
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpectedTotal = (d: UpcomingDividend) => d.expected_total ?? d.expected_amount ?? 0;
  const totalExpected = upcomingDividends.reduce((sum, d) => sum + getExpectedTotal(d), 0);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            Proventos Previstos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingDividends.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
              </div>
              Proventos Previstos
            </div>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum provento previsto no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
            </div>
            Proventos Previstos
          </div>
          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {/* Dividends List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {upcomingDividends.slice(0, 10).map((dividend, index) => {
            const daysUntil = getDaysUntil(dividend.payment_date);
            
            return (
              <div 
                key={`${dividend.ticker}-${dividend.payment_date}-${index}`}
                className="flex items-center justify-between p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono font-semibold text-sm">
                    {dividend.ticker}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {dividend.dividend_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(getExpectedTotal(dividend))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(dividend.payment_date)}
                      {daysUntil <= 7 && (
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

        {upcomingDividends.length > 10 && (
          <p className="text-xs text-muted-foreground text-center">
            + {upcomingDividends.length - 10} proventos adicionais
          </p>
        )}
      </CardContent>
    </Card>
  );
};
