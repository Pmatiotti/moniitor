-- Drop the old admin view policy that might be conflicting
DROP POLICY IF EXISTS "Admins can view all advisor links" ON public.client_advisor_links;

-- Create a new, clearer policy for admins to view all links
CREATE POLICY "Admins can view all advisor links v2"
ON public.client_advisor_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Also ensure admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can manage all advisor links" ON public.client_advisor_links;

CREATE POLICY "Admins can insert advisor links"
ON public.client_advisor_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update advisor links"
ON public.client_advisor_links
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete advisor links"
ON public.client_advisor_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);