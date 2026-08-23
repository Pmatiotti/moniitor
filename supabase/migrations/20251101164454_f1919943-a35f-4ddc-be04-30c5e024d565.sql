-- 1. Remover constraints antigas
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_class_check;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_sub_class_check;

-- 2. Atualizar dados para nova estrutura
UPDATE assets 
SET asset_class = 'Renda Variável', sub_class = 'Ações'
WHERE asset_class = 'Ações';

UPDATE assets 
SET asset_class = 'Fundos de Investimento', sub_class = 'Multimercado'
WHERE asset_class = 'Multimercado';

UPDATE assets 
SET sub_class = 'Pós'
WHERE asset_class = 'Renda Fixa' AND (sub_class = 'Pós-fixada' OR sub_class ILIKE '%pós%');

UPDATE assets 
SET sub_class = 'Pré'
WHERE asset_class = 'Renda Fixa' AND (sub_class = 'Pré-fixada' OR sub_class ILIKE '%pré%');

-- 3. Criar novas constraints com valores corretos
ALTER TABLE assets ADD CONSTRAINT assets_asset_class_check 
CHECK (asset_class IN ('Renda Variável', 'Renda Fixa', 'Fundos de Investimento', 'Previdência'));

ALTER TABLE assets ADD CONSTRAINT assets_sub_class_check 
CHECK (
  (asset_class = 'Renda Variável' AND sub_class IN ('Ações', 'Fundos Imobiliário', 'Derivativos')) OR
  (asset_class = 'Renda Fixa' AND sub_class IN ('Pós', 'Pré', 'Inflação')) OR
  (asset_class = 'Fundos de Investimento' AND sub_class IN ('Renda Fixa', 'Multimercado', 'Ações', 'FIDIC', 'Alternativos')) OR
  (asset_class = 'Previdência' AND sub_class IN ('Renda Fixa', 'Multimercado', 'Ações')) OR
  sub_class IS NULL
);