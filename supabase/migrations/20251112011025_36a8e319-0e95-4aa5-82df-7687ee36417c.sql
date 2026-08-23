-- Create table for Pluggy connections (items)
CREATE TABLE public.pluggy_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL UNIQUE,
  connector_id TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE
);

-- Create table for Pluggy accounts
CREATE TABLE public.pluggy_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_item_id UUID NOT NULL REFERENCES public.pluggy_items(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL UNIQUE,
  account_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  balance NUMERIC,
  currency TEXT DEFAULT 'BRL',
  category_id UUID REFERENCES public.categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for Pluggy investments
CREATE TABLE public.pluggy_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_account_id UUID NOT NULL REFERENCES public.pluggy_accounts(id) ON DELETE CASCADE,
  investment_id TEXT NOT NULL UNIQUE,
  investment_type TEXT NOT NULL,
  investment_name TEXT NOT NULL,
  quantity NUMERIC,
  amount NUMERIC NOT NULL,
  current_price NUMERIC,
  ticker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for sync history
CREATE TABLE public.pluggy_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pluggy_item_id UUID NOT NULL REFERENCES public.pluggy_items(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  synced_records INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pluggy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pluggy_items
CREATE POLICY "Users can view own Pluggy items"
  ON public.pluggy_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Pluggy items"
  ON public.pluggy_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Pluggy items"
  ON public.pluggy_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Pluggy items"
  ON public.pluggy_items FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for pluggy_accounts
CREATE POLICY "Users can view own Pluggy accounts"
  ON public.pluggy_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Pluggy accounts"
  ON public.pluggy_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Pluggy accounts"
  ON public.pluggy_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Pluggy accounts"
  ON public.pluggy_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for pluggy_investments
CREATE POLICY "Users can view own Pluggy investments"
  ON public.pluggy_investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Pluggy investments"
  ON public.pluggy_investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Pluggy investments"
  ON public.pluggy_investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Pluggy investments"
  ON public.pluggy_investments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for pluggy_sync_history
CREATE POLICY "Users can view own sync history"
  ON public.pluggy_sync_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sync history"
  ON public.pluggy_sync_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_pluggy_items_user_id ON public.pluggy_items(user_id);
CREATE INDEX idx_pluggy_accounts_user_id ON public.pluggy_accounts(user_id);
CREATE INDEX idx_pluggy_investments_user_id ON public.pluggy_investments(user_id);
CREATE INDEX idx_pluggy_sync_history_user_id ON public.pluggy_sync_history(user_id);