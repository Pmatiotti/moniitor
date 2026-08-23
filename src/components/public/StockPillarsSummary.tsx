import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { IndicatorTooltip } from "@/components/public/IndicatorTooltip";

type PillarTone = "positive" | "neutral" | "negative";

export interface StockPillarSummary {
  key: "valuation" | "performance" | "financial_health" | "dividends";
  title: string;
  tone: PillarTone;
  score?: number; // Novo: score 0-100
  highlights: Array<{ label: string; value: string }>;
}

const toneMeta: Record<PillarTone, { label: string; badgeClass: string }> = {
  positive: { label: "Bom", badgeClass: "bg-green-500/10 text-green-600 border-green-500/20" },
  neutral: { label: "Neutro", badgeClass: "bg-muted text-foreground border-border" },
  negative: { label: "Atenção", badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
};

const getScoreTone = (score: number | undefined): PillarTone => {
  if (score === undefined || score === null) return "neutral";
  if (score >= 70) return "positive";
  if (score >= 40) return "neutral";
  return "negative";
};

export function StockPillarsSummary({
  items,
}: {
  items: StockPillarSummary[];
}) {
  return (
    <section aria-label="Resumo da análise" className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Análise por Pilares</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-sm">
                Scores calculados com base nos indicadores fundamentalistas. 
                0-40: Atenção · 40-70: Neutro · 70-100: Bom
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const tone = item.score !== undefined ? getScoreTone(item.score) : item.tone;
          const meta = toneMeta[tone];
          return (
            <Card key={item.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg font-bold">
                    {item.title}
                  </CardTitle>
                  {item.score !== undefined && (
                    <Badge variant="outline" className={meta.badgeClass}>
                      {item.score}/100
                    </Badge>
                  )}
                </div>
                {item.score !== undefined && (
                  <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        tone === "positive" ? "bg-green-500" : 
                        tone === "neutral" ? "bg-yellow-500" : "bg-orange-500"
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {item.highlights.map((h, idx) => (
                  <div
                    key={`${item.key}-${idx}`}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                      {h.label}
                      <IndicatorTooltip label={h.label} />
                    </span>
                    <span className="text-base font-medium text-foreground">{h.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
