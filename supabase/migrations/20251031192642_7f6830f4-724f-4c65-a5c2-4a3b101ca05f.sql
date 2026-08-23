-- Adicionar client_id à tabela assets para vincular ativos aos clientes
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de queries por cliente
CREATE INDEX IF NOT EXISTS idx_assets_client_id ON public.assets(client_id);

-- Expandir perfil do cliente com informações de investimento
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS risk_profile TEXT CHECK (risk_profile IN ('conservador', 'moderado', 'arrojado')),
ADD COLUMN IF NOT EXISTS investment_objectives TEXT,
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC,
ADD COLUMN IF NOT EXISTS onboarding_date DATE,
ADD COLUMN IF NOT EXISTS last_portfolio_update DATE,
ADD COLUMN IF NOT EXISTS suitability JSONB;

-- Criar tabela para histórico de snapshots do portfólio
CREATE TABLE IF NOT EXISTS public.client_portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value NUMERIC NOT NULL DEFAULT 0,
  assets_snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de snapshots
ALTER TABLE public.client_portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para snapshots
CREATE POLICY "Advisors can view own client snapshots"
  ON public.client_portfolio_snapshots
  FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create snapshots for own clients"
  ON public.client_portfolio_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own client snapshots"
  ON public.client_portfolio_snapshots
  FOR DELETE
  USING (auth.uid() = advisor_id);

-- Criar índices para snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_client_id ON public.client_portfolio_snapshots(client_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_advisor_id ON public.client_portfolio_snapshots(advisor_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.client_portfolio_snapshots(snapshot_date);

-- Adicionar client_id à tabela financial_goals para vincular metas aos clientes
ALTER TABLE public.financial_goals
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Criar índice para metas por cliente
CREATE INDEX IF NOT EXISTS idx_goals_client_id ON public.financial_goals(client_id);