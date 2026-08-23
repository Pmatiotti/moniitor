import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedIds: string[];
}

export const BulkEditDialog = ({ open, onOpenChange, onSuccess, selectedIds }: BulkEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [updateFields, setUpdateFields] = useState({
    asset_class: false,
    currency: false,
    broker: false,
    sector: false,
  });
  const [formData, setFormData] = useState({
    asset_class: "",
    currency: "BRL",
    broker: "",
    sector: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhum ativo selecionado",
        description: "Selecione pelo menos um ativo para editar.",
        variant: "destructive",
      });
      return;
    }

    // Build update object with only selected fields
    const updates: any = {};
    if (updateFields.asset_class) updates.asset_class = formData.asset_class;
    if (updateFields.currency) updates.currency = formData.currency;
    if (updateFields.broker) updates.broker = formData.broker;
    if (updateFields.sector) updates.sector = formData.sector;

    if (Object.keys(updates).length === 0) {
      toast({
        title: "Nenhum campo selecionado",
        description: "Selecione pelo menos um campo para atualizar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("assets")
        .update(updates)
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Ativos atualizados!",
        description: `${selectedIds.length} ativo(s) atualizado(s) com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setUpdateFields({
        asset_class: false,
        currency: false,
        broker: false,
        sector: false,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ativos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar em Massa ({selectedIds.length} selecionados)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione os campos que deseja atualizar em todos os ativos selecionados:
          </p>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="update_asset_class"
                checked={updateFields.asset_class}
                onCheckedChange={(checked) =>
                  setUpdateFields({ ...updateFields, asset_class: !!checked })
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="update_asset_class" className="cursor-pointer">
                  Classe de Ativo
                </Label>
                {updateFields.asset_class && (
                  <Select
                    value={formData.asset_class}
                    onValueChange={(value) => setFormData({ ...formData, asset_class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ações">Ações</SelectItem>
                      <SelectItem value="FIIs">FIIs</SelectItem>
                      <SelectItem value="ETFs">ETFs</SelectItem>
                      <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                      <SelectItem value="Criptomoedas">Criptomoedas</SelectItem>
                      <SelectItem value="Multimercado">Multimercado</SelectItem>
                      <SelectItem value="Bonds (USD)">Bonds (USD)</SelectItem>
                      <SelectItem value="REITs (USD)">REITs (USD)</SelectItem>
                      <SelectItem value="Stocks (USD)">Stocks (USD)</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="update_currency"
                checked={updateFields.currency}
                onCheckedChange={(checked) =>
                  setUpdateFields({ ...updateFields, currency: !!checked })
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="update_currency" className="cursor-pointer">
                  Moeda
                </Label>
                {updateFields.currency && (
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL - Real</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="update_broker"
                checked={updateFields.broker}
                onCheckedChange={(checked) =>
                  setUpdateFields({ ...updateFields, broker: !!checked })
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="update_broker" className="cursor-pointer">
                  Corretora
                </Label>
                {updateFields.broker && (
                  <Input
                    placeholder="Nome da corretora"
                    value={formData.broker}
                    onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="update_sector"
                checked={updateFields.sector}
                onCheckedChange={(checked) =>
                  setUpdateFields({ ...updateFields, sector: !!checked })
                }
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="update_sector" className="cursor-pointer">
                  Setor
                </Label>
                {updateFields.sector && (
                  <Input
                    placeholder="Ex: Tecnologia"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Aplicar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
