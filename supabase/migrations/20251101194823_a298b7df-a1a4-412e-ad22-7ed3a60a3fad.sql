-- Add comprehensive fundamental data tables for detailed stock analysis

-- Table for income statement (DRE) data
CREATE TABLE IF NOT EXISTS public.income_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
  
  -- Revenue metrics
  total_revenue NUMERIC,
  cost_of_revenue NUMERIC,
  gross_profit NUMERIC,
  
  -- Operating metrics
  operating_expenses NUMERIC,
  operating_income NUMERIC,
  ebitda NUMERIC,
  ebit NUMERIC,
  
  -- Profit metrics
  net_income NUMERIC,
  earnings_per_share NUMERIC,
  
  -- Margins
  gross_margin NUMERIC,
  operating_margin NUMERIC,
  net_margin NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticker, period_end, period_type)
);

-- Table for balance sheet data
CREATE TABLE IF NOT EXISTS public.balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
  
  -- Assets
  total_assets NUMERIC,
  current_assets NUMERIC,
  cash_and_equivalents NUMERIC,
  accounts_receivable NUMERIC,
  inventory NUMERIC,
  
  -- Liabilities
  total_liabilities NUMERIC,
  current_liabilities NUMERIC,
  long_term_debt NUMERIC,
  short_term_debt NUMERIC,
  
  -- Equity
  total_equity NUMERIC,
  retained_earnings NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticker, period_end, period_type)
);

-- Table for cash flow data
CREATE TABLE IF NOT EXISTS public.cash_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
  
  -- Operating activities
  operating_cash_flow NUMERIC,
  
  -- Investing activities
  investing_cash_flow NUMERIC,
  capital_expenditure NUMERIC,
  
  -- Financing activities
  financing_cash_flow NUMERIC,
  dividends_paid NUMERIC,
  
  -- Net change
  net_change_in_cash NUMERIC,
  free_cash_flow NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticker, period_end, period_type)
);

-- Table for key metrics and ratios
CREATE TABLE IF NOT EXISTS public.stock_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  
  -- Valuation metrics
  market_cap NUMERIC,
  enterprise_value NUMERIC,
  ev_to_ebitda NUMERIC,
  price_to_earnings NUMERIC,
  price_to_book NUMERIC,
  price_to_sales NUMERIC,
  
  -- Profitability metrics
  roe NUMERIC,
  roa NUMERIC,
  roic NUMERIC,
  gross_margin NUMERIC,
  operating_margin NUMERIC,
  net_margin NUMERIC,
  
  -- Efficiency metrics
  asset_turnover NUMERIC,
  inventory_turnover NUMERIC,
  
  -- Liquidity metrics
  current_ratio NUMERIC,
  quick_ratio NUMERIC,
  
  -- Leverage metrics
  debt_to_equity NUMERIC,
  debt_to_assets NUMERIC,
  interest_coverage NUMERIC,
  
  -- Growth metrics
  revenue_growth_yoy NUMERIC,
  earnings_growth_yoy NUMERIC,
  
  -- Dividend metrics
  dividend_yield NUMERIC,
  payout_ratio NUMERIC,
  
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticker)
);

-- Enable RLS on new tables
ALTER TABLE public.income_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read, only service role can write
CREATE POLICY "Anyone can read income statements"
  ON public.income_statements FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert income statements"
  ON public.income_statements FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update income statements"
  ON public.income_statements FOR UPDATE
  USING (false);

CREATE POLICY "Anyone can read balance sheets"
  ON public.balance_sheets FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert balance sheets"
  ON public.balance_sheets FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update balance sheets"
  ON public.balance_sheets FOR UPDATE
  USING (false);

CREATE POLICY "Anyone can read cash flows"
  ON public.cash_flows FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert cash flows"
  ON public.cash_flows FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update cash flows"
  ON public.cash_flows FOR UPDATE
  USING (false);

CREATE POLICY "Anyone can read stock metrics"
  ON public.stock_metrics FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert stock metrics"
  ON public.stock_metrics FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update stock metrics"
  ON public.stock_metrics FOR UPDATE
  USING (false);

-- Create indexes for better query performance
CREATE INDEX idx_income_statements_ticker ON public.income_statements(ticker);
CREATE INDEX idx_income_statements_period ON public.income_statements(period_end DESC);
CREATE INDEX idx_balance_sheets_ticker ON public.balance_sheets(ticker);
CREATE INDEX idx_balance_sheets_period ON public.balance_sheets(period_end DESC);
CREATE INDEX idx_cash_flows_ticker ON public.cash_flows(ticker);
CREATE INDEX idx_cash_flows_period ON public.cash_flows(period_end DESC);
CREATE INDEX idx_stock_metrics_ticker ON public.stock_metrics(ticker);