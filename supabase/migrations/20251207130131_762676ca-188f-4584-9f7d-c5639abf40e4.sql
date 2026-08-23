-- Drop existing constraints
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_class_check;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_sub_class_check;

-- Add new constraint with COE included
ALTER TABLE public.assets ADD CONSTRAINT assets_asset_class_check 
CHECK (asset_class = ANY (ARRAY['Renda Variável'::text, 'Renda Fixa'::text, 'Fundos de Investimento'::text, 'Previdência'::text, 'COE'::text]));

-- Add new sub_class constraint with COE support
ALTER TABLE public.assets ADD CONSTRAINT assets_sub_class_check 
CHECK (
  ((asset_class = 'Renda Variável'::text) AND (sub_class = ANY (ARRAY['Ações'::text, 'Fundos Imobiliário'::text, 'Derivativos'::text, 'ETF'::text, 'BDR'::text]))) 
  OR ((asset_class = 'Renda Fixa'::text) AND (sub_class = ANY (ARRAY['Pós'::text, 'Pré'::text, 'Inflação'::text, 'CDB'::text, 'LCI'::text, 'LCA'::text, 'Debêntures'::text, 'Tesouro Direto'::text]))) 
  OR ((asset_class = 'Fundos de Investimento'::text) AND (sub_class = ANY (ARRAY['Renda Fixa'::text, 'Multimercado'::text, 'Ações'::text, 'FIDIC'::text, 'Alternativos'::text, 'FIAGRO'::text, 'FIP'::text]))) 
  OR ((asset_class = 'Previdência'::text) AND (sub_class = ANY (ARRAY['Renda Fixa'::text, 'Multimercado'::text, 'Ações'::text])))
  OR ((asset_class = 'COE'::text) AND (sub_class IS NULL OR sub_class = ANY (ARRAY['Estruturado'::text, 'Proteção'::text, 'Alavancado'::text])))
  OR (sub_class IS NULL)
);