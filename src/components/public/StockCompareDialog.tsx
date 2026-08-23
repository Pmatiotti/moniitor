import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StockSearchSuggestions } from "@/components/public/StockSearchSuggestions";
import { Loader2, Search, X } from "lucide-react";

interface StockSuggestion {
  ticker: string;
  name: string;
  logo: string | null;
}

export function StockCompareDialog({
  open,
  onOpenChange,
  baseTicker,
  onCompare,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseTicker: string;
  onCompare: (ticker: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const looksLikeTicker = (term: string): boolean => {
    const trimmed = term.trim().toUpperCase();
    return /^[A-Z]{3,6}\d{1,2}$/.test(trimmed);
  };

  const searchByName = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-stocks", {
        body: { query: q },
      });
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
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const t = setTimeout(() => {
      if (!looksLikeTicker(query)) searchByName(query.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [open, query, searchByName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirm = (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    if (t === baseTicker.toUpperCase()) return;
    onCompare(t);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comparar com outra ação</DialogTitle>
        </DialogHeader>

        <div ref={containerRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ticker ou nome (ex: PETR4 ou Petrobras)"
            className="pl-10 pr-10"
            onFocus={() => {
              if (suggestions.length > 0 && !looksLikeTicker(query)) setShowSuggestions(true);
            }}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <StockSearchSuggestions
            suggestions={suggestions}
            isLoading={isSearching}
            onSelect={(t) => handleConfirm(t)}
            visible={showSuggestions && !looksLikeTicker(query)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Comparando com: <span className="font-semibold text-foreground">{baseTicker}</span>
          </p>
          <Button
            onClick={() => handleConfirm(query)}
            disabled={!looksLikeTicker(query) || query.trim().toUpperCase() === baseTicker.toUpperCase()}
          >
            Comparar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
