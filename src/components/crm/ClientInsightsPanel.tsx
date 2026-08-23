import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  AlertTriangle,
  Info,
  TrendingUp,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface Insight {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
}

interface Recommendation {
  action: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface ClientInsightsPanelProps {
  clientId: string;
  clientName: string;
}

export const ClientInsightsPanel = ({ clientId, clientName }: ClientInsightsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  const analyzeClient = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-insights", {
        body: { clientId },
      });

      if (error) {
        if (error.message?.includes("429") || error.message?.includes("rate_limit")) {
          toast.error("Limite de requisições atingido. Aguarde alguns minutos.");
        } else if (error.message?.includes("402") || error.message?.includes("payment_required")) {
          toast.error("Créditos insuficientes. Adicione créditos ao Lovable.");
        } else {
          throw error;
        }
        return;
      }

      if (data?.analysis) {
        setInsights(data.analysis.insights || []);
        setRecommendations(data.analysis.recommendations || []);
        setLastAnalyzed(new Date());
        toast.success(`Análise concluída para ${clientName}`);
      }
    } catch (error: any) {
      console.error("Erro ao analisar cliente:", error);
      toast.error("Erro ao analisar cliente");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <Info className="h-5 w-5 text-warning" />;
      case "low":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
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
    return (
      <Badge variant={variants[priority] || "default"}>
        {priority === "high" && "Alta"}
        {priority === "medium" && "Média"}
        {priority === "low" && "Baixa"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights com IA
          </CardTitle>
          <Button
            onClick={analyzeClient}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Analisar
              </>
            )}
          </Button>
        </div>
        {lastAnalyzed && (
          <p className="text-xs text-muted-foreground">
            Última análise: {lastAnalyzed.toLocaleString("pt-BR")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!insights.length && !recommendations.length && !loading && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Clique em "Analisar" para obter insights inteligentes sobre este cliente
              usando IA.
            </AlertDescription>
          </Alert>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Observações Principais</h4>
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                {getSeverityIcon(insight.severity)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{insight.type}</p>
                  <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recomendações */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Ações Recomendadas</h4>
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">{rec.action}</p>
                  </div>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
