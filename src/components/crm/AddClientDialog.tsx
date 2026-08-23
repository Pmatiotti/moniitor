import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CONTACT_FREQUENCIES = [
  { value: "semanal", label: "Semanal (7 dias)" },
  { value: "quinzenal", label: "Quinzenal (15 dias)" },
  { value: "mensal", label: "Mensal (30 dias)" },
  { value: "bimestral", label: "Bimestral (60 dias)" },
  { value: "trimestral", label: "Trimestral (90 dias)" },
];

export const AddClientDialog = ({ open, onOpenChange, onSuccess }: AddClientDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
    portfolio_value: "",
    notes: "",
    risk_profile: "",
    investment_objectives: "",
    monthly_income: "",
    onboarding_date: "",
    contact_frequency: "mensal",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verificar se é admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id) as any;

      const isAdmin = roles?.some((r: any) => r.role === 'admin');
      let organizationId = null;

      // Se não é admin, precisa ter organization_id
      if (!isAdmin) {
        const roleData = roles?.find((r: any) => r.organization_id);
        if (!roleData?.organization_id) {
          throw new Error("Usuário não está associado a uma organização. Por favor, contate o administrador.");
        }
        organizationId = roleData.organization_id;
      }

      const { data: newClient, error } = await supabase.from("clients").insert({
        advisor_id: user.id,
        organization_id: organizationId,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        status: formData.status,
        portfolio_value: formData.portfolio_value ? parseFloat(formData.portfolio_value) : null,
        notes: formData.notes || null,
        risk_profile: formData.risk_profile || null,
        investment_objectives: formData.investment_objectives || null,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : null,
        onboarding_date: formData.onboarding_date || null,
        contact_frequency: formData.contact_frequency,
      }).select("id").single();

      if (error) throw error;

      // Criar interação automática de captação
      await supabase.from("interactions").insert({
        client_id: newClient.id,
        advisor_id: user.id,
        interaction_type: "meeting",
        subject: "Captação do cliente",
        description: "Cliente cadastrado no CRM",
        interaction_date: formData.onboarding_date || new Date().toISOString().split('T')[0],
      });

      toast({
        title: "Cliente adicionado!",
        description: "O cliente foi adicionado ao seu CRM.",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        status: "active",
        portfolio_value: "",
        notes: "",
        risk_profile: "",
        investment_objectives: "",
        monthly_income: "",
        onboarding_date: "",
        contact_frequency: "mensal",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar cliente",
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
          <DialogTitle>Adicionar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="João Silva"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio_value">Patrimônio</Label>
              <Input
                id="portfolio_value"
                type="number"
                step="0.01"
                placeholder="1000000.00"
                value={formData.portfolio_value}
                onChange={(e) => setFormData({ ...formData, portfolio_value: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="risk_profile">Perfil de Risco</Label>
              <Select
                value={formData.risk_profile}
                onValueChange={(value) => setFormData({ ...formData, risk_profile: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservador">Conservador</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="arrojado">Arrojado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_income">Renda Mensal</Label>
              <Input
                id="monthly_income"
                type="number"
                step="0.01"
                placeholder="10000.00"
                value={formData.monthly_income}
                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="investment_objectives">Objetivos de Investimento</Label>
            <Textarea
              id="investment_objectives"
              placeholder="Objetivos e expectativas do cliente..."
              value={formData.investment_objectives}
              onChange={(e) => setFormData({ ...formData, investment_objectives: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding_date">Data de Captação</Label>
              <Input
                id="onboarding_date"
                type="date"
                value={formData.onboarding_date}
                onChange={(e) => setFormData({ ...formData, onboarding_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_frequency">Régua de Contato</Label>
              <Select
                value={formData.contact_frequency}
                onValueChange={(value) => setFormData({ ...formData, contact_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Anotações sobre o cliente..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
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
