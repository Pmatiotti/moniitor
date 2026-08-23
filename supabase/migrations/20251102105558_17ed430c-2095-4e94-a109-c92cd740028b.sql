-- Allow authenticated users to view profiles of users who are advisors or admins
-- This is needed so clients can search for and link to advisors
CREATE POLICY "Anyone can view advisor and admin profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = profiles.id 
    AND user_roles.role IN ('assessor', 'admin')
  )
);