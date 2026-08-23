import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, CalendarDays, TrendingUp, DollarSign, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdvisorMetrics {
  advisor_id: string;
  advisor_name: string;
  advisor_email: string;
  total_clients: number;
  total_interactions: number;
  interactions_last_30_days: number;
  new_clients_last_30_days: number;
  total_aum: number;
  total_meetings: number;
  meetings_last_30_days: number;
  total_deals: number;
  active_deals: number;
}

export const AdvisorPerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<AdvisorMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("advisor_performance_metrics")
        .select("*")
        .order("total_aum", { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching advisor metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
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
      <div>
        <h2 className="text-2xl font-bold">Performance dos Assessores</h2>
        <p className="text-muted-foreground">
          Métricas de intensidade comercial e interação com clientes
        </p>
      </div>

      <div className="grid gap-6">
        {metrics.map((advisor) => (
          <Card key={advisor.advisor_id} className="card-hover">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{advisor.advisor_name || "Nome não informado"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{advisor.advisor_email}</p>
                </div>
                <Badge variant="secondary" className="text-lg font-semibold">
                  {formatCurrency(advisor.total_aum)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Clientes</span>
                  </div>
                  <p className="text-2xl font-semibold">{advisor.total_clients}</p>
                  {advisor.new_clients_last_30_days > 0 && (
                    <p className="text-xs text-green-600">
                      +{advisor.new_clients_last_30_days} últimos 30 dias
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs">Interações</span>
                  </div>
                  <p className="text-2xl font-semibold">{advisor.total_interactions}</p>
                  <p className="text-xs text-muted-foreground">
                    {advisor.interactions_last_30_days} últimos 30 dias
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs">Reuniões</span>
                  </div>
                  <p className="text-2xl font-semibold">{advisor.total_meetings}</p>
                  <p className="text-xs text-muted-foreground">
                    {advisor.meetings_last_30_days} últimos 30 dias
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-xs">Negócios</span>
                  </div>
                  <p className="text-2xl font-semibold">{advisor.total_deals}</p>
                  <p className="text-xs text-primary">
                    {advisor.active_deals} ativos
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Intensidade</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {advisor.total_clients > 0 
                      ? (advisor.interactions_last_30_days / advisor.total_clients).toFixed(1)
                      : "0.0"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    interações/cliente
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Ticket Médio</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {advisor.total_clients > 0 
                      ? formatCurrency(advisor.total_aum / advisor.total_clients)
                      : formatCurrency(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    por cliente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {metrics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum assessor encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};