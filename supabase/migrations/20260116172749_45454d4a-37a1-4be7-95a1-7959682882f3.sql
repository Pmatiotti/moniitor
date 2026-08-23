-- Fase 1: Adicionar campo CNPJ na tabela assets para Fundos de Investimento
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS cnpj text;

-- Criar índice para busca por CNPJ
CREATE INDEX IF NOT EXISTS idx_assets_cnpj ON public.assets(cnpj) WHERE cnpj IS NOT NULL;

-- Fase 2: Criar tabela para cotas de fundos de investimento
CREATE TABLE IF NOT EXISTS public.fund_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL,
  nome_fundo text,
  data_quota date NOT NULL,
  valor_quota numeric NOT NULL,
  patrimonio_liquido numeric,
  captacao_dia numeric,
  resgate_dia numeric,
  numero_cotistas integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cnpj, data_quota)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fund_quotes_cnpj ON public.fund_quotes(cnpj);
CREATE INDEX IF NOT EXISTS idx_fund_quotes_data ON public.fund_quotes(data_quota DESC);

-- Habilitar RLS
ALTER TABLE public.fund_quotes ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (dados são públicos da CVM)
CREATE POLICY "Fund quotes are publicly readable" 
ON public.fund_quotes 
FOR SELECT 
USING (true);

-- Política de inserção apenas para service role (edge functions)
CREATE POLICY "Service role can insert fund quotes" 
ON public.fund_quotes 
FOR INSERT 
WITH CHECK (public.is_service_role());

-- Política de atualização apenas para service role
CREATE POLICY "Service role can update fund quotes" 
ON public.fund_quotes 
FOR UPDATE 
USING (public.is_service_role());

-- Adicionar constraint unique na tabela economic_indicators se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'economic_indicators_type_date_unique'
  ) THEN
    ALTER TABLE public.economic_indicators 
    ADD CONSTRAINT economic_indicators_type_date_unique 
    UNIQUE (indicator_type, reference_date);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;