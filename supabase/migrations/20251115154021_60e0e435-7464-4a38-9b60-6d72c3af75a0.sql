
-- Permitir que novos usuários tenham um perfil criado automaticamente
CREATE POLICY "Allow profile creation on signup"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (true);
