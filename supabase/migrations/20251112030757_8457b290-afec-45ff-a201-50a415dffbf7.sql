-- Atualizar políticas para permitir gestores visualizarem clientes de assessores
CREATE POLICY "Gestores podem visualizar todos os clientes"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem todas as interações
CREATE POLICY "Gestores podem visualizar todas as interações"
ON interactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem client_actions
CREATE POLICY "Gestores podem visualizar todas as ações"
ON client_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem deal_pipeline
CREATE POLICY "Gestores podem visualizar todos os deals"
ON deal_pipeline
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem meetings
CREATE POLICY "Gestores podem visualizar todas as reuniões"
ON meetings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem client_health_scores
CREATE POLICY "Gestores podem visualizar health scores"
ON client_health_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Gestores visualizarem advisor links  
CREATE POLICY "Gestores podem visualizar advisor links"
ON client_advisor_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'::app_role
  )
);

-- Criar view para métricas de gestores
CREATE OR REPLACE VIEW advisor_performance_metrics AS
SELECT 
  ur.user_id as advisor_id,
  p.full_name as advisor_name,
  p.email as advisor_email,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT i.id) as total_interactions,
  COUNT(DISTINCT CASE WHEN i.interaction_date >= NOW() - INTERVAL '30 days' THEN i.id END) as interactions_last_30_days,
  COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.id END) as new_clients_last_30_days,
  COALESCE(SUM(c.portfolio_value), 0) as total_aum,
  COUNT(DISTINCT m.id) as total_meetings,
  COUNT(DISTINCT CASE WHEN m.meeting_date >= NOW() - INTERVAL '30 days' THEN m.id END) as meetings_last_30_days,
  COUNT(DISTINCT dp.id) as total_deals,
  COUNT(DISTINCT CASE WHEN dp.stage IN ('qualified', 'proposal', 'negotiation') THEN dp.id END) as active_deals
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
LEFT JOIN clients c ON c.advisor_id = ur.user_id
LEFT JOIN interactions i ON i.advisor_id = ur.user_id
LEFT JOIN meetings m ON m.advisor_id = ur.user_id
LEFT JOIN deal_pipeline dp ON dp.advisor_id = ur.user_id
WHERE ur.role = 'assessor'::app_role
GROUP BY ur.user_id, p.full_name, p.email;