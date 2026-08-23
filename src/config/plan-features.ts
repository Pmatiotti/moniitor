// Plan types matching Stripe products
export type PlanType = 'free' | 'trial' | 'investor' | 'pro' | 'professional';

// All feature keys in the application
export type FeatureKey = 
  | 'portfolio'              // Consolidação patrimonial
  | 'dividends'              // Acompanhamento proventos
  | 'basic_performance'      // Análise performance básica
  | 'alerts'                 // Alertas inteligentes
  | 'planning'               // Planejamento financeiro
  | 'advanced_reports'       // Relatórios avançados
  | 'ai_assistant'           // Assistente IA
  | 'crm'                    // Gestão de clientes
  | 'advanced_simulator'     // Simulador cenários avançado
  | 'auto_rebalancing'       // Rebalanceamento automático
  | 'patrimony'              // Patrimônio
  | 'finances'               // Finanças pessoais
  | 'goals'                  // Metas
  | 'education'              // Educação
  | 'performance'            // Performance
  | 'bank_sync'              // Sincronização bancária
  | 'export_data';           // Exportação de dados

// Limits per plan
export interface PlanLimits {
  maxAssets: number;
  maxGoals: number;
  aiQuestionsPerMonth: number;
  dividendsMonths: number;
  canExport: boolean;
  canSyncBank: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxAssets: 5,
    maxGoals: 1,
    aiQuestionsPerMonth: 3,
    dividendsMonths: 3,
    canExport: false,
    canSyncBank: false,
  },
  trial: {
    maxAssets: Infinity,
    maxGoals: Infinity,
    aiQuestionsPerMonth: Infinity,
    dividendsMonths: Infinity,
    canExport: true,
    canSyncBank: true,
  },
  investor: {
    maxAssets: Infinity,
    maxGoals: 10,
    aiQuestionsPerMonth: 20,
    dividendsMonths: 24,
    canExport: true,
    canSyncBank: true,
  },
  pro: {
    maxAssets: Infinity,
    maxGoals: Infinity,
    aiQuestionsPerMonth: 100,
    dividendsMonths: Infinity,
    canExport: true,
    canSyncBank: true,
  },
  professional: {
    maxAssets: Infinity,
    maxGoals: Infinity,
    aiQuestionsPerMonth: Infinity,
    dividendsMonths: Infinity,
    canExport: true,
    canSyncBank: true,
  },
};

// Features available for each plan
export const PLAN_FEATURES: Record<PlanType, FeatureKey[]> = {
  free: [
    // Very limited access
    'portfolio',           // Limited to 5 assets
    'dividends',           // Limited to 3 months
    'basic_performance',
    'goals',               // Limited to 1 goal
    'education',           // Basic content only
  ],
  trial: [
    // Trial has FULL access for testing
    'portfolio', 'dividends', 'basic_performance', 'alerts',
    'planning', 'advanced_reports', 'ai_assistant', 'crm',
    'advanced_simulator', 'auto_rebalancing', 'patrimony',
    'finances', 'goals', 'education', 'performance',
    'bank_sync', 'export_data'
  ],
  investor: [
    // Basic plan
    'portfolio', 'dividends', 'basic_performance',
    'patrimony', 'finances', 'goals', 'education', 'performance',
    'bank_sync', 'export_data'
  ],
  pro: [
    // Intermediate plan
    'portfolio', 'dividends', 'basic_performance',
    'alerts', 'planning', 'advanced_reports',
    'patrimony', 'finances', 'goals', 'education', 'performance',
    'bank_sync', 'export_data'
  ],
  professional: [
    // Full plan
    'portfolio', 'dividends', 'basic_performance',
    'alerts', 'planning', 'advanced_reports',
    'ai_assistant', 'crm', 'advanced_simulator',
    'auto_rebalancing', 'patrimony', 'finances',
    'goals', 'education', 'performance',
    'bank_sync', 'export_data'
  ],
};

// Route to feature mapping
export const ROUTE_FEATURES: Record<string, FeatureKey> = {
  '/alerts': 'alerts',
  '/planning': 'planning',
  '/crm': 'crm',
  '/assistant': 'ai_assistant',
  '/rebalancing': 'auto_rebalancing',
};

