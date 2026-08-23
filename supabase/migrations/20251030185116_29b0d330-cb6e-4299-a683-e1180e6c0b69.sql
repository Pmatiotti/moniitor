-- Step 1: Remove the old check constraint
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_class_check;

-- Step 2: Update existing data to use Portuguese names
UPDATE public.assets 
SET asset_class = CASE 
  WHEN asset_class = 'stocks' THEN 'Ações'
  WHEN asset_class = 'fiis' THEN 'FIIs'
  WHEN asset_class = 'etfs' THEN 'ETFs'
  WHEN asset_class = 'bonds' THEN 'Renda Fixa'
  WHEN asset_class = 'crypto' THEN 'Criptomoedas'
  WHEN asset_class = 'other' THEN 'Outros'
  ELSE asset_class
END;

-- Step 3: Add new check constraint with Portuguese names
ALTER TABLE public.assets ADD CONSTRAINT assets_asset_class_check 
CHECK (asset_class IN ('Ações', 'FIIs', 'ETFs', 'Renda Fixa', 'Criptomoedas', 'Inflação', 'Pré fixado', 'Pós fixado', 'Multimercado', 'Bonds (USD)', 'REITs (USD)', 'Stocks (USD)', 'Outros'));