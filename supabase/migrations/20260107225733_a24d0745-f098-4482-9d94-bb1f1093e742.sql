-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns for sensitive data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf_encrypted bytea,
ADD COLUMN IF NOT EXISTS phone_encrypted bytea;

-- Create a secure encryption function using a database-level key
CREATE OR REPLACE FUNCTION public.encrypt_pii(
  _data text,
  _user_id uuid
)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  IF _data IS NULL OR _data = '' THEN
    RETURN NULL;
  END IF;
  
  -- Create a deterministic key based on user_id and a static salt
  _key := encode(extensions.digest((_user_id::text || 'pii_encryption_salt_v1')::bytea, 'sha256'), 'hex');
  
  RETURN extensions.pgp_sym_encrypt(_data, _key);
END;
$$;

-- Create a secure decryption function
CREATE OR REPLACE FUNCTION public.decrypt_pii(
  _encrypted_data bytea,
  _user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  IF _encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  _key := encode(extensions.digest((_user_id::text || 'pii_encryption_salt_v1')::bytea, 'sha256'), 'hex');
  
  BEGIN
    RETURN extensions.pgp_sym_decrypt(_encrypted_data, _key);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Create a function to mask CPF for display
CREATE OR REPLACE FUNCTION public.mask_cpf(_cpf text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _cpf IS NULL OR length(_cpf) < 4 THEN
    RETURN '***.***.***-**';
  END IF;
  RETURN '***.***.***-' || right(_cpf, 2);
END;
$$;

-- Create a function to mask phone for display
CREATE OR REPLACE FUNCTION public.mask_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _phone IS NULL OR length(_phone) < 4 THEN
    RETURN '(**) *****-****';
  END IF;
  RETURN '(**) *****-' || right(_phone, 4);
END;
$$;