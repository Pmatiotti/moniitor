-- Criar tabela de snapshots diários do portfólio para usuários finais
CREATE TABLE public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value NUMERIC NOT NULL DEFAULT 0,
  total_invested NUMERIC NOT NULL DEFAULT 0,
  daily_return_percent NUMERIC,
  cumulative_return_percent NUMERIC,
  assets_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Criar índices para performance
CREATE INDEX idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_date ON public.portfolio_snapshots(snapshot_date DESC);

-- Habilitar RLS
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own snapshots"
ON public.portfolio_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots"
ON public.portfolio_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
ON public.portfolio_snapshots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
ON public.portfolio_snapshots
FOR DELETE
USING (auth.uid() = user_id);

-- Admins podem ver todos os snapshots
CREATE POLICY "Admins can view all snapshots"
ON public.portfolio_snapshots
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Assessores podem ver snapshots de clientes vinculados
CREATE POLICY "Advisors can view linked client snapshots"
ON public.portfolio_snapshots
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM client_advisor_links cal
  WHERE cal.client_id = portfolio_snapshots.user_id
  AND cal.advisor_id = auth.uid()
  AND cal.status = 'active'
));