-- Tabela de classes de ativos gerenciadas pelo sistema
CREATE TABLE public.asset_class_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de subclasses gerenciadas pelo sistema
CREATE TABLE public.asset_subclass_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.asset_class_definitions(id) ON DELETE CASCADE NOT NULL,
  subclass_name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, subclass_name)
);

-- Trigger para updated_at
CREATE TRIGGER update_asset_class_definitions_updated_at
  BEFORE UPDATE ON public.asset_class_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.asset_class_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_subclass_definitions ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura (todos podem ler classes ativas)
CREATE POLICY "Anyone can read active classes"
ON public.asset_class_definitions FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can read active subclasses"
ON public.asset_subclass_definitions FOR SELECT
USING (is_active = true);

-- Políticas de escrita (apenas admin e assessor/manager)
CREATE POLICY "Admins can manage classes"
ON public.asset_class_definitions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage classes"
ON public.asset_class_definitions FOR ALL
USING (public.has_role(auth.uid(), 'assessor'::app_role));

CREATE POLICY "Admins can manage subclasses"
ON public.asset_subclass_definitions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage subclasses"
ON public.asset_subclass_definitions FOR ALL
USING (public.has_role(auth.uid(), 'assessor'::app_role));

-- Inserir classes iniciais
INSERT INTO public.asset_class_definitions (class_name, display_order) VALUES
  ('Renda Fixa', 1),
  ('Renda Variável', 2),
  ('Multimercado', 3),
  ('Previdência', 4),
  ('Commodities', 5),
  ('Moedas', 6),
  ('Recebíveis', 7);

-- Inserir subclasses de Renda Fixa
INSERT INTO public.asset_subclass_definitions (class_id, subclass_name, display_order)
SELECT id, 'Pós-fixado', 1 FROM public.asset_class_definitions WHERE class_name = 'Renda Fixa'
UNION ALL
SELECT id, 'Pré-fixado', 2 FROM public.asset_class_definitions WHERE class_name = 'Renda Fixa'
UNION ALL
SELECT id, 'Inflação', 3 FROM public.asset_class_definitions WHERE class_name = 'Renda Fixa';

-- Inserir subclasses de Renda Variável
INSERT INTO public.asset_subclass_definitions (class_id, subclass_name, display_order)
SELECT id, 'Ações', 1 FROM public.asset_class_definitions WHERE class_name = 'Renda Variável'
UNION ALL
SELECT id, 'FIIs', 2 FROM public.asset_class_definitions WHERE class_name = 'Renda Variável'
UNION ALL
SELECT id, 'BDR', 3 FROM public.asset_class_definitions WHERE class_name = 'Renda Variável'
UNION ALL
SELECT id, 'Derivativos', 4 FROM public.asset_class_definitions WHERE class_name = 'Renda Variável'
UNION ALL
SELECT id, 'FIAs', 5 FROM public.asset_class_definitions WHERE class_name = 'Renda Variável';

-- Inserir subclasses para classes "planas" (mesma subclasse que classe)
INSERT INTO public.asset_subclass_definitions (class_id, subclass_name, display_order)
SELECT id, 'Multimercado', 1 FROM public.asset_class_definitions WHERE class_name = 'Multimercado'
UNION ALL
SELECT id, 'Previdência', 1 FROM public.asset_class_definitions WHERE class_name = 'Previdência'
UNION ALL
SELECT id, 'Commodities', 1 FROM public.asset_class_definitions WHERE class_name = 'Commodities'
UNION ALL
SELECT id, 'Moedas', 1 FROM public.asset_class_definitions WHERE class_name = 'Moedas'
UNION ALL
SELECT id, 'Recebíveis', 1 FROM public.asset_class_definitions WHERE class_name = 'Recebíveis';