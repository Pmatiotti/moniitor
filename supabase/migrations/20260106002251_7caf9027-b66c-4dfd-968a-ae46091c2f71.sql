-- Create function for updating updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing upcoming/provisioned dividends
CREATE TABLE public.upcoming_dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  dividend_type TEXT NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  payment_date DATE NOT NULL,
  ex_date DATE,
  expected_amount DECIMAL(15,2),
  quantity DECIMAL(15,6),
  source TEXT DEFAULT 'brapi',
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker, payment_date, dividend_type)
);

-- Enable RLS
ALTER TABLE public.upcoming_dividends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own upcoming dividends"
ON public.upcoming_dividends
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upcoming dividends"
ON public.upcoming_dividends
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upcoming dividends"
ON public.upcoming_dividends
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upcoming dividends"
ON public.upcoming_dividends
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_upcoming_dividends_user_id ON public.upcoming_dividends(user_id);
CREATE INDEX idx_upcoming_dividends_payment_date ON public.upcoming_dividends(payment_date);
CREATE INDEX idx_upcoming_dividends_ticker ON public.upcoming_dividends(ticker);

-- Create trigger for updated_at
CREATE TRIGGER update_upcoming_dividends_updated_at
BEFORE UPDATE ON public.upcoming_dividends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();