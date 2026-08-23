-- Limpar registros duplicados de PETR4 mantendo apenas o mais recente
-- Primeiro, identificar e deletar registros antigos com asset_class diferente

-- Delete the older 'Ações' record for PETR4 (keeping 'Renda Variável')
DELETE FROM fundamental_data 
WHERE ticker = 'PETR4' 
  AND asset_class = 'Ações';

-- Also clean up any other potential duplicates for other tickers
-- Keep only the most recently updated record per ticker
DELETE FROM fundamental_data f1
WHERE EXISTS (
  SELECT 1 FROM fundamental_data f2
  WHERE f1.ticker = f2.ticker
    AND f1.id != f2.id
    AND (
      f1.last_updated < f2.last_updated 
      OR (f1.last_updated = f2.last_updated AND f1.id < f2.id)
    )
);

-- Now add a unique constraint on just ticker to prevent future duplicates
-- First drop the existing composite unique constraint if it exists
-- Note: We need to handle this carefully as the constraint name may vary

-- Create a unique index on ticker only (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS fundamental_data_ticker_unique ON fundamental_data(ticker);