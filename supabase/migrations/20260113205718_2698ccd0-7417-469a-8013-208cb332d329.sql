
-- Tabela de histórico de avaliações de ativos
CREATE TABLE public.asset_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimony_asset_id UUID REFERENCES public.patrimony_assets(id) ON DELETE CASCADE NOT NULL,
  valuation_date DATE NOT NULL,
  valuation_source TEXT NOT NULL, -- 'fipe', 'ivg_r', 'manual', 'fipezap'
  estimated_value NUMERIC NOT NULL,
  confidence_level TEXT, -- 'high', 'medium', 'low'
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_asset_valuations_asset ON public.asset_valuations(patrimony_asset_id);
CREATE INDEX idx_asset_valuations_date ON public.asset_valuations(valuation_date);

-- RLS para asset_valuations
ALTER TABLE public.asset_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view valuations of their assets" ON public.asset_valuations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patrimony_assets pa 
      WHERE pa.id = patrimony_asset_id AND pa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert valuations for their assets" ON public.asset_valuations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patrimony_assets pa 
      WHERE pa.id = patrimony_asset_id AND pa.user_id = auth.uid()
    )
  );

-- Campos adicionais em patrimony_assets para avaliação
ALTER TABLE public.patrimony_assets 
  ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
  ADD COLUMN IF NOT EXISTS fipe_code TEXT,
  ADD COLUMN IF NOT EXISTS fipe_brand_id TEXT,
  ADD COLUMN IF NOT EXISTS fipe_model_id TEXT,
  ADD COLUMN IF NOT EXISTS last_valuation_date DATE,
  ADD COLUMN IF NOT EXISTS last_estimated_value NUMERIC,
  ADD COLUMN IF NOT EXISTS valuation_source TEXT;

-- Tabela de passivos patrimoniais
CREATE TABLE public.patrimony_liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Classificação
  category TEXT NOT NULL, -- 'financiamento_imobiliario', 'financiamento_veicular', 'emprestimo_pessoal', 'cartao_credito', 'outros'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Valores
  original_value NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  interest_rate NUMERIC, -- taxa de juros anual %
  
  -- Datas
  start_date DATE,
  end_date DATE, -- previsão de quitação
  
  -- Vinculação a ativo (opcional)
  linked_asset_id UUID REFERENCES public.patrimony_assets(id) ON DELETE SET NULL,
  
  -- Parcelas
  installment_value NUMERIC,
  total_installments INTEGER,
  paid_installments INTEGER DEFAULT 0,
  
  -- Credor
  creditor_name TEXT,
  creditor_type TEXT, -- 'banco', 'financeira', 'pessoa_fisica', 'outros'
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual',
  ir_code TEXT, -- código do IRPF se importado
  ir_year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_patrimony_liabilities_user ON public.patrimony_liabilities(user_id);
CREATE INDEX idx_patrimony_liabilities_category ON public.patrimony_liabilities(category);
CREATE INDEX idx_patrimony_liabilities_active ON public.patrimony_liabilities(is_active);

-- RLS para patrimony_liabilities
ALTER TABLE public.patrimony_liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own liabilities" ON public.patrimony_liabilities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liabilities" ON public.patrimony_liabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own liabilities" ON public.patrimony_liabilities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own liabilities" ON public.patrimony_liabilities
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_patrimony_liabilities_updated_at
  BEFORE UPDATE ON public.patrimony_liabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para histórico de patrimônio líquido (snapshots mensais)
CREATE TABLE public.net_worth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL,
  total_assets NUMERIC NOT NULL DEFAULT 0,
  total_investments NUMERIC NOT NULL DEFAULT 0,
  total_liabilities NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  breakdown JSONB, -- detalhamento por categoria
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_net_worth_history_user ON public.net_worth_history(user_id);
CREATE INDEX idx_net_worth_history_date ON public.net_worth_history(snapshot_date);
CREATE UNIQUE INDEX idx_net_worth_history_unique ON public.net_worth_history(user_id, client_id, snapshot_date);

-- RLS
ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own net worth history" ON public.net_worth_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own net worth history" ON public.net_worth_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
