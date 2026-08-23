# Documentação do Sistema de Gestão de Investimentos

## 📋 Visão Geral

Sistema completo de gestão de investimentos e assessoria financeira desenvolvido com React, TypeScript, Tailwind CSS e Supabase. A plataforma oferece funcionalidades para clientes, assessores e administradores, incluindo gestão de portfólio, CRM, educação financeira, alertas, metas e muito mais.

## 🏗️ Arquitetura

### Stack Tecnológica

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS com design system customizado
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticação**: Supabase Auth com RLS (Row Level Security)
- **Gráficos**: Recharts
- **Formulários**: React Hook Form + Zod
- **Componentes UI**: Radix UI + shadcn/ui
- **Roteamento**: React Router v6
- **Estado**: React Query (TanStack Query)

### Princípios Arquiteturais

1. **Separação de Responsabilidades**: Componentes focados, hooks customizados, utilitários separados
2. **Type Safety**: TypeScript estrito em todo o codebase
3. **Design System**: Tokens semânticos centralizados em `index.css` e `tailwind.config.ts`
4. **Security First**: RLS policies em todas as tabelas, autenticação obrigatória
5. **Component Composition**: Componentes reutilizáveis e compostos
6. **Edge Functions**: Lógica backend em funções serverless

## 📁 Estrutura do Projeto

```
├── src/
│   ├── components/
│   │   ├── admin/              # Gestão de usuários, convites, auditoria
│   │   ├── alerts/             # Sistema de alertas e notificações
│   │   ├── auth/               # Autenticação e rotas protegidas
│   │   ├── crm/                # CRM para assessores
│   │   ├── dashboard/          # Componentes do dashboard
│   │   ├── dividends/          # Gestão de dividendos
│   │   ├── education/          # Conteúdo educacional (cliente)
│   │   ├── education-admin/    # Gestão de conteúdo (admin)
│   │   ├── finances/           # Gestão financeira pessoal
│   │   ├── goals/              # Metas financeiras
│   │   ├── layout/             # Layout e navegação
│   │   ├── performance/        # Análise de performance
│   │   ├── planning/           # Planejamento financeiro
│   │   ├── portfolio/          # Gestão de carteira
│   │   ├── profile/            # Perfil do usuário
│   │   ├── rebalancing/        # Rebalanceamento de carteira
│   │   └── ui/                 # Componentes base (shadcn)
│   ├── hooks/                  # Custom hooks
│   ├── integrations/
│   │   └── supabase/           # Cliente e types do Supabase
│   ├── lib/                    # Utilitários e helpers
│   ├── pages/                  # Páginas principais
│   └── main.tsx                # Entry point
├── supabase/
│   ├── functions/              # Edge Functions
│   ├── migrations/             # Migrations do banco
│   └── config.toml             # Configuração do Supabase
└── public/                     # Assets estáticos
```

## 🎯 Funcionalidades Implementadas

### 1. Sistema de Autenticação e Autorização

**Arquivos**: `src/pages/Auth.tsx`, `src/components/auth/AdminRoute.tsx`

- Login/Registro com email e senha
- Validação de senha (8+ caracteres, maiúsculas, minúsculas, números, especiais)
- Auto-confirmação de email
- Sistema de convites com tokens
- 3 níveis de usuário: Admin, Assessor, Cliente
- RLS policies baseadas em roles

**Edge Function**: `admin-create-user`

### 2. Gestão de Portfólio

**Arquivos**: `src/pages/Portfolio.tsx`, `src/components/portfolio/*`

**Funcionalidades**:
- Adicionar/editar/excluir ativos
- Suporte para múltiplas classes: Ações, FIIs, Renda Fixa, ETFs, Internacional, Criptomoedas
- Upload de arquivos (CSV, Excel, PDF)
- Edição em massa
- Visualização por classe, subclasse e corretora
- Dados fundamentalistas (P/E, P/VP, ROE, dividend yield)
- Atualização automática de preços

**Classificação de Ativos**:
- **Renda Variável**: Ações, Fundos Imobiliários, Derivativos
- **Renda Fixa**: Pós-fixada, Pré-fixada, Inflação
- **Fundos de Investimento**: Renda Fixa, Multimercado, Ações, FIDIC, Alternativos
- **Previdência**: Renda Fixa, Multimercado, Ações

**Tabelas**: `assets`, `fundamental_data`
**Edge Functions**: `update-portfolio-prices`, `parse-portfolio-pdf`, `fetch-market-data`

