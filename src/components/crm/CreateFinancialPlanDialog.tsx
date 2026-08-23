import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { PlanData } from "@/types/financial-plan";

interface CreateFinancialPlanDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: PlanData | null;
}

export const CreateFinancialPlanDialog = ({
  clientId,
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: CreateFinancialPlanDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plan_type: "retirement",
    title: "",
    description: "",
    parameters: {} as Record<string, any>,
    recommendations: [] as Array<{ title: string; description: string; priority: string }>,
  });

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        plan_type: initialData.plan_type,
        title: initialData.title,
        description: initialData.description || "",
        parameters: initialData.parameters,
        recommendations: initialData.recommendations,
      });
    }
  }, [initialData, open]);

  const [newParam, setNewParam] = useState({ key: "", value: "" });
  const [newRec, setNewRec] = useState({ title: "", description: "", priority: "medium" });

  const planTypes = [
    { value: "retirement", label: "Aposentadoria" },
    { value: "succession", label: "Sucessão" },
    { value: "tax", label: "Otimização Fiscal" },
    { value: "cashflow", label: "Fluxo de Caixa" },
    { value: "risk", label: "Análise de Risco" },
  ];

  const handleAddParameter = () => {
    if (newParam.key && newParam.value) {
      setFormData({
        ...formData,
        parameters: {
          ...formData.parameters,
          [newParam.key]: newParam.value,
        },
      });
      setNewParam({ key: "", value: "" });
    }
  };

  const handleRemoveParameter = (key: string) => {
    const { [key]: removed, ...rest } = formData.parameters;
    setFormData({ ...formData, parameters: rest });
  };

  const handleAddRecommendation = () => {
    if (newRec.title && newRec.description) {
      setFormData({
        ...formData,
        recommendations: [...formData.recommendations, newRec],
      });
      setNewRec({ title: "", description: "", priority: "medium" });
    }
  };

  const handleRemoveRecommendation = (index: number) => {
    setFormData({
      ...formData,
      recommendations: formData.recommendations.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se é cliente manual ou vinculado
      const { data: manualClient } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle();

      const isLinkedClient = !manualClient;

      // Se vinculado, verificar se existe vínculo ativo
      if (isLinkedClient) {
        const { data: link } = await supabase
          .from("client_advisor_links")
          .select("id")
          .eq("advisor_id", user.id)
          .eq("client_id", clientId)
          .eq("status", "active")
          .maybeSingle();

        if (!link) {
          throw new Error("Cliente vinculado não encontrado ou vínculo inativo.");
        }
      }

      // Inserir com campos corretos baseado no tipo de cliente
      const { error } = await supabase.from("financial_plans" as any).insert({
        client_id: isLinkedClient ? null : clientId,
        linked_user_id: isLinkedClient ? clientId : null,
        advisor_id: user.id,
        plan_type: formData.plan_type,
        title: formData.title,
        description: formData.description || null,
        parameters: formData.parameters,
        recommendations: formData.recommendations,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Plano criado!",
        description: "O plano financeiro foi compartilhado com o cliente.",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        plan_type: "retirement",
        title: "",
        description: "",
        parameters: {},
        recommendations: [],
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar plano",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Plano Financeiro para Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="plan_type">Tipo de Plano *</Label>
            <Select
              value={formData.plan_type}
              onValueChange={(value) => setFormData({ ...formData, plan_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Planejamento de Aposentadoria aos 60 anos"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo e contexto do plano..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Parâmetros */}
          <div className="space-y-3">
            <Label>Parâmetros do Plano</Label>
            <Card>
              <CardContent className="pt-4 space-y-3">
                {Object.entries(formData.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="font-medium text-sm">{key}</div>
                      <div className="text-sm text-muted-foreground">{String(value)}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParameter(key)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <Input
                    placeholder="Nome do parâmetro"
                    value={newParam.key}
                    onChange={(e) => setNewParam({ ...newParam, key: e.target.value })}
                  />
                  <Input
                    placeholder="Valor"
                    value={newParam.value}
                    onChange={(e) => setNewParam({ ...newParam, value: e.target.value })}
                  />
                  <Button type="button" onClick={handleAddParameter} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendações */}
          <div className="space-y-3">
            <Label>Recomendações</Label>
            <Card>
              <CardContent className="pt-4 space-y-3">
                {formData.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        <span className="text-xs text-muted-foreground">Prioridade: {rec.priority}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRecommendation(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t">
                  <Input
                    placeholder="Título da recomendação"
                    value={newRec.title}
                    onChange={(e) => setNewRec({ ...newRec, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Descrição detalhada..."
                    value={newRec.description}
                    onChange={(e) => setNewRec({ ...newRec, description: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Select
                      value={newRec.priority}
                      onValueChange={(value) => setNewRec({ ...newRec, priority: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleAddRecommendation} className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Recomendação
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Plano"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
