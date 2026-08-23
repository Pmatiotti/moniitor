import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  spent: number;
  categories: Category;
}

interface BudgetManagerProps {
  refreshTrigger?: number;
}

export function BudgetManager({ refreshTrigger }: BudgetManagerProps = {}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("type", "expense")
        .order("name");

      setCategories(categoriesData || []);

      // Fetch budgets for current month
      const { data: budgetsData } = await supabase
        .from("budgets")
        .select("*, categories(id, name, color)")
        .eq("user_id", user.id)
        .eq("month", currentMonth);

      // Calculate spent amount for each budget
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const budgetsWithSpent = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: transactions, error: transError } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", user.id)
            .eq("category_id", budget.category_id)
            .eq("type", "expense")
            .gte("transaction_date", firstDay.toISOString().split('T')[0])
            .lte("transaction_date", lastDay.toISOString().split('T')[0]);

          if (transError) {
            console.error("Error fetching transactions:", transError);
          }

          const spent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          return { ...budget, spent };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddBudget = async () => {
    if (!selectedCategory || !amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma categoria e informe o valor.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("budgets").upsert({
        user_id: user.id,
        category_id: selectedCategory,
        month: currentMonth,
        amount: parseFloat(amount),
      });

      if (error) throw error;

      toast({
        title: "Orçamento definido",
        description: "O orçamento foi configurado com sucesso.",
      });

      setSelectedCategory("");
      setAmount("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao definir orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBudget = async () => {
    if (!editingBudget || !editAmount) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("budgets")
        .update({ amount: parseFloat(editAmount) })
        .eq("id", editingBudget.id);
      if (error) throw error;
      toast({ title: "Orçamento atualizado", description: "O valor foi alterado com sucesso." });
      setEditingBudget(null);
      setEditAmount("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Orçamento removido" });
      setDeleteConfirmId(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddBudget} disabled={loading} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map((budget) => {
          const percentage = (budget.spent / budget.amount) * 100;
          const isOverBudget = percentage > 100;

          return (
            <Card key={budget.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{budget.categories.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${isOverBudget ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingBudget(budget);
                        setEditAmount(budget.amount.toString());
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(budget.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress
                  value={Math.min(percentage, 100)}
                  className={isOverBudget ? "bg-destructive/20" : ""}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Gasto: {formatCurrency(budget.spent)}
                  </span>
                  <span className="font-medium">
                    Orçamento: {formatCurrency(budget.amount)}
                  </span>
                </div>
                {isOverBudget && (
                  <p className="text-sm text-destructive font-medium">
                    Orçamento excedido em {formatCurrency(budget.spent - budget.amount)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Orçamento - {editingBudget?.categories.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBudget(null)}>Cancelar</Button>
            <Button onClick={handleEditBudget} disabled={loading}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Orçamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Tem certeza que deseja remover este orçamento? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteBudget(deleteConfirmId)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