**Integração com IA**:
- Upload de PDFs de corretoras processado via Lovable AI
- Extração automática de ativos com classificação inteligente
- Suporte para BTG Pactual, XP, Rico e outras corretoras brasileiras

### 3. Dividendos

**Arquivos**: `src/pages/Dividends.tsx`, `src/components/dividends/*`

**Funcionalidades**:
- Registro manual de dividendos
- Timeline de dividendos recebidos
- Busca automática de dividendos futuros
- Agrupamento por ticker e data
- Cálculo de yield anualizado

**Tabelas**: `dividends`
**Edge Functions**: `fetch-upcoming-dividends`

### 4. CRM (Gestão de Clientes)

**Arquivos**: `src/pages/CRM.tsx`, `src/components/crm/*`

**Funcionalidades para Assessores**:
- Gestão completa de clientes
- Pipeline de vendas (Kanban)
- Histórico de interações
- Agenda e tarefas
- Snapshots de portfólio dos clientes
- Visualização de alocação de ativos
- Alertas inteligentes por cliente
- Geração de relatórios PDF
- Importação de carteira de clientes

**Tabelas**: `clients`, `interactions`, `meetings`, `tasks`, `deal_pipeline`, `client_portfolio_snapshots`, `client_advisor_links`
**Edge Functions**: `advisor-alerts`

### 5. Sistema de Alertas

**Arquivos**: `src/pages/Alerts.tsx`, `src/components/alerts/*`

**Tipos de Alertas**:
- **Variação de Preço**: Alerta quando ativo varia X% (diário, semanal ou mensal)
- **Queda de Preço**: Alerta quando ativo cai abaixo de um percentual
- **Preço Alvo**: Alerta quando ativo atinge preço específico (acima ou abaixo)
- **Dividendo Previsto**: Alerta sobre dividendos futuros anunciados
- **Dividendo Pago**: Alerta quando dividendo é creditado
- **Vencimento de Renda Fixa**: Alerta X dias antes do vencimento de títulos

**Funcionalidades**:
- Criar, editar e excluir alertas
- Frequência configurável (tempo real, diário, semanal)
- Múltiplos métodos de notificação (in-app, email, WhatsApp)
- Ativar/desativar alertas individualmente
- Histórico completo de disparos com detalhes
- Contagem de vezes que cada alerta foi acionado
- Dashboard com métricas (alertas ativos, não lidos, total de disparos)

**Componentes**:
- `AddAlertDialog.tsx`: Dialog para criar novos alertas com campos dinâmicos por tipo
- `EditAlertDialog.tsx`: Dialog para editar alertas existentes
- `AlertsTable.tsx`: Tabela com listagem, toggle de ativo/inativo e ações
- `NotificationsList.tsx`: Lista de notificações recentes

**Tabelas**: 
- `alerts`: Configuração de alertas (ticker, tipo, threshold, target_price, etc.)
- `notifications`: Notificações in-app
- `alert_history`: Histórico detalhado de todos os disparos

**Edge Functions**: 
- `check-alerts`: Verificação de alertas de preço, variação, dividendos
- `check-fixed-income-maturity`: Verificação de vencimentos de renda fixa
- `check-goal-alerts`: Verificação de alertas de metas financeiras

### 6. Metas Financeiras

**Arquivos**: `src/pages/Goals.tsx`, `src/components/goals/*`

**Funcionalidades**:
- Criar metas (aposentadoria, casa, viagem, etc.)
- Vincular ativos da carteira às metas
- Projeções com juros compostos
- Cálculo de capacidade de contribuição
- Projeção de dividendos
- Sistema de conquistas (gamificação)
- Histórico de progresso

**Tabelas**: `financial_goals`, `goal_portfolio_mappings`, `goal_progress_history`, `user_achievements`
**Edge Functions**: `sync-goal-progress`

### 7. Análise de Performance

**Arquivos**: `src/pages/Performance.tsx`, `src/components/performance/*`

**Funcionalidades**:
- Gráfico de evolução do patrimônio
- Comparação com benchmarks (IBOV, CDI, IPCA)
- Métricas de risco (volatilidade, Sharpe, drawdown)
- Alocação setorial
- Análise de concentração

**Tabelas**: `benchmark_data`
**Edge Functions**: `fetch-benchmark-data`

### 8. Rebalanceamento

**Arquivos**: `src/pages/Rebalancing.tsx`, `src/components/rebalancing/*`

**Funcionalidades**:
- Definir alocação alvo por subclasse
- Visualização de alocação atual vs. alvo
- Recomendações de compra/venda
- Simulador de rebalanceamento
- Recomendações baseadas em metas

