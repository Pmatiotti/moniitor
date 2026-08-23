-- Create table for fundamental data
CREATE TABLE IF NOT EXISTS public.fundamental_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  
  -- Price data
  current_price NUMERIC,
  previous_close NUMERIC,
  day_change_percent NUMERIC,
  week_52_high NUMERIC,
  week_52_low NUMERIC,
  
  -- Valuation metrics
  market_cap NUMERIC,
  pe_ratio NUMERIC,
  pb_ratio NUMERIC,
  
  -- Profitability metrics
  roe NUMERIC,
  roa NUMERIC,
  profit_margin NUMERIC,
  
  -- Dividend metrics
  dividend_yield NUMERIC,
  payout_ratio NUMERIC,
  annual_dividend NUMERIC,
  
  -- FII specific
  vacancia NUMERIC,
  p_vp NUMERIC,
  
  -- ETF specific
  aum NUMERIC,
  expense_ratio NUMERIC,
  
  -- Volume and liquidity
  avg_volume NUMERIC,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_source TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ticker for faster lookups
CREATE INDEX idx_fundamental_data_ticker ON public.fundamental_data(ticker);

-- Enable RLS
ALTER TABLE public.fundamental_data ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read fundamental data (public market data)
CREATE POLICY "Fundamental data is publicly readable"
  ON public.fundamental_data
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_fundamental_data_updated_at
  BEFORE UPDATE ON public.fundamental_data
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();