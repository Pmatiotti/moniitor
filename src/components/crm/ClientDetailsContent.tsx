import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Wallet,
  TrendingUp,
  Target,
  MessageSquare,
  PieChart,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  Video,
  ClipboardList,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Client } from "@/pages/CRM";
import { ClientHealthScore } from "./ClientHealthScore";
import { QuickActionsBar } from "./QuickActionsBar";
import { AddInteractionDialog } from "./AddInteractionDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { NextActionsWidget } from "./NextActionsWidget";
import { InteractionDetailDialog } from "./InteractionDetailDialog";
import { ClientPortfolioView } from "./ClientPortfolioView";
import { ClientPluggyFinances } from "./ClientPluggyFinances";
import { ClientGoalsView } from "./ClientGoalsView";
import { WealthPlanningPanel } from "./WealthPlanningPanel";

import { ClientAllocationCharts } from "./ClientAllocationCharts";
import { ClientMaturityWidget } from "./ClientMaturityWidget";
import { ClientUpcomingDividendsWidget } from "./ClientUpcomingDividendsWidget";
import { ClientFixedIncomeRatesCard } from "./ClientFixedIncomeRatesCard";
import { ClientGoalsSummaryCard } from "./ClientGoalsSummaryCard";
import { PatrimonyDashboard } from "@/components/patrimony/PatrimonyDashboard";

interface ClientDetailsContentProps {
  client: Client;
  isFullPage?: boolean;
  onEdit?: () => void;
}

export const ClientDetailsContent = ({ client, isFullPage = false, onEdit }: ClientDetailsContentProps) => {
  const [healthScore, setHealthScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [goalsKey, setGoalsKey] = useState(0);
  const [recentInteractions, setRecentInteractions] = useState<any[]>([]);
  const [scheduledInteractions, setScheduledInteractions] = useState<any[]>([]);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchHealthScore();
    fetchRecentInteractions();
  }, [client.id]);

  const fetchHealthScore = async () => {
    try {
      const { data, error } = await supabase
        .from("client_health_scores")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar health score:", error);
      }

      setHealthScore(data || null);
    } catch (error) {
      console.error("Erro ao buscar health score:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("client_id", client.id)
        .order("interaction_date", { ascending: false });

      if (error) throw error;
      
      const all = data || [];
      setScheduledInteractions(all.filter((i: any) => i.status === "scheduled"));
      setRecentInteractions(all.filter((i: any) => i.status !== "scheduled").slice(0, 5));
    } catch (error) {
      console.error("Erro ao buscar interações:", error);
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
      fetchRecentInteractions();
    } catch (error) {
      console.error("Erro ao concluir interação:", error);
    }
  };

  const getInteractionIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone, email: Mail, meeting: CalendarIcon,
      message: MessageSquare, video_call: Video,
    };
    return icons[type] || ClipboardList;
  };

  const getInteractionLabel = (type: string) => {
    const labels: Record<string, string> = {
      call: "Ligação", email: "Email", meeting: "Reunião",
      message: "Mensagem", video_call: "Videochamada",
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRiskProfileBadge = (profile: string | null) => {
    if (!profile) return null;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      conservador: "secondary",
      moderado: "default",
      arrojado: "destructive",
    };
    return (
      <Badge variant={variants[profile.toLowerCase()] || "default"}>{profile}</Badge>
    );
  };

  return (
    <div className={isFullPage ? "p-6 max-w-7xl mx-auto" : "p-6 space-y-6"}>
      {/* Header do Cliente */}
      <div className={isFullPage ? "mb-6" : ""}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {getRiskProfileBadge(client.risk_profile)}
          <Badge variant={client.status === "active" ? "default" : "secondary"}>
            {client.status === "active" ? "Ativo" : client.status}
          </Badge>
          {client.phone && (
            <span className="text-sm text-muted-foreground">{client.phone}</span>
          )}
        </div>
        <QuickActionsBar client={client} onEdit={onEdit} onInteractionAdded={fetchRecentInteractions} />
      </div>

      <div className="space-y-6">
        {/* Resumo Executivo */}
        <div className={`grid gap-4 ${isFullPage ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Patrimônio</p>
                  <p className="text-base font-bold truncate">
                    {formatCurrency(Number(client.portfolio_value || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Renda Mensal</p>
                  <p className="text-base font-bold truncate">
                    {client.monthly_income
                      ? formatCurrency(Number(client.monthly_income))
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última Atualização</p>
                  <p className="text-sm font-medium">
                    {client.last_portfolio_update
                      ? new Date(client.last_portfolio_update).toLocaleDateString("pt-BR")
                      : "Nunca"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análises do Portfólio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Análises do Portfólio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gráficos de Alocação */}
            <ClientAllocationCharts clientId={client.id} />
            
            {/* Widgets de Vencimentos, Proventos e Taxas */}
            <div className={`grid gap-4 ${isFullPage ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              <ClientMaturityWidget clientId={client.id} />
              <ClientUpcomingDividendsWidget clientId={client.id} />
              <ClientFixedIncomeRatesCard clientId={client.id} />
            </div>
            
            {/* Resumo de Metas */}
            <ClientGoalsSummaryCard clientId={client.id} />
          </CardContent>
        </Card>

        {/* Health Score */}
        {healthScore && <ClientHealthScore score={healthScore} />}

        {/* Próximas Ações */}
        <NextActionsWidget clientId={client.id} />

        {/* Atividades Agendadas */}
        {scheduledInteractions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Atividades Agendadas
                <Badge variant="secondary">{scheduledInteractions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scheduledInteractions.map((interaction) => {
                  const Icon = getInteractionIcon(interaction.interaction_type);
                  return (
                    <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => { setSelectedInteraction(interaction); setDetailDialogOpen(true); }}>
                       <Checkbox
                        checked={false}
                        onCheckedChange={() => handleCompleteInteraction(interaction.id)}
                        className="mt-1"
                      />
                      <div className="p-2 rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{interaction.subject}</p>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {getInteractionLabel(interaction.interaction_type)}
                          </Badge>
                        </div>
                        {interaction.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {interaction.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(interaction.interaction_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Últimas Interações */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Últimas Interações
              </CardTitle>
              <Button size="sm" onClick={() => setInteractionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Registrar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInteractions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma interação registrada
              </p>
            ) : (
              <div className="space-y-3">
                {recentInteractions.map((interaction) => {
                  const Icon = getInteractionIcon(interaction.interaction_type);
                  return (
                    <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setSelectedInteraction(interaction); setDetailDialogOpen(true); }}>
                       <div className="p-2 rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{interaction.subject}</p>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {getInteractionLabel(interaction.interaction_type)}
                          </Badge>
                        </div>
                        {interaction.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {interaction.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(interaction.interaction_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AddInteractionDialog
          clientId={client.id}
          open={interactionDialogOpen}
          onOpenChange={setInteractionDialogOpen}
          onSuccess={fetchRecentInteractions}
        />

        <InteractionDetailDialog
          interaction={selectedInteraction}
          clientName={client.name}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />

        {/* Tabs com Detalhes */}
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
            <TabsTrigger value="openfinance">Open Finance</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
            <TabsTrigger value="planning">Planejamento</TabsTrigger>
            <TabsTrigger value="patrimony">Patrimônio</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4 mt-6">
            <ClientPortfolioView
              clientId={client.id}
              clientName={client.name}
              onPortfolioUpdate={() => {}}
            />
          </TabsContent>

          <TabsContent value="openfinance" className="space-y-4 mt-6">
            <ClientPluggyFinances clientId={client.id} />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-6">
            <ClientGoalsView key={goalsKey} clientId={client.id} />
          </TabsContent>

          <TabsContent value="planning" className="space-y-4 mt-6">
            <WealthPlanningPanel 
              client={client} 
              onGoalCreated={() => setGoalsKey(prev => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="patrimony" className="space-y-4 mt-6">
            <PatrimonyDashboard clientId={client.id} />
          </TabsContent>
        </Tabs>

        {/* Informações Adicionais */}
        {(client.notes || client.investment_objectives) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {client.investment_objectives && (
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Objetivos de Investimento
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {client.investment_objectives}
                  </p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Observações
                  </p>
                  <p className="text-sm text-muted-foreground">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
