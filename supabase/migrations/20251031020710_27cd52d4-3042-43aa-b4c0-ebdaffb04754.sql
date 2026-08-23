-- Add goal_id to alerts table for goal-specific alerts
ALTER TABLE public.alerts 
ADD COLUMN goal_id UUID REFERENCES public.financial_goals(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_alerts_goal_id ON public.alerts(goal_id);

-- Add new alert types for goals
COMMENT ON COLUMN public.alerts.goal_id IS 'Reference to financial goal for goal-specific alerts';