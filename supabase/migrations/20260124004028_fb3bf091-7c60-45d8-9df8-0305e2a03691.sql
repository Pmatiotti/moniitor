-- Add explicit market region for equity assets (Brasil vs Exterior)
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS market_region TEXT;

-- Optional validation: allow NULL for non-equity assets; constrain values when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assets_market_region_check'
  ) THEN
    ALTER TABLE public.assets
    ADD CONSTRAINT assets_market_region_check
    CHECK (market_region IS NULL OR market_region IN ('br', 'intl'));
  END IF;
END $$;

-- Backfill conservative defaults for existing equity stocks when missing
-- (Does NOT attempt to infer; just sets BR for common existing BRL equity rows to reduce NULLs)
UPDATE public.assets
SET market_region = 'br'
WHERE market_region IS NULL
  AND asset_class = 'Renda Variável'
  AND sub_class = 'Ações'
  AND (currency IS NULL OR currency = 'BRL');
