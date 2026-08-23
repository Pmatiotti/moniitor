-- Tabela de patrimônio consolidado (bens além de investimentos)
CREATE TABLE public.patrimony_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Classificação
  category TEXT NOT NULL CHECK (category IN ('imovel', 'participacao_societaria', 'bem_movel', 'direitos', 'outros')),
  subcategory TEXT,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  
  -- Valores
  acquisition_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC,
  acquisition_date DATE,
  
  -- Dados específicos do IR
  ir_code TEXT, -- Código do bem no IR (ex: "01" para imóveis)
  ir_description TEXT, -- Descrição original do IR
  ir_year INTEGER, -- Ano da declaração de origem
  
  -- Localização (para imóveis)
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  registration_number TEXT, -- Matrícula do imóvel
  
  -- Participações societárias
  company_name TEXT,
  company_cnpj TEXT,
  ownership_percentage NUMERIC,
  
  -- Bens móveis
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  
  -- Documentos e fotos (URLs do storage)
  documents JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'irpf', 'api')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de valores para acompanhar evolução
CREATE TABLE public.patrimony_value_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patrimony_asset_id UUID NOT NULL REFERENCES public.patrimony_assets(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  value_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Importações de IR
CREATE TABLE public.irpf_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  file_name TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_assets_imported INTEGER DEFAULT 0,
  raw_data JSONB,
  status TEXT DEFAULT 'processed' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.patrimony_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_value_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irpf_imports ENABLE ROW LEVEL SECURITY;

-- Policies para patrimony_assets
CREATE POLICY "user_manage_own_patrimony" ON public.patrimony_assets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "assessor_manage_client_patrimony" ON public.patrimony_assets
  FOR ALL USING (
    has_role(auth.uid(), 'assessor'::app_role) AND 
    client_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = patrimony_assets.client_id AND clients.advisor_id = auth.uid()
    )
  );

CREATE POLICY "admin_full_access_patrimony" ON public.patrimony_assets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para patrimony_value_history
CREATE POLICY "user_view_own_history" ON public.patrimony_value_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patrimony_assets WHERE patrimony_assets.id = patrimony_asset_id AND patrimony_assets.user_id = auth.uid()
    )
  );

CREATE POLICY "user_insert_own_history" ON public.patrimony_value_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patrimony_assets WHERE patrimony_assets.id = patrimony_asset_id AND patrimony_assets.user_id = auth.uid()
    )
  );

-- Policies para irpf_imports
CREATE POLICY "user_manage_own_imports" ON public.irpf_imports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "assessor_manage_client_imports" ON public.irpf_imports
  FOR ALL USING (
    has_role(auth.uid(), 'assessor'::app_role) AND 
    client_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = irpf_imports.client_id AND clients.advisor_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_patrimony_assets_updated_at
  BEFORE UPDATE ON public.patrimony_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices
CREATE INDEX idx_patrimony_assets_user_id ON public.patrimony_assets(user_id);
CREATE INDEX idx_patrimony_assets_client_id ON public.patrimony_assets(client_id);
CREATE INDEX idx_patrimony_assets_category ON public.patrimony_assets(category);
CREATE INDEX idx_patrimony_value_history_asset_id ON public.patrimony_value_history(patrimony_asset_id);