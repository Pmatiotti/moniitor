import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dividend } from "@/pages/Dividends";

interface DividendsYearlyTableProps {
  dividends: Dividend[];
}

export const DividendsYearlyTable = ({ dividends }: DividendsYearlyTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const yearlyData = dividends.reduce((acc, div) => {
    const year = new Date(div.payment_date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(Number(div.amount));
    return acc;
  }, {} as Record<number, number[]>);

  const yearlyStats = Object.entries(yearlyData)
    .map(([year, amounts]) => {
      const total = amounts.reduce((sum, val) => sum + val, 0);
      const average = total / 12;
      return { year: Number(year), total, average };
    })
    .sort((a, b) => b.year - a.year);

  const calculateVariation = (index: number) => {
    if (index === yearlyStats.length - 1) return null;
    const current = yearlyStats[index].total;
    const previous = yearlyStats[index + 1].total;
    return ((current - previous) / previous) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>HISTÓRICO ANUAL</CardTitle>
          <Select defaultValue="receita">
            <SelectTrigger className="w-40 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="receita">Receita recebida</SelectItem>
              <SelectItem value="anunciado">Anunciado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Confira o resumo anual de seus proventos, com a remuneração recebida em cada ano e quanto isso rendeu em um ano para outro.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Média mensal</TableHead>
              <TableHead className="text-right">Variação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {yearlyStats.map((stat, index) => {
              const variation = calculateVariation(index);
              return (
                <TableRow key={stat.year}>
                  <TableCell className="font-medium">{stat.year}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(stat.total)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(stat.average)}</TableCell>
                  <TableCell className="text-right">
                    {variation !== null ? (
                      <span className={variation >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {variation >= 0 ? '+' : ''}{variation.toFixed(2)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
