-- Add unique constraint to fundamental_data ticker
ALTER TABLE public.fundamental_data
  ADD CONSTRAINT fundamental_data_ticker_key UNIQUE (ticker);