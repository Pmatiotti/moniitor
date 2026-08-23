-- Tabelas para funcionalidades logadas: watchlist, notas, cenários de valuation

-- Watchlist (ações favoritas do usuário)
CREATE TABLE IF NOT EXISTS public.user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'acoes',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ticker, asset_class)
);

-- Notas pessoais do usuário por ticker
CREATE TABLE IF NOT EXISTS public.user_stock_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'acoes',
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT, -- 'acompanhar', 'comprar', 'evitar', etc.
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ticker, asset_class)
);

-- Cenários de valuation salvos pelo usuário
CREATE TABLE IF NOT EXISTS public.valuation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'acoes',
  scenario_name TEXT NOT NULL,
  valuation_method TEXT NOT NULL, -- 'multiples', 'dcf'
  inputs JSONB NOT NULL, -- premissas (ex.: target_pl, growth_rate, wacc)
  results JSONB, -- outputs (ex.: fair_price, margin_of_safety)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Histórico anual completo (receita, lucro, margens, dívida, caixa por ano)
-- Vai receber dados do robô via webhook ingest-fundamental-data
CREATE TABLE IF NOT EXISTS public.annual_fundamentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  year INTEGER NOT NULL,
  -- DRE
  revenue NUMERIC,
  gross_profit NUMERIC,
  ebit NUMERIC,
  ebitda NUMERIC,
  net_income NUMERIC,
  -- Margens
  gross_margin NUMERIC,
  ebit_margin NUMERIC,
  ebitda_margin NUMERIC,
  net_margin NUMERIC,
  -- Balanço
  total_assets NUMERIC,
  total_equity NUMERIC,
  total_debt NUMERIC,
  net_debt NUMERIC,
  cash_and_equivalents NUMERIC,
  -- Dividendos
  dividends_paid NUMERIC,
  payout_ratio NUMERIC,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, asset_class, year)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON public.user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stock_notes_user_id ON public.user_stock_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_scenarios_user_id ON public.valuation_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_annual_fundamentals_ticker ON public.annual_fundamentals(ticker, asset_class, year);

-- RLS
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stock_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_fundamentals ENABLE ROW LEVEL SECURITY;

-- Policies: usuário só vê/edita seus próprios registros
CREATE POLICY "Users can view their own watchlist"
  ON public.user_watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist"
  ON public.user_watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON public.user_watchlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes"
  ON public.user_stock_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
  ON public.user_stock_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.user_stock_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.user_stock_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own scenarios"
  ON public.valuation_scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON public.valuation_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON public.valuation_scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON public.valuation_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- annual_fundamentals: público para leitura (alimentado pelo robô)
CREATE POLICY "Anyone can view annual fundamentals"
  ON public.annual_fundamentals FOR SELECT
  USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_notes_updated_at
  BEFORE UPDATE ON public.user_stock_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_notes_updated_at();

CREATE TRIGGER trigger_update_scenarios_updated_at
  BEFORE UPDATE ON public.valuation_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_notes_updated_at();

CREATE TRIGGER trigger_update_annual_updated_at
  BEFORE UPDATE ON public.annual_fundamentals
  FOR EACH ROW EXECUTE FUNCTION public.update_notes_updated_at();