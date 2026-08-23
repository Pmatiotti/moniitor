-- Add new columns to dividends table for better classification
ALTER TABLE public.dividends 
ADD COLUMN IF NOT EXISTS asset_class TEXT,
ADD COLUMN IF NOT EXISTS market_type TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN public.dividends.asset_class IS 'Asset class: FII, Ações, Debenture, CRI, CRA, FIDC, Outros';
COMMENT ON COLUMN public.dividends.market_type IS 'Market type: Renda Fixa, Renda Variável';