// Feature information for upgrade screens
export const FEATURE_INFO: Record<FeatureKey, {
  name: string;
  description: string;
  requiredPlan: PlanType;
  icon?: string;
}> = {
  portfolio: {
    name: 'Consolidação de Carteira',
    description: 'Visualize todos os seus investimentos em um só lugar.',
    requiredPlan: 'free',
  },
  dividends: {
    name: 'Acompanhamento de Proventos',
    description: 'Monitore seus dividendos e proventos recebidos.',
    requiredPlan: 'free',
  },
  basic_performance: {
    name: 'Análise de Performance Básica',
    description: 'Acompanhe o desempenho da sua carteira.',
    requiredPlan: 'free',
  },
  alerts: {
    name: 'Alertas Inteligentes',
    description: 'Receba notificações automáticas sobre variações, vencimentos e oportunidades.',
    requiredPlan: 'pro',
  },
  planning: {
    name: 'Planejamento Financeiro',
    description: 'Ferramentas de simulação e planejamento para seus objetivos.',
    requiredPlan: 'pro',
  },
  advanced_reports: {
    name: 'Relatórios Avançados',
    description: 'Relatórios detalhados e exportação de dados.',
    requiredPlan: 'pro',
  },
  ai_assistant: {
    name: 'Assistente IA Ilimitado',
    description: 'Converse com a IA para análises e insights personalizados da sua carteira.',
    requiredPlan: 'professional',
  },
  crm: {
    name: 'Gestão de Clientes (CRM)',
    description: 'Gerencie sua carteira de clientes com ferramentas profissionais.',
    requiredPlan: 'professional',
  },
  advanced_simulator: {
    name: 'Simulador de Cenários Avançado',
    description: 'Simule diferentes cenários para tomada de decisão.',
    requiredPlan: 'professional',
  },
  auto_rebalancing: {
    name: 'Rebalanceamento Automático',
    description: 'Sugestões automáticas para manter sua carteira alinhada aos objetivos.',
    requiredPlan: 'professional',
  },
  patrimony: {
    name: 'Patrimônio',
    description: 'Gestão completa do seu patrimônio.',
    requiredPlan: 'investor',
  },
  finances: {
    name: 'Finanças Pessoais',
    description: 'Controle suas finanças pessoais.',
    requiredPlan: 'investor',
  },
  goals: {
    name: 'Metas Financeiras',
    description: 'Defina e acompanhe suas metas financeiras.',
    requiredPlan: 'free',
  },
  education: {
    name: 'Educação Financeira',
    description: 'Conteúdos educativos sobre investimentos.',
    requiredPlan: 'free',
  },
  performance: {
    name: 'Performance',
    description: 'Análise de performance da sua carteira.',
    requiredPlan: 'investor',
  },
  bank_sync: {
    name: 'Sincronização Bancária',
    description: 'Conecte suas contas bancárias para importação automática.',
    requiredPlan: 'investor',
  },
  export_data: {
    name: 'Exportação de Dados',
    description: 'Exporte seus dados em diversos formatos.',
    requiredPlan: 'investor',
  },
};

// Plan display names and prices
export const PLAN_INFO: Record<PlanType, {
  name: string;
  price: number;
  priceId: string;
  productId: string;
  isContactSales?: boolean;
}> = {
  free: {
    name: 'Grátis',
    price: 0,
    priceId: '',
    productId: '',
  },
  trial: {
    name: 'Trial',
    price: 0,
    priceId: '',
    productId: '',
  },
  investor: {
    name: 'Básico',
    price: 29.90,
    priceId: 'price_1SpFNrQVZAXJJ8v6IJ6VayGk',
    productId: 'prod_Tmp1H9971iLKcw',
  },
  pro: {
    name: 'Pro',
    price: 69.90,
    priceId: 'price_1SpFO7QVZAXJJ8v6hZlw8K4h',
    productId: 'prod_Tmp2L2tfdNvxw0',
  },
  professional: {
    name: 'Professional',
    price: 0,
    priceId: '',
    productId: '',
    isContactSales: true,
  },
};

// Get plan type from product ID
export const getPlanFromProductId = (productId: string | null): PlanType | null => {
  if (!productId) return null;
  
  for (const [plan, info] of Object.entries(PLAN_INFO)) {
    if (info.productId === productId) {
      return plan as PlanType;
    }
  }
  return null;
};

// Get minimum required plan for a feature
export const getMinimumPlanForFeature = (feature: FeatureKey): PlanType => {
  return FEATURE_INFO[feature]?.requiredPlan || 'investor';
};

// Check if a plan has access to a feature
export const planHasFeature = (plan: PlanType, feature: FeatureKey): boolean => {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
};
