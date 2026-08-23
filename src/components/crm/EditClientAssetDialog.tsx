import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubClassSelector } from "@/components/portfolio/SubClassSelector";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { parse, isValid } from "date-fns";
import { canFetchPriceFromAPI } from "@/lib/asset-api-detection";

interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  currency: string | null;
  broker: string | null;
  sector?: string | null;
  application_date?: string | null;
  maturity_date?: string | null;
  rate?: string | null;
  invested_amount?: number | null;
  cnpj?: string | null;
}

interface EditClientAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asset: Asset | null;
  clientId: string;
}

export const EditClientAssetDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  asset, 
  clientId 
}: EditClientAssetDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    asset_name: "",
    asset_class: "",
    sub_class: "",
    quantity: "",
    average_price: "",
    current_price: "",
    currency: "BRL",
    broker: "",
    sector: "",
    application_date: "",
    maturity_date: "",
    rate: "",
    invested_amount: "",
    cnpj: "",
  });

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 14);
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  useEffect(() => {
    if (asset) {
      setFormData({
        ticker: asset.ticker,
        asset_name: asset.asset_name,
        asset_class: asset.asset_class,
        sub_class: asset.sub_class || "",
        quantity: asset.quantity.toString(),
        average_price: asset.average_price.toString(),
        current_price: asset.current_price.toString(),
        currency: asset.currency || "BRL",
        broker: asset.broker || "",
        sector: asset.sector || "",
        application_date: asset.application_date || "",
        maturity_date: asset.maturity_date || "",
        rate: asset.rate || "",
        invested_amount: asset.invested_amount?.toString() || "",
        cnpj: asset.cnpj ? formatCNPJ(asset.cnpj) : "",
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    setLoading(true);

    try {
      const isMarketAsset = canFetchPriceFromAPI(formData.asset_class);
      const updateData: Record<string, unknown> = {
        ticker: formData.ticker,
        asset_name: formData.asset_name,
        asset_class: formData.asset_class,
        sub_class: formData.sub_class || null,
        quantity: parseFloat(formData.quantity),
        average_price: parseFloat(formData.average_price),
        current_price: formData.current_price ? parseFloat(formData.current_price) : (isMarketAsset ? null : parseFloat(formData.average_price)),
        currency: formData.currency,
        broker: formData.broker || null,
        sector: formData.sector || null,
        application_date: formData.application_date || null,
        maturity_date: formData.maturity_date || null,
        rate: formData.rate || null,
        invested_amount: formData.invested_amount ? parseFloat(formData.invested_amount) : null,
        cnpj: formData.cnpj ? formData.cnpj.replace(/[.\-\/]/g, "") : null,
      };

      const { error } = await supabase
        .from("assets")
        .update(updateData)
        .eq("id", asset.id)
        .eq("client_id", clientId);

      if (error) throw error;

      toast({
        title: "Ativo atualizado!",
        description: "As informações do ativo foram atualizadas com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar ativo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ativo do Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker *</Label>
              <Input
                id="ticker"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset_name">Nome do Ativo *</Label>
              <Input
                id="asset_name"
                value={formData.asset_name}
                onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_class">Classe de Ativo *</Label>
              <Select
                value={formData.asset_class}
                onValueChange={(value) => setFormData({ ...formData, asset_class: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Renda Variável">Renda Variável</SelectItem>
                  <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                  <SelectItem value="Fundos de Investimento">Fundos de Investimento</SelectItem>
                  <SelectItem value="COE">COE</SelectItem>
                  <SelectItem value="Multimercado">Multimercado</SelectItem>
                  <SelectItem value="Previdência">Previdência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <SubClassSelector
              assetClass={formData.asset_class}
              value={formData.sub_class}
              onChange={(value) => setFormData({ ...formData, sub_class: value })}
            />
          </div>

          {formData.asset_class === "Fundos de Investimento" && (
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Fundo</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
              />
            </div>
          )}

          {(formData.asset_class === "Renda Fixa" || formData.asset_class === "COE") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Aplicação</Label>
                  <DatePickerInput
                    value={formData.application_date ? (() => { const d = parse(formData.application_date, "yyyy-MM-dd", new Date()); return isValid(d) ? d : undefined; })() : undefined}
                    onChange={(date) => setFormData({ ...formData, application_date: date ? date.toISOString().split('T')[0] : "" })}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <DatePickerInput
                    value={formData.maturity_date ? (() => { const d = parse(formData.maturity_date, "yyyy-MM-dd", new Date()); return isValid(d) ? d : undefined; })() : undefined}
                    onChange={(date) => setFormData({ ...formData, maturity_date: date ? date.toISOString().split('T')[0] : "" })}
                    placeholder="dd/mm/aaaa"
                    toYear={2070}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Taxa</Label>
                  <Input
                    id="rate"
                    placeholder="Ex: 100% CDI ou 12% a.a."
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invested_amount">Valor Aplicado</Label>
                  <Input
                    id="invested_amount"
                    type="number"
                    step="0.01"
                    placeholder="Valor investido"
                    value={formData.invested_amount}
                    onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="average_price">Preço Médio *</Label>
              <Input
                id="average_price"
                type="number"
                step="0.01"
                value={formData.average_price}
                onChange={(e) => setFormData({ ...formData, average_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_price">
                Preço Atual {!canFetchPriceFromAPI(formData.asset_class) && "*"}
              </Label>
              <Input
                id="current_price"
                type="number"
                step="0.01"
                value={formData.current_price}
                onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                required={!canFetchPriceFromAPI(formData.asset_class)}
                placeholder={canFetchPriceFromAPI(formData.asset_class) ? "Automático via API" : ""}
              />
              {canFetchPriceFromAPI(formData.asset_class) && (
                <p className="text-xs text-muted-foreground">
                  Opcional. O preço será atualizado automaticamente com o preço de mercado.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="broker">Corretora</Label>
              <Input
                id="broker"
                placeholder="Ex: BTG, XP, etc."
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
              />
            </div>
            {(formData.asset_class === "Renda Variável" || formData.asset_class === "Fundos de Investimento") && (
              <div className="space-y-2">
                <Label htmlFor="sector">Setor</Label>
                <Input
                  id="sector"
                  placeholder="Ex: Tecnologia"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
