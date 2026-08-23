import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PLAN_PRICES } from "@/hooks/useSubscription";
import { CreditCard, Check, Loader2, MessageCircle, Crown, X } from "lucide-react";
import { useState } from "react";
import { ContactSalesDialog } from "@/components/subscription/ContactSalesDialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";

const Subscription = () => {
  const { subscription, isLoading, createCheckoutSession, openCustomerPortal } = useSubscription();
  const { currentPlan, limits, assetsCount, goalsCount, getRemainingAIQuestions } = usePlanLimits();
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const plans = [
    {
      name: "Grátis",
      planKey: "free",
      price: "R$ 0",
      period: "para sempre",
      features: [
        "Até 5 ativos na carteira",
        "Histórico de 3 meses",
        "1 meta financeira",
        "3 perguntas à IA/mês",
        "Conteúdo educacional básico",
      ],
      limitations: [
        "Sem sincronização bancária",
        "Sem exportação de dados",
      ],
      priceId: null,
      isFree: true,
    },
    {
      name: "Básico",
      planKey: "investor",
      price: "R$ 29,90",
      period: "por mês",
      features: [
        "Ativos ilimitados",
        "Histórico completo de proventos",
        "10 metas financeiras",
        "20 perguntas à IA/mês",
        "Sincronização bancária",
        "Exportação de dados",
        "Suporte por email",
      ],
      priceId: PLAN_PRICES.investor,
    },
    {
      name: "Pro",
      planKey: "pro",
      price: "R$ 69,90",
      period: "por mês",
      features: [
        "Tudo do Básico",
        "Metas ilimitadas",
        "100 perguntas à IA/mês",
        "Alertas inteligentes",
        "Planejamento financeiro",
        "Relatórios avançados",
        "Suporte prioritário",
      ],
      priceId: PLAN_PRICES.pro,
      recommended: true,
    },
    {
      name: "Professional",
      planKey: "professional",
      price: "Sob consulta",
      period: "",
      features: [
        "Tudo do Pro",
        "IA ilimitada",
        "Gestão de clientes (CRM)",
        "Simulador avançado",
        "Rebalanceamento automático",
        "White label",
        "Suporte VIP dedicado",
      ],
      priceId: null,
      isContactSales: true,
    },
  ];

  const getCurrentPlanInfo = () => {
    // Handle trial separately
    if (currentPlan === 'trial') {
      return {
        name: 'Trial',
        price: 'Grátis',
        period: 'por 30 dias',
        features: ['Acesso completo por 30 dias', 'Todos os recursos disponíveis'],
      };
    }
    return plans.find(p => p.planKey === currentPlan) || plans[0];
  };

  const currentPlanInfo = getCurrentPlanInfo();

  const handleUpgrade = (priceId: string) => {
    setProcessingPriceId(priceId);
    createCheckoutSession.mutate(priceId, {
      onSettled: () => setProcessingPriceId(null),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Minha Assinatura
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seu plano e assinatura
          </p>
        </div>

        {/* Current Plan Card */}
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {currentPlanInfo.name}
                  {currentPlan !== 'free' && currentPlan !== 'trial' && (
                    <Crown className="h-5 w-5 text-amber-500" />
                  )}
                </CardTitle>
                <CardDescription className="text-lg mt-1">
                  {currentPlanInfo.price} <span className="text-sm">{currentPlanInfo.period}</span>
                </CardDescription>
                {subscription?.trial_end && subscription.status === 'trialing' && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    Trial expira em: {new Date(subscription.trial_end).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
                {subscription?.current_period_end && subscription.status === 'active' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Renovação em: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              <Badge variant="default" className="text-base px-4 py-1">
                Plano Atual
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage stats for free plan */}
            {currentPlan === 'free' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{assetsCount}/{limits.maxAssets}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{goalsCount}/{limits.maxGoals}</p>
                  <p className="text-xs text-muted-foreground">Metas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {getRemainingAIQuestions() === Infinity ? '∞' : getRemainingAIQuestions()}/{limits.aiQuestionsPerMonth}
                  </p>
                  <p className="text-xs text-muted-foreground">Perguntas IA</p>
                </div>
              </div>
            )}

            {subscription?.status === 'trialing' && subscription?.trial_end && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Período de Trial Ativo</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Seu trial expira em{' '}
                      <span className="font-bold">
                        {new Date(subscription.trial_end).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      {Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} dias restantes
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-2">Recursos inclusos:</p>
              <ul className="space-y-2">
                {currentPlanInfo.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {subscription?.subscribed && subscription?.status === 'active' && currentPlan !== 'free' && (
              <Button 
                onClick={() => openCustomerPortal.mutate()}
                variant="outline"
                className="w-full"
                disabled={openCustomerPortal.isPending}
              >
                {openCustomerPortal.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gerenciar Assinatura
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Planos Disponíveis</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrentPlan = plan.planKey === currentPlan;
              
              return (
                <Card 
                  key={plan.name} 
                  className={`relative ${
                    plan.recommended 
                      ? "border-primary shadow-lg" 
                      : isCurrentPlan 
                        ? "border-primary/50" 
                        : ""
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Recomendado</Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      {plan.period && (
                        <>
                          <br />
                          <span className="text-sm">{plan.period}</span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.limitations && (
                      <ul className="space-y-2 pt-2 border-t">
                        {plan.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {isCurrentPlan ? (
                      <Button disabled className="w-full">
                        Plano Atual
                      </Button>
                    ) : plan.isFree ? (
                      <Button disabled className="w-full" variant="outline">
                        Plano Gratuito
                      </Button>
                    ) : plan.isContactSales ? (
                      <Button
                        onClick={() => setContactDialogOpen(true)}
                        className="w-full"
                        variant="outline"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Falar com vendas
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(plan.priceId!)}
                        className="w-full"
                        disabled={processingPriceId === plan.priceId}
                      >
                        {processingPriceId === plan.priceId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          "Assinar agora"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <ContactSalesDialog 
        open={contactDialogOpen} 
        onOpenChange={setContactDialogOpen} 
      />
    </AppLayout>
  );
};

export default Subscription;