**Tabelas**: `target_allocations`

### 9. Planejamento Financeiro

**Arquivos**: `src/pages/Planning.tsx`, `src/components/planning/*`

**Calculadoras**:
- Juros compostos
- Contribuição mensal necessária
- Tempo para atingir meta
- Simulador de cenários (otimista, realista, pessimista)

### 10. Gestão Financeira Pessoal

**Arquivos**: `src/pages/Finances.tsx`, `src/components/finances/*`

**Funcionalidades**:
- Controle de receitas e despesas
- Categorização customizável
- Transações recorrentes
- Orçamento mensal por categoria
- Gráfico de fluxo de caixa

**Tabelas**: `transactions`, `categories`, `budgets`

### 11. Educação Financeira

**Arquivos Cliente**: `src/pages/Education.tsx`, `src/components/education/*`
**Arquivos Admin**: `src/pages/EducationAdmin.tsx`, `src/components/education-admin/*`

**Conteúdo**:
- Artigos educacionais
- Vídeos educacionais
- Cursos estruturados com lições
- Quizzes interativos

**Funcionalidades Admin**:
- CRUD completo de artigos, vídeos, cursos e quizzes
- Slug automático
- Categorização e tags
- Níveis de dificuldade
- Controle de publicação
- Preview gratuito de lições

**Tabelas**: `educational_articles`, `educational_videos`, `educational_courses`, `course_lessons`, `educational_quizzes`, `quiz_questions`, `user_education_progress`

### 12. Assistente IA

**Arquivos**: `src/pages/Assistant.tsx`, `src/components/dashboard/AIAssistant.tsx`

**Funcionalidades**:
- Chat com IA sobre portfólio via Lovable AI
- Análise de investimentos personalizada
- Recomendações baseadas em dados reais do portfólio
- Contexto completo do portfólio do usuário
- Streaming de respostas em tempo real

**Modelos Disponíveis**:
- `google/gemini-2.5-flash`: Modelo padrão, balanceado
- `google/gemini-2.5-pro`: Melhor para análises complexas
- `openai/gpt-5`: Análises avançadas quando necessário

**Edge Functions**: `portfolio-assistant`

### 13. Administração

**Arquivos**: `src/pages/Admin.tsx`, `src/components/admin/*`

**Funcionalidades**:
- Gestão de usuários
- Convites com roles
- Vínculos assessor-cliente
- Logs de auditoria
- Criação manual de usuários

**Tabelas**: `profiles`, `user_roles`, `invitations`, `audit_logs`, `client_advisor_links`, `impersonation_tokens`
**Edge Functions**: `send-invitation`, `impersonate-user`

### 14. Gestão de Email Templates

**Arquivos**: `src/components/admin/EmailManagement.tsx`, `src/components/admin/EmailTemplateEditor.tsx`

**Funcionalidades**:
- Editor visual de templates de email
- Variáveis dinâmicas (`{{user_name}}`, `{{email}}`, etc.)
- Preview em tempo real com sanitização XSS
- Templates customizáveis por tipo:
  - Boas-vindas
  - Convite
  - Senha temporária
  - Relatório mensal
  - Meta atingida
  - Alertas de portfólio
  - Lembretes de renovação
  - Confirmação de assinatura

**Tabelas**: `email_templates`

**Segurança**: 
- DOMPurify para sanitização de HTML
- Validação de variáveis permitidas
- Preview isolado em sandbox

### 15. Sistema de Assinaturas

**Arquivos**: `src/pages/Plans.tsx`, `src/pages/Subscription.tsx`

**Funcionalidades**:
- Integração completa com Stripe
- Múltiplos planos de assinatura
- Trial gratuito de 30 dias
- Portal do cliente para gerenciar assinatura
- Webhooks para sincronização de status
- Verificação automática de assinatura ativa
- Lembretes de renovação automatizados

**Planos Disponíveis**:
- **Grátis**: Funcionalidades básicas
- **Básico**: Gestão completa de portfólio
- **Profissional**: CRM + funcionalidades avançadas
- **Premium**: Todos os recursos + suporte prioritário

**Tabelas**: `subscription_plans`, `subscriptions`

**Edge Functions**: 
- `create-checkout`: Criação de sessão de pagamento
- `create-trial-subscription`: Ativação de trial
- `customer-portal`: Gerenciamento de assinatura
- `check-subscription`: Validação de status ativo
- `send-renewal-reminder`: Lembretes automáticos
- `send-subscription-confirmation`: Confirmação de pagamento

