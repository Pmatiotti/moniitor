import { TrendingUp, TrendingDown, Minus, Clock, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrencyCompact } from "@/lib/format-utils";

interface PublicStockHeaderProps {
  ticker: string;
  currentPrice: number | null;
  dayChangePercent: number | null;
  marketCap: number | null;
  updatedAt: string | null;
  isLiveData?: boolean;
  logoUrl?: string | null;
}

export function PublicStockHeader({
  ticker,
  currentPrice,
  dayChangePercent,
  marketCap,
  updatedAt,
  logoUrl,
}: PublicStockHeaderProps) {
  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const formatMarketCap = (value: number | null) => {
    return formatCurrencyCompact(value);
  };

  const getTrendIcon = () => {
    if (dayChangePercent === null || dayChangePercent === undefined) {
      return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
    if (dayChangePercent > 0) {
      return <TrendingUp className="h-5 w-5 text-green-500" />;
    }
    if (dayChangePercent < 0) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getChangeColor = () => {
    if (dayChangePercent === null || dayChangePercent === undefined) {
      return "text-muted-foreground";
    }
    if (dayChangePercent > 0) return "text-green-500";
    if (dayChangePercent < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getChangeBgColor = () => {
    if (dayChangePercent === null || dayChangePercent === undefined) {
      return "bg-muted";
    }
    if (dayChangePercent > 0) return "bg-green-500/10";
    if (dayChangePercent < 0) return "bg-red-500/10";
    return "bg-muted";
  };

  // Check if we're within trading hours (10:00 - 18:00 BRT)
  const isWithinTradingHours = () => {
    const now = new Date();
    const brtOffset = -3;
    const utcHours = now.getUTCHours();
    const brtHours = (utcHours + brtOffset + 24) % 24;
    return brtHours >= 10 && brtHours < 18;
  };

  const renderTimestamp = () => {
    if (isWithinTradingHours() && updatedAt) {
      return (
        <div className="flex items-center gap-1 whitespace-nowrap text-foreground/70">
          <Clock className="h-4 w-4 text-foreground/60" />
          <span className="font-medium">
            Atualizado em{" "}
            {format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 whitespace-nowrap text-foreground/70">
        <Clock className="h-4 w-4 text-foreground/60" />
        <span className="font-medium">Preço base do último fechamento</span>
      </div>
    );
  };

  // Build logo URL from ticker (TheFintz repository - high quality B3 logos)
  const getBaseTickerForLogo = (t: string) => t.replace(/\d+$/, '').toUpperCase();
  const primaryLogoUrl = `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${getBaseTickerForLogo(ticker)}.png`;
  const fallbackLogoUrl = `https://ui-avatars.com/api/?name=${ticker}&background=6366f1&color=fff&size=64&bold=true&length=2`;
  const effectiveLogoUrl = logoUrl || primaryLogoUrl;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage 
            src={effectiveLogoUrl} 
            alt={`Logo ${ticker}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackLogoUrl;
            }}
          />
          <AvatarFallback className="bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold text-foreground">{ticker}</h1>
        <Badge variant="secondary" className="text-xs">
          Ação
        </Badge>
      </div>

      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <span className="text-3xl font-bold text-foreground">
          {formatPrice(currentPrice)}
        </span>
        
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${getChangeBgColor()}`}>
          {getTrendIcon()}
          <span className={`font-semibold text-sm ${getChangeColor()}`}>
            {formatPercent(dayChangePercent)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4 text-xs text-foreground/70">
        <div className="flex flex-col gap-0.5 w-fit">
          <div>
            <span className="font-medium text-foreground">Market Cap:</span>{" "}
            <span className="text-foreground font-medium">{formatMarketCap(marketCap)}</span>
          </div>

          {renderTimestamp()}
        </div>
      </div>
    </div>
  );
}
