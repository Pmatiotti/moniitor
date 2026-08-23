import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubClassSelector } from "./SubClassSelector";
import { isFIITicker } from "@/lib/ticker-detection";

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddAssetDialog = ({ open, onOpenChange, onSuccess }: AddAssetDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    asset_name: "",
    asset_class: "Renda Variável",
    sub_class: "",
    quantity: "",
    average_price: "",
    current_price: "",
    currency: "BRL",
    broker: "",
    sector: "",
    application_date: undefined as Date | undefined,
    maturity_date: undefined as Date | undefined,
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

  const showFixedIncomeFields = formData.asset_class === "Renda Fixa";
  const showFundFields = formData.asset_class === "Fundos de Investimento";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const quantity = parseFloat(formData.quantity);
      const averagePrice = parseFloat(formData.average_price);
      const investedAmountValue = formData.invested_amount ? parseFloat(formData.invested_amount) : null;
      const applicationDate = formData.application_date?.toISOString().split('T')[0] || null;

      // Inserir o ativo
      const { data: newAsset, error } = await supabase.from("assets").insert({
        user_id: user.id,
        ticker: formData.ticker,
        asset_name: formData.asset_name,
        asset_class: formData.asset_class,
        sub_class: formData.sub_class || null,
        quantity: quantity,
        average_price: averagePrice,
        current_price: formData.current_price ? parseFloat(formData.current_price) : averagePrice,
        currency: formData.currency,
        broker: formData.broker,
        sector: formData.sector,
        application_date: applicationDate,
        maturity_date: formData.maturity_date?.toISOString().split('T')[0] || null,
        rate: formData.rate || null,
        invested_amount: investedAmountValue,
        cnpj: formData.cnpj ? formData.cnpj.replace(/[.\-\/]/g, "") : null,
      }).select().single();

      if (error) throw error;

      // Registrar o aporte automaticamente (CFA/GIPS compliance)
      const depositAmount = investedAmountValue || (quantity * averagePrice);
      const flowDate = applicationDate || new Date().toISOString().split('T')[0];

      const { error: cashFlowError } = await supabase.from("portfolio_cash_flows").insert({
        user_id: user.id,
        flow_type: 'deposit',
        amount: depositAmount,
        flow_date: flowDate,
        description: `Aporte em ${formData.ticker}`,
        asset_id: newAsset?.id || null
      });

      if (cashFlowError) {
        console.error("Erro ao registrar fluxo de caixa:", cashFlowError);
      }

      // Check if this is a FII and trigger automatic sync
      const isFII = isFIITicker(formData.ticker);

      if (isFII) {
        toast({
          title: "FII adicionado!",
          description: "Buscando dados do fundo automaticamente...",
        });

        // Trigger background sync for FII data
        supabase.functions.invoke("sync-fii-on-insert", {
          body: { 
            ticker: formData.ticker, 
            asset_id: newAsset?.id,
            user_id: user.id 
          },
        }).then((syncResult) => {
          if (syncResult.error) {
            console.error("Erro ao sincronizar FII:", syncResult.error);
          } else if (syncResult.data?.success) {
            console.log("FII sync complete:", syncResult.data);
            toast({
              title: "Dados do FII carregados!",
              description: `${formData.ticker}: preços, dividendos e fundamentos atualizados.`,
            });
          }
        }).catch((err) => {
          console.error("FII sync error:", err);
        });
      } else {
        toast({
          title: "Ativo adicionado!",
          description: "O ativo foi adicionado à sua carteira com sucesso.",
        });
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        ticker: "",
        asset_name: "",
        asset_class: "Renda Variável",
        sub_class: "",
        quantity: "",
        average_price: "",
        current_price: "",
        currency: "BRL",
        broker: "",
        sector: "",
        application_date: undefined,
        maturity_date: undefined,
        rate: "",
        invested_amount: "",
        cnpj: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar ativo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Ativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="asset_name">Nome do Ativo *</Label>
              <Input
                id="asset_name"
                placeholder="Ex: Vale S.A."
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
                onValueChange={(value) => setFormData({ ...formData, asset_class: value, sub_class: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Renda Variável">Renda Variável</SelectItem>
                  <SelectItem value="Renda Fixa">Renda Fixa</SelectItem>
                  <SelectItem value="Fundos de Investimento">Fundos de Investimento</SelectItem>
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

          {showFundFields && (
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Fundo</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Usado para buscar cotas automaticamente na CVM
              </p>
            </div>
          )}

          {showFixedIncomeFields && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Aplicação</Label>
                  <DatePickerInput
                    value={formData.application_date}
                    onChange={(date) => setFormData({ ...formData, application_date: date })}
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <DatePickerInput
                    value={formData.maturity_date}
                    onChange={(date) => setFormData({ ...formData, maturity_date: date })}
                    placeholder="dd/mm/aaaa"
                    toYear={2070}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Taxa/Rentabilidade</Label>
                  <Input
                    id="rate"
                    placeholder="Ex: CDI + 2%, IPCA + 6%, 12% a.a."
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
                    placeholder="Ex: 10000.00"
                    value={formData.invested_amount}
                    onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {(formData.asset_class === "Renda Variável" || formData.asset_class === "Fundos de Investimento") && (
            <div className="space-y-2">
              <Label htmlFor="sector">Setor</Label>
              <Input
                id="sector"
                placeholder="Ex: Mineração"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                placeholder="Ex: 100"
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
                placeholder="Ex: 25.50"
                value={formData.average_price}
                onChange={(e) => setFormData({ ...formData, average_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_price">Preço Atual</Label>
              <Input
                id="current_price"
                type="number"
                step="0.01"
                placeholder="Ex: 27.30"
                value={formData.current_price}
                onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker">Corretora</Label>
              <Input
                id="broker"
                placeholder=""
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
              />
            </div>
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
