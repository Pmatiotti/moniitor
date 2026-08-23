import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowUpCircle, ArrowDownCircle, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditTransactionDialog } from "./EditTransactionDialog";

interface Transaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: string;
  category_id: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  categories: { name: string; color: string } | null;
}

interface TransactionsTableProps {
  onUpdate: () => void;
}

export function TransactionsTable({ onUpdate }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, title, description, amount, type, category_id, transaction_date, is_recurring, recurrence_frequency, categories(name, color)")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });

      fetchTransactions();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir transação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    fetchTransactions();
    onUpdate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(parseISO(transaction.transaction_date.split('T')[0]), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{transaction.title}</div>
                    {transaction.description && (
                      <div className="text-sm text-muted-foreground">
                        {transaction.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {transaction.categories && (
                    <Badge
                      style={{
                        backgroundColor: transaction.categories.color + "20",
                        color: transaction.categories.color,
                        borderColor: transaction.categories.color,
                      }}
                      variant="outline"
                    >
                      {transaction.categories.name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {transaction.type === "income" ? (
                    <div className="flex items-center text-green-600">
                      <ArrowUpCircle className="mr-1 h-4 w-4" />
                      Receita
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <ArrowDownCircle className="mr-1 h-4 w-4" />
                      Despesa
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span
                    className={
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  );
}
