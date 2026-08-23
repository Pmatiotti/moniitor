-- Allow all authenticated users to view advisor and admin roles
-- This is needed so clients can search for and link to advisors
CREATE POLICY "Anyone can view advisor and admin roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role IN ('assessor', 'admin'));