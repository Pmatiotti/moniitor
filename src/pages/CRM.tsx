import { useState, lazy, Suspense, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, ClipboardList, TrendingUp, FileDown, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AddClientDialog } from "@/components/crm/AddClientDialog";
import { EditClientDialog } from "@/components/crm/EditClientDialog";
import { ClientsTable } from "@/components/crm/ClientsTable";
import { ClientDetailsPanel } from "@/components/crm/ClientDetailsPanel";
import { ClientSearchFilters } from "@/components/crm/ClientSearchFilters";
import { SendClientInvitationDialog } from "@/components/crm/SendClientInvitationDialog";
import { generateCRMReport } from "@/lib/pdf-reports";
import { useToast } from "@/hooks/use-toast";


// Lazy load dos componentes pesados
const AdvisorAnalytics = lazy(() => import("@/components/crm/AdvisorAnalytics").then(m => ({ default: m.AdvisorAnalytics })));
const AdvisorAlertsPanel = lazy(() => import("@/components/crm/AdvisorAlertsPanel").then(m => ({ default: m.AdvisorAlertsPanel })));
const NextActionsWidget = lazy(() => import("@/components/crm/NextActionsWidget").then(m => ({ default: m.NextActionsWidget })));
const ConsolidatedCalendar = lazy(() => import("@/components/crm/ConsolidatedCalendar").then(m => ({ default: m.ConsolidatedCalendar })));
const TasksList = lazy(() => import("@/components/crm/TasksList").then(m => ({ default: m.TasksList })));
const InteractionsTimeline = lazy(() => import("@/components/crm/InteractionsTimeline").then(m => ({ default: m.InteractionsTimeline })));
const CRMConsolidatedCharts = lazy(() => import("@/components/crm/CRMConsolidatedCharts").then(m => ({ default: m.CRMConsolidatedCharts })));
const CRMUpcomingDividendsWidget = lazy(() => import("@/components/crm/CRMUpcomingDividendsWidget").then(m => ({ default: m.CRMUpcomingDividendsWidget })));
const CRMMaturityWidget = lazy(() => import("@/components/crm/CRMMaturityWidget").then(m => ({ default: m.CRMMaturityWidget })));
const CRMAssetConcentrationCard = lazy(() => import("@/components/crm/CRMAssetConcentrationCard").then(m => ({ default: m.CRMAssetConcentrationCard })));
const CRMFixedIncomeRatesCard = lazy(() => import("@/components/crm/CRMFixedIncomeRatesCard").then(m => ({ default: m.CRMFixedIncomeRatesCard })));

// Loading component
const TabLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  portfolio_value: number;
  notes: string;
  risk_profile: string | null;
  investment_objectives: string | null;
  monthly_income: number | null;
  onboarding_date: string | null;
  last_portfolio_update: string | null;
  contact_frequency?: string | null;
  user_id?: string | null;
}

