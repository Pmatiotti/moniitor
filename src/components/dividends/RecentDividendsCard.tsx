import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp } from "lucide-react";

interface Dividend {
  id: string;
  ticker: string;
  dividend_type: string;
  amount: number;
  payment_date: string;
}

interface RecentDividendsCardProps {
  dividends: Dividend[];
  loading?: boolean;
}

export function RecentDividendsCard({ dividends, loading }: RecentDividendsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Filter dividends from current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;

  const recentDividends = dividends.filter(d => {
    const paymentDate = new Date(d.payment_date + 'T00:00:00');
    return paymentDate >= firstDayOfMonth && paymentDate <= lastDayOfMonth;
  }).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const totalRecent = recentDividends.reduce((sum, d) => sum + d.amount, 0);

  const getDividendTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'dividendo': 'Dividendo',
      'jcp': 'JCP',
      'rendimento': 'Rendimento',
      'amortização': 'Amortização'
    };
    return types[type?.toLowerCase()] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Pagos Recentemente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentDividends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Proventos do Mês
          </CardTitle>
          <p className="text-xs text-muted-foreground">{currentMonthName}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum provento recebido neste mês
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Proventos do Mês
          </CardTitle>
          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            {formatCurrency(totalRecent)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{currentMonthName}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {recentDividends.slice(0, 10).map((dividend) => (
            <div
              key={dividend.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-600">
                    {dividend.ticker.slice(0, 4)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{dividend.ticker}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDividendTypeLabel(dividend.dividend_type)} • {formatDate(dividend.payment_date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600 text-sm">
                  {formatCurrency(dividend.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {recentDividends.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            +{recentDividends.length - 10} proventos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
