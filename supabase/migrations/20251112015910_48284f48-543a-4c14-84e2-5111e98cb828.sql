-- Tabela para ações e follow-ups de clientes
CREATE TABLE IF NOT EXISTS public.client_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'follow_up', 'review', 'onboarding'
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela para scores de saúde do cliente
CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  portfolio_health INTEGER CHECK (portfolio_health >= 0 AND portfolio_health <= 100),
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  risk_alignment INTEGER CHECK (risk_alignment >= 0 AND risk_alignment <= 100),
  diversification_score INTEGER CHECK (diversification_score >= 0 AND diversification_score <= 100),
  insights JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_actions_client_id ON public.client_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_actions_advisor_id ON public.client_actions(advisor_id);
CREATE INDEX IF NOT EXISTS idx_client_actions_status ON public.client_actions(status);
CREATE INDEX IF NOT EXISTS idx_client_actions_due_date ON public.client_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_client_id ON public.client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_advisor_id ON public.client_health_scores(advisor_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_actions_updated_at
  BEFORE UPDATE ON public.client_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies para client_actions
ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view own client actions"
  ON public.client_actions
  FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create client actions"
  ON public.client_actions
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own client actions"
  ON public.client_actions
  FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own client actions"
  ON public.client_actions
  FOR DELETE
  USING (auth.uid() = advisor_id);

-- RLS Policies para client_health_scores
ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors can view own client health scores"
  ON public.client_health_scores
  FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create client health scores"
  ON public.client_health_scores
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

COMMENT ON TABLE public.client_actions IS 'Ações e follow-ups para gestão de clientes do CRM';
COMMENT ON TABLE public.client_health_scores IS 'Scores de saúde e insights dos clientes para o assessor';

COMMENT ON COLUMN public.client_actions.action_type IS 'Tipo de ação: call, email, meeting, follow_up, review, onboarding';
COMMENT ON COLUMN public.client_actions.priority IS 'Prioridade: low, medium, high';
COMMENT ON COLUMN public.client_actions.status IS 'Status: pending, in_progress, completed, cancelled';

COMMENT ON COLUMN public.client_health_scores.overall_score IS 'Score geral de saúde (0-100)';
COMMENT ON COLUMN public.client_health_scores.portfolio_health IS 'Saúde do portfólio (0-100)';
COMMENT ON COLUMN public.client_health_scores.engagement_score IS 'Nível de engajamento (0-100)';
COMMENT ON COLUMN public.client_health_scores.risk_alignment IS 'Alinhamento com perfil de risco (0-100)';
COMMENT ON COLUMN public.client_health_scores.diversification_score IS 'Nível de diversificação (0-100)';