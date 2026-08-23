import { Loader2 } from "lucide-react";

interface StockSuggestion {
  ticker: string;
  name: string;
  logo: string | null;
}

interface StockSearchSuggestionsProps {
  suggestions: StockSuggestion[];
  isLoading: boolean;
  onSelect: (ticker: string) => void;
  visible: boolean;
}

export function StockSearchSuggestions({
  suggestions,
  isLoading,
  onSelect,
  visible,
}: StockSearchSuggestionsProps) {
  if (!visible) return null;

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      {isLoading ? (
        <div className="flex items-center gap-2 p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Buscando empresas...</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="p-4 text-muted-foreground text-sm">
          Nenhuma empresa encontrada
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li key={suggestion.ticker}>
              <button
                type="button"
                onClick={() => onSelect(suggestion.ticker)}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
              >
                <img
                  src={suggestion.logo || `https://ui-avatars.com/api/?name=${suggestion.ticker}&background=random&size=32&bold=true&length=2`}
                  alt={suggestion.ticker}
                  className="h-8 w-8 rounded-lg object-contain bg-muted/50 p-1 border border-border/50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${suggestion.ticker}&background=random&size=32&bold=true&length=2`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{suggestion.ticker}</p>
                  <p className="text-sm text-muted-foreground truncate">{suggestion.name}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
