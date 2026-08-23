import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContributionAsset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  quantity: number;
  average_price: number;
  invested_amount?: number | null;
  currency: string | null;
}

interface AddContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: ContributionAsset | null;
  onSuccess: () => void;
}

export const AddContributionDialog = ({ open, onOpenChange, asset, onSuccess }: AddContributionDialogProps) => {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setQuantity("");
      setPrice("");
    }
  }, [open]);

  if (!asset) return null;

  const qtdAporte = parseFloat(quantity) || 0;
  const precoAporte = parseFloat(price) || 0;
  const qtdAtual = Number(asset.quantity);
  const precoMedioAtual = Number(asset.average_price);

  const novaQuantidade = qtdAtual + qtdAporte;
  const novoPrecoMedio = novaQuantidade > 0
    ? (qtdAtual * precoMedioAtual + qtdAporte * precoAporte) / novaQuantidade
    : 0;

  const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") &&
    asset.invested_amount && Number(asset.invested_amount) > 0;

  const novoInvestedAmount = usesInvestedAmount
    ? Number(asset.invested_amount) + (qtdAporte * precoAporte)
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: asset.currency || 'BRL',
    }).format(value);
  };

  const canSubmit = qtdAporte > 0 && precoAporte > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const updateData: Record<string, number> = {
        quantity: novaQuantidade,
        average_price: novoPrecoMedio,
      };

      if (novoInvestedAmount !== null) {
        updateData.invested_amount = novoInvestedAmount;
      }

      const { error } = await supabase
        .from("assets")
        .update(updateData)
        .eq("id", asset.id);

      if (error) throw error;

      toast({
        title: "Aporte registrado",
        description: `${qtdAporte} unidade(s) de ${asset.ticker} adicionada(s) com sucesso.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar aporte",
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
          <DialogTitle>Registrar Aporte</DialogTitle>
          <DialogDescription>
            Adicionar novas unidades ao ativo <strong>{asset.ticker}</strong> — {asset.asset_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contribution-qty">Quantidade do aporte</Label>
            <Input
              id="contribution-qty"
              type="number"
              min="0"
              step="any"
              placeholder="Ex: 100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribution-price">Preço unitário do aporte</Label>
            <Input
              id="contribution-price"
              type="number"
              min="0"
              step="any"
              placeholder="Ex: 25.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {canSubmit && (
            <div className="rounded-md border p-4 space-y-2 bg-muted/30">
              <h4 className="font-medium text-sm">Preview do resultado</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Quantidade atual:</span>
                <span className="text-right">{qtdAtual.toFixed(2)}</span>
                <span className="text-muted-foreground">Nova quantidade:</span>
                <span className="text-right font-medium">{novaQuantidade.toFixed(2)}</span>
                <span className="text-muted-foreground">Preço médio atual:</span>
                <span className="text-right">{formatCurrency(precoMedioAtual)}</span>
                <span className="text-muted-foreground">Novo preço médio:</span>
                <span className="text-right font-medium">{formatCurrency(novoPrecoMedio)}</span>
                {novoInvestedAmount !== null && (
                  <>
                    <span className="text-muted-foreground">Valor aplicado atual:</span>
                    <span className="text-right">{formatCurrency(Number(asset.invested_amount))}</span>
                    <span className="text-muted-foreground">Novo valor aplicado:</span>
                    <span className="text-right font-medium">{formatCurrency(novoInvestedAmount)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Salvando..." : "Confirmar Aporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
