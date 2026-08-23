-- Allow anyone to update invitation when accepting (mark as accepted)
CREATE POLICY "Anyone can update invitation when accepting"
ON public.invitations
FOR UPDATE
TO public
USING (accepted_at IS NULL AND expires_at > now())
WITH CHECK (accepted_at IS NOT NULL);