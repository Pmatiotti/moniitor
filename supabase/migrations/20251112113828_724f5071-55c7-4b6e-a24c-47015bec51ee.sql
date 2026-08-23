-- Recreate advisor_performance_metrics view with role-based access control
DROP VIEW IF EXISTS advisor_performance_metrics;

CREATE VIEW advisor_performance_metrics 
WITH (security_barrier=true, security_invoker=true)
AS
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
WHERE 
  ur.role = 'assessor'::app_role
  AND (
    -- Admins can see all advisor metrics
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Gestores can see all advisor metrics
    has_role(auth.uid(), 'gestor'::app_role)
    OR
    -- Assessores can only see their own metrics
    (has_role(auth.uid(), 'assessor'::app_role) AND ur.user_id = auth.uid())
  )
GROUP BY ur.user_id, p.full_name, p.email;

-- Grant access to authenticated users (filtered by WHERE clause)
GRANT SELECT ON advisor_performance_metrics TO authenticated;