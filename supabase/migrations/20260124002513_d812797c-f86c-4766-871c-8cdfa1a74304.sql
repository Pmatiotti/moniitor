-- Normalize fundamental_data.asset_class to canonical values: acoes (BR), stock (exterior), fii
-- Also remove potential duplicates that would collide after normalization.

DO $$
BEGIN
  -- 1) Remove duplicates that would collide after normalization (keep most recently updated)
  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY
          upper(ticker),
          CASE
            WHEN lower(asset_class) IN ('ação','acoes','ações','acao','renda variável','renda variavel') THEN 'acoes'
            WHEN lower(asset_class) IN ('fii','fiis') THEN 'fii'
            WHEN lower(asset_class) = 'stock' THEN 'stock'
            ELSE lower(asset_class)
          END
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id
      ) AS rn
    FROM public.fundamental_data
  )
  DELETE FROM public.fundamental_data fd
  USING ranked r
  WHERE fd.id = r.id
    AND r.rn > 1;

  -- 2) Apply normalization
  UPDATE public.fundamental_data
  SET asset_class = CASE
    WHEN lower(asset_class) IN ('ação','acoes','ações','acao','renda variável','renda variavel') THEN 'acoes'
    WHEN lower(asset_class) IN ('fii','fiis') THEN 'fii'
    ELSE lower(asset_class)
  END
  WHERE asset_class IS NOT NULL;
END $$;
