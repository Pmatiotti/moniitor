import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, Eye } from "lucide-react";
import { useState } from "react";
import { AdvisorPlanDetailsDialog } from "./AdvisorPlanDetailsDialog";

interface FinancialPlan {
  id: string;
  client_id: string;
  advisor_id: string;
  plan_type: string;
  title: string;
  description: string | null;
  parameters: any;
  recommendations: any[];
  status: string;
  reviewed_by_client_at: string | null;
  created_at: string;
  updated_at: string;
  clients: {
    name: string;
    email: string | null;
  };
}

export const AdvisorPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState<FinancialPlan | null>(null);

  const { data: plans, isLoading } = useQuery<FinancialPlan[]>({
    queryKey: ['client-financial-plans'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Primeiro busca planos vinculados diretamente ao user.id (linked_user_id)
      const linkedPlansResult = await (supabase as any)
        .from('financial_plans')
        .select('*')
        .eq('linked_user_id', user.id)
        .order('created_at', { ascending: false });

      const linkedPlans = linkedPlansResult.data || [];

      // Busca pelo client_id se o usuário for um cliente manual
      let clientResult = await (supabase as any)
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Se não encontrar, tenta pelo email
      if (!clientResult.data && user.email) {
        clientResult = await (supabase as any)
          .from('clients')
          .select('id')
          .ilike('email', user.email)
          .maybeSingle();
      }

      let manualClientPlans: FinancialPlan[] = [];
      if (clientResult.data) {
        const plansResult = await (supabase as any)
          .from('financial_plans')
          .select(`
            *,
            clients(name, email)
          `)
          .eq('client_id', clientResult.data.id)
          .order('created_at', { ascending: false });

        if (!plansResult.error) {
          manualClientPlans = plansResult.data || [];
        }
      }

      // Combinar planos, removendo duplicatas por id
      const allPlans = [...linkedPlans, ...manualClientPlans];
      const uniquePlans = allPlans.reduce((acc, plan) => {
        if (!acc.find((p: FinancialPlan) => p.id === plan.id)) {
          acc.push(plan);
        }
        return acc;
      }, [] as FinancialPlan[]);

      return uniquePlans.sort((a: FinancialPlan, b: FinancialPlan) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const handleMarkAsReviewed = async (planId: string) => {
    const updateResult = await (supabase as any)
      .from('financial_plans')
      .update({ reviewed_by_client_at: new Date().toISOString() })
      .eq('id', planId);

    if (!updateResult.error) {
      // Refetch plans
      window.location.reload();
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Carregando planos...</div>;
  }

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum plano compartilhado</h3>
          <p className="text-muted-foreground">
            Seu assessor ainda não criou nenhum plano financeiro para você.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPlanTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      retirement: "Aposentadoria",
      succession: "Sucessão",
      tax: "Otimização Fiscal",
      cashflow: "Fluxo de Caixa",
      risk: "Análise de Risco"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string, reviewedAt: string | null) => {
    if (reviewedAt) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Revisado</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Aguardando Revisão</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Planos Criados pelo Seu Assessor</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Revise as recomendações e estratégias personalizadas para seus objetivos
        </p>
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{getPlanTypeLabel(plan.plan_type)}</Badge>
                    {getStatusBadge(plan.status, plan.reviewed_by_client_at)}
                  </div>
                  <CardTitle className="text-xl">{plan.title}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Criado em {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  {!plan.reviewed_by_client_at && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsReviewed(plan.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Revisado
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPlan && (
        <AdvisorPlanDetailsDialog
          plan={selectedPlan}
          open={!!selectedPlan}
          onOpenChange={(open) => !open && setSelectedPlan(null)}
        />
      )}
    </div>
  );
};
