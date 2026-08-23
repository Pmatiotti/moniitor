import { TrendingUp, TrendingDown } from "lucide-react";

interface StockHeaderProps {
  metrics: any;
  fundamentalData: any;
  formatCurrency: (value?: number) => string;
  formatPercent: (value?: number) => string;
  formatMarketCap: (value?: number) => string;
}

export const StockHeader = ({ 
  metrics, 
  fundamentalData,
  formatCurrency,
  formatPercent,
  formatMarketCap
}: StockHeaderProps) => {
  if (!metrics && !fundamentalData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Clique em "Atualizar" para carregar os dados
      </div>
    );
  }

  const currentPrice = fundamentalData?.current_price;
  const dayChange = fundamentalData?.day_change_percent;
  const marketCap = metrics?.market_cap || fundamentalData?.market_cap;
  const dividendYield = metrics?.dividend_yield || fundamentalData?.dividend_yield;
  const peRatio = metrics?.price_to_earnings || fundamentalData?.pe_ratio;
  const evEbitda = metrics?.ev_to_ebitda;
  const roe = metrics?.roe || fundamentalData?.roe;
  const netMargin = metrics?.net_margin || fundamentalData?.profit_margin;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
      {/* Preço */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Preço</p>
        <p className="text-2xl font-bold">{formatCurrency(currentPrice)}</p>
        {dayChange !== undefined && dayChange !== null && (
          <p className={`text-sm flex items-center gap-1 ${dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {dayChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {formatPercent(dayChange)}
          </p>
        )}
      </div>

      {/* Market Cap */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Market Cap</p>
        <p className="text-lg font-semibold">{formatMarketCap(marketCap)}</p>
      </div>

      {/* Dividend Yield */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Dividend Yield</p>
        <p className="text-lg font-semibold">{formatPercent(dividendYield)}</p>
      </div>

      {/* P/L */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">P/L</p>
        <p className="text-lg font-semibold">{peRatio ? peRatio.toFixed(2) : '-'}</p>
      </div>

      {/* EV/EBITDA */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">EV/EBITDA</p>
        <p className="text-lg font-semibold">{evEbitda ? evEbitda.toFixed(2) : '-'}</p>
      </div>

      {/* ROE */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">ROE</p>
        <p className="text-lg font-semibold">{formatPercent(roe)}</p>
      </div>

      {/* Margem Líquida */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Margem Líquida</p>
        <p className="text-lg font-semibold">{formatPercent(netMargin)}</p>
      </div>
    </div>
  );
};