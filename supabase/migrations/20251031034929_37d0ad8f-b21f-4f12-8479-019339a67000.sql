-- Create impersonation_tokens table to temporarily store impersonation sessions
CREATE TABLE IF NOT EXISTS public.impersonation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on impersonation_tokens
ALTER TABLE public.impersonation_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage impersonation tokens (for security)
-- This prevents users from creating fake impersonation tokens
CREATE POLICY "Service role can manage impersonation tokens"
ON public.impersonation_tokens
FOR ALL
USING (false)
WITH CHECK (false);