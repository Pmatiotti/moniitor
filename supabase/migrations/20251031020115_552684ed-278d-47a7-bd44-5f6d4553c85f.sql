-- Create goal_portfolio_mappings table
CREATE TABLE public.goal_portfolio_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_class TEXT,
  sub_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.goal_portfolio_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_portfolio_mappings
CREATE POLICY "Users can view own goal mappings"
ON public.goal_portfolio_mappings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal mappings"
ON public.goal_portfolio_mappings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal mappings"
ON public.goal_portfolio_mappings
FOR DELETE
USING (auth.uid() = user_id);

-- Create goal_progress_history table
CREATE TABLE public.goal_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.goal_progress_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goal_progress_history
CREATE POLICY "Users can view own goal history"
ON public.goal_progress_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goal history"
ON public.goal_progress_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  goal_id UUID REFERENCES public.financial_goals(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_goal_mappings_goal_id ON public.goal_portfolio_mappings(goal_id);
CREATE INDEX idx_goal_mappings_user_id ON public.goal_portfolio_mappings(user_id);
CREATE INDEX idx_goal_history_goal_id ON public.goal_progress_history(goal_id);
CREATE INDEX idx_achievements_user_id ON public.user_achievements(user_id);