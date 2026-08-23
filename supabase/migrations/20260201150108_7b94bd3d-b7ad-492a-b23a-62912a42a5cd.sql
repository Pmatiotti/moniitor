-- Create quarterly_fundamentals table for quarterly financial data
CREATE TABLE IF NOT EXISTS public.quarterly_fundamentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'acoes',
  year INT NOT NULL,
  quarter INT NOT NULL,
  
  -- Revenue Metrics
  revenue NUMERIC,
  gross_profit NUMERIC,
  ebit NUMERIC,
  ebitda NUMERIC,
  net_income NUMERIC,
  
  -- Margins
  gross_margin NUMERIC,
  ebit_margin NUMERIC,
  ebitda_margin NUMERIC,
  net_margin NUMERIC,
  
  -- Balance Sheet
  total_assets NUMERIC,
  total_equity NUMERIC,
  total_debt NUMERIC,
  net_debt NUMERIC,
  cash_and_equivalents NUMERIC,
  
  -- Profitability (annualized or quarterly)
  roe NUMERIC,
  roa NUMERIC,
  roic NUMERIC,
  
  -- Dividends
  dividends_paid NUMERIC,
  
  -- Valuation (calculated with end-of-quarter price)
  p_l NUMERIC,
  p_vp NUMERIC,
  ev_ebitda NUMERIC,
  
  -- Metadata
  data_source TEXT,
  is_financial BOOLEAN DEFAULT FALSE,
  format_flags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT quarterly_fundamentals_quarter_check CHECK (quarter BETWEEN 1 AND 4),
  CONSTRAINT quarterly_fundamentals_unique UNIQUE(ticker, asset_class, year, quarter)
);

-- Create indexes for efficient querying
CREATE INDEX idx_quarterly_fundamentals_ticker ON public.quarterly_fundamentals(ticker);
CREATE INDEX idx_quarterly_fundamentals_year_quarter ON public.quarterly_fundamentals(year, quarter);
CREATE INDEX idx_quarterly_fundamentals_ticker_year ON public.quarterly_fundamentals(ticker, year);

-- Enable RLS
ALTER TABLE public.quarterly_fundamentals ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (same as annual_fundamentals)
CREATE POLICY "Allow public read access to quarterly_fundamentals"
ON public.quarterly_fundamentals
FOR SELECT
USING (true);

-- Create policy for service role insert/update
CREATE POLICY "Allow service role full access to quarterly_fundamentals"
ON public.quarterly_fundamentals
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Add trigger for updated_at
CREATE TRIGGER update_quarterly_fundamentals_updated_at
  BEFORE UPDATE ON public.quarterly_fundamentals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();