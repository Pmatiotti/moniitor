import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { StockSearchSuggestions } from "./StockSearchSuggestions";
import { useDebounce } from "@/hooks/useDebounce";

interface StockSuggestion {
  ticker: string;
  name: string;
  logo: string | null;
}

interface QuickStockSearchProps {
  currentTicker?: string;
}

export function QuickStockSearch({ currentTicker }: QuickStockSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Search logic
  useEffect(() => {
    const search = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const term = debouncedSearch.toUpperCase();

      try {
        // Check if it's a ticker-like search (letters + optional numbers)
        const isTickerSearch = /^[A-Z]{4}\d*$/.test(term);

        if (isTickerSearch) {
          // Search by ticker prefix
          const { data: dbResults } = await supabase
            .from("fundamental_data")
            .select("ticker")
            .in("asset_class", ["acoes", "Ação", "Ações", "Renda Variável"])
            .ilike("ticker", `${term}%`)
            .limit(8);

          if (dbResults && dbResults.length > 0) {
            setSuggestions(
              dbResults.map((r) => ({
                ticker: r.ticker,
                name: r.ticker,
                logo: `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${r.ticker}.png`,
              }))
            );
          } else {
            // Try via edge function
            const { data: liveData } = await supabase.functions.invoke("search-stocks", {
              body: { query: term },
            });

            if (liveData?.results) {
              setSuggestions(
                liveData.results.slice(0, 8).map((r: any) => ({
                  ticker: r.ticker || r.stock,
                  name: r.name || r.ticker || r.stock,
                  logo: `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${r.ticker || r.stock}.png`,
                }))
              );
            } else {
              setSuggestions([]);
            }
          }
        } else {
          // Search by company name
          const { data: liveData } = await supabase.functions.invoke("search-stocks", {
            body: { query: debouncedSearch },
          });

          if (liveData?.results) {
            setSuggestions(
              liveData.results.slice(0, 8).map((r: any) => ({
                ticker: r.ticker || r.stock,
                name: r.name || r.ticker || r.stock,
                logo: `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${r.ticker || r.stock}.png`,
              }))
            );
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar ações:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedSearch]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (ticker: string) => {
      if (ticker.toUpperCase() !== currentTicker?.toUpperCase()) {
        navigate(`/ticker/${ticker.toUpperCase()}`);
      }
      setSearchTerm("");
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [currentTicker, navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && suggestions.length > 0) {
      handleSelect(suggestions[0].ticker);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar ação..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 text-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <StockSearchSuggestions
        suggestions={suggestions}
        isLoading={isSearching}
        onSelect={handleSelect}
        visible={showSuggestions && (isSearching || searchTerm.length >= 2)}
      />
    </div>
  );
}