**Segurança**:
- Webhook signature verification
- Validação de status no backend antes de permitir acesso
- Separação de secrets (Stripe keys não expostas no frontend)

## 🔒 Segurança

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS rigorosas:

1. **Usuários regulares**: Acesso apenas aos próprios dados
2. **Assessores**: Acesso aos dados de seus clientes vinculados
3. **Admins**: Acesso completo via funções específicas

Exemplo de política:
```sql
CREATE POLICY "Users can view own assets" 
ON public.assets 
FOR SELECT 
USING (auth.uid() = user_id);
```

### Funções de Autorização

```sql
-- Verificar se usuário tem role específica
has_role(user_id uuid, role app_role) RETURNS boolean
  SECURITY DEFINER SET search_path = public

-- Obter role do usuário
get_user_role(user_id uuid) RETURNS app_role
  SECURITY DEFINER SET search_path = public

-- Gerar senha temporária
generate_temp_password() RETURNS text
  SECURITY DEFINER SET search_path = public
```

**IMPORTANTE**: Todas as funções security definer usam `SET search_path = public` para prevenir ataques de search path hijacking.

### Medidas de Segurança Implementadas

1. **Prevenção XSS**: 
   - Sanitização com DOMPurify em preview de templates de email
   - Validação de inputs em todos os formulários
   
2. **Search Path Mutable**: 
   - Todas as funções `SECURITY DEFINER` possuem `SET search_path = public`
   - Prevenção de privilege escalation attacks

3. **Validação de Senha**:
   - Mínimo 8 caracteres
   - Requer maiúsculas, minúsculas, números e caracteres especiais
   - Implementado em `src/lib/password-validation.ts`

4. **Auditoria**:
   - Logs de mudanças de role em `audit_logs`
   - Tracking de impersonação de usuários
   - Histórico completo de ações administrativas

### Edge Functions Security

- Validação de tokens JWT (quando `verify_jwt = true`)
- Verificação de permissões no backend
- Headers CORS configurados adequadamente
- Sanitização de inputs antes de processar
- Rate limiting via Lovable AI Gateway

## 🛡️ Melhorias de Segurança Recentes

### Correções Implementadas (Janeiro 2025)

**1. Prevenção de XSS em Email Templates**
- **Problema**: Preview de templates de email sem sanitização
- **Solução**: Implementação de DOMPurify para sanitizar HTML antes de renderizar
- **Localização**: `src/components/admin/EmailTemplateEditor.tsx`
- **Impacto**: Previne injeção de scripts maliciosos em templates

**2. Search Path Hijacking Prevention**
- **Problema**: Funções `SECURITY DEFINER` sem `search_path` fixo
- **Solução**: Adição de `SET search_path = public` em todas as funções security definer
- **Funções Corrigidas**:
  - `has_role()`
  - `get_user_role()`
  - `generate_temp_password()`
- **Impacto**: Previne privilege escalation attacks

**3. Validação de Classificação de Ativos**
- **Problema**: Valores de `asset_class` e `sub_class` inconsistentes ao fazer parse de PDFs
- **Solução**: Atualização do prompt da IA para usar valores exatos do CHECK constraint
- **Localização**: `supabase/functions/parse-portfolio-pdf/index.ts`
- **Impacto**: Evita erros de inserção e garante consistência dos dados

### Boas Práticas de Segurança Seguidas

1. **Principle of Least Privilege**: Roles com permissões mínimas necessárias
2. **Defense in Depth**: Múltiplas camadas de validação (frontend + backend + database)
3. **Audit Trail**: Logs completos de ações administrativas
4. **Input Validation**: Validação rigorosa em formulários e APIs
5. **Secure by Default**: RLS habilitado em todas as tabelas por padrão
6. **Secret Management**: Secrets gerenciados via Lovable Cloud, nunca no código

## 🎨 Design System

### Tokens Semânticos (index.css)

```css
:root {
  --primary: 219 100% 50%;
  --secondary: 280 80% 60%;
  --accent: 340 90% 60%;
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  /* ... mais tokens */
}
```

### Componentes UI

Baseados em shadcn/ui com customizações:
- Button (variants: default, destructive, outline, secondary, ghost, link)
- Input, Textarea, Select
- Dialog, Sheet, Drawer
- Card, Badge, Avatar
- Table, Tabs, Accordion
- Toast, Sonner (notifications)
- Chart (recharts wrapper)

## 🔧 Utilidades

### Validações

- **Senha**: `src/lib/password-validation.ts`
  - 8+ caracteres, maiúsculas, minúsculas, números, caracteres especiais

