import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Shield, 
  Calculator, 
  Wallet,
  FileText 
} from "lucide-react";

interface AdvisorPlanDetailsDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdvisorPlanDetailsDialog = ({
  plan,
  open,
  onOpenChange,
}: AdvisorPlanDetailsDialogProps) => {
  const getPlanIcon = (type: string) => {
    const icons: Record<string, any> = {
      retirement: TrendingUp,
      succession: FileText,
      tax: Calculator,
      cashflow: Wallet,
      risk: Shield,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-6 w-6" />;
  };

  const getPlanTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      retirement: "Planejamento de Aposentadoria",
      succession: "Planejamento Sucessório",
      tax: "Otimização Fiscal",
      cashflow: "Projeção de Fluxo de Caixa",
      risk: "Análise de Risco"
    };
    return types[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getPlanIcon(plan.plan_type)}
            </div>
            <div>
              <DialogTitle className="text-2xl">{plan.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getPlanTypeLabel(plan.plan_type)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {plan.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrição</h3>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>
          )}

          {plan.parameters && Object.keys(plan.parameters).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parâmetros do Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(plan.parameters).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium">
                        {typeof value === 'number' 
                          ? value.toLocaleString('pt-BR')
                          : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {plan.recommendations && plan.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Recomendações do Assessor</h3>
              <div className="space-y-3">
                {plan.recommendations.map((rec: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge className="mt-1">{idx + 1}</Badge>
                        <div className="flex-1">
                          <p className="font-medium mb-1">{rec.title}</p>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                          {rec.priority && (
                            <Badge variant="outline" className="mt-2">
                              Prioridade: {rec.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>Criado em: {new Date(plan.created_at).toLocaleString('pt-BR')}</p>
            {plan.reviewed_by_client_at && (
              <p className="text-green-600">
                Revisado em: {new Date(plan.reviewed_by_client_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
