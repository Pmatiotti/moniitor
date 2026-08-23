import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/pages/Portfolio";

interface AddDividendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: Asset | null;
}

export const AddDividendDialog = ({ open, onOpenChange, onSuccess, asset }: AddDividendDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: "",
    ex_date: "",
    dividend_type: "Dividendo",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("dividends").insert({
        user_id: user.id,
        asset_id: asset.id,
        ticker: asset.ticker,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        ex_date: formData.ex_date || null,
        dividend_type: formData.dividend_type,
      });

      if (error) throw error;

      toast({
        title: "Provento registrado!",
        description: `${formData.dividend_type} de ${new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: asset.currency || 'BRL' 
        }).format(parseFloat(formData.amount))} adicionado com sucesso.`,
      });

      setFormData({
        amount: "",
        payment_date: "",
        ex_date: "",
        dividend_type: "Dividendo",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao registrar provento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Adicionar Provento - {asset?.ticker}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dividend_type">Tipo de Provento *</Label>
            <Select
              value={formData.dividend_type}
              onValueChange={(value) => setFormData({ ...formData, dividend_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dividendo">Dividendo</SelectItem>
                <SelectItem value="JCP">Juros sobre Capital Próprio (JCP)</SelectItem>
                <SelectItem value="Rendimento">Rendimento (FII)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Total Recebido *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Valor total recebido (já considerando todas as suas cotas/ações)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Data de Pagamento *</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex_date">Data Com (opcional)</Label>
            <Input
              id="ex_date"
              type="date"
              value={formData.ex_date}
              onChange={(e) => setFormData({ ...formData, ex_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar Provento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
