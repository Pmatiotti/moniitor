-- Drop the existing view and recreate with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.profiles_secure;

-- Recreate view with explicit SECURITY INVOKER
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  email,
  created_at,
  updated_at,
  is_active,
  tour_completed,
  birth_date,
  CASE 
    WHEN id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) 
    THEN public.decrypt_pii(cpf_encrypted, id)
    ELSE public.mask_cpf(public.decrypt_pii(cpf_encrypted, id))
  END as cpf,
  CASE 
    WHEN id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    THEN public.decrypt_pii(phone_encrypted, id)
    ELSE public.mask_phone(public.decrypt_pii(phone_encrypted, id))
  END as phone,
  profile_completed,
  organization_id,
  welcome_email_sent,
  onboarding_completed,
  whatsapp_notifications_enabled,
  notification_preferences
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add comment
COMMENT ON VIEW public.profiles_secure IS 'Secure view that decrypts PII only for authorized users (SECURITY INVOKER)';