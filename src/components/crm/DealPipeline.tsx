import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Client } from "@/pages/CRM";

interface Deal {
  id: string;
  client_id: string;
  deal_name: string;
  deal_value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
}

interface DealPipelineProps {
  clients: Client[];
}

const stages = [
  { value: "prospecting", label: "Prospecção", color: "bg-secondary" },
  { value: "qualification", label: "Qualificação", color: "bg-info" },
  { value: "proposal", label: "Proposta", color: "bg-warning" },
  { value: "negotiation", label: "Negociação", color: "bg-primary" },
  { value: "closed_won", label: "Ganho", color: "bg-success" },
  { value: "closed_lost", label: "Perdido", color: "bg-destructive" }
];

export const DealPipeline = ({ clients }: DealPipelineProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    client_id: "",
    deal_name: "",
    deal_value: "",
    stage: "prospecting",
    probability: "0",
    expected_close_date: "",
    notes: ""
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*")
        .eq("advisor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("deal_pipeline").insert({
        advisor_id: user.id,
        ...formData,
        deal_value: formData.deal_value ? parseFloat(formData.deal_value) : null,
        probability: parseInt(formData.probability),
        expected_close_date: formData.expected_close_date || null
      });

      if (error) throw error;

      toast({
        title: "Oportunidade criada!",
        description: "A oportunidade foi adicionada ao pipeline.",
      });

      setDialogOpen(false);
      setFormData({
        client_id: "",
        deal_name: "",
        deal_value: "",
        stage: "prospecting",
        probability: "0",
        expected_close_date: "",
        notes: ""
      });
      fetchDeals();
    } catch (error: any) {
      toast({
        title: "Erro ao criar oportunidade",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(d => d.stage === stage);
  };

  const getTotalValueByStage = (stage: string) => {
    return deals
      .filter(d => d.stage === stage)
      .reduce((sum, d) => sum + Number(d.deal_value || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Pipeline de Vendas</h3>
          <p className="text-sm text-muted-foreground">
            {deals.length} oportunidades ativas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Oportunidade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal_name">Nome da Oportunidade *</Label>
                <Input
                  id="deal_name"
                  placeholder="Ex: Consultoria de Investimentos"
                  value={formData.deal_name}
                  onChange={(e) => setFormData({ ...formData, deal_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal_value">Valor</Label>
                  <Input
                    id="deal_value"
                    type="number"
                    step="0.01"
                    placeholder="100000.00"
                    value={formData.deal_value}
                    onChange={(e) => setFormData({ ...formData, deal_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probabilidade (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">Estágio *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.slice(0, 4).map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Data Esperada</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Anotações sobre a oportunidade..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.value);
          const totalValue = getTotalValueByStage(stage.value);
          
          return (
            <Card key={stage.value} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground font-semibold">
                  {formatCurrency(totalValue)}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageDeals.map((deal) => {
                  const client = clients.find(c => c.id === deal.client_id);
                  return (
                    <Card key={deal.id} className="p-3 hover:border-primary transition-colors">
                      <div className="space-y-1">
                        <p className="text-sm font-medium line-clamp-1">{deal.deal_name}</p>
                        <p className="text-xs text-muted-foreground">{client?.name}</p>
                        {deal.deal_value && (
                          <p className="text-xs font-semibold text-primary">
                            {formatCurrency(Number(deal.deal_value))}
                          </p>
                        )}
                        {deal.probability > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <TrendingUp className="h-3 w-3" />
                            <span>{deal.probability}%</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {stageDeals.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma oportunidade
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
