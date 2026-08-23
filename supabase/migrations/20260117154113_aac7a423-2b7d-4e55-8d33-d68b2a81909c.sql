-- Add new columns to goal_portfolio_mappings for allocation percentage
ALTER TABLE public.goal_portfolio_mappings 
ADD COLUMN IF NOT EXISTS allocation_percentage numeric DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
ADD COLUMN IF NOT EXISTS notes text;

-- Add new columns to financial_goals for priority and icon
ALTER TABLE public.financial_goals 
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS icon text;

-- Create index for faster queries on priority
CREATE INDEX IF NOT EXISTS idx_financial_goals_priority ON public.financial_goals(priority);

-- Add comment for documentation
COMMENT ON COLUMN public.goal_portfolio_mappings.allocation_percentage IS 'Percentage of the asset value allocated to this goal (0-100)';
COMMENT ON COLUMN public.financial_goals.priority IS 'Goal priority from 1 (highest) to 5 (lowest)';