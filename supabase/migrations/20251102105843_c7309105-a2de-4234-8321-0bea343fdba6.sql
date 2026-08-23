-- Drop the existing policies
DROP POLICY IF EXISTS "Anyone can view advisor and admin profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view advisor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view advisor and admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can view advisor roles" ON public.user_roles;

-- Create new policy that only allows viewing advisor profiles (not admins)
CREATE POLICY "Clients can view advisor profiles"
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

-- Create policy to only show assessor role to authenticated users
CREATE POLICY "Clients can view advisor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'assessor');