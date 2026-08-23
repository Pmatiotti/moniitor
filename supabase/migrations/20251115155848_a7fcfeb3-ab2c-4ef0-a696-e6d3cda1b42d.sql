-- Add welcome_email_sent column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.welcome_email_sent IS 'Tracks if welcome email has been sent to user after email verification';