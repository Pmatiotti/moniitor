-- Drop the existing policy that allows viewing admins
DROP POLICY IF EXISTS "Anyone can view advisor and admin profiles" ON public.profiles;

-- Create new policy that only allows viewing advisor profiles
CREATE POLICY "Anyone can view advisor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role = 'assessor'
  )
);

-- Update the user_roles policy to only show assessor role
DROP POLICY IF EXISTS "Anyone can view advisor and admin roles" ON public.user_roles;

CREATE POLICY "Anyone can view advisor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'assessor');