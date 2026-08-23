import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddLiabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string;
}

const CATEGORIES = [
  { value: "financiamento_imobiliario", label: "Financiamento Imobiliário" },
  { value: "financiamento_veicular", label: "Financiamento Veicular" },
  { value: "emprestimo_pessoal", label: "Empréstimo Pessoal" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "outros", label: "Outras Dívidas" },
];

const CREDITOR_TYPES = [
  { value: "banco", label: "Banco" },
  { value: "financeira", label: "Financeira" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
  { value: "outros", label: "Outros" },
];

export const AddLiabilityDialog = ({
  open,
  onOpenChange,
  onSuccess,
  clientId,
}: AddLiabilityDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [paidInstallments, setPaidInstallments] = useState("");
  const [creditorName, setCreditorName] = useState("");
  const [creditorType, setCreditorType] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch patrimony assets for linking
  const { data: patrimonyAssets } = useQuery({
    queryKey: ["patrimony-assets-for-linking", clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("patrimony_assets")
        .select("id, name, category")
        .eq("is_active", true);

      if (clientId) {
        query = query.eq("client_id", clientId);
      } else {
        query = query.eq("user_id", user.id).is("client_id", null);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const resetForm = () => {
    setCategory("");
    setName("");
    setDescription("");
    setOriginalValue("");
    setCurrentBalance("");
    setInterestRate("");
    setStartDate("");
    setEndDate("");
    setLinkedAssetId("");
    setInstallmentValue("");
    setTotalInstallments("");
    setPaidInstallments("");
    setCreditorName("");
    setCreditorType("");
    setNotes("");
  };

  const formatCurrencyInput = (value: string): string => {
    const numericValue = value.replace(/\D/g, "");
    const numberValue = parseInt(numericValue || "0", 10) / 100;
    return numberValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSubmit = async () => {
    if (!category || !name || !originalValue || !currentBalance) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const liabilityData = {
        user_id: user.id,
        client_id: clientId || null,
        category,
        name,
        description: description || null,
        original_value: parseCurrency(originalValue),
        current_balance: parseCurrency(currentBalance),
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        linked_asset_id: linkedAssetId && linkedAssetId !== "none" ? linkedAssetId : null,
        installment_value: installmentValue ? parseCurrency(installmentValue) : null,
        total_installments: totalInstallments ? parseInt(totalInstallments) : null,
        paid_installments: paidInstallments ? parseInt(paidInstallments) : 0,
        creditor_name: creditorName || null,
        creditor_type: creditorType || null,
        notes: notes || null,
        is_active: true,
        source: "manual",
      };

      const { error } = await supabase
        .from("patrimony_liabilities")
        .insert(liabilityData);

      if (error) throw error;

      toast({
        title: "Passivo adicionado",
        description: "O passivo foi registrado com sucesso.",
      });

      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showInstallmentFields = ["financiamento_imobiliario", "financiamento_veicular", "emprestimo_pessoal"].includes(category);
  const showAssetLink = ["financiamento_imobiliario", "financiamento_veicular"].includes(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Passivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome / Descrição *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Financiamento do apartamento"
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Original *</Label>
              <Input
                value={originalValue}
                onChange={(e) => setOriginalValue(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Devedor Atual *</Label>
              <Input
                value={currentBalance}
                onChange={(e) => setCurrentBalance(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Taxa de juros */}
          <div className="space-y-2">
            <Label>Taxa de Juros Anual (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="Ex: 12.5"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Previsão de Quitação</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Parcelas - apenas para financiamentos */}
          {showInstallmentFields && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor da Parcela</Label>
                  <Input
                    value={installmentValue}
                    onChange={(e) => setInstallmentValue(formatCurrencyInput(e.target.value))}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de Parcelas</Label>
                  <Input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    placeholder="Ex: 360"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Parcelas Pagas</Label>
                <Input
                  type="number"
                  value={paidInstallments}
                  onChange={(e) => setPaidInstallments(e.target.value)}
                  placeholder="Ex: 24"
                />
              </div>
            </>
          )}

          {/* Vinculação a ativo */}
          {showAssetLink && patrimonyAssets && patrimonyAssets.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a Bem Patrimonial</Label>
              <Select value={linkedAssetId} onValueChange={setLinkedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bem (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {patrimonyAssets.map((asset: any) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Credor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Credor</Label>
              <Input
                value={creditorName}
                onChange={(e) => setCreditorName(e.target.value)}
                placeholder="Ex: Banco Itaú"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Credor</Label>
              <Select value={creditorType} onValueChange={setCreditorType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CREDITOR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição adicional */}
          <div className="space-y-2">
            <Label>Descrição Adicional</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre o passivo..."
              rows={2}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas pessoais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar Passivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
