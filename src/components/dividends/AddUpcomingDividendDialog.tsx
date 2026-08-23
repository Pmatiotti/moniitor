import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddUpcomingDividendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddUpcomingDividendDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddUpcomingDividendDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ticker, setTicker] = useState("");
  const [dividendType, setDividendType] = useState("Rendimento");
  const [amountPerShare, setAmountPerShare] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [exDate, setExDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar a quantidade do ativo na carteira (apenas ativos pessoais)
      const { data: asset } = await supabase
        .from("assets")
        .select("quantity, asset_class")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir ativos de clientes
        .eq("ticker", ticker.toUpperCase())
        .single();

      const quantity = asset?.quantity || 0;
      const rate = parseFloat(amountPerShare);
      const expectedAmount = rate * quantity;

      // Inserir na tabela upcoming_dividends
      const { error } = await supabase
        .from("upcoming_dividends")
        .insert({
          user_id: user.id,
          ticker: ticker.toUpperCase(),
          dividend_type: dividendType,
          rate: rate,
          expected_amount: expectedAmount,
          payment_date: paymentDate,
          ex_date: exDate || null,
          quantity: quantity,
          source: "manual"
        });

      if (error) throw error;

      toast({
        title: "Provento anunciado adicionado!",
        description: `${ticker.toUpperCase()} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedAmount)} previsto para ${new Date(paymentDate).toLocaleDateString('pt-BR')}`,
      });

      // Reset form
      setTicker("");
      setDividendType("Rendimento");
      setAmountPerShare("");
      setPaymentDate("");
      setExDate("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error adding upcoming dividend:", error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o provento anunciado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Provento Anunciado</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <Input
              id="ticker"
              placeholder="Ex: HGLG11, ITUB4"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dividendType">Tipo</Label>
            <Select value={dividendType} onValueChange={setDividendType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rendimento">Rendimento</SelectItem>
                <SelectItem value="Dividendo">Dividendo</SelectItem>
                <SelectItem value="JCP">JCP</SelectItem>
                <SelectItem value="Juros">Juros</SelectItem>
                <SelectItem value="Amortização">Amortização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountPerShare">Valor por Cota (R$)</Label>
            <Input
              id="amountPerShare"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 0.85"
              value={amountPerShare}
              onChange={(e) => setAmountPerShare(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exDate">Data COM (Ex)</Label>
              <Input
                id="exDate"
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};