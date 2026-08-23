import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { getIndicatorMeta } from "@/lib/indicator-metadata";

export function IndicatorTooltip({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  const meta = getIndicatorMeta(label);
  if (!meta) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ? (
            <span className="inline-flex">{children}</span>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              aria-label={`O que é ${label}`}
            >
              <Info className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">{meta.label}</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground">O que é</p>
              <p className="text-sm">{meta.description}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Referência (global)</p>
              <p className="text-sm">{meta.reference}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Referências são heurísticas e podem variar por setor/ciclo.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
