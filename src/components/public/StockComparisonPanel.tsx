import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IndicatorTooltip } from "@/components/public/IndicatorTooltip";
import { compareIndicatorValues } from "@/lib/indicator-metadata";
import type { Indicator } from "@/components/public/PublicIndicatorSection";
import type { StockPillarScores } from "@/lib/stock-pillars";
import { X } from "lucide-react";

function formatCell(indicator: Indicator, value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (indicator.format === "percent") return `${value.toFixed(2)}%`;
  if (indicator.format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  return value.toFixed(2);
}

export function StockComparisonPanel({
  baseTicker,
  compareTicker,
  baseScores,
  compareScores,
  baseIndicatorGroups,
  compareIndicatorGroups,
  onClear,
}: {
  baseTicker: string;
  compareTicker: string;
  baseScores: StockPillarScores | null;
  compareScores: StockPillarScores | null;
  baseIndicatorGroups: {
    valuation: Indicator[];
    performance: Indicator[];
    health: Indicator[];
    dividends: Indicator[];
  };
  compareIndicatorGroups: {
    valuation: Indicator[];
    performance: Indicator[];
    health: Indicator[];
    dividends: Indicator[];
  };
  onClear: () => void;
}) {
  const baseAll: Indicator[] = [
    ...baseIndicatorGroups.valuation,
    ...baseIndicatorGroups.performance,
    ...baseIndicatorGroups.health,
    ...baseIndicatorGroups.dividends,
  ];

  const compareAll: Indicator[] = [
    ...compareIndicatorGroups.valuation,
    ...compareIndicatorGroups.performance,
    ...compareIndicatorGroups.health,
    ...compareIndicatorGroups.dividends,
  ];

  const baseByLabel = new Map(baseAll.map((i) => [i.label, i] as const));
  const compareByLabel = new Map(compareAll.map((i) => [i.label, i] as const));
  const rows = Array.from(baseByLabel.values());

  return (
    <section className="mt-10" aria-label="Comparação de ações">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl">
                Comparação: {baseTicker} vs {compareTicker}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comparação completa com referências globais por indicador.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear} aria-label="Fechar comparação">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pilares */}
          <div className="grid gap-3 md:grid-cols-2">
            {([
              { key: "valuation", label: "Valuation" },
              { key: "performance", label: "Performance" },
              { key: "health", label: "Saúde Financeira" },
              { key: "dividends", label: "Dividendos" },
            ] as const).map((p) => {
              const a = baseScores?.[p.key]?.score;
              const b = compareScores?.[p.key]?.score;
              return (
                <div key={p.key} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{p.label}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{baseTicker}: {a ?? "—"}</Badge>
                      <Badge variant="outline">{compareTicker}: {b ?? "—"}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Tabela completa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Indicador</th>
                  <th className="py-2 pr-4 font-medium">{baseTicker}</th>
                  <th className="py-2 pr-4 font-medium">{compareTicker}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((indicator) => {
                  const base = baseByLabel.get(indicator.label)?.value;
                  const comp = compareByLabel.get(indicator.label)?.value;
                  const winner = compareIndicatorValues(indicator.label, base, comp);

                  const baseClass = winner === "a" ? "bg-accent/40" : "";
                  const compClass = winner === "b" ? "bg-accent/40" : "";

                  return (
                    <tr key={indicator.label} className="border-t border-border/60">
                      <td className="py-3 pr-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{indicator.label}</span>
                          <IndicatorTooltip label={indicator.label} />
                        </div>
                      </td>
                      <td className={`py-3 pr-4 align-top ${baseClass}`}>
                        {formatCell(indicator, base)}
                      </td>
                      <td className={`py-3 pr-4 align-top ${compClass}`}>
                        {formatCell(indicator, comp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
