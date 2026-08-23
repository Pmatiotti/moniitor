import { useState, useEffect } from "react";
import Joyride, { CallBackProps, Step, STATUS, EVENTS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";
import { TourProgressBar } from "./TourProgressBar";
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Target, 
  Scale, 
  Calculator, 
  Bell, 
  BarChart3, 
  LineChart,
  BookOpen, 
  Users,
  Sparkles,
  Rocket
} from "lucide-react";

interface PlatformTourProps {
  run: boolean;
  onComplete: () => void;
  userRole?: 'admin' | 'assessor' | 'cliente' | 'gestor';
}

interface TourStepContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  example?: string;
}

const StepContent = ({ content, currentStep, totalSteps }: { 
  content: TourStepContent; 
  currentStep: number; 
  totalSteps: number;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        {content.icon}
      </div>
      <h3 className="text-lg font-semibold">{content.title}</h3>
    </div>
    <p className="text-sm text-muted-foreground">{content.description}</p>
    {content.example && (
      <div className="text-xs bg-muted/50 p-2 rounded-md border-l-2 border-primary">
        💡 <span className="font-medium">Exemplo:</span> {content.example}
      </div>
    )}
    <TourProgressBar currentStep={currentStep} totalSteps={totalSteps} />
  </div>
);

export const PlatformTour = ({ run, onComplete, userRole = 'cliente' }: PlatformTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isAdvisor = userRole === 'assessor' || userRole === 'admin';

  // Define all possible steps
  const allSteps: (Step & { showFor?: string[] })[] = [
    {
      target: "body",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary animate-pulse">
              <Rocket className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Bem-vindo ao MONIITOR! 🎉</h2>
              <p className="text-sm text-muted-foreground">Sua plataforma completa de gestão patrimonial</p>
            </div>
          </div>
          <p className="text-sm">
            Vamos fazer um tour rápido pelas principais funcionalidades. 
            Em poucos minutos você estará pronto para gerenciar seus investimentos!
          </p>
          <TourProgressBar currentStep={0} totalSteps={isAdvisor ? 15 : 14} />
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[href="/dashboard"]',
      content: null, // Will be set dynamically
      placement: "right",
      data: {
        icon: <LayoutDashboard className="h-5 w-5" />,
        title: "Dashboard",
        description: "Visão geral completa do seu patrimônio, rentabilidade e distribuição de ativos.",
        example: "Acompanhe a evolução do seu patrimônio ao longo do tempo com gráficos interativos."
      }
    },
    {
      target: '[href="/portfolio"]',
      content: null,
      placement: "right",
      data: {
        icon: <TrendingUp className="h-5 w-5" />,
        title: "Carteira",
        description: "Gerencie todos os seus ativos de investimento com dados fundamentalistas em tempo real.",
        example: "Adicione ações, FIIs, ETFs e renda fixa. Veja P/L, DY e outros indicadores automaticamente."
      }
    },
    {
      target: '[href="/patrimony"]',
      content: null,
      placement: "right",
      data: {
        icon: <Rocket className="h-5 w-5" />,
        title: "Patrimônio",
        description: "Cadastre todos os seus bens: imóveis, veículos, participações societárias e outros.",
        example: "Importe automaticamente do IRPF ou adicione manualmente para ter uma visão consolidada."
      }
    },
    {
      target: '[href="/dividends"]',
      content: null,
      placement: "right",
      data: {
        icon: <DollarSign className="h-5 w-5" />,
        title: "Proventos",
        description: "Acompanhe todos os dividendos e rendimentos recebidos, com histórico completo.",
        example: "Veja quanto você recebeu por mês, por ativo, e projete sua renda passiva futura."
      }
    },
    {
      target: '[href="/finances"]',
      content: null,
      placement: "right",
      data: {
        icon: <Wallet className="h-5 w-5" />,
        title: "Finanças",
        description: "Controle suas receitas, despesas e orçamento para otimizar seus aportes.",
        example: "Conecte suas contas bancárias automaticamente via Open Finance."
      }
    },
    {
      target: '[href="/goals"]',
      content: null,
      placement: "right",
      data: {
        icon: <Target className="h-5 w-5" />,
        title: "Metas Financeiras",
        description: "Defina objetivos claros e acompanhe seu progresso com projeções automáticas.",
        example: "Crie uma meta de R$ 1 milhão e veja quanto tempo falta para atingir."
      }
    },
    {
      target: '[href="/rebalancing"]',
      content: null,
      placement: "right",
      data: {
        icon: <Scale className="h-5 w-5" />,
        title: "Rebalanceamento",
        description: "Mantenha sua carteira alinhada com sua estratégia através de sugestões inteligentes.",
        example: "Defina 30% em ações, 40% em FIIs e 30% em renda fixa e veja o que comprar."
      }
    },
    {
      target: '[href="/planning"]',
      content: null,
      placement: "right",
      data: {
        icon: <Calculator className="h-5 w-5" />,
        title: "Planejamento",
        description: "Use calculadoras financeiras para simular cenários e tomar decisões informadas.",
        example: "Calcule quanto precisa aportar por mês para atingir sua independência financeira."
      }
    },
    {
      target: '[href="/alerts"]',
      content: null,
      placement: "right",
      data: {
        icon: <Bell className="h-5 w-5" />,
        title: "Alertas",
        description: "Configure alertas de preço e receba notificações sobre oportunidades.",
        example: "Crie um alerta para quando PETR4 chegar a R$ 30 e não perca a oportunidade."
      }
    },
    {
      target: '[href="/performance"]',
      content: null,
      placement: "right",
      data: {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Performance",
        description: "Analise o desempenho da sua carteira comparado com benchmarks do mercado.",
        example: "Compare sua rentabilidade com o IBOV, CDI e outros índices."
      }
    },
    {
      target: '[href="/ticker"]',
      content: null,
      placement: "right",
      data: {
        icon: <LineChart className="h-5 w-5" />,
        title: "MONIITOR Ticker",
        description: "Analise ações, FIIs e fundos com dados fundamentalistas, históricos e scores automáticos.",
        example: "Pesquise WEGE3 e veja valuation, saúde financeira, dividendos e comparações com outros ativos."
      }
    },
    {
      target: '[href="/education"]',
      content: null,
      placement: "right",
      data: {
        icon: <BookOpen className="h-5 w-5" />,
        title: "Educação Financeira",
        description: "Aprenda com cursos, artigos e vídeos sobre investimentos e finanças pessoais.",
        example: "Faça quizzes para testar seu conhecimento e ganhe conquistas."
      }
    },
    {
      target: '[href="/crm"]',
      content: null,
      placement: "right",
      showFor: ['assessor', 'admin'],
      data: {
        icon: <Users className="h-5 w-5" />,
        title: "CRM de Clientes",
        description: "Gerencie seus clientes, acompanhe carteiras e crie planos financeiros personalizados.",
        example: "Visualize a saúde financeira de cada cliente e identifique oportunidades."
      }
    },
    {
      target: ".floating-ai-button",
      content: null,
      placement: "top-end",
      disableScrolling: true,
      spotlightClicks: false,
      data: {
        icon: <Sparkles className="h-5 w-5" />,
        title: "Assistente IA",
        description: "Converse com nossa inteligência artificial para análises e recomendações personalizadas.",
        example: "Pergunte 'Qual ação está mais descontada na minha carteira?' e receba insights."
      }
    },
    {
      target: "body",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/10 text-green-500">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Tour Completo! ✨</h2>
              <p className="text-sm text-muted-foreground">Você está pronto para começar!</p>
            </div>
          </div>
          <p className="text-sm">
            Explore a plataforma e gerencie seus investimentos com confiança. 
            Estamos aqui para ajudar você a alcançar seus objetivos financeiros!
          </p>
          <div className="text-sm bg-muted p-3 rounded-md">
            💡 <strong>Dica:</strong> Você pode refazer este tour a qualquer momento 
            acessando seu <strong>Perfil</strong> e clicando em "Iniciar Tour Novamente".
          </div>
          <TourProgressBar currentStep={isAdvisor ? 14 : 13} totalSteps={isAdvisor ? 15 : 14} />
        </div>
      ),
      placement: "center",
    },
  ];

  // Filter steps based on user role
  const steps: Step[] = allSteps
    .filter(step => {
      if (!step.showFor) return true;
      return step.showFor.includes(userRole);
    })
    .map((step, index) => {
      // Set dynamic content for steps with data
      if (step.data && !step.content) {
        const totalSteps = allSteps.filter(s => !s.showFor || s.showFor.includes(userRole)).length;
        return {
          ...step,
          content: (
            <StepContent 
              content={step.data as TourStepContent} 
              currentStep={index} 
              totalSteps={totalSteps} 
            />
          )
        };
      }
      return step;
    });

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setCurrentStep(index + 1);
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ tour_completed: true })
          .eq('id', user.id);
      }
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress={false}
      showSkipButton
      scrollToFirstStep
      spotlightPadding={8}
      callback={handleJoyrideCallback}
      floaterProps={{
        styles: {
          floater: {
            filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15))'
          }
        }
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          arrowColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "380px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "8px",
          padding: "0.625rem 1.25rem",
          fontWeight: 500,
          fontSize: "0.875rem",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.75rem",
          fontSize: "0.875rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.875rem",
        },
        spotlight: {
          borderRadius: "12px",
        },
        overlay: {
          mixBlendMode: "normal" as const,
        }
      }}
      locale={{
        back: "Anterior",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        skip: "Pular Tour",
      }}
    />
  );
};
