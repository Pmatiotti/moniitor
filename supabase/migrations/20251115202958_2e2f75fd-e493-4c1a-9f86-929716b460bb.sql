-- Criar tabela para histórico de dividendos de FIIs
CREATE TABLE IF NOT EXISTS public.fii_dividends_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  payment_date DATE NOT NULL,
  dividend_rate NUMERIC NOT NULL,
  price_at_date NUMERIC,
  yield_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticker, payment_date)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_fii_dividends_ticker ON public.fii_dividends_history(ticker);
CREATE INDEX IF NOT EXISTS idx_fii_dividends_date ON public.fii_dividends_history(payment_date DESC);

-- Adicionar campo para resumo de dividendos na tabela fundamental_data
ALTER TABLE public.fundamental_data 
ADD COLUMN IF NOT EXISTS dividends_summary JSONB DEFAULT NULL;

-- RLS policies para fii_dividends_history
ALTER TABLE public.fii_dividends_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read FII dividend history"
  ON public.fii_dividends_history
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert FII dividend history"
  ON public.fii_dividends_history
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update FII dividend history"
  ON public.fii_dividends_history
  FOR UPDATE
  USING (false);