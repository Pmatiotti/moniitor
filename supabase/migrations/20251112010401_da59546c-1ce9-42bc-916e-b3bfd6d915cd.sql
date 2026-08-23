-- Add RLS policies for impersonation_tokens table
-- This table is used by the admin impersonation feature

-- Policy 1: Allow service role to insert impersonation tokens
CREATE POLICY "Service role can insert impersonation tokens"
ON public.impersonation_tokens
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 2: Allow admins to select their own impersonation tokens
CREATE POLICY "Admins can view impersonation tokens they created"
ON public.impersonation_tokens
FOR SELECT
TO authenticated
USING (
  admin_id = auth.uid() AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy 3: Allow service role to update tokens (for marking as used)
CREATE POLICY "Service role can update impersonation tokens"
ON public.impersonation_tokens
FOR UPDATE
TO service_role
USING (true);

-- Policy 4: Auto-delete expired tokens (cleanup)
CREATE POLICY "Service role can delete expired tokens"
ON public.impersonation_tokens
FOR DELETE
TO service_role
USING (expires_at < now());

-- Add function to hash temporary passwords using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update temporary_passwords table to use hashed passwords
ALTER TABLE public.temporary_passwords 
  ALTER COLUMN temp_password TYPE text;

-- Create function to hash password
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- Create function to verify hashed password
CREATE OR REPLACE FUNCTION public.verify_password(password text, hashed_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN hashed_password = crypt(password, hashed_password);
END;
$$;