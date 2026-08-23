import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddPatrimonyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string;
}

const CATEGORIES = [
  { value: 'imovel', label: 'Imóvel' },
  { value: 'participacao_societaria', label: 'Participação Societária' },
  { value: 'bem_movel', label: 'Bem Móvel' },
  { value: 'direitos', label: 'Direitos' },
  { value: 'outros', label: 'Outros' },
];

const SUBCATEGORIES: Record<string, string[]> = {
  imovel: ['Casa', 'Apartamento', 'Terreno', 'Imóvel Comercial', 'Imóvel Rural', 'Sala/Conjunto', 'Galpão', 'Outro'],
  participacao_societaria: ['Quotas de Capital', 'Ações', 'Participação em Holding', 'Outro'],
  bem_movel: ['Veículo', 'Joia', 'Obra de Arte', 'Coleção', 'Móveis', 'Equipamentos', 'Outro'],
  direitos: ['Crédito a Receber', 'Royalties', 'Herança Pendente', 'Ação Judicial', 'Outro'],
  outros: ['Outro'],
};

export const AddPatrimonyDialog = ({
  open,
  onOpenChange,
  onSuccess,
  clientId,
}: AddPatrimonyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("imovel");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subcategory: "",
    acquisition_value: "",
    current_value: "",
    acquisition_date: "",
    // Imóvel
    address: "",
    city: "",
    state: "",
    registration_number: "",
    // Participação societária
    company_name: "",
    company_cnpj: "",
    ownership_percentage: "",
    // Bem móvel
    brand: "",
    model: "",
    serial_number: "",
    // Notas
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const insertData: any = {
        user_id: user.id,
        client_id: clientId || null,
        category,
        subcategory: formData.subcategory,
        name: formData.name,
        description: formData.description,
        acquisition_value: parseFloat(formData.acquisition_value.replace(/\D/g, '')) / 100 || 0,
        current_value: formData.current_value 
          ? parseFloat(formData.current_value.replace(/\D/g, '')) / 100 
          : null,
        acquisition_date: formData.acquisition_date || null,
        notes: formData.notes || null,
        source: 'manual',
      };

      // Add category-specific fields
      if (category === 'imovel') {
        insertData.address = formData.address || null;
        insertData.city = formData.city || null;
        insertData.state = formData.state || null;
        insertData.registration_number = formData.registration_number || null;
      } else if (category === 'participacao_societaria') {
        insertData.company_name = formData.company_name || null;
        insertData.company_cnpj = formData.company_cnpj || null;
        insertData.ownership_percentage = formData.ownership_percentage 
          ? parseFloat(formData.ownership_percentage) 
          : null;
      } else if (category === 'bem_movel') {
        insertData.brand = formData.brand || null;
        insertData.model = formData.model || null;
        insertData.serial_number = formData.serial_number || null;
      }

      const { error } = await supabase
        .from('patrimony_assets' as any)
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Bem cadastrado!",
        description: "O patrimônio foi adicionado com sucesso.",
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        subcategory: "",
        acquisition_value: "",
        current_value: "",
        acquisition_date: "",
        address: "",
        city: "",
        state: "",
        registration_number: "",
        company_name: "",
        company_cnpj: "",
        ownership_percentage: "",
        brand: "",
        model: "",
        serial_number: "",
        notes: "",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Bem Patrimonial</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Categoria e Subcategoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={category} onValueChange={(v) => {
                setCategory(v);
                setFormData({ ...formData, subcategory: '' });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select 
                value={formData.subcategory} 
                onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SUBCATEGORIES[category]?.map(sub => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Identificação */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome/Identificação *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Apartamento Barra da Tijuca"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes do bem..."
              rows={2}
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisition_value">Valor de Aquisição *</Label>
              <Input
                id="acquisition_value"
                value={formData.acquisition_value}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  acquisition_value: formatCurrencyInput(e.target.value) 
                })}
                placeholder="R$ 0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_value">Valor Atual</Label>
              <Input
                id="current_value"
                value={formData.current_value}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  current_value: formatCurrencyInput(e.target.value) 
                })}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acquisition_date">Data Aquisição</Label>
              <Input
                id="acquisition_date"
                type="date"
                value={formData.acquisition_date}
                onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
              />
            </div>
          </div>

          {/* Campos específicos por categoria */}
          {category === 'imovel' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium">Dados do Imóvel</h4>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, complemento..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Matrícula</Label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'participacao_societaria' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium">Dados da Empresa</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.company_cnpj}
                    onChange={(e) => setFormData({ ...formData, company_cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Participação (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ownership_percentage}
                  onChange={(e) => setFormData({ ...formData, ownership_percentage: e.target.value })}
                  placeholder="Ex: 25.5"
                />
              </div>
            </div>
          )}

          {category === 'bem_movel' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium">Detalhes do Bem</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº Série/Chassi</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar Bem"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};