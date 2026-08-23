-- Add unique constraint to fundamental_data table for proper upserts
ALTER TABLE public.fundamental_data 
ADD CONSTRAINT fundamental_data_ticker_asset_class_key 
UNIQUE (ticker, asset_class);