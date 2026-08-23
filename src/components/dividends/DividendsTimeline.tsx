import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dividend, UpcomingDividend } from "@/pages/Dividends";

interface DividendsTimelineProps {
  dividends: Dividend[];
  upcomingDividends?: UpcomingDividend[];
  onRefresh: () => void;
  mode?: 'upcoming' | 'received';
}

export const DividendsTimeline = ({ 
  dividends, 
  upcomingDividends = [], 
  onRefresh,
  mode = 'received'
}: DividendsTimelineProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("dividends").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Provento removido",
        description: "O provento foi removido do histórico.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover provento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (mode === 'upcoming') {
    if (upcomingDividends.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum provento futuro encontrado para seus ativos.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor por Ação</TableHead>
            <TableHead className="text-right">Total Estimado</TableHead>
            <TableHead>Data de Pagamento</TableHead>
            <TableHead>Data Ex</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {upcomingDividends.map((dividend, index) => (
            <TableRow key={`${dividend.ticker}-${dividend.payment_date}-${index}`}>
              <TableCell className="font-medium">
                {dividend.ticker}
                <Badge variant="outline" className="ml-2 text-xs">
                  Previsto
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{dividend.dividend_type}</TableCell>
              <TableCell className="text-right">{dividend.quantity.toFixed(2)}</TableCell>
              <TableCell className="text-right">{formatCurrency(Number(dividend.amount_per_share))}</TableCell>
              <TableCell className="text-right font-semibold text-green-600">
                {formatCurrency(Number(dividend.expected_total))}
              </TableCell>
              <TableCell>{formatDate(dividend.payment_date)}</TableCell>
              <TableCell>{dividend.ex_date ? formatDate(dividend.ex_date) : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // Mode: received
  if (dividends.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum provento registrado ainda.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticker</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Data de Pagamento</TableHead>
          <TableHead>Data Ex</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dividends.map((dividend) => (
          <TableRow key={dividend.id}>
            <TableCell className="font-medium">{dividend.ticker}</TableCell>
            <TableCell className="capitalize">{dividend.dividend_type}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(dividend.amount))}</TableCell>
            <TableCell>{formatDate(dividend.payment_date)}</TableCell>
            <TableCell>{dividend.ex_date ? formatDate(dividend.ex_date) : '-'}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(dividend.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
