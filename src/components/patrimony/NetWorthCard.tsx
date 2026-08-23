import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetWorthCardProps {
  totalAssets: number;
  totalInvestments: number;
  totalLiabilities: number;
}

export const NetWorthCard = ({
  totalAssets,
  totalInvestments,
  totalLiabilities,
}: NetWorthCardProps) => {
  const totalGrossAssets = totalAssets + totalInvestments;
  const netWorth = totalGrossAssets - totalLiabilities;
  const isPositive = netWorth >= 0;
  const liabilityRatio = totalGrossAssets > 0 
    ? (totalLiabilities / totalGrossAssets) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4 items-center text-center">
          {/* Total Assets */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Ativos</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(totalGrossAssets)}
            </p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Patrimônio: {formatCurrency(totalAssets)}</p>
              <p>Investimentos: {formatCurrency(totalInvestments)}</p>
            </div>
          </div>

          {/* Minus Sign */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Minus className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Total Liabilities */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">Passivos</span>
            </div>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(totalLiabilities)}
            </p>
            {liabilityRatio > 0 && (
              <p className="text-xs text-muted-foreground">
                {liabilityRatio.toFixed(1)}% dos ativos
              </p>
            )}
          </div>
        </div>

        {/* Net Worth - Destacado */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Patrimônio Líquido
            </p>
            <p
              className={cn(
                "text-3xl font-bold",
                isPositive ? "text-primary" : "text-destructive"
              )}
            >
              {formatCurrency(netWorth)}
            </p>
            {!isPositive && (
              <p className="text-xs text-destructive mt-1">
                Atenção: passivos excedem ativos
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
