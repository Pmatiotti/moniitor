import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  Loader2, 
  BarChart3,
  Zap,
  X,
  Star
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicStockNavbar } from "@/components/layout/PublicStockNavbar";
import { StockSearchSuggestions } from "@/components/public/StockSearchSuggestions";
import { WatchlistStockCard } from "@/components/public/WatchlistStockCard";
import { useToast } from "@/hooks/use-toast";

interface StockListItem {
  ticker: string;
  current_price: number | null;
  day_change_percent: number | null;
  dividend_yield: number | null;
  p_l: number | null;
  market_cap: number | null;
  is_live_data?: boolean;
}

interface StockSuggestion {
  ticker: string;
  name: string;
  logo: string | null;
}

interface WatchlistItem {
  ticker: string;
  asset_class: string;
}

const B3_SEED_TICKERS: string[] = [
  "PETR4",
  "VALE3",
  "ITUB4",
  "BBDC4",
  "BBAS3",
  "ABEV3",
  "WEGE3",
  "MGLU3",
  "B3SA3",
  "SUZB3",
  "PRIO3",
  "ELET3",
  "ELET6",
  "BPAC11",
  "RENT3",
  "RAIL3",
  "LREN3",
  "JBSS3",
  "GGBR4",
  "CSNA3",
  "CPLE3",
  "EGIE3",
  "TAEE11",
  "SANB11",
 ];

