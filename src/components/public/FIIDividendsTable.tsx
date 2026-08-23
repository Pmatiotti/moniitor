import { useMemo, useState } from "react";
import { type FIIData } from "@/pages/PublicFII";
import { formatCurrency } from "@/lib/format-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FIIDividendsTableProps {
  data: FIIData;
}

const PAGE_SIZE = 12;

export function FIIDividendsTable({ data }: FIIDividendsTableProps) {
  const [showAll, setShowAll] = useState(false);

  const dividends = useMemo(() => {
    if (!data.dividends) return [];
    
    // Sort by payment date descending
    return [...data.dividends].sort(
      (a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime()
    );
  }, [data.dividends]);

  const displayedDividends = showAll ? dividends : dividends.slice(0, PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const calculateYield = (valor: number, cotacao: number | null | undefined) => {
    if (!cotacao || cotacao <= 0) return null;
    return (valor / cotacao) * 100;
  };

  if (dividends.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Sem histórico de proventos disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Data com</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Cotação</TableHead>
              <TableHead className="text-right">Valor (R$)</TableHead>
              <TableHead className="text-right">Yield (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedDividends.map((div, index) => {
              const yieldPercent = calculateYield(div.valor_por_cota, div.cotacao_data_base);
              
              return (
                <TableRow key={`${div.data_pagamento}-${index}`}>
                  <TableCell className="font-medium">{div.tipo}</TableCell>
                  <TableCell>{formatDate(div.data_base)}</TableCell>
                  <TableCell>{formatDate(div.data_pagamento)}</TableCell>
                  <TableCell className="text-right">
                    {div.cotacao_data_base ? formatCurrency(div.cotacao_data_base) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(div.valor_por_cota)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-500 font-medium">
                    {yieldPercent != null ? `${yieldPercent.toFixed(2)}%` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {dividends.length > PAGE_SIZE && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver todos ({dividends.length} pagamentos)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
