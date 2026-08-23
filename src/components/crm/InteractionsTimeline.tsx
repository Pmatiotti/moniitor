import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Phone, Mail, MessageSquare, Calendar as CalendarIcon, User, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Interaction {
  id: string;
  client_id: string;
  interaction_type: string;
  subject: string;
  description: string | null;
  interaction_date: string;
}

interface InteractionsTimelineProps {
  clients: Client[];
}

const interactionTypes = [
  { value: "call", label: "Ligação", icon: Phone, color: "text-primary" },
  { value: "email", label: "Email", icon: Mail, color: "text-info" },
  { value: "meeting", label: "Reunião", icon: CalendarIcon, color: "text-success" },
  { value: "message", label: "Mensagem", icon: MessageSquare, color: "text-warning" }
];

export const InteractionsTimeline = ({ clients }: InteractionsTimelineProps) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    client_id: "",
    interaction_type: "call",
    subject: "",
    description: "",
    interaction_date: new Date().toISOString().split('T')[0]
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  useEffect(() => {
    fetchInteractions();
  }, []);

  const fetchInteractions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("advisor_id", user.id)
        .order("interaction_date", { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error("Error fetching interactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const today = new Date().toISOString().split('T')[0];
      const isScheduled = formData.interaction_date > today;

      const { error } = await supabase.from("interactions").insert({
        advisor_id: user.id,
        ...formData,
        status: isScheduled ? "scheduled" : "completed",
      } as any);

      if (error) throw error;

      toast.success("Atividade registrada!");

      setDialogOpen(false);
      setFormData({
        client_id: "",
        interaction_type: "call",
        subject: "",
        description: "",
        interaction_date: new Date().toISOString().split('T')[0]
      });
      fetchInteractions();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar interação");
    }
  };

  const handleCompleteInteraction = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from("interactions")
        .update({ status: "completed" } as any)
        .eq("id", interactionId);

      if (error) throw error;
      toast.success("Atividade concluída!");
      fetchInteractions();
    } catch (error) {
      toast.error("Erro ao concluir atividade");
    }
  };

  const getInteractionIcon = (type: string) => {
    const interactionType = interactionTypes.find(t => t.value === type);
    if (!interactionType) return Phone;
    return interactionType.icon;
  };

  const getInteractionColor = (type: string) => {
    const interactionType = interactionTypes.find(t => t.value === type);
    return interactionType?.color || "text-muted-foreground";
  };

  const getInteractionLabel = (type: string) => {
    const interactionType = interactionTypes.find(t => t.value === type);
    return interactionType?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const scheduledInteractions = interactions.filter((i: any) => i.status === "scheduled");
  const completedInteractions = interactions.filter((i: any) => i.status !== "scheduled");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Atividades</h3>
          <p className="text-sm text-muted-foreground">
            {scheduledInteractions.length} agendadas, {completedInteractions.length} no histórico
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Interação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Interação</DialogTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interaction_type">Tipo *</Label>
                  <Select
                    value={formData.interaction_type}
                    onValueChange={(value) => setFormData({ ...formData, interaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {interactionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interaction_date">Data *</Label>
                  <Input
                    id="interaction_date"
                    type="date"
                    value={formData.interaction_date}
                    onChange={(e) => setFormData({ ...formData, interaction_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Acompanhamento mensal"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes da interação..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Atividades Agendadas */}
      {scheduledInteractions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Agendadas
              <Badge variant="secondary">{scheduledInteractions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledInteractions.map((interaction) => {
              const client = clients.find(c => c.id === interaction.client_id);
              const Icon = getInteractionIcon(interaction.interaction_type);
              const color = getInteractionColor(interaction.interaction_type);
              return (
                <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleCompleteInteraction(interaction.id)}
                    className="mt-1"
                  />
                  <div className={`rounded-full p-2 border-2 ${color} bg-card`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{interaction.subject}</p>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {getInteractionLabel(interaction.interaction_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{client?.name || "Cliente"}</span>
                      <span>•</span>
                      <span>{format(new Date(interaction.interaction_date), "d 'de' MMM", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {completedInteractions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma interação registrada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {completedInteractions.map((interaction, index) => {
                const client = clients.find(c => c.id === interaction.client_id);
                const Icon = getInteractionIcon(interaction.interaction_type);
                const color = getInteractionColor(interaction.interaction_type);
                const isExpanded = expandedIds.has(interaction.id);
                
                return (
                  <div key={interaction.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-2 border-2 ${color} bg-card`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < completedInteractions.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <Card className="flex-1 card-hover cursor-pointer" onClick={() => toggleExpanded(interaction.id)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base font-semibold">{interaction.subject}</CardTitle>
                              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                {getInteractionLabel(interaction.interaction_type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="font-medium">{client?.name || "Cliente não encontrado"}</span>
                              <span>•</span>
                              <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{format(new Date(interaction.interaction_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(interaction.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-4">
                          <div className="border-t pt-4">
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-semibold mb-1.5">Tipo de Interação</h4>
                                <div className="flex items-center gap-2">
                                  <Icon className={`h-4 w-4 ${color}`} />
                                  <span className="text-sm">{getInteractionLabel(interaction.interaction_type)}</span>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-semibold mb-1.5">Cliente</h4>
                                <p className="text-sm text-muted-foreground">{client?.name || "Cliente não encontrado"}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-semibold mb-1.5">Data</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(interaction.interaction_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              
                              {interaction.description && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1.5">Descrição</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                                    {interaction.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