### Formatação

- **Moeda**: Formatação em R$
- **Percentual**: Formatação com 2 casas decimais
- **Datas**: date-fns para manipulação

### Cores de Ativos

- `src/lib/asset-colors.ts`: Paleta consistente para classes de ativos

### Geração de PDFs

- `src/lib/pdf-reports.ts`: Relatórios de portfólio
- `src/lib/client-pdf-reports.ts`: Relatórios de clientes (assessores)

## 📊 Banco de Dados

### Estrutura Principal

1. **Autenticação e Usuários**: 
   - `profiles`: Dados de perfil do usuário
   - `user_roles`: Tabela de roles (admin, advisor, client) com security definer functions
   - `invitations`: Sistema de convites com tokens únicos
   - `audit_logs`: Logs de auditoria de ações administrativas
   - `impersonation_tokens`: Tokens de impersonação para admins

2. **Portfólio**: 
   - `assets`: Ativos da carteira com classificação hierárquica
     - `asset_class`: Renda Variável, Renda Fixa, Fundos de Investimento, Previdência
     - `sub_class`: Subclassificação específica por classe
   - `dividends`: Histórico e previsão de dividendos
   - `fundamental_data`: Dados fundamentalistas (P/E, P/VP, ROE, etc.)
   - `stock_metrics`: Métricas detalhadas de ações

3. **Metas Financeiras**: 
   - `financial_goals`: Objetivos financeiros do usuário
   - `goal_portfolio_mappings`: Vinculação de ativos às metas
   - `goal_progress_history`: Histórico de evolução das metas
   - `user_achievements`: Sistema de gamificação

4. **Alertas e Notificações**: 
   - `alerts`: Configuração de alertas (preço, variação, dividendos, vencimento)
     - Campos: `ticker`, `alert_type`, `threshold_value`, `target_price`, `comparison_type`, `frequency`, `notification_method`, `is_active`
   - `notifications`: Notificações in-app com tipos e status de leitura
   - `alert_history`: Histórico de disparos de alertas
     - Campos: `alert_id`, `user_id`, `alert_type`, `ticker`, `triggered_at`, `trigger_value`, `trigger_details`, `notification_sent`, `whatsapp_sent`

5. **CRM (Assessores)**: 
   - `clients`: Base de clientes dos assessores
   - `interactions`: Histórico de interações
   - `meetings`: Agendamentos e reuniões
   - `tasks`: Tarefas relacionadas a clientes
   - `deal_pipeline`: Pipeline de vendas (Kanban)
   - `client_portfolio_snapshots`: Snapshots históricos de carteiras

6. **Educação Financeira**: 
   - `educational_articles`: Artigos educacionais
   - `educational_videos`: Biblioteca de vídeos
   - `educational_courses`: Cursos estruturados
   - `course_lessons`: Lições dos cursos
   - `educational_quizzes`: Quizzes interativos
   - `quiz_questions`: Questões dos quizzes
   - `user_education_progress`: Progresso do usuário

7. **Finanças Pessoais**: 
   - `transactions`: Receitas e despesas
   - `categories`: Categorias customizáveis
   - `budgets`: Orçamento mensal por categoria

8. **Rebalanceamento**: 
   - `target_allocations`: Alocação alvo por subclasse

9. **Benchmarks e Análise**: 
   - `benchmark_data`: Dados históricos de IBOV, CDI, IPCA
   - `income_statements`: DREs de empresas
   - `balance_sheets`: Balanços patrimoniais
   - `cash_flows`: Fluxos de caixa

10. **Administração**: 
    - `client_advisor_links`: Vínculos entre assessores e clientes
    - `email_templates`: Templates de email customizáveis
    - `subscription_plans`: Planos de assinatura
    - `subscriptions`: Assinaturas ativas dos usuários

### Triggers Automáticos

- `updated_at`: Atualização automática de timestamp
- `handle_new_user`: Criação de perfil ao registrar
- `handle_new_user_role`: Atribuição de role padrão (cliente)
- `log_role_change`: Auditoria de mudanças de role

## 🚀 Edge Functions

### Funções Implementadas

