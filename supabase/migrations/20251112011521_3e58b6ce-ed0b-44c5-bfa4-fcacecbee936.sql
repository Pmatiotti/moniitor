-- Add new columns to pluggy_accounts for complete data
ALTER TABLE public.pluggy_accounts 
  ADD COLUMN IF NOT EXISTS available_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS overdraft_limit NUMERIC,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT;

-- Create table for credit cards data
CREATE TABLE IF NOT EXISTS public.pluggy_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_account_id UUID NOT NULL REFERENCES public.pluggy_accounts(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL UNIQUE,
  card_name TEXT NOT NULL,
  card_network TEXT,
  available_credit NUMERIC,
  close_day INTEGER,
  due_day INTEGER,
  minimum_payment NUMERIC,
  total_balance NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for investment portfolios
CREATE TABLE IF NOT EXISTS public.pluggy_investment_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_account_id UUID NOT NULL REFERENCES public.pluggy_accounts(id) ON DELETE CASCADE,
  portfolio_type TEXT NOT NULL,
  total_value NUMERIC NOT NULL,
  total_gain NUMERIC,
  total_gain_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pluggy_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_investment_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit cards
CREATE POLICY "Users can view own credit cards"
  ON public.pluggy_credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own credit cards"
  ON public.pluggy_credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards"
  ON public.pluggy_credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards"
  ON public.pluggy_credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for investment portfolios
CREATE POLICY "Users can view own investment portfolios"
  ON public.pluggy_investment_portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own investment portfolios"
  ON public.pluggy_investment_portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment portfolios"
  ON public.pluggy_investment_portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment portfolios"
  ON public.pluggy_investment_portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pluggy_credit_cards_user_id ON public.pluggy_credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_investment_portfolios_user_id ON public.pluggy_investment_portfolios(user_id);

-- Enable pg_cron extension for scheduled syncs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;