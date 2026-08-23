import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IndicatorTooltip } from "@/components/public/IndicatorTooltip";
import { BarChart3 } from "lucide-react";

export interface Indicator {
  label: string;
  value: number | null | undefined;
  format: "number" | "percent" | "currency";
  tooltip?: string;
  indicatorKey?: string;
}

type CategoryColor = "orange" | "blue" | "green" | "purple" | "red" | "cyan";

interface PublicIndicatorSectionProps {
  title: string;
  icon: ReactNode;
  indicators: Indicator[];
  loading?: boolean;
  categoryColor?: CategoryColor;
  onIndicatorClick?: (indicator: Indicator) => void;
}

const colorClasses: Record<CategoryColor, { border: string; title: string; icon: string }> = {
  orange: {
    border: "border-l-orange-500",
    title: "text-orange-600 dark:text-orange-400",
    icon: "text-orange-500",
  },
  blue: {
    border: "border-l-blue-500",
    title: "text-blue-600 dark:text-blue-400",
    icon: "text-blue-500",
  },
  green: {
    border: "border-l-green-500",
    title: "text-green-600 dark:text-green-400",
    icon: "text-green-500",
  },
  purple: {
    border: "border-l-purple-500",
    title: "text-purple-600 dark:text-purple-400",
    icon: "text-purple-500",
  },
  red: {
    border: "border-l-red-500",
    title: "text-red-600 dark:text-red-400",
    icon: "text-red-500",
  },
  cyan: {
    border: "border-l-cyan-500",
    title: "text-cyan-600 dark:text-cyan-400",
    icon: "text-cyan-500",
  },
};

export function PublicIndicatorSection({
  title,
  icon,
  indicators,
  loading = false,
  categoryColor = "orange",
  onIndicatorClick,
}: PublicIndicatorSectionProps) {
  const isClickable = !!onIndicatorClick;
  const colors = colorClasses[categoryColor];

  const formatValue = (value: number | null | undefined, format: string) => {
    if (value === null || value === undefined) return "—";
    
    switch (format) {
      case "percent":
        // Database stores percentages as decimals (0.xx), multiply by 100 for display
        return `${(value * 100).toFixed(2)}%`;
      case "currency":
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      case "number":
      default:
        return value.toFixed(2);
    }
  };

  const getValueColor = (value: number | null | undefined, format: string) => {
    if (value === null || value === undefined) return "text-muted-foreground";
    
    // Para percentuais de crescimento/rentabilidade, verde se positivo
    if (format === "percent") {
      if (value > 0) return "text-green-600 dark:text-green-400";
      if (value < 0) return "text-red-600 dark:text-red-400";
    }
    
    return "text-foreground";
  };

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 text-lg md:text-xl font-bold uppercase tracking-wide ${colors.title}`}>
          <span className={colors.icon}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {indicators.map((indicator, index) => (
            <div 
              key={index} 
              className={`bg-muted/30 rounded-lg p-4 md:p-5 border border-border/50 hover:border-primary/50 hover:bg-muted/50 hover:shadow-md transition-all group relative ${
                isClickable ? "cursor-pointer" : ""
              }`}
              onClick={() => isClickable && onIndicatorClick(indicator)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onIndicatorClick(indicator);
                }
              }}
            >
              {/* Chart icon indicator for clickable cards */}
              {isClickable && (
                <BarChart3 className="absolute top-2 right-2 h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              )}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm md:text-base font-medium text-muted-foreground">
                  {indicator.label}
                </span>
                <IndicatorTooltip label={indicator.label} />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p
                  className={`text-2xl md:text-3xl font-bold ${getValueColor(
                    indicator.value,
                    indicator.format
                  )}`}
                >
                  {formatValue(indicator.value, indicator.format)}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
