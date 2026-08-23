import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WatchlistStockCardProps {
  ticker: string;
  price: number | null;
  change: number | null;
  dividendYield: number | null;
  pl: number | null;
  marketCap: number | null;
  onRemove: (ticker: string) => void;
  isRemoving?: boolean;
}

export function WatchlistStockCard({
  ticker,
  price,
  change,
  dividendYield,
  pl,
  marketCap,
  onRemove,
  isRemoving = false,
}: WatchlistStockCardProps) {
  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    const formatted = value.toFixed(2).replace(".", ",");
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const formatMarketCap = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    if (value >= 1e12) return `R$ ${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`;
    return `R$ ${value.toLocaleString("pt-BR")}`;
  };

  const getTrendIcon = (value: number | null) => {
    if (value === null || value === undefined) return <Minus className="h-4 w-4" />;
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getChangeColor = (value: number | null) => {
    if (value === null || value === undefined) return "text-muted-foreground";
    if (value > 0) return "text-emerald-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(ticker);
  };

  return (
    <Link to={`/ticker/${ticker.toUpperCase()}`}>
      <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group relative">
        <CardContent className="p-4">
          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
            onClick={handleRemoveClick}
            disabled={isRemoving}
          >
            <Star className="h-4 w-4 fill-primary text-primary" />
          </Button>

          <div className="flex items-center justify-between mb-3 pr-8">
            <div>
              <h3 className="font-bold text-lg">{ticker}</h3>
            </div>
            <div className={`flex items-center gap-1 ${getChangeColor(change)}`}>
              {getTrendIcon(change)}
              <span className="font-semibold text-sm">{formatPercent(change)}</span>
            </div>
          </div>

          <div className="text-2xl font-bold mb-3">{formatPrice(price)}</div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">DY:</span>{" "}
              <span className="font-medium">
                {dividendYield !== null ? `${dividendYield.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">P/L:</span>{" "}
              <span className="font-medium">
                {pl !== null ? pl.toFixed(2) : "—"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Valor de Mercado:</span>{" "}
              <span className="font-medium">{formatMarketCap(marketCap)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
