-- Fix: allow same ticker across different asset_class (keep composite unique)
-- The edge function upserts on (ticker, asset_class), but a leftover UNIQUE index on (ticker)
-- makes inserts fail with 23505 when the ticker already exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'fundamental_data'
      AND indexname = 'fundamental_data_ticker_unique'
  ) THEN
    EXECUTE 'DROP INDEX public.fundamental_data_ticker_unique';
  END IF;
END $$;