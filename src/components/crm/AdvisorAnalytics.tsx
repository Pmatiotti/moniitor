import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  CheckSquare,
  Activity,
  AlertCircle,
  RefreshCw,
  Loader2,
  Target,
  Calendar,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Analytics {
  summary: {
    total_clients: number;
    active_clients: number;
    new_clients_last_month: number;
    total_aum: number;
    avg_portfolio_size: number;
  };
  tasks: {
    total_pending: number;
    overdue: number;
    high_priority: number;
  };
  engagement: {
    interactions_last_month: number;
    avg_interactions_per_client: number;
    interactions_by_type: Record<string, number>;
  };
  portfolio_health: {
    avg_score: number;
    distribution: {
      excellent: number;
      good: number;
      attention: number;
      critical: number;
    };
  };
  needs_attention: Array<{
    client_id: string;
    client_name: string;
    reason: string;
    days_since_contact?: number;
    health_score?: number;
  }>;
}

interface AdvisorAnalyticsProps {
  onClientSelect?: (clientId: string) => void;
}

export const AdvisorAnalytics = ({ onClientSelect }: AdvisorAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("advisor-analytics");

      if (error) throw error;

      setAnalytics(data);
    } catch (error) {
      console.error("Erro ao buscar analytics:", error);
      toast.error("Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Erro ao carregar métricas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Dashboard do Assessor</h3>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold">{analytics.summary.active_clients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {analytics.summary.total_clients} totais
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
              <div>
                <p className="text-xs text-muted-foreground">AUM Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics.summary.total_aum)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Média: {formatCurrency(analytics.summary.avg_portfolio_size)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <CheckSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tarefas Pendentes</p>
                <p className="text-2xl font-bold">{analytics.tasks.total_pending}</p>
                <div className="flex gap-2 mt-1">
                  {analytics.tasks.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {analytics.tasks.overdue} atrasadas
                    </Badge>
                  )}
                  {analytics.tasks.high_priority > 0 && (
                    <Badge variant="default" className="text-xs">
                      {analytics.tasks.high_priority} urgentes
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interações (30d)</p>
                <p className="text-2xl font-bold">{analytics.engagement.interactions_last_month}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.engagement.avg_interactions_per_client.toFixed(1)} por cliente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saúde da Carteira */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Saúde das Carteiras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score Médio</span>
              <span className="text-2xl font-bold">
                {analytics.portfolio_health.avg_score.toFixed(0)}
              </span>
            </div>
            <Progress value={analytics.portfolio_health.avg_score} className="h-2" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.portfolio_health.distribution.excellent}
                </div>
                <div className="text-xs text-muted-foreground">Excelente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.portfolio_health.distribution.good}
                </div>
                <div className="text-xs text-muted-foreground">Bom</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {analytics.portfolio_health.distribution.attention}
                </div>
                <div className="text-xs text-muted-foreground">Atenção</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {analytics.portfolio_health.distribution.critical}
                </div>
                <div className="text-xs text-muted-foreground">Crítico</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clientes que Precisam de Atenção */}
      {analytics.needs_attention && analytics.needs_attention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Requerem Atenção ({analytics.needs_attention.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.needs_attention.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => onClientSelect?.(item.client_id)}
                      className="font-medium text-sm text-primary hover:underline cursor-pointer text-left"
                    >
                      {item.client_name}
                    </button>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    {item.days_since_contact !== undefined && (
                      <Badge variant="destructive">
                        {item.days_since_contact} dias
                      </Badge>
                    )}
                    {item.health_score !== undefined && (
                      <Badge variant="secondary">Score: {item.health_score}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
