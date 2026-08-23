-- Migrate existing data to encrypted columns
UPDATE public.profiles
SET 
  cpf_encrypted = CASE 
    WHEN cpf IS NOT NULL AND cpf != '' 
    THEN public.encrypt_pii(cpf, id) 
    ELSE NULL 
  END,
  phone_encrypted = CASE 
    WHEN phone IS NOT NULL AND phone != '' 
    THEN public.encrypt_pii(phone, id) 
    ELSE NULL 
  END
WHERE (cpf IS NOT NULL AND cpf != '') OR (phone IS NOT NULL AND phone != '');

-- Create a secure view for profiles that handles decryption
-- Only the owner can see their own decrypted data
CREATE OR REPLACE VIEW public.profiles_secure AS
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

-- Create a trigger to automatically encrypt data on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_profile_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt CPF if provided
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    NEW.cpf_encrypted := public.encrypt_pii(NEW.cpf, NEW.id);
  END IF;
  
  -- Encrypt phone if provided
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := public.encrypt_pii(NEW.phone, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS encrypt_profile_pii_trigger ON public.profiles;
CREATE TRIGGER encrypt_profile_pii_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_profile_pii();

-- Add comments
COMMENT ON COLUMN public.profiles.cpf_encrypted IS 'Encrypted CPF using pgp_sym_encrypt with user-specific key';
COMMENT ON COLUMN public.profiles.phone_encrypted IS 'Encrypted phone using pgp_sym_encrypt with user-specific key';
COMMENT ON VIEW public.profiles_secure IS 'Secure view that decrypts PII only for authorized users';