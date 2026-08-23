import { type FIIData } from "@/pages/PublicFII";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FIIDividendsSectionProps {
  data: FIIData;
}

export function FIIDividendsSection({ data }: FIIDividendsSectionProps) {
  // Calculate yield on last dividend
  const lastDividendYield = data.current_price > 0 && data.ultimo_dividendo
    ? (data.ultimo_dividendo / data.current_price) * 100
    : null;

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" });
  };

  // Calculate year-to-date performance
  const ytdPerformance = data.year_change_percent;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dividendos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contextual text */}
        <div className="text-sm text-muted-foreground space-y-2">
          {data.ultimo_dividendo && data.data_ultimo_dividendo && (
            <p>
              O atual dividendo do <span className="font-semibold text-foreground">{data.ticker}</span> foi de{" "}
              <span className="font-semibold text-foreground">{formatCurrency(data.ultimo_dividendo)}</span> por cota 
              na data {formatDate(data.data_ultimo_dividendo)}, com um Dividend Yield de{" "}
              <span className="font-semibold text-foreground">{lastDividendYield?.toFixed(2)}%</span> com base na 
              cotação de {formatCurrency(data.current_price)} da data com.
            </p>
          )}
          
          {ytdPerformance != null && (
            <p>
              O <span className="font-semibold text-foreground">{data.ticker}</span> performa com{" "}
              <span className={ytdPerformance >= 0 ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                {ytdPerformance >= 0 ? "alta" : "baixa"}
              </span>{" "}
              nos últimos 12 meses de{" "}
              <span className={ytdPerformance >= 0 ? "text-emerald-500 font-semibold" : "text-red-500 font-semibold"}>
                {ytdPerformance >= 0 ? "+" : ""}{ytdPerformance.toFixed(2)}%
              </span>.
              A cotação atualmente está em {formatCurrency(data.current_price)}.
            </p>
          )}
        </div>

        {/* Period summary table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Dividendos</TableHead>
                <TableHead className="text-center">Último</TableHead>
                <TableHead className="text-center">3 meses</TableHead>
                <TableHead className="text-center">6 meses</TableHead>
                <TableHead className="text-center">12 meses</TableHead>
                <TableHead className="text-center">Desde o IPO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Retorno por cota</TableCell>
                <TableCell className="text-center">
                  {formatCurrency(data.dividendos_ultimo?.valor || 0)}
                </TableCell>
                <TableCell className="text-center">
                  {formatCurrency(data.dividendos_3m?.valor || 0)}
                </TableCell>
                <TableCell className="text-center">
                  {formatCurrency(data.dividendos_6m?.valor || 0)}
                </TableCell>
                <TableCell className="text-center">
                  {formatCurrency(data.dividendos_12m?.valor || 0)}
                </TableCell>
                <TableCell className="text-center">
                  {formatCurrency(data.dividendos_total?.valor || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground text-xs">
                  Em relação ao valor de cota atual
                </TableCell>
                <TableCell className="text-center text-emerald-500 font-medium">
                  {(data.dividendos_ultimo?.percentual || 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-center text-emerald-500 font-medium">
                  {(data.dividendos_3m?.percentual || 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-center text-emerald-500 font-medium">
                  {(data.dividendos_6m?.percentual || 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-center text-emerald-500 font-medium">
                  {(data.dividendos_12m?.percentual || 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-center text-emerald-500 font-medium">
                  {(data.dividendos_total?.percentual || 0).toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
