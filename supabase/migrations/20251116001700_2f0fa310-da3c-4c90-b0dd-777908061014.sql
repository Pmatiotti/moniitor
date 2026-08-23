-- Remove a constraint UNIQUE apenas no ticker que está causando conflito
ALTER TABLE fundamental_data DROP CONSTRAINT IF EXISTS fundamental_data_ticker_key;

-- Padroniza asset_class de 'Renda Variável' para 'Ações' em todos os registros existentes
UPDATE fundamental_data 
SET asset_class = 'Ações' 
WHERE asset_class = 'Renda Variável';

-- Garante que a constraint composta (ticker, asset_class) existe
-- Ela já deve existir como fundamental_data_ticker_asset_class_key, mas vamos garantir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fundamental_data_ticker_asset_class_key'
  ) THEN
    ALTER TABLE fundamental_data 
    ADD CONSTRAINT fundamental_data_ticker_asset_class_key 
    UNIQUE (ticker, asset_class);
  END IF;
END $$;