import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isFIITicker } from "@/lib/ticker-detection";

interface AddDividendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddDividendDialog = ({ open, onOpenChange, onSuccess }: AddDividendDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    dividend_type: "dividendo",
    amount: "",
    payment_date: "",
    ex_date: "",
  });

  // Function to determine asset class based on ticker and dividend type
  const determineAssetClass = (ticker: string, dividendType: string): string => {
    const upperTicker = ticker.toUpperCase();
    
    if (isFIITicker(ticker)) return 'FII';
    if (dividendType === 'cupom' || dividendType === 'amortização') {
      if (upperTicker.includes('DEB')) return 'Debenture';
      if (upperTicker.includes('CRI')) return 'CRI';
      if (upperTicker.includes('CRA')) return 'CRA';
      if (upperTicker.includes('FIDC')) return 'FIDC';
      return 'Debenture';
    }
    return 'Ações';
  };

  // Function to determine market type based on asset class
  const determineMarketType = (assetClass: string): string => {
    const rendaFixa = ['Debenture', 'CRI', 'CRA', 'FIDC'];
    return rendaFixa.includes(assetClass) ? 'Renda Fixa' : 'Renda Variável';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const assetClass = determineAssetClass(formData.ticker, formData.dividend_type);
      const marketType = determineMarketType(assetClass);

      const { error } = await supabase.from("dividends").insert({
        user_id: user.id,
        ticker: formData.ticker.toUpperCase(),
        dividend_type: formData.dividend_type,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        ex_date: formData.ex_date || null,
        asset_class: assetClass,
        market_type: marketType
      });

      if (error) throw error;

      toast({
        title: "Provento adicionado!",
        description: "O provento foi registrado com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        ticker: "",
        dividend_type: "dividendo",
        amount: "",
        payment_date: "",
        ex_date: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar provento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Provento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="dividend_type">Tipo *</Label>
            <Select
              value={formData.dividend_type}
              onValueChange={(value) => setFormData({ ...formData, dividend_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dividendo">Dividendo</SelectItem>
                <SelectItem value="jcp">JCP</SelectItem>
                <SelectItem value="rendimento">Rendimento</SelectItem>
                <SelectItem value="amortização">Amortização</SelectItem>
                <SelectItem value="cupom">Cupom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Ex: 150.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
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
            <Label htmlFor="ex_date">Data Ex-Dividendo</Label>
            <Input
              id="ex_date"
              type="date"
              value={formData.ex_date}
              onChange={(e) => setFormData({ ...formData, ex_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
