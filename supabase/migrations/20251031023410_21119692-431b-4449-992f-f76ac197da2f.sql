-- Add is_active field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Create a function to create a new user with role (for admin use)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text,
  user_password text,
  user_full_name text,
  user_role app_role DEFAULT 'cliente'::app_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Check if the caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- This function should be called from an edge function with service role
  -- Return instruction for client
  result := json_build_object(
    'success', false,
    'message', 'Use edge function to create users'
  );
  
  RETURN result;
END;
$$;