1. **admin-create-user**: Criação de usuário por admin com role específica
2. **advisor-alerts**: Alertas inteligentes para assessores sobre seus clientes
3. **check-alerts**: Verificação periódica de alertas (preço, variação, dividendos, preço alvo)
4. **check-fixed-income-maturity**: Verificação de vencimentos de títulos de renda fixa
5. **check-goal-alerts**: Verificação de alertas de metas financeiras
5. **check-subscription**: Validação de assinaturas ativas
6. **create-checkout**: Criação de sessão de checkout Stripe
7. **create-trial-subscription**: Criação de assinatura trial
8. **customer-portal**: Portal do cliente Stripe
9. **delete-user**: Exclusão completa de usuário e dados relacionados
10. **fetch-benchmark-data**: Dados de benchmarks (IBOV, CDI, IPCA)
11. **fetch-fundamental-data**: Dados fundamentalistas via Brapi API
12. **fetch-market-data**: Dados de mercado via Yahoo Finance
13. **fetch-stock-data**: Dados de ações para análise técnica
14. **fetch-upcoming-dividends**: Busca dividendos futuros previstos
15. **impersonate-user**: Impersonação de usuário por admin (com auditoria)
16. **parse-portfolio-pdf**: Parse de PDFs de corretoras via Lovable AI
17. **portfolio-assistant**: Assistente IA com contexto do portfólio
18. **send-goal-achieved**: Email de notificação de meta atingida
19. **send-invitation**: Envio de convites com token único
20. **send-monthly-report**: Relatório mensal automatizado
21. **send-portfolio-alerts**: Envio de alertas de portfólio
22. **send-renewal-reminder**: Lembrete de renovação de assinatura
23. **send-subscription-confirmation**: Confirmação de assinatura
24. **send-temp-password**: Envio de senha temporária
25. **send-welcome-email**: Email de boas-vindas
26. **sync-goal-progress**: Sincronização automática de progresso de metas
27. **update-portfolio-prices**: Atualização automática de preços de ativos

### Integração com Lovable AI

**Edge Functions que usam Lovable AI**:
- `portfolio-assistant`: Chat inteligente sobre investimentos
- `parse-portfolio-pdf`: Extração de dados de PDFs de corretoras

**Configuração**:
```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash", // Modelo padrão
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    stream: true, // Streaming habilitado
  }),
});
```

**Tratamento de Erros**:
- 429: Rate limit excedido
- 402: Créditos insuficientes
- 500: Erro no gateway

### Padrão de Implementação

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: authHeader } },
    });

    // Lógica da função
    const data = await req.json();
    // ... processamento

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

## 🧪 Boas Práticas Implementadas

### 1. Type Safety

```typescript
// Uso de tipos do Supabase gerados automaticamente
import { Database } from "@/integrations/supabase/types";

type Asset = Database["public"]["Tables"]["assets"]["Row"];
```

### 2. Error Handling

```typescript
try {
  const { data, error } = await supabase.from("assets").select();
  
  if (error) throw error;
  
  // Processar data
} catch (error) {
  console.error("Error:", error);
  toast.error("Erro ao carregar dados");
}
```

### 3. Loading States

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // fetch data
  } finally {
    setLoading(false);
  }
};
```

### 4. Componentização

- Componentes pequenos e focados
- Separação de lógica (hooks) e apresentação
- Props tipadas com TypeScript
- Composição ao invés de herança

### 5. Hooks Customizados

```typescript
// src/hooks/useUserRole.tsx
export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch role
  }, []);
  
  return { role, isAdmin, isAdvisor, isClient };
};
```

## 📝 Convenções de Código

### Nomenclatura

- **Componentes**: PascalCase (`ClientsTable.tsx`)
- **Hooks**: camelCase com prefixo "use" (`useUserRole.ts`)
- **Utilitários**: camelCase (`password-validation.ts`)
- **Constantes**: UPPER_SNAKE_CASE
- **Tipos**: PascalCase com sufixo adequado (`ClientFormData`)

### Estrutura de Componentes

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface MyComponentProps {
  title: string;
  onClose: () => void;
}

export const MyComponent = ({ title, onClose }: MyComponentProps) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    // fetch logic
  };
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Imports

```typescript
// 1. React e libs externas
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// 2. Componentes UI
import { Button } from "@/components/ui/button";

// 3. Componentes locais
import { ClientsTable } from "@/components/crm/ClientsTable";

// 4. Hooks e utils
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

