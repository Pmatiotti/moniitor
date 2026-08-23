import { useLocation } from "react-router-dom";
import { useMemo } from "react";

/**
 * Hook para fornecer contexto automático para o assistente de IA
 * baseado na rota atual e dados disponíveis
 */
export const useAIContext = () => {
  const location = useLocation();

  const contextInfo = useMemo(() => {
    const path = location.pathname;
    
    const contexts: Record<string, { title: string; description: string }> = {
      "/dashboard": {
        title: "Dashboard - Visão Geral",
        description: "Usuário visualizando métricas gerais do portfolio, alocação e performance."
      },
      "/portfolio": {
        title: "Portfólio - Gestão de Ativos",
        description: "Usuário gerenciando ativos individuais, vendo análises fundamentalistas e técnicas."
      },
      "/goals": {
        title: "Metas Financeiras",
        description: "Usuário acompanhando progresso de metas financeiras e planejamento."
      },
      "/finances": {
        title: "Finanças Pessoais",
        description: "Usuário gerenciando transações, orçamentos e categorias de despesas."
      },
      "/dividends": {
        title: "Dividendos",
        description: "Usuário acompanhando histórico e projeções de dividendos recebidos."
      },
      "/performance": {
        title: "Performance",
        description: "Usuário analisando rentabilidade, benchmarks e métricas de risco-retorno."
      },
      "/planning": {
        title: "Planejamento",
        description: "Usuário usando calculadoras e simuladores financeiros."
      },
      "/rebalancing": {
        title: "Rebalanceamento",
        description: "Usuário analisando necessidades de rebalanceamento de carteira."
      },
      "/crm": {
        title: "CRM - Gestão de Clientes",
        description: "Assessor gerenciando clientes, pipeline de vendas e interações."
      },
      "/education": {
        title: "Educação Financeira",
        description: "Usuário acessando conteúdo educacional sobre investimentos."
      },
    };

    return contexts[path] || {
      title: "Plataforma MONIITOR",
      description: "Usuário navegando na plataforma de gestão de investimentos."
    };
  }, [location.pathname]);

  return contextInfo;
};