
-- Add status column to interactions table
ALTER TABLE public.interactions 
ADD COLUMN status text NOT NULL DEFAULT 'completed';

-- Set future interactions as 'scheduled'
UPDATE public.interactions 
SET status = 'scheduled' 
WHERE interaction_date > CURRENT_DATE;

-- Create index for efficient filtering
CREATE INDEX idx_interactions_status ON public.interactions(status);
