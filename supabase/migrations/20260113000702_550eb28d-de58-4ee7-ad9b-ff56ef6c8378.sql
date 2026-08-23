-- Criar tabela para rastrear fluxos de caixa (aportes/retiradas)
CREATE TABLE public.portfolio_cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  flow_date DATE NOT NULL,
  description TEXT,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.portfolio_cash_flows ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own cash flows"
  ON public.portfolio_cash_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash flows"
  ON public.portfolio_cash_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash flows"
  ON public.portfolio_cash_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash flows"
  ON public.portfolio_cash_flows FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_portfolio_cash_flows_user_date 
  ON public.portfolio_cash_flows(user_id, flow_date);

CREATE INDEX idx_portfolio_cash_flows_user_id 
  ON public.portfolio_cash_flows(user_id);

-- Comentários
COMMENT ON TABLE public.portfolio_cash_flows IS 'Rastreia aportes e retiradas para cálculo correto de TWR e XIRR';
COMMENT ON COLUMN public.portfolio_cash_flows.flow_type IS 'deposit = aporte, withdrawal = retirada';
COMMENT ON COLUMN public.portfolio_cash_flows.amount IS 'Valor absoluto do fluxo (sempre positivo)';