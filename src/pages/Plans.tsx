import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PLAN_PRICES } from "@/hooks/useSubscription";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PublicNavbar from "@/components/layout/PublicNavbar";
import { ContactSalesDialog } from "@/components/subscription/ContactSalesDialog";

const Plans = () => {
  const navigate = useNavigate();
  const { subscription, createCheckoutSession } = useSubscription();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }
      
      if (subscription?.subscribed) {
        navigate('/dashboard');
      }
    };

    checkAuth();
  }, [subscription, navigate]);

  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      period: "para sempre",
      description: "Para conhecer a plataforma",
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
        "Sem alertas",
      ],
      colorClass: "border-muted",
      badgeClass: "bg-muted text-muted-foreground",
      priceId: null,
      isFree: true,
    },
    {
      name: "Básico",
      price: "R$ 29,90",
      period: "/mês",
      description: "Para investidores iniciantes",
      features: [
        "Ativos ilimitados",
        "Histórico completo de proventos",
        "10 metas financeiras",
        "20 perguntas à IA/mês",
        "Sincronização bancária",
        "Exportação de dados",
        "Suporte por email",
      ],
      colorClass: "border-plan-investidor",
      badgeClass: "bg-plan-investidor/10 text-plan-investidor border-plan-investidor/20",
      priceId: PLAN_PRICES.investor,
    },
    {
      name: "Pro",
      price: "R$ 69,90",
      period: "/mês",
      description: "Para investidores avançados",
      features: [
        "Tudo do Básico",
        "Metas ilimitadas",
        "100 perguntas à IA/mês",
        "Alertas inteligentes",
        "Planejamento financeiro",
        "Relatórios avançados",
        "Suporte prioritário",
      ],
      highlighted: true,
      colorClass: "border-plan-pro",
      badgeClass: "bg-plan-pro/10 text-plan-pro border-plan-pro/20",
      priceId: PLAN_PRICES.pro,
    },
    {
      name: "Profissional",
      price: "Sob consulta",
      period: "",
      description: "Para assessores e gestores",
      features: [
        "Tudo do Pro",
        "IA ilimitada",
        "Gestão de clientes (CRM)",
        "Simulador avançado",
        "Rebalanceamento automático",
        "White label",
        "Suporte VIP dedicado",
      ],
      colorClass: "border-plan-profissional",
      badgeClass: "bg-plan-profissional/10 text-plan-profissional border-plan-profissional/20",
      priceId: null,
      isContactSales: true,
    },
  ];

  const handlePlanClick = async (plan: typeof plans[0]) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (plan.isContactSales) {
      setContactDialogOpen(true);
      return;
    }
    
    if (!session) {
      navigate('/auth', { state: { selectedPlan: plan.name } });
      return;
    }

    if (plan.isFree) {
      navigate('/dashboard');
    } else if (plan.priceId) {
      createCheckoutSession.mutate(plan.priceId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <PublicNavbar />

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-foreground">
              Escolha o plano ideal para você
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comece sua jornada de gestão patrimonial premium
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative transition-all duration-300 hover:shadow-lg ${plan.colorClass} ${
                  plan.highlighted ? 'scale-105 shadow-xl' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className={plan.badgeClass}>
                      Recomendado
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.limitations && (
                    <ul className="space-y-2 pt-2 border-t">
                      {plan.limitations.map((limitation) => (
                        <li key={limitation} className="flex items-start gap-2">
                          <X className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={plan.isContactSales ? "outline" : "default"}
                    onClick={() => handlePlanClick(plan)}
                    disabled={createCheckoutSession.isPending}
                  >
                    {createCheckoutSession.isPending ? (
                      "Carregando..."
                    ) : plan.isContactSales ? (
                      <>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Falar com vendas
                      </>
                    ) : (
                      "Começar agora"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Já tem uma conta?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/auth")}
              >
                Fazer login
              </Button>
            </p>
          </div>
        </div>
      </main>

      <ContactSalesDialog 
        open={contactDialogOpen} 
        onOpenChange={setContactDialogOpen} 
      />
    </div>
  );
};

export default Plans;
