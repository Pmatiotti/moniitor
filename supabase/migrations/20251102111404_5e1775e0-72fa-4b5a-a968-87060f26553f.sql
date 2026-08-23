-- Add additional profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create index for CPF (unique)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_key ON public.profiles(cpf) WHERE cpf IS NOT NULL;

-- Create table for temporary passwords
CREATE TABLE IF NOT EXISTS public.temporary_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  temp_password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  used boolean DEFAULT false,
  UNIQUE(user_id)
);

-- Enable RLS on temporary_passwords
ALTER TABLE public.temporary_passwords ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own temporary password
CREATE POLICY "Users can view own temporary password"
ON public.temporary_passwords
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: System can insert temporary passwords
CREATE POLICY "System can insert temporary passwords"
ON public.temporary_passwords
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own temporary password (mark as used)
CREATE POLICY "Users can update own temporary password"
ON public.temporary_passwords
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Function to generate random temporary password
CREATE OR REPLACE FUNCTION public.generate_temp_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;