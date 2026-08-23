-- Create table to store asset value history for evolution charts
CREATE TABLE public.asset_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_date date NOT NULL,
  value_accrual numeric NOT NULL,
  value_market numeric,
  daily_return_percent numeric,
  cumulative_return_percent numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, reference_date)
);

-- Indexes for fast queries
CREATE INDEX idx_asset_value_history_asset ON public.asset_value_history(asset_id, reference_date DESC);
CREATE INDEX idx_asset_value_history_user ON public.asset_value_history(user_id, reference_date DESC);

-- Enable RLS
ALTER TABLE public.asset_value_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own asset history
CREATE POLICY "Users can view own asset history"
  ON public.asset_value_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert asset history"
  ON public.asset_value_history FOR INSERT
  WITH CHECK (true);

-- Service role can update
CREATE POLICY "Service role can update asset history"
  ON public.asset_value_history FOR UPDATE
  USING (true);