const CRM = () => {
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // React Query com cache de 5 minutos - busca clientes manuais + clientes vinculados
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-clients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Buscar clientes cadastrados manualmente pelo assessor
      const { data: manualClients, error: manualError } = await supabase
        .from("clients")
        .select("id, name, email, phone, status, portfolio_value, notes, risk_profile, investment_objectives, monthly_income, onboarding_date, last_portfolio_update, user_id, contact_frequency")
        .eq("advisor_id", user.id)
        .order("name");

      if (manualError) {
        console.error("Error fetching manual clients:", manualError);
        throw manualError;
      }

      // Buscar links de clientes vinculados ao assessor
      const { data: linkedClientLinks, error: linkedError } = await supabase
        .from("client_advisor_links")
        .select("client_id, status")
        .eq("advisor_id", user.id)
        .eq("status", "active");

      if (linkedError) {
        console.error("Error fetching client links:", linkedError);
        throw linkedError;
      }

      // Criar mapa de clientes manuais por user_id para evitar duplicatas
      const manualClientsByUserId = new Map<string, boolean>();
      manualClients?.forEach(client => {
        if (client.user_id) {
          manualClientsByUserId.set(client.user_id, true);
        }
      });

      // Filtrar links que não estão já nos clientes manuais
      const newLinkedClientIds = (linkedClientLinks || [])
        .filter(link => !manualClientsByUserId.has(link.client_id))
        .map(link => link.client_id);

      // Se houver clientes vinculados novos, buscar seus profiles e calcular portfolio_value
      let linkedClientsFormatted: Client[] = [];
      if (newLinkedClientIds.length > 0) {
        const { data: linkedProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", newLinkedClientIds);

        if (profilesError) {
          console.error("Error fetching linked profiles:", profilesError);
        } else {
          // Para cada cliente vinculado, buscar seus assets e calcular o valor do portfólio
          const clientsWithPortfolio = await Promise.all(
            (linkedProfiles || []).map(async (profile) => {
              // Buscar assets do cliente vinculado
              const { data: assets } = await supabase
                .from("assets")
                .select("quantity, current_price, average_price")
                .eq("user_id", profile.id);

              // Calcular valor total do portfólio
              const portfolioValue = (assets || []).reduce((sum, asset) => {
                const price = Number(asset.current_price) || Number(asset.average_price) || 0;
                const qty = Number(asset.quantity) || 0;
                return sum + (price * qty);
              }, 0);

              // Buscar última atualização de asset
              const { data: lastAsset } = await supabase
                .from("assets")
                .select("updated_at")
                .eq("user_id", profile.id)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              return {
                id: profile.id,
                name: profile.full_name || profile.email?.split('@')[0] || 'Sem nome',
                email: profile.email || '',
                phone: profile.phone || '',
                status: 'active',
                portfolio_value: portfolioValue,
                notes: '',
                risk_profile: null,
                investment_objectives: null,
                monthly_income: null,
                onboarding_date: null,
                last_portfolio_update: lastAsset?.updated_at?.split('T')[0] || null,
              };
            })
          );
          linkedClientsFormatted = clientsWithPortfolio;
        }
      }

      // Combinar ambas as listas
      const allClients = [...(manualClients || []), ...linkedClientsFormatted];
      
      // Ordenar por nome
      return allClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Garbage collection após 10 minutos
  });

  // Memoizar IDs dos clientes para os componentes consolidados
  const clientIds = useMemo(() => clients.map(c => c.id), [clients]);

  // Memoizar cálculos pesados
  const stats = useMemo(() => {
    const totalPortfolioValue = clients.reduce((sum, client) => sum + Number(client.portfolio_value || 0), 0);
    const activeClients = clients.filter(c => c.status === 'active').length;
    const newClients = clients.filter(c => c.status === 'novo').length;
    return { totalPortfolioValue, activeClients, newClients };
  }, [clients]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleGeneratePDF = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const advisorName = user?.email || 'Assessor';
      
      generateCRMReport(clients, advisorName);
      
      toast({
        title: "Relatório gerado",
        description: "O relatório de CRM foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">CRM</h1>
            <p className="text-muted-foreground">Gestão completa de clientes, pipeline e tarefas</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setInviteDialogOpen(true)} variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Cliente
            </Button>
            <Button onClick={handleGeneratePDF} variant="outline" disabled={clients.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Gerar PDF
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.newClients} novos clientes este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patrimônio Consolidado</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.totalPortfolioValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total sob assessoria
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <ClipboardList className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 overflow-x-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="consolidated">Consolidado</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="interactions">Interações</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Suspense fallback={<TabLoading />}>
              <AdvisorAnalytics 
                onClientSelect={async (clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  if (client) {
                    setSelectedClient(client);
                    setShowDetailsPanel(true);
                  } else {
                    const { data } = await supabase
                      .from('clients')
                      .select('*')
                      .eq('id', clientId)
                      .maybeSingle();
                    if (data) {
                      setSelectedClient(data);
                      setShowDetailsPanel(true);
                    }
                  }
                }}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="consolidated">
            <Suspense fallback={<TabLoading />}>
              <div className="space-y-6">
                <CRMConsolidatedCharts clientIds={clientIds} />
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <CRMUpcomingDividendsWidget 
                    clientIds={clientIds}
                    onClientSelect={async (clientId) => {
                      const client = clients.find(c => c.id === clientId);
                      if (client) {
                        setSelectedClient(client);
                        setShowDetailsPanel(true);
                      }
                    }}
                  />
                  <CRMMaturityWidget 
                    clientIds={clientIds}
                    onClientSelect={async (clientId) => {
                      const client = clients.find(c => c.id === clientId);
                      if (client) {
                        setSelectedClient(client);
                        setShowDetailsPanel(true);
                      }
                    }}
                  />
                  <CRMFixedIncomeRatesCard clientIds={clientIds} />
                </div>
                
                <CRMAssetConcentrationCard clientIds={clientIds} />
              </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Clientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ClientSearchFilters clients={clients} onFilter={setFilteredClients} />
                {isLoading ? (
                  <TabLoading />
                ) : (
                  <ClientsTable 
                    clients={filteredClients.length > 0 ? filteredClients : clients}
                    onRefresh={() => refetch()} 
                    onSelectClient={(client) => {
                      setSelectedClient(client);
                      setShowDetailsPanel(true);
                    }}
                    onEditClient={(client) => {
                      setEditingClient(client);
                      setEditDialogOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Suspense fallback={<TabLoading />}>
              <NextActionsWidget showClientName limit={20} />
            </Suspense>
          </TabsContent>

          <TabsContent value="alerts">
            <Suspense fallback={<TabLoading />}>
              <AdvisorAlertsPanel 
                onClientSelect={async (clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  if (client) {
                    setSelectedClient(client);
                    setShowDetailsPanel(true);
                  } else {
                    const { data } = await supabase
                      .from('clients')
                      .select('*')
                      .eq('id', clientId)
                      .maybeSingle();
                    if (data) {
                      setSelectedClient(data);
                      setShowDetailsPanel(true);
                    }
                  }
                }}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="calendar">
            <Suspense fallback={<TabLoading />}>
              <ConsolidatedCalendar clients={clients} />
            </Suspense>
          </TabsContent>

          <TabsContent value="tasks">
            <Suspense fallback={<TabLoading />}>
              <TasksList clients={clients} />
            </Suspense>
          </TabsContent>

          <TabsContent value="interactions">
            <Suspense fallback={<TabLoading />}>
              <InteractionsTimeline clients={clients} />
            </Suspense>
          </TabsContent>
        </Tabs>

        <AddClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => refetch()}
        />

        {showDetailsPanel && selectedClient && (
          <ClientDetailsPanel
            client={selectedClient}
            onClose={() => setShowDetailsPanel(false)}
            onClientUpdated={() => refetch()}
          />
        )}

        {editingClient && (
          <EditClientDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            client={editingClient}
            onSuccess={() => refetch()}
          />
        )}

        <SendClientInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </AppLayout>
  );
};

export default CRM;
