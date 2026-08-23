import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Eye,
  Sparkles,
  Shield,
  Target,
  UserPlus,
  FileUp,
  LineChart,
  Lightbulb,
  PieChart,
  TrendingUp,
  Bell,
  Calculator,
  Wallet,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "@/components/layout/PublicNavbar";

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Eye,
      title: "Transparência",
      description:
        "Cálculos no padrão CFA/GIPS, métricas confiáveis e auditáveis que gestores profissionais utilizam.",
    },
    {
      icon: Sparkles,
      title: "Simplicidade",
      description:
        "Interface intuitiva para qualquer perfil de investidor, do iniciante ao experiente.",
    },
    {
      icon: Shield,
      title: "Segurança",
      description:
        "Dados criptografados e conexões seguras com instituições financeiras via Open Finance.",
    },
    {
      icon: Target,
      title: "Autonomia",
      description:
        "Ferramentas para tomar decisões independentes e informadas sobre seu patrimônio.",
    },
  ];

  const steps = [
    {
      icon: UserPlus,
      number: "1",
      title: "Cadastre-se gratuitamente",
      description: "Crie sua conta em segundos e comece seu trial de 30 dias.",
    },
    {
      icon: FileUp,
      number: "2",
      title: "Importe sua carteira",
      description:
        "Adicione ativos manualmente, via planilha ou integração bancária.",
    },
    {
      icon: LineChart,
      number: "3",
      title: "Acompanhe em tempo real",
      description:
        "Visualize performance TWR, proventos e evolução patrimonial.",
    },
    {
      icon: Lightbulb,
      number: "4",
      title: "Tome decisões inteligentes",
      description:
        "Use alertas, simuladores e rebalanceamento para otimizar sua carteira.",
    },
  ];

  const features = [
    {
      icon: Building2,
      title: "Consolidação Multi-Corretora",
      description: "Todos seus ativos de diferentes corretoras em uma única visão unificada.",
    },
    {
      icon: TrendingUp,
      title: "Rentabilidade TWR/XIRR",
      description: "Métricas profissionais padrão CFA para medir sua performance real.",
    },
    {
      icon: Wallet,
      title: "Proventos Inteligentes",
      description: "Histórico completo, projeções e calendário de dividendos e JCP.",
    },
    {
      icon: Bell,
      title: "Alertas Personalizados",
      description: "Notificações de preço, vencimento de renda fixa e pagamento de dividendos.",
    },
    {
      icon: Calculator,
      title: "Planejamento Financeiro",
      description: "Simuladores de aposentadoria, metas e projeção de independência financeira.",
    },
    {
      icon: PieChart,
      title: "Rebalanceamento",
      description: "Análise de alocação e recomendações para manter sua carteira alinhada.",
    },
  ];

  const faqs = [
    {
      question: "É gratuito para testar?",
      answer:
        "Sim! Oferecemos um trial de 30 dias com acesso completo a todas as funcionalidades, sem necessidade de cartão de crédito.",
    },
    {
      question: "Meus dados estão seguros?",
      answer:
        "Absolutamente. Utilizamos criptografia de ponta a ponta e as conexões com instituições financeiras são feitas via Open Finance, o padrão regulamentado pelo Banco Central.",
    },
    {
      question: "Como funciona a rentabilidade TWR?",
      answer:
        "O Time-Weighted Return (TWR) é o padrão GIPS usado por gestores profissionais. Ele mede a qualidade das suas escolhas de investimento, eliminando o efeito de aportes e retiradas, permitindo comparações justas com benchmarks.",
    },
    {
      question: "Posso cancelar a qualquer momento?",
      answer:
        "Sim, você pode cancelar sua assinatura a qualquer momento. Não há multas ou taxas de cancelamento. Você continuará tendo acesso até o fim do período já pago.",
    },
    {
      question: "Funciona com qualquer corretora?",
      answer:
        "Sim! Você pode importar ativos de qualquer corretora brasileira ou internacional. Oferecemos importação via planilha, PDF de corretoras e integração direta com diversas instituições.",
    },
    {
      question: "Como entrar em contato com suporte?",
      answer:
        "Nosso suporte está disponível via email para todos os planos. Planos Pro e Professional contam com suporte prioritário e dedicado.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold text-foreground">
            Sobre o MONIITOR
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para consolidação patrimonial, análise de performance 
            e planejamento financeiro com métricas no padrão CFA/GIPS.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate("/plans")}>
              Conhecer Planos
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Nossa Missão
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Democratizar o acesso a ferramentas de gestão patrimonial que antes
              eram exclusivas de grandes investidores e family offices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card
                key={value.title}
                className="border-border/50 bg-card/50 hover:shadow-lg transition-shadow"
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-16 bg-secondary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Como Funciona
            </h2>
            <p className="text-lg text-muted-foreground">
              Comece a usar em minutos com 4 passos simples
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                      <step.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {step.number}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-lg text-muted-foreground">
              Tudo que você precisa para gerenciar seu patrimônio de forma profissional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-border/50 bg-card/50 hover:shadow-lg transition-shadow"
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-6 py-16 bg-secondary/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas sobre a plataforma
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">
            Pronto para transformar sua gestão patrimonial?
          </h2>
          <p className="text-lg text-muted-foreground">
            Comece seu trial gratuito de 30 dias. Sem cartão de crédito.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Começar Gratuitamente
          </Button>
        </div>
      </section>
    </div>
  );
};

export default About;
