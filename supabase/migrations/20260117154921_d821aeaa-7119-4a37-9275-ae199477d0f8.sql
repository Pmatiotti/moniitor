-- Drop the existing constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_sub_class_check;

-- Create new expanded constraint that accepts all valid subclass values
ALTER TABLE public.assets ADD CONSTRAINT assets_sub_class_check CHECK (
  (asset_class = 'Renda Variável' AND sub_class IN ('Ações', 'Fundos Imobiliário', 'Derivativos', 'ETF', 'ETFs', 'BDR', 'BDRs'))
  OR 
  (asset_class = 'Renda Fixa' AND sub_class IN ('Pós', 'Pré', 'Inflação', 'CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'Debêntures', 'Tesouro Direto'))
  OR 
  (asset_class = 'Fundos de Investimento' AND sub_class IN ('Renda Fixa', 'Multimercado', 'Ações', 'FIDIC', 'Alternativos', 'Cambial', 'FIAGRO', 'FIP'))
  OR 
  (asset_class = 'Previdência' AND sub_class IN ('Renda Fixa', 'Multimercado', 'Ações', 'PGBL', 'VGBL'))
  OR 
  (asset_class = 'COE' AND (sub_class IS NULL OR sub_class IN ('Estruturado', 'Proteção', 'Alavancado')))
  OR 
  sub_class IS NULL
);