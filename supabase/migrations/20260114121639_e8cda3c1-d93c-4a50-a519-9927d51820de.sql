-- Tabela de registro de FIIs (mapeia CNPJ para Ticker)
CREATE TABLE IF NOT EXISTS public.fii_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,
  ticker TEXT NOT NULL,
  nome_fundo TEXT,
  tipo TEXT,
  segmento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de métricas de FIIs (dados CVM)
CREATE TABLE IF NOT EXISTS public.fii_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  cnpj_fundo TEXT,
  nome_fundo TEXT,
  tipo_fii TEXT,
  segmento TEXT,
  administrador TEXT,
  gestor TEXT,
  patrimonio_liquido NUMERIC,
  valor_patrimonial_cota NUMERIC,
  num_cotistas INTEGER,
  num_cotas_emitidas BIGINT,
  taxa_vacancia NUMERIC,
  taxa_inadimplencia NUMERIC,
  rentabilidade_patrimonio NUMERIC,
  data_referencia DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticker, data_referencia)
);

-- Tabela de dividendos de FIIs
CREATE TABLE IF NOT EXISTS public.fii_dividends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  tipo TEXT DEFAULT 'Rendimento',
  valor_por_cota NUMERIC NOT NULL,
  data_base DATE,
  data_pagamento DATE,
  data_declaracao DATE,
  source TEXT DEFAULT 'B3',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticker, data_pagamento, valor_por_cota)
);

-- Tabela de fatos relevantes
CREATE TABLE IF NOT EXISTS public.fii_relevant_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  titulo TEXT NOT NULL,
  resumo TEXT,
  data_publicacao DATE NOT NULL,
  url_documento TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices (usar IF NOT EXISTS não disponível para índices, usar DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_registry_ticker_v1') THEN
    CREATE INDEX idx_fii_registry_ticker_v1 ON public.fii_registry(ticker);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_metrics_ticker_v1') THEN
    CREATE INDEX idx_fii_metrics_ticker_v1 ON public.fii_metrics(ticker);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_metrics_data_ref_v1') THEN
    CREATE INDEX idx_fii_metrics_data_ref_v1 ON public.fii_metrics(data_referencia DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_dividends_ticker_v1') THEN
    CREATE INDEX idx_fii_dividends_ticker_v1 ON public.fii_dividends(ticker);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_dividends_data_pag_v1') THEN
    CREATE INDEX idx_fii_dividends_data_pag_v1 ON public.fii_dividends(data_pagamento DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_facts_ticker_v1') THEN
    CREATE INDEX idx_fii_facts_ticker_v1 ON public.fii_relevant_facts(ticker);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fii_facts_data_v1') THEN
    CREATE INDEX idx_fii_facts_data_v1 ON public.fii_relevant_facts(data_publicacao DESC);
  END IF;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS update_fii_registry_updated_at ON public.fii_registry;
CREATE TRIGGER update_fii_registry_updated_at
  BEFORE UPDATE ON public.fii_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fii_metrics_updated_at ON public.fii_metrics;
CREATE TRIGGER update_fii_metrics_updated_at
  BEFORE UPDATE ON public.fii_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.fii_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fii_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fii_dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fii_relevant_facts ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "FII registry is viewable by authenticated users" ON public.fii_registry;
CREATE POLICY "FII registry is viewable by authenticated users"
  ON public.fii_registry FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "FII metrics is viewable by authenticated users" ON public.fii_metrics;
CREATE POLICY "FII metrics is viewable by authenticated users"
  ON public.fii_metrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "FII dividends is viewable by authenticated users" ON public.fii_dividends;
CREATE POLICY "FII dividends is viewable by authenticated users"
  ON public.fii_dividends FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "FII relevant facts is viewable by authenticated users" ON public.fii_relevant_facts;
CREATE POLICY "FII relevant facts is viewable by authenticated users"
  ON public.fii_relevant_facts FOR SELECT TO authenticated USING (true);