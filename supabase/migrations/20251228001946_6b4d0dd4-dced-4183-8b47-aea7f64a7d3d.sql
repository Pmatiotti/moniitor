-- Add onboarding_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indicates whether the user has completed the onboarding checklist';