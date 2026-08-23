import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Info, Pencil } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

interface CategoryManagerProps {
  onCategoriesChange?: () => void;
}

const DEFAULT_CATEGORIES = [
  // Receitas
  { name: "Salário", type: "income", color: "#10b981" },
  { name: "Investimentos", type: "income", color: "#3b82f6" },
  { name: "Freelance", type: "income", color: "#8b5cf6" },
  { name: "Outros", type: "income", color: "#6b7280" },
  
  // Despesas
  { name: "Moradia", type: "expense", color: "#ef4444" },
  { name: "Alimentação", type: "expense", color: "#f97316" },
  { name: "Transporte", type: "expense", color: "#eab308" },
  { name: "Saúde", type: "expense", color: "#06b6d4" },
  { name: "Educação", type: "expense", color: "#8b5cf6" },
  { name: "Lazer", type: "expense", color: "#ec4899" },
  { name: "Compras", type: "expense", color: "#f59e0b" },
  { name: "Contas", type: "expense", color: "#6366f1" },
];

export function CategoryManager({ onCategoriesChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("type")
        .order("name");

      if (error) throw error;
      
      const categoriesData = data || [];
      setCategories(categoriesData);
      
      // Se não tem categorias, criar as padrão
      if (categoriesData.length === 0) {
        await initializeDefaultCategories(user.id);
      } else if (onCategoriesChange) {
        onCategoriesChange();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar categorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const initializeDefaultCategories = async (userId: string) => {
    setInitializing(true);
    try {
      const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
        user_id: userId,
        name: cat.name,
        type: cat.type,
        color: cat.color,
      }));

      const { error } = await supabase
        .from("categories")
        .insert(categoriesToInsert);

      if (error) throw error;

      toast({
        title: "Categorias padrão criadas!",
        description: "Criamos algumas categorias para você começar. Você pode editá-las ou adicionar novas.",
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erro ao criar categorias padrão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!name) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da categoria.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name,
        type,
        color,
      });

      if (error) throw error;

      toast({
        title: "Categoria criada",
        description: "A categoria foi adicionada com sucesso.",
      });

      setName("");
      setColor("#3b82f6");
      fetchCategories();
      
      if (onCategoriesChange) {
        onCategoriesChange();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: editingCategory.name,
          color: editingCategory.color,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      });

      setEditDialogOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory({ ...category });
    setEditDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Categoria excluída",
        description: "A categoria foi removida com sucesso.",
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="space-y-6">
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  placeholder="Ex: Supermercado"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={editingCategory.type === "income" ? "Receita" : "Despesa"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, color: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditCategory} disabled={loading}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {categories.length === 0 && !initializing && (
        <Alert className="border-primary bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Bem-vindo!</strong> Crie suas categorias para organizar melhor suas receitas e despesas.
            Isso facilitará a classificação de suas transações e a criação de orçamentos.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Supermercado"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCategory} disabled={loading} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Categorias de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias de Despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