// 5. Types
import { Database } from "@/integrations/supabase/types";
```

## 🚦 Rotas

### Rotas Públicas
- `/` - Landing page
- `/auth` - Login/Registro
- `/plans` - Planos
- `/invite/:token` - Aceitar convite

### Rotas Protegidas (requerem autenticação)
- `/dashboard` - Dashboard principal
- `/portfolio` - Gestão de portfólio
- `/dividends` - Dividendos
- `/goals` - Metas financeiras
- `/alerts` - Alertas
- `/performance` - Performance
- `/rebalancing` - Rebalanceamento
- `/planning` - Planejamento
- `/finances` - Gestão financeira
- `/education` - Educação financeira
- `/assistant` - Assistente IA
- `/profile` - Perfil do usuário
- `/crm` - CRM (apenas assessores)

### Rotas Admin (requerem role admin)
- `/admin` - Administração
- `/education-admin` - Gestão de conteúdo educacional

## 🔄 Fluxos Principais

### 1. Registro de Usuário

```
1. Usuário acessa /auth
2. Preenche formulário de registro
3. Sistema valida senha
4. Cria usuário no Supabase Auth
5. Trigger cria perfil em profiles
6. Trigger atribui role "cliente"
7. Usuário é redirecionado para /dashboard
```

### 2. Adição de Ativo

```
1. Usuário clica em "Adicionar Ativo"
2. Preenche formulário (ticker, quantidade, preço, classe)
3. Sistema valida dados
4. Insere no banco (tabela assets)
5. RLS verifica se auth.uid() = user_id
6. Atualiza lista de ativos
7. Dispara atualização de preços (edge function)
```

### 3. Sistema de Alertas

```
1. Usuário cria alerta (preço > X)
2. Alerta salvo na tabela alerts
3. Edge function check-alerts roda periodicamente
4. Verifica condições de todos os alertas ativos
5. Se condição satisfeita, cria notificação
6. Usuário recebe notificação in-app
7. Alerta incrementa trigger_count
```

### 4. Assessor Gerando Relatório

```
1. Assessor acessa CRM
2. Seleciona cliente
3. Clica em "Gerar Relatório"
4. Sistema busca ativos do cliente
5. Calcula alocações e métricas
6. Gera recomendações automatizadas
7. Cria PDF com jsPDF
8. Download automático
```

## 📈 Escalabilidade e Performance

### Otimizações Implementadas

1. **React Query**: Cache e gerenciamento de estado servidor
2. **Lazy Loading**: Componentes carregados sob demanda
3. **Memoization**: useMemo e useCallback onde apropriado
4. **Indexes no Banco**: Índices em campos frequentemente consultados
5. **Edge Functions**: Processamento distribuído
6. **RLS**: Filtros no nível do banco reduzem tráfego

### Considerações Futuras

- Pagination em tabelas grandes
- Virtual scrolling para listas longas
- Service Worker para PWA
- Websockets para updates em tempo real (Supabase Realtime)

## 🧩 Integrações Externas

### APIs Utilizadas

1. **Lovable AI Gateway**: Assistente de portfólio e processamento de PDFs
   - Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
   - Modelos: Gemini 2.5 Flash/Pro, GPT-5
   - Rate limiting: Gerenciado pelo gateway

2. **Yahoo Finance API**: Atualização de preços e dados de mercado
   - Cotações em tempo real
   - Dados históricos
   - Fundamentalistas básicos

3. **Brapi API**: Dados fundamentalistas detalhados de empresas brasileiras
   - Demonstrações financeiras
   - Métricas de valuation
   - Balanços patrimoniais

4. **Resend API**: Envio transacional de emails
   - Templates customizáveis
   - Tracking de entregas
   - Gestão de email templates

5. **Stripe API**: Processamento de pagamentos e assinaturas
   - Checkout sessions
   - Customer portal
   - Webhook handling

### Configuração de Secrets

Secrets configurados no Supabase (via Lovable Cloud):
- `LOVABLE_API_KEY`: Acesso ao Lovable AI Gateway (auto-configurado)
- `RESEND_API_KEY`: Envio de emails transacionais
- `SUPABASE_SERVICE_ROLE_KEY`: Operações privilegiadas em Edge Functions
- `STRIPE_SECRET_KEY`: Processamento de pagamentos
- `STRIPE_WEBHOOK_SECRET`: Validação de webhooks
- `BRAPI_API_KEY`: Acesso à API Brapi

## 🎓 Guia de Desenvolvimento

### Setup do Ambiente

```bash
# Clonar repositório
git clone <repo-url>

# Instalar dependências
npm install

# Configurar variáveis de ambiente (.env)
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_PUBLISHABLE_KEY=<key>

