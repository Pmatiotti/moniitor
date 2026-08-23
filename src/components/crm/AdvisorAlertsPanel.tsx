import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Loader2 } from "lucide-react";

interface AdvisorAlert {
  title: string;
  description: string;
  action: string;
  client_id: string;
  client_name: string;
  priority: "high" | "medium" | "low";
}

interface AdvisorAlertsPanelProps {
  onClientSelect?: (clientId: string) => void;
}

export const AdvisorAlertsPanel = ({ onClientSelect }: AdvisorAlertsPanelProps) => {
  const [alerts, setAlerts] = useState<AdvisorAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("advisor-alerts", {
        body: {},
      });

      if (error) {
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          toast({
            title: "Limite de requisições atingido",
            description: "Aguarde alguns minutos antes de atualizar novamente.",
            variant: "destructive",
          });
        } else if (error.message?.includes("402") || error.message?.includes("payment")) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos no Lovable para usar análise com IA.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        
        // Use fallback alerts if available
        if (data?.fallback_alerts) {
          setAlerts(data.fallback_alerts);
          setLastUpdated(new Date());
        }
        return;
      }

      if (data?.alerts) {
        setAlerts(data.alerts);
        setLastUpdated(new Date());
        toast({
          title: "Alertas atualizados",
          description: `${data.alerts.length} alerta(s) identificado(s)`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      toast({
        title: "Erro ao buscar alertas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <Info className="h-5 w-5 text-warning" />;
      case "low":
        return <CheckCircle2 className="h-5 w-5 text-info" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    const labels: Record<string, string> = {
      high: "Alta Prioridade",
      medium: "Média Prioridade",
      low: "Baixa Prioridade",
    };
    return <Badge variant={variants[priority] || "default"}>{labels[priority] || priority}</Badge>;
  };

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando carteiras dos clientes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Alertas Inteligentes</h3>
          <p className="text-muted-foreground">
            Ações recomendadas com base na análise de portfólios
            {lastUpdated && (
              <span className="text-xs ml-2">
                (Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')})
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchAlerts} disabled={loading} variant="outline">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Alertas
            </>
          )}
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Nenhum alerta no momento! Todas as carteiras estão em ordem.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <Card key={index} className="border-l-4" style={{
              borderLeftColor: alert.priority === "high" 
                ? "hsl(var(--destructive))" 
                : alert.priority === "medium" 
                ? "hsl(var(--warning))" 
                : "hsl(var(--info))"
            }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getPriorityIcon(alert.priority)}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente:{" "}
                        <button
                          onClick={() => onClientSelect?.(alert.client_id)}
                          className="font-medium text-primary hover:underline cursor-pointer"
                        >
                          {alert.client_name}
                        </button>
                      </p>
                    </div>
                  </div>
                  {getPriorityBadge(alert.priority)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Situação:</p>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Ação Recomendada:</p>
                  <p className="text-sm">{alert.action}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};