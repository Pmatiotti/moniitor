
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_sub_class_check;

ALTER TABLE public.assets ADD CONSTRAINT assets_sub_class_check CHECK (
  sub_class IS NULL
  OR sub_class IN (
    'Pós', 'Pré', 'Pós-fixado', 'Pré-fixado', 'Inflação',
    'CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'Debêntures', 'Tesouro Direto',
    'Renda Fixa',
    'Ações', 'Fundos Imobiliário', 'FIIs', 'FIAs', 'Derivativos', 'ETF', 'ETFs', 'BDR', 'BDRs',
    'Multimercado', 'Previdência', 'Commodities', 'Moedas', 'Recebíveis',
    'Alternativos', 'FIDIC'
  )
);
