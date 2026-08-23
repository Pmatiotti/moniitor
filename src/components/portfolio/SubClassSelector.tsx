import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubClassSelectorProps {
  assetClass: string;
  value: string;
  onChange: (value: string) => void;
}

// Subclasses padrão baseadas na nova taxonomia
// Veículos (CDB, CRA, etc) NÃO são subclasses
const DEFAULT_SUBCLASSES: Record<string, string[]> = {
  "Renda Fixa": ["Pós-fixado", "Pré-fixado", "Inflação"],
  "Renda Variável": ["Ações", "FIIs", "BDR", "Derivativos", "FIAs"],
  "Multimercado": ["Multimercado"],
  "Previdência": ["Previdência"],
  "Commodities": ["Commodities"],
  "Moedas": ["Moedas"],
  "Recebíveis": ["Recebíveis"],
};

export const SubClassSelector = ({ assetClass, value, onChange }: SubClassSelectorProps) => {
  const [customSubClasses, setCustomSubClasses] = useState<string[]>([]);
  const [newSubClassName, setNewSubClassName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomSubClasses();
  }, [assetClass]);

  const fetchCustomSubClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_asset_subclasses")
        .select("sub_class_name")
        .eq("user_id", user.id)
        .eq("asset_class", assetClass);

      if (error) throw error;
      setCustomSubClasses(data?.map(item => item.sub_class_name) || []);
    } catch (error) {
      console.error("Error fetching custom subclasses:", error);
    }
  };

  const handleAddSubClass = async () => {
    if (!newSubClassName.trim()) {
      toast.error("Digite um nome para a subclasse");
      return;
    }

    const allSubClasses = getAllSubClasses();
    if (allSubClasses.includes(newSubClassName.trim())) {
      toast.error("Esta subclasse já existe");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("custom_asset_subclasses").insert({
        user_id: user.id,
        asset_class: assetClass,
        sub_class_name: newSubClassName.trim(),
      });

      if (error) throw error;

      setCustomSubClasses([...customSubClasses, newSubClassName.trim()]);
      onChange(newSubClassName.trim());
      setNewSubClassName("");
      setIsAddingNew(false);
      toast.success("Subclasse criada com sucesso!");
    } catch (error: any) {
      console.error("Error adding custom subclass:", error);
      toast.error("Erro ao criar subclasse");
    } finally {
      setLoading(false);
    }
  };

  const getAllSubClasses = (): string[] => {
    const defaultOnes = DEFAULT_SUBCLASSES[assetClass] || [];
    return [...defaultOnes, ...customSubClasses];
  };

  const allSubClasses = getAllSubClasses();

  if (allSubClasses.length === 0 && !isAddingNew) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Subclasse</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione a subclasse" />
          </SelectTrigger>
          <SelectContent>
            {allSubClasses.map((subClass) => (
              <SelectItem key={subClass} value={subClass}>
                {subClass}
                {customSubClasses.includes(subClass) && (
                  <span className="ml-2 text-xs text-muted-foreground">(personalizada)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={isAddingNew} onOpenChange={setIsAddingNew}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Adicionar nova subclasse">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Nova Subclasse</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsAddingNew(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input
                placeholder="Nome da subclasse"
                value={newSubClassName}
                onChange={(e) => setNewSubClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubClass();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleAddSubClass}
                disabled={loading || !newSubClassName.trim()}
              >
                {loading ? "Criando..." : "Criar Subclasse"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
