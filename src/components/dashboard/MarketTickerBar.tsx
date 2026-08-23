import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, RefreshCw, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

const formatPrice = (price: number, symbol: string): string => {
  if (symbol === 'SELIC' || symbol === 'IPCA') {
    return `${price.toFixed(2)}%`;
  }
  if (symbol === 'BTC' || symbol === 'ETH') {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  if (symbol === 'IBOV' || symbol === 'IFIX' || symbol === 'S&P500' || symbol === 'NASDAQ') {
    return price.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
  if (symbol === 'USD' || symbol === 'EUR') {
    return `R$ ${price.toFixed(4)}`;
  }
  if (symbol === 'GOLD') {
    return `$ ${price.toFixed(2)}`;
  }
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getSymbolOrder = (symbol: string): number => {
  const order: Record<string, number> = {
    'USD': 1,
    'EUR': 2,
    'BTC': 3,
    'ETH': 4,
    'GOLD': 5,
    'S&P500': 6,
    'NASDAQ': 7,
    'IBOV': 8,
    'IFIX': 9,
    'SELIC': 10,
    'IPCA': 11,
  };
  return order[symbol] || 99;
};

export const MarketTickerBar = () => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-market-ticker');
      
      if (error) throw error;
      
      if (data?.quotes) {
        const sortedQuotes = [...data.quotes].sort(
          (a, b) => getSymbolOrder(a.symbol) - getSymbolOrder(b.symbol)
        );
        setQuotes(sortedQuotes);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error fetching market ticker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-center">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando cotações...</span>
      </div>
    );
  }

  if (quotes.length === 0) {
    return null;
  }

  const QuoteItem = ({ quote, index }: { quote: QuoteData; index: number }) => (
    <div 
      key={`${quote.symbol}-${index}`}
      className="flex items-center gap-2 shrink-0"
    >
      <span className="font-medium text-sm">{quote.name}</span>
      <span className="text-sm font-semibold">
        {formatPrice(quote.price, quote.symbol)}
      </span>
      {quote.symbol !== 'SELIC' && quote.symbol !== 'IPCA' && (
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            quote.changePercent > 0 && "text-green-600 dark:text-green-400",
            quote.changePercent < 0 && "text-red-600 dark:text-red-400",
            quote.changePercent === 0 && "text-muted-foreground"
          )}
        >
          {quote.changePercent > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : quote.changePercent < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span>
            {quote.changePercent > 0 ? '+' : ''}
            {quote.changePercent.toFixed(2)}%
          </span>
        </div>
      )}
      <span className="text-muted-foreground/30 mx-2">|</span>
    </div>
  );

  return (
    <div className="bg-muted/30 border-b w-full max-w-full overflow-hidden" style={{ contain: 'layout style paint' }}>
      <div className="w-full max-w-full overflow-hidden">
        <div className="inline-flex animate-marquee hover:pause-animation" style={{ willChange: 'transform' }}>
          {/* First set of quotes */}
          <div className="flex items-center gap-6 px-4 py-2 whitespace-nowrap shrink-0">
            {quotes.map((quote, index) => (
              <QuoteItem key={`first-${quote.symbol}-${index}`} quote={quote} index={index} />
            ))}
          </div>
          {/* Duplicate for seamless loop */}
          <div className="flex items-center gap-6 px-4 py-2 whitespace-nowrap shrink-0">
            {quotes.map((quote, index) => (
              <QuoteItem key={`second-${quote.symbol}-${index}`} quote={quote} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
