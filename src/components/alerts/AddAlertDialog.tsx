import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddAlertDialog = ({ open, onOpenChange, onSuccess }: AddAlertDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    alert_type: "price_variation",
    threshold_value: "",
    target_price: "",
    comparison_type: "above",
    frequency: "daily",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const insertData: any = {
        user_id: user.id,
        ticker: formData.ticker.toUpperCase(),
        alert_type: formData.alert_type,
        comparison_type: formData.comparison_type,
        frequency: formData.frequency,
        is_active: true,
      };

      // Set threshold_value or target_price based on alert type
      if (formData.alert_type === "price_variation" || formData.alert_type === "price_drop") {
        insertData.threshold_value = formData.threshold_value ? parseFloat(formData.threshold_value) : null;
      } else if (formData.alert_type === "target_price") {
        insertData.target_price = formData.target_price ? parseFloat(formData.target_price) : null;
      } else if (formData.alert_type === "fixed_income_maturity") {
        insertData.threshold_value = formData.threshold_value ? parseFloat(formData.threshold_value) : 30;
      }

      const { error } = await supabase.from("alerts").insert(insertData);

      if (error) throw error;

      toast({
        title: "Alerta criado!",
        description: "O alerta foi configurado com sucesso.",
      });

      onSuccess();
      setFormData({
        ticker: "",
        alert_type: "price_variation",
        threshold_value: "",
        target_price: "",
        comparison_type: "above",
        frequency: "daily",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar alerta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const needsTicker = !["fixed_income_maturity"].includes(formData.alert_type);
  const showThreshold = ["price_variation", "price_drop"].includes(formData.alert_type);
  const showTargetPrice = formData.alert_type === "target_price";
  const showMaturityDays = formData.alert_type === "fixed_income_maturity";
  const showComparisonType = ["price_variation", "target_price"].includes(formData.alert_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Alerta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert_type">Tipo de Alerta *</Label>
            <Select
              value={formData.alert_type}
              onValueChange={(value) => setFormData({ ...formData, alert_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_variation">Variação de Preço</SelectItem>
                <SelectItem value="price_drop">Queda Significativa</SelectItem>
                <SelectItem value="target_price">Preço Alvo</SelectItem>
                <SelectItem value="dividend">Novo Provento Anunciado</SelectItem>
                <SelectItem value="dividend_paid">Provento Pago</SelectItem>
                <SelectItem value="corporate_event">Fato Relevante</SelectItem>
                <SelectItem value="fixed_income_maturity">Vencimento Renda Fixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsTicker && (
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker *</Label>
              <Input
                id="ticker"
                placeholder="Ex: VALE3"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                required
              />
            </div>
          )}

          {showThreshold && (
            <div className="space-y-2">
              <Label htmlFor="threshold_value">Variação (%) *</Label>
              <Input
                id="threshold_value"
                type="number"
                step="0.1"
                placeholder="Ex: 5.0"
                value={formData.threshold_value}
                onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
                required
              />
            </div>
          )}

          {showTargetPrice && (
            <div className="space-y-2">
              <Label htmlFor="target_price">Preço Alvo (R$) *</Label>
              <Input
                id="target_price"
                type="number"
                step="0.01"
                placeholder="Ex: 50.00"
                value={formData.target_price}
                onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
                required
              />
            </div>
          )}

          {showMaturityDays && (
            <div className="space-y-2">
              <Label htmlFor="threshold_value">Dias antes do vencimento *</Label>
              <Input
                id="threshold_value"
                type="number"
                placeholder="Ex: 30"
                value={formData.threshold_value}
                onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Você será notificado quando faltar esse número de dias para o vencimento
              </p>
            </div>
          )}

          {showComparisonType && (
            <div className="space-y-2">
              <Label htmlFor="comparison_type">Condição *</Label>
              <Select
                value={formData.comparison_type}
                onValueChange={(value) => setFormData({ ...formData, comparison_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">
                    {formData.alert_type === "target_price" ? "Atingir ou ultrapassar" : "Subir acima de"}
                  </SelectItem>
                  <SelectItem value="below">
                    {formData.alert_type === "target_price" ? "Cair abaixo de" : "Cair abaixo de"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Alerta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
