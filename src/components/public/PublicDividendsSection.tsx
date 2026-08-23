import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, TrendingUp, Wallet, Info, CircleDollarSign, Percent } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
export interface DividendHistoryItem {
  paymentDate: string;
  rate: number;
  type: string;
  relatedTo?: string;
}

interface PublicDividendsSectionProps {
  dividendYield: number | null | undefined;
  ultimoDividendo: number | null | undefined;
  dataUltimoDividendo: string | null | undefined;
  totalDividendos12m: number | null | undefined;
  payoutRatio: number | null | undefined;
  dividendsHistory: DividendHistoryItem[] | null | undefined;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr: string) => {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd MMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const getTypeColor = (type: string) => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes("jcp") || typeLower.includes("juros")) {
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }
  if (typeLower.includes("rendimento")) {
    return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  }
  return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
};

const getTypeLabel = (type: string) => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes("jcp") || typeLower.includes("juros")) {
    return "JCP";
  }
  if (typeLower.includes("rendimento")) {
    return "Rend.";
  }
  return "Div.";
};

// Detectar frequência baseado nos pagamentos
const detectFrequency = (history: DividendHistoryItem[]): string => {
  if (!history || history.length < 2) return "—";
  
  const sortedDates = history
    .map(d => new Date(d.paymentDate).getTime())
    .sort((a, b) => b - a);
  
  if (sortedDates.length < 2) return "—";
  
  // Calcular média de dias entre pagamentos
  let totalDays = 0;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    totalDays += (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
  }
  const avgDays = totalDays / (sortedDates.length - 1);
  
  if (avgDays <= 45) return "Mensal";
  if (avgDays <= 100) return "Trimestral";
  if (avgDays <= 200) return "Semestral";
  return "Anual";
};

export function PublicDividendsSection({
  dividendYield,
  ultimoDividendo,
  dataUltimoDividendo,
  totalDividendos12m,
  payoutRatio,
  dividendsHistory,
  loading = false,
}: PublicDividendsSectionProps) {
  const hasData = ultimoDividendo !== null && ultimoDividendo !== undefined && ultimoDividendo > 0;
  
  // Filtrar apenas dividendos já pagos (excluir datas futuras)
  const paidDividendsHistory = useMemo(() => {
    if (!dividendsHistory || dividendsHistory.length === 0) return [];
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Incluir todo o dia de hoje
    
    return dividendsHistory.filter(d => {
      try {
        const paymentDate = new Date(d.paymentDate);
        return paymentDate <= today;
      } catch {
        return false;
      }
    });
  }, [dividendsHistory]);
  
  const hasHistory = paidDividendsHistory.length > 0;
  
  if (loading) {
    return (
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CircleDollarSign className="h-5 w-5 text-emerald-500" />
            Dividendos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-20 bg-muted rounded-lg" />
              <div className="h-20 bg-muted rounded-lg" />
            </div>
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!hasData && !hasHistory) {
    return (
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CircleDollarSign className="h-5 w-5 text-emerald-500" />
            Dividendos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum dividendo registrado nos últimos 12 meses</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const frequency = hasHistory ? detectFrequency(paidDividendsHistory) : "—";
  
  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CircleDollarSign className="h-5 w-5 text-emerald-500" />
          Dividendos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Último Dividendo */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Último Provento
            </div>
            <div className="text-xl font-bold text-foreground">
              {ultimoDividendo ? formatCurrency(ultimoDividendo) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {dataUltimoDividendo ? formatDate(dataUltimoDividendo) : "—"}
            </div>
          </div>
          
          {/* DY 12m */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>DY</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      12m
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Soma dos proventos dos últimos 12 meses ÷ preço atual</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={`text-xl font-bold ${
              dividendYield && dividendYield >= 6 
                ? "text-emerald-600" 
                : dividendYield && dividendYield >= 4 
                  ? "text-foreground" 
                  : "text-muted-foreground"
            }`}>
              {dividendYield !== null && dividendYield !== undefined 
                ? `${dividendYield.toFixed(2)}%` 
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              Dividend Yield
            </div>
          </div>
          
          {/* Total 12m */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Total 12 meses
            </div>
            <div className="text-xl font-bold text-foreground">
              {totalDividendos12m ? formatCurrency(totalDividendos12m) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {hasHistory ? `${paidDividendsHistory.length} pagamentos` : "—"}
            </div>
          </div>
          
          {/* Payout */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              <span>Payout</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>% do lucro líquido distribuído como dividendos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={`text-xl font-bold ${
              payoutRatio && payoutRatio > 100 
                ? "text-red-500" 
                : payoutRatio && payoutRatio >= 70 
                  ? "text-amber-500" 
                  : "text-foreground"
            }`}>
              {payoutRatio !== null && payoutRatio !== undefined 
                ? `${payoutRatio.toFixed(0)}%` 
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              Distribuição
            </div>
          </div>
        </div>
        
        {/* Payment History Timeline */}
        {hasHistory && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Histórico de Pagamentos
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Proventos pagos nos últimos 12 meses</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {paidDividendsHistory.map((dividend, index) => (
                  <div 
                    key={`${dividend.paymentDate}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-muted-foreground w-16">
                        {formatShortDate(dividend.paymentDate)}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getTypeColor(dividend.type)}`}
                      >
                        {getTypeLabel(dividend.type)}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {formatCurrency(dividend.rate)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
