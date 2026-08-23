-- Adicionar política RLS para clientes verem seu próprio registro
CREATE POLICY "Users can view own client record"
ON clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid());