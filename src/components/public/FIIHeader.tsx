import { type FIIData } from "@/pages/PublicFII";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentFromDecimal } from "@/lib/format-utils";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FIIHeaderProps {
  data: FIIData;
}

export function FIIHeader({ data }: FIIHeaderProps) {
  const isPositive = (data.day_change_percent ?? 0) >= 0;
  
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      {/* Left side - Ticker and name */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{data.ticker}</h1>
            {data.nome_fundo && (
              <p className="text-muted-foreground">{data.nome_fundo}</p>
            )}
          </div>
        </div>
        
        {/* Fund type badges */}
        <div className="flex gap-2 mt-2">
          {data.tipo_fii && (
            <Badge variant="secondary">{data.tipo_fii}</Badge>
          )}
          {data.segmento && (
            <Badge variant="outline">{data.segmento}</Badge>
          )}
        </div>
      </div>

      {/* Right side - Price and variation */}
      <div className="text-right space-y-1">
        <div className="text-3xl font-bold">
          {formatCurrency(data.current_price)}
        </div>
        
        <div className={cn(
          "flex items-center justify-end gap-2 text-lg",
          isPositive ? "text-emerald-500" : "text-red-500"
        )}>
          {isPositive ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
          <span>
            {data.day_change != null && (
              <>
                {isPositive ? "+" : ""}
                {formatCurrency(data.day_change)}
              </>
            )}
            {data.day_change_percent != null && (
              <span className="ml-1">
                ({isPositive ? "+" : ""}{data.day_change_percent.toFixed(2)}%)
              </span>
            )}
          </span>
        </div>

        {/* 52 week range */}
        <div className="text-sm text-muted-foreground mt-2">
          <span>Mín. 52 sem: {formatCurrency(data.week_52_low)}</span>
          <span className="mx-2">|</span>
          <span>Máx. 52 sem: {formatCurrency(data.week_52_high)}</span>
        </div>

        {/* Year performance */}
        {data.year_change_percent != null && (
          <div className={cn(
            "text-sm",
            data.year_change_percent >= 0 ? "text-emerald-500" : "text-red-500"
          )}>
            Valorização 12 meses: {data.year_change_percent >= 0 ? "+" : ""}{data.year_change_percent.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}
