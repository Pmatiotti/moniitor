-- Tabela para histórico de preços de ações
CREATE TABLE IF NOT EXISTS public.stock_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  open_price NUMERIC,
  high_price NUMERIC,
  low_price NUMERIC,
  close_price NUMERIC,
  volume BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticker, date)
);

-- Tabela para indicadores técnicos
CREATE TABLE IF NOT EXISTS public.technical_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  date DATE NOT NULL,
  indicator_type TEXT NOT NULL, -- rsi, macd, bb_upper, bb_lower, sma, ema, etc
  value NUMERIC NOT NULL,
  period INTEGER, -- período usado no cálculo (ex: 14 dias para RSI)
  metadata JSONB, -- dados adicionais específicos do indicador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ticker, date, indicator_type, period)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_stock_price_history_ticker_date ON public.stock_price_history(ticker, date DESC);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_ticker_date ON public.technical_indicators(ticker, date DESC);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_type ON public.technical_indicators(indicator_type);

-- RLS Policies
ALTER TABLE public.stock_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir leitura pública dos dados de mercado
CREATE POLICY "Anyone can read stock price history"
  ON public.stock_price_history
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read technical indicators"
  ON public.technical_indicators
  FOR SELECT
  USING (true);

-- Apenas service role pode inserir/atualizar dados de mercado
CREATE POLICY "Only service role can insert stock prices"
  ON public.stock_price_history
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update stock prices"
  ON public.stock_price_history
  FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can insert indicators"
  ON public.technical_indicators
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update indicators"
  ON public.technical_indicators
  FOR UPDATE
  USING (false);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_stock_price_history_updated_at
  BEFORE UPDATE ON public.stock_price_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_technical_indicators_updated_at
  BEFORE UPDATE ON public.technical_indicators
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();