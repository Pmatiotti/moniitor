import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Layers } from "lucide-react";

interface AssetClass {
  id: string;
  class_name: string;
  display_order: number;
  is_active: boolean;
}

interface AssetSubclass {
  id: string;
  class_id: string;
  subclass_name: string;
  display_order: number;
  is_active: boolean;
}

export const AssetTaxonomyManager = () => {
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [subclasses, setSubclasses] = useState<AssetSubclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSubclassOpen, setIsAddSubclassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [isEditSubclassOpen, setIsEditSubclassOpen] = useState(false);
  
  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newSubclassName, setNewSubclassName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<AssetClass | null>(null);
  const [editingSubclass, setEditingSubclass] = useState<AssetSubclass | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    try {
      const [classesResult, subclassesResult] = await Promise.all([
        supabase
          .from("asset_class_definitions")
          .select("*")
          .order("display_order"),
        supabase
          .from("asset_subclass_definitions")
          .select("*")
          .order("display_order"),
      ]);

      if (classesResult.error) throw classesResult.error;
      if (subclassesResult.error) throw subclassesResult.error;

      setClasses(classesResult.data || []);
      setSubclasses(subclassesResult.data || []);
    } catch (error) {
      console.error("Error fetching taxonomy:", error);
      toast.error("Erro ao carregar taxonomia");
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) {
      toast.error("Digite um nome para a classe");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = Math.max(...classes.map((c) => c.display_order), 0);
      const { data, error } = await supabase
        .from("asset_class_definitions")
        .insert({
          class_name: newClassName.trim(),
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setClasses([...classes, data]);
      setNewClassName("");
      setIsAddClassOpen(false);
      toast.success("Classe criada com sucesso!");
    } catch (error: any) {
      console.error("Error adding class:", error);
      toast.error(error.message?.includes("unique") ? "Esta classe já existe" : "Erro ao criar classe");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubclass = async () => {
    if (!newSubclassName.trim() || !selectedClassId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setSaving(true);
    try {
      const classSubclasses = subclasses.filter((s) => s.class_id === selectedClassId);
      const maxOrder = Math.max(...classSubclasses.map((s) => s.display_order), 0);

      const { data, error } = await supabase
        .from("asset_subclass_definitions")
        .insert({
          class_id: selectedClassId,
          subclass_name: newSubclassName.trim(),
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setSubclasses([...subclasses, data]);
      setNewSubclassName("");
      setIsAddSubclassOpen(false);
      toast.success("Subclasse criada com sucesso!");
    } catch (error: any) {
      console.error("Error adding subclass:", error);
      toast.error(error.message?.includes("unique") ? "Esta subclasse já existe nesta classe" : "Erro ao criar subclasse");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClass = async () => {
    if (!editingClass || !editingClass.class_name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("asset_class_definitions")
        .update({ class_name: editingClass.class_name.trim() })
        .eq("id", editingClass.id);

      if (error) throw error;

      setClasses(classes.map((c) => (c.id === editingClass.id ? editingClass : c)));
      setIsEditClassOpen(false);
      setEditingClass(null);
      toast.success("Classe atualizada!");
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Erro ao atualizar classe");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubclass = async () => {
    if (!editingSubclass || !editingSubclass.subclass_name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("asset_subclass_definitions")
        .update({ subclass_name: editingSubclass.subclass_name.trim() })
        .eq("id", editingSubclass.id);

      if (error) throw error;

      setSubclasses(subclasses.map((s) => (s.id === editingSubclass.id ? editingSubclass : s)));
      setIsEditSubclassOpen(false);
      setEditingSubclass(null);
      toast.success("Subclasse atualizada!");
    } catch (error) {
      console.error("Error updating subclass:", error);
      toast.error("Erro ao atualizar subclasse");
    } finally {
      setSaving(false);
    }
  };

  const toggleClassActive = async (classItem: AssetClass) => {
    try {
      const { error } = await supabase
        .from("asset_class_definitions")
        .update({ is_active: !classItem.is_active })
        .eq("id", classItem.id);

      if (error) throw error;

      setClasses(classes.map((c) => (c.id === classItem.id ? { ...c, is_active: !c.is_active } : c)));
      toast.success(classItem.is_active ? "Classe desativada" : "Classe ativada");
    } catch (error) {
      console.error("Error toggling class:", error);
      toast.error("Erro ao alterar status da classe");
    }
  };

  const toggleSubclassActive = async (subclass: AssetSubclass) => {
    try {
      const { error } = await supabase
        .from("asset_subclass_definitions")
        .update({ is_active: !subclass.is_active })
        .eq("id", subclass.id);

      if (error) throw error;

      setSubclasses(subclasses.map((s) => (s.id === subclass.id ? { ...s, is_active: !s.is_active } : s)));
      toast.success(subclass.is_active ? "Subclasse desativada" : "Subclasse ativada");
    } catch (error) {
      console.error("Error toggling subclass:", error);
      toast.error("Erro ao alterar status da subclasse");
    }
  };

  const deleteSubclass = async (subclass: AssetSubclass) => {
    if (!confirm(`Deseja realmente excluir a subclasse "${subclass.subclass_name}"?`)) return;

    try {
      const { error } = await supabase
        .from("asset_subclass_definitions")
        .delete()
        .eq("id", subclass.id);

      if (error) throw error;

      setSubclasses(subclasses.filter((s) => s.id !== subclass.id));
      toast.success("Subclasse excluída");
    } catch (error) {
      console.error("Error deleting subclass:", error);
      toast.error("Erro ao excluir subclasse");
    }
  };

  const getSubclassesForClass = (classId: string) => {
    return subclasses.filter((s) => s.class_id === classId).sort((a, b) => a.display_order - b.display_order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Gerenciamento de Classes de Ativos
        </CardTitle>
        <Button onClick={() => setIsAddClassOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Classe
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma classe cadastrada. Clique em "Nova Classe" para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {classes.map((classItem) => (
              <Collapsible
                key={classItem.id}
                open={expandedClasses.has(classItem.id)}
                onOpenChange={() => toggleClass(classItem.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {expandedClasses.has(classItem.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{classItem.class_name}</span>
                        <Badge variant={classItem.is_active ? "default" : "secondary"}>
                          {classItem.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({getSubclassesForClass(classItem.id).length} subclasses)
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={classItem.is_active}
                          onCheckedChange={() => toggleClassActive(classItem)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingClass(classItem);
                            setIsEditClassOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/30">
                      {getSubclassesForClass(classItem.id).map((subclass) => (
                        <div
                          key={subclass.id}
                          className="flex items-center justify-between py-2 px-3 bg-background rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{subclass.subclass_name}</span>
                            {!subclass.is_active && (
                              <Badge variant="outline" className="text-xs">
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={subclass.is_active}
                              onCheckedChange={() => toggleSubclassActive(subclass)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingSubclass(subclass);
                                setIsEditSubclassOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteSubclass(subclass)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setSelectedClassId(classItem.id);
                          setIsAddSubclassOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Subclasse
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Add Class Dialog */}
        <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Classe de Ativo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Classe</Label>
                <Input
                  placeholder="Ex: Renda Fixa, Renda Variável..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddClassOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddClass} disabled={saving}>
                {saving ? "Criando..." : "Criar Classe"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Subclass Dialog */}
        <Dialog open={isAddSubclassOpen} onOpenChange={setIsAddSubclassOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Subclasse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Classe</Label>
                <Input
                  value={classes.find((c) => c.id === selectedClassId)?.class_name || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Nome da Subclasse</Label>
                <Input
                  placeholder="Ex: Pós-fixado, Ações..."
                  value={newSubclassName}
                  onChange={(e) => setNewSubclassName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubclass()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSubclassOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddSubclass} disabled={saving}>
                {saving ? "Criando..." : "Criar Subclasse"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Class Dialog */}
        <Dialog open={isEditClassOpen} onOpenChange={setIsEditClassOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Classe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Classe</Label>
                <Input
                  value={editingClass?.class_name || ""}
                  onChange={(e) =>
                    setEditingClass(editingClass ? { ...editingClass, class_name: e.target.value } : null)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditClassOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditClass} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Subclass Dialog */}
        <Dialog open={isEditSubclassOpen} onOpenChange={setIsEditSubclassOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Subclasse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Subclasse</Label>
                <Input
                  value={editingSubclass?.subclass_name || ""}
                  onChange={(e) =>
                    setEditingSubclass(editingSubclass ? { ...editingSubclass, subclass_name: e.target.value } : null)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditSubclassOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubclass} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