export default function PublicStockList() {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Watchlist states
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [watchlistStocks, setWatchlistStocks] = useState<StockListItem[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);
  const [removingTicker, setRemovingTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Random 4x3 grid (12 items) per route visit
  const [randomStocks, setRandomStocks] = useState<StockListItem[]>([]);
  const baseStocksRef = useRef<StockListItem[]>([]);
  const lastVisitKeyRef = useRef<string | null>(null);
  
  // New states for name search
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingNames, setIsSearchingNames] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const location = useLocation();
  const { toast } = useToast();

  const QUOTE_TTL_MS = 15 * 60 * 1000; // 15 minutos

  const getQuoteTTLKey = useCallback((ticker: string) => {
    return `public_stock_list_quote_last_fetch_${ticker.toUpperCase()}`;
  }, []);

  const shouldFetchLiveForTicker = useCallback(
    (ticker: string) => {
      const key = getQuoteTTLKey(ticker);
      const now = Date.now();
      try {
        const last = Number(localStorage.getItem(key));
        if (!Number.isFinite(last) || last <= 0) return true;
        return now - last > QUOTE_TTL_MS;
      } catch {
        return true;
      }
    },
    [QUOTE_TTL_MS, getQuoteTTLKey]
  );

  const markLiveFetched = useCallback(
    (ticker: string) => {
      const key = getQuoteTTLKey(ticker);
      try {
        localStorage.setItem(key, String(Date.now()));
      } catch {
        // ignore
      }
    },
    [getQuoteTTLKey]
  );

  const pickRandomSubset = useCallback((items: StockListItem[], count: number) => {
    const copy = [...items];
    // Fisher–Yates shuffle
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(count, copy.length));
  }, []);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch watchlist when user is authenticated
  const fetchWatchlist = useCallback(async () => {
    if (!userId) return;
    
    setLoadingWatchlist(true);
    try {
      // Fetch watchlist items
      const { data: watchlist, error: watchlistError } = await supabase
        .from("user_watchlists")
        .select("ticker, asset_class")
        .eq("user_id", userId);

      if (watchlistError) throw watchlistError;

      setWatchlistItems(watchlist || []);

      if (!watchlist || watchlist.length === 0) {
        setWatchlistStocks([]);
        setLoadingWatchlist(false);
        return;
      }

      // Fetch stock data for watchlist tickers
      const tickers = watchlist.map(w => w.ticker.toUpperCase());
      const { data: stocksData, error: stocksError } = await supabase
        .from("fundamental_data")
        .select("ticker, current_price, day_change_percent, dividend_yield, p_l, market_cap")
        .in("ticker", tickers);

      if (stocksError) throw stocksError;

      // Map the data, maintaining watchlist order
      const stocksMap = new Map<string, StockListItem>();
      (stocksData || []).forEach(s => stocksMap.set(s.ticker.toUpperCase(), s));

      const orderedStocks: StockListItem[] = tickers.map(ticker => {
        const stock = stocksMap.get(ticker);
        if (stock) return stock;
        // Placeholder for stocks not in fundamental_data
        return {
          ticker,
          current_price: null,
          day_change_percent: null,
          dividend_yield: null,
          p_l: null,
          market_cap: null,
        };
      });

      setWatchlistStocks(orderedStocks);
    } catch (err) {
      console.error("Erro ao buscar watchlist:", err);
    } finally {
      setLoadingWatchlist(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchWatchlist();
    }
  }, [userId, fetchWatchlist]);

  // Remove from watchlist
  const handleRemoveFromWatchlist = async (ticker: string) => {
    if (!userId) return;

    setRemovingTicker(ticker);
    try {
      const { error } = await supabase
        .from("user_watchlists")
        .delete()
        .eq("user_id", userId)
        .eq("ticker", ticker.toUpperCase());

      if (error) throw error;

      // Update local state
      setWatchlistItems(prev => prev.filter(w => w.ticker.toUpperCase() !== ticker.toUpperCase()));
      setWatchlistStocks(prev => prev.filter(s => s.ticker.toUpperCase() !== ticker.toUpperCase()));
      
      toast({ title: "Removido da watchlist" });
    } catch (err: any) {
      console.error("Erro ao remover da watchlist:", err);
      toast({
        title: "Erro",
        description: "Não foi possível remover da watchlist.",
        variant: "destructive",
      });
    } finally {
      setRemovingTicker(null);
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("fundamental_data")
        .select("ticker, current_price, day_change_percent, dividend_yield, p_l, market_cap")
        // Só B3: usar a classe canônica do robô (acoes) e manter compatibilidade com legados PT.
        // IMPORTANT: NÃO incluir 'stock' aqui para não misturar registros de exterior/legacy.
        .in("asset_class", ["acoes", "Ação", "Ações", "Renda Variável"])
        .order("ticker", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Erro ao buscar ações:", error);
      } else {
        const list = (data as StockListItem[]) || [];

        // Se o banco ainda não tem volume suficiente, "seedar" tickers B3 via BRAPI e cachear.
        const shouldSeed = list.length < 12;
        let merged = list;

        if (shouldSeed) {
          const missingSeedTickers = B3_SEED_TICKERS.filter((t) => {
            const exists = list.some((s) => s.ticker.toUpperCase() === t);
            return !exists && shouldFetchLiveForTicker(t);
          }).slice(0, 12);

          if (missingSeedTickers.length) {
            const results = await Promise.all(
              missingSeedTickers.map(async (t) => {
                try {
                  const { data: live, error: liveError } = await supabase.functions.invoke(
                    "fetch-public-stock",
                    { body: { ticker: t, saveToCache: true } }
                  );

                  if (liveError || !live || live?.error) return null;
                  markLiveFetched(t);
                  return { ...live, is_live_data: true } as StockListItem;
                } catch {
                  return null;
                }
              })
            );

            const seeded = results.filter(Boolean) as StockListItem[];
            if (seeded.length) {
              // Coloca seeded na frente para aparecerem logo na vitrine
              const byTicker = new Map<string, StockListItem>();
              [...seeded, ...merged].forEach((s) => byTicker.set(s.ticker.toUpperCase(), s));
              merged = Array.from(byTicker.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
            }
          }
        }

        baseStocksRef.current = merged;
        setStocks(merged);
      }
      setLoading(false);
    };

    fetchStocks();
  }, [markLiveFetched, shouldFetchLiveForTicker]);

  // Re-randomize when the user *visits* /acoes (route entry)
  useEffect(() => {
    if (location.pathname !== "/acoes") return;

    // When navigating to the same route again, react-router changes location.key.
    if (lastVisitKeyRef.current === location.key) return;

    const base = baseStocksRef.current;
    if (!base.length) return;

    lastVisitKeyRef.current = location.key;
    setRandomStocks(pickRandomSubset(base, 12));
  }, [location.key, location.pathname, pickRandomSubset]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if search term looks like a ticker (ends with number or is all caps with number)
  const looksLikeTicker = (term: string): boolean => {
    const trimmed = term.trim().toUpperCase();
    // Matches patterns like: PETR4, VALE3, HGLG11, RECV3
    return /^[A-Z]{3,6}\d{1,2}$/.test(trimmed);
  };

  // Search for stock by ticker (direct fetch)
  const searchByTicker = useCallback(async (ticker: string) => {
    const tickerToSearch = ticker.toUpperCase().trim();
    
    const exists = stocks.find(s => s.ticker.toUpperCase() === tickerToSearch);
    if (exists) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-public-stock",
        { body: { ticker: tickerToSearch, saveToCache: true } }
      );

      if (error) {
        console.error("Error fetching from BRAPI:", error);
        setSearchError("Erro ao buscar ação");
      } else if (data && !data.error) {
        markLiveFetched(tickerToSearch);
        setStocks(prev => {
          const filtered = prev.filter(s => s.ticker.toUpperCase() !== tickerToSearch);
          return [{ ...data, is_live_data: true }, ...filtered];
        });
      } else if (data?.error) {
        setSearchError("Ação não encontrada");
      }
    } catch (err) {
      console.error("Error searching:", err);
      setSearchError("Erro ao buscar ação");
    } finally {
      setIsSearching(false);
    }
  }, [stocks, markLiveFetched]);

  // Search by company name
  const searchByName = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingNames(true);
    setShowSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "search-stocks",
        { body: { query } }
      );

      if (error) {
        console.error("Error searching by name:", error);
        setSuggestions([]);
      } else if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Error in name search:", err);
      setSuggestions([]);
    } finally {
      setIsSearchingNames(false);
    }
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(async (ticker: string) => {
    setShowSuggestions(false);
    setSearchTerm(ticker);
    setSuggestions([]);
    
    // Fetch the stock data
    await searchByTicker(ticker);
  }, [searchByTicker]);

  // Debounce effect for search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchError(null);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      if (looksLikeTicker(searchTerm)) {
        // Direct ticker search
        setShowSuggestions(false);
        searchByTicker(searchTerm);
      } else {
        // Name search with suggestions
        searchByName(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchByTicker, searchByName]);

  // Filter stocks locally
  const filteredStocks = stocks.filter((stock) =>
    stock.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSearchActive = searchTerm.trim().length > 0;
  const displayStocks = isSearchActive
    ? filteredStocks
    : (randomStocks.length ? randomStocks : baseStocksRef.current.slice(0, 12));

  // Fallback automático de preço na vitrine (TTL 15min) para itens exibidos sem preço.
  useEffect(() => {
    if (!displayStocks.length) return;

    const tickersToFix = displayStocks
      .filter((s) => (s.current_price === null || s.current_price === undefined) && shouldFetchLiveForTicker(s.ticker))
      .map((s) => s.ticker.toUpperCase());

    if (!tickersToFix.length) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        tickersToFix.map(async (t) => {
          try {
            const { data: live, error: liveError } = await supabase.functions.invoke(
              "fetch-public-stock",
              { body: { ticker: t, saveToCache: true } }
            );
            if (liveError || !live || live?.error) return null;
            markLiveFetched(t);
            return { ...live, is_live_data: true } as StockListItem;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const updates = results.filter(Boolean) as StockListItem[];
      if (!updates.length) return;

      setStocks((prev) => {
        const byTicker = new Map(prev.map((s) => [s.ticker.toUpperCase(), s]));
        updates.forEach((u) => byTicker.set(u.ticker.toUpperCase(), { ...byTicker.get(u.ticker.toUpperCase()), ...u }));
        const merged = Array.from(byTicker.values());
        baseStocksRef.current = merged;
        return merged;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [displayStocks, markLiveFetched, shouldFetchLiveForTicker]);

  // Format helpers
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "R$ -";
    return `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatMarketCap = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    if (value >= 1e12) return `R$ ${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`;
    return `R$ ${value.toLocaleString("pt-BR")}`;
  };

  const getTrendIcon = (change: number | null) => {
    if (change === null || change === undefined) return <Minus className="h-5 w-5 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getChangeColor = (change: number | null) => {
    if (change === null || change === undefined) return "text-muted-foreground";
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  // Loading skeleton while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-16 w-full" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderStockCard = (stock: StockListItem) => (
    <Link key={stock.ticker} to={`/acoes/${stock.ticker.toLowerCase()}`}>
      <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={`https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${stock.ticker.replace(/\d+$/, '')}.png`}
                alt={stock.ticker}
                className="h-12 w-12 rounded-xl object-contain bg-muted/50 p-1.5 shadow-sm border border-border/50"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${stock.ticker}&background=random&size=48&bold=true&length=2`;
                }}
              />
              <CardTitle className="text-xl font-bold">{stock.ticker}</CardTitle>
              {stock.is_live_data && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500 text-amber-600">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  Novo
                </Badge>
              )}
            </div>
            {getTrendIcon(stock.day_change_percent)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold">{formatPrice(stock.current_price)}</p>
              <p className={`text-sm font-medium ${getChangeColor(stock.day_change_percent)}`}>
                {formatPercent(stock.day_change_percent)}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {stock.dividend_yield !== null && stock.dividend_yield !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  DY: {stock.dividend_yield.toFixed(2)}%
                </Badge>
              )}
              {stock.p_l !== null && stock.p_l !== undefined && (
                <Badge variant="outline" className="text-xs">
                  P/L: {stock.p_l.toFixed(1)}
                </Badge>
              )}
            </div>
            
            {stock.market_cap !== null && (
              <p className="text-xs text-muted-foreground pt-1">
                Mkt Cap: {formatMarketCap(stock.market_cap)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const renderAllStocksContent = () => (
    <>
      {/* Search */}
      <div ref={searchContainerRef} className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ticker ou nome (ex: PETR4 ou Petrobras)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 && !looksLikeTicker(searchTerm)) {
              setShowSuggestions(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {(isSearching || isSearchingNames) && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {searchTerm && !isSearching && !isSearchingNames && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Suggestions dropdown */}
        <StockSearchSuggestions
          suggestions={suggestions}
          isLoading={isSearchingNames}
          onSelect={handleSelectSuggestion}
          visible={showSuggestions && !looksLikeTicker(searchTerm)}
        />
      </div>
      
      {/* Search status */}
      {searchError && !isSearching && searchTerm.length >= 3 && (
        <div className="mb-4 text-sm text-amber-600">
          {searchError}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : displayStocks.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhuma ação encontrada" : "Nenhuma ação disponível"}
          </p>
          {searchTerm && !looksLikeTicker(searchTerm) && (
            <p className="text-sm text-muted-foreground mt-2">
              Tente buscar pelo nome da empresa ou ticker
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayStocks.map(renderStockCard)}
        </div>
      )}
    </>
  );

  const renderWatchlistContent = () => (
    <>
      {loadingWatchlist ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : watchlistStocks.length === 0 ? (
        <div className="text-center py-16">
          <Star className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sua watchlist está vazia</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Adicione ações à sua watchlist clicando no ícone de estrela na página de detalhes de cada ação.
          </p>
          <button
            onClick={() => setActiveTab("all")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
          >
            Explorar ações
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {watchlistStocks.map((stock) => (
            <WatchlistStockCard
              key={stock.ticker}
              ticker={stock.ticker}
              price={stock.current_price}
              change={stock.day_change_percent}
              dividendYield={stock.dividend_yield}
              pl={stock.p_l}
              marketCap={stock.market_cap}
              onRemove={handleRemoveFromWatchlist}
              isRemoving={removingTicker === stock.ticker}
            />
          ))}
        </div>
      )}
    </>
  );

  const content = (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Ações B3</h1>
        </div>
        <p className="text-muted-foreground">
          Dados fundamentalistas de ações e FIIs brasileiros
        </p>
      </div>

      {/* Tabs - only show if authenticated */}
      {isAuthenticated ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Todas as Ações
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="gap-2">
              <Star className="h-4 w-4" />
              Minha Watchlist
              {watchlistItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {watchlistItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderAllStocksContent()}
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0">
            {renderWatchlistContent()}
          </TabsContent>
        </Tabs>
      ) : (
        renderAllStocksContent()
      )}
    </div>
  );

  // Render with or without app layout
  if (isAuthenticated) {
    return <AppLayout>{content}</AppLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicStockNavbar />
      {content}
      
      {/* CTA for non-authenticated users */}
      <div className="border-t bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Quer acompanhar seu portfólio completo?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Crie sua conta gratuita e tenha acesso a análises, alertas e muito mais.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
          >
            Criar conta grátis
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Moniitor. Todos os direitos reservados.</p>
          <p className="mt-1">Dados fornecidos por BRAPI. Não constitui recomendação de investimento.</p>
        </div>
      </footer>
    </div>
  );
}