# Rodar em desenvolvimento
npm run dev
```

### Adicionar Nova Funcionalidade

1. **Planeje o modelo de dados**
   - Defina tabelas necessárias
   - Crie migration SQL
   - Adicione RLS policies

2. **Crie os componentes**
   - Componentes de apresentação
   - Formulários com validação
   - Tabelas/Listas

3. **Implemente a lógica**
   - Hooks customizados se necessário
   - Integração com Supabase
   - Error handling

4. **Adicione a rota**
   - Defina em App.tsx
   - Adicione ao Sidebar se necessário
   - Configure proteção (ProtectedRoute/AdminRoute)

5. **Teste**
   - Fluxos de sucesso
   - Casos de erro
   - Permissões de acesso

### Criar Nova Tabela

```sql
-- Migration
CREATE TABLE public.minha_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records"
ON public.minha_tabela
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.minha_tabela
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### Criar Edge Function

```bash
# Criar função
supabase functions new minha-funcao

# Implementar em supabase/functions/minha-funcao/index.ts

# Deploy
supabase functions deploy minha-funcao
```

## 📚 Recursos e Referências

### Documentação Oficial

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Router](https://reactrouter.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Recharts](https://recharts.org/)

### Patterns e Best Practices

- [React Patterns](https://reactpatterns.com/)
- [TypeScript Best Practices](https://github.com/typescript-cheatsheets/react)
- [Supabase RLS Cookbook](https://supabase.com/docs/guides/auth/row-level-security)

## 🐛 Troubleshooting

### Problemas Comuns

**1. Erro de permissão ao acessar dados**
- Verificar se RLS policy está correta
- Confirmar que usuário está autenticado
- Checar se user_id está sendo passado corretamente
- Validar se o usuário tem a role necessária

**2. Edge function não executa**
- Verificar logs no Lovable Cloud Backend
- Confirmar que secrets necessários estão configurados
- Validar headers CORS
- Checar se `verify_jwt` está configurado corretamente no `config.toml`

**3. Componente não atualiza**
- Verificar se estado está sendo atualizado corretamente
- Usar React DevTools para debugar
- Conferir dependências do useEffect
- Validar se React Query está fazendo cache indevido

**4. Erro de CORS**
- Adicionar headers CORS nas Edge Functions
- Verificar se OPTIONS request está sendo tratado
- Confirmar configuração no `config.toml`

**5. Parse de PDF falhando**
- Validar formato do PDF (apenas corretoras brasileiras suportadas)
- Verificar se o PDF contém dados extraíveis (não é imagem)
- Checar logs do Edge Function `parse-portfolio-pdf`
- Confirmar que os valores de `asset_class` e `sub_class` estão corretos

**6. Lovable AI retornando erro 429/402**
- 429: Rate limit atingido, aguardar alguns minutos
- 402: Créditos insuficientes, adicionar créditos na workspace
- Implementar retry logic com backoff exponencial
- Adicionar mensagem clara para o usuário

**7. Funções security definer falhando**
- Verificar se `SET search_path = public` está configurado
- Validar permissões no banco de dados
- Checar logs de erro no backend

## 🔮 Roadmap Futuro

### Funcionalidades Planejadas

1. **Mobile App**: React Native ou PWA aprimorado
2. **Relatórios Avançados**: Mais análises e visualizações
3. **Integrações Bancárias**: Open Finance / Pluggy
4. **Importação Automática**: Integração com corretoras
5. **Análise Tributária**: IR sobre ganhos de capital
6. **Social Features**: Compartilhar carteiras, rankings
7. **Websockets**: Updates em tempo real
8. **Multi-moeda**: Suporte a múltiplas moedas
9. **API Pública**: Para integrações externas
10. **White Label**: Versão customizável para assessorias

### Melhorias Técnicas

1. **Testes**: Jest + React Testing Library
2. **E2E**: Playwright ou Cypress
3. **CI/CD**: GitHub Actions
4. **Monitoring**: Sentry ou similar
5. **Analytics**: Posthog ou Mixpanel
6. **Documentation**: Storybook para componentes
7. **Performance**: Lighthouse optimization
8. **Accessibility**: WCAG 2.1 compliance

## 📄 Licença e Créditos

Sistema desenvolvido com foco em qualidade, segurança e escalabilidade, seguindo as melhores práticas da indústria.

---

**Última atualização**: Janeiro 2025
**Versão**: 1.2.0

### Changelog

**v1.2.0** (Janeiro 2025)
- ✅ Integração com Lovable AI para assistente e parse de PDFs
- ✅ Correções de segurança: XSS prevention e search_path mutable
- ✅ Nova classificação de ativos (Renda Variável, Renda Fixa, Fundos, Previdência)
- ✅ Sistema completo de assinaturas com Stripe
- ✅ Melhorias na documentação de Edge Functions

**v1.0.0** (2025)
- 🎉 Versão inicial com funcionalidades completas de gestão de investimentos
