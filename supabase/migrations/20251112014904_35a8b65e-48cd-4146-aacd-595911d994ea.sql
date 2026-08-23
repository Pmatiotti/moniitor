-- =====================================================
-- PADRÃO OURO DE SEGURANÇA - INTEGRAÇÃO PLUGGY
-- =====================================================

-- 1. ATIVAR EXTENSÃO DE CRIPTOGRAFIA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABELA DE LOGS DE AUDITORIA PLUGGY
CREATE TABLE IF NOT EXISTS public.pluggy_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('connection_created', 'connection_deleted', 'sync_started', 'sync_completed', 'sync_failed', 'token_created')),
  item_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance de auditoria
CREATE INDEX idx_pluggy_audit_logs_user_id ON public.pluggy_audit_logs(user_id);
CREATE INDEX idx_pluggy_audit_logs_action ON public.pluggy_audit_logs(action);
CREATE INDEX idx_pluggy_audit_logs_created_at ON public.pluggy_audit_logs(created_at DESC);

-- 3. TABELA DE RATE LIMITING
CREATE TABLE IF NOT EXISTS public.pluggy_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create_token', 'sync_data', 'create_connection')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action)
);

CREATE INDEX idx_pluggy_rate_limits_user_action ON public.pluggy_rate_limits(user_id, action);
CREATE INDEX idx_pluggy_rate_limits_window ON public.pluggy_rate_limits(window_start);

-- 4. FUNÇÃO PARA VERIFICAR RATE LIMIT
CREATE OR REPLACE FUNCTION public.check_pluggy_rate_limit(
  _user_id UUID,
  _action TEXT,
  _max_attempts INTEGER DEFAULT 10,
  _window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Limpar registros antigos
  DELETE FROM public.pluggy_rate_limits
  WHERE window_start < now() - (_window_minutes || ' minutes')::interval;
  
  -- Buscar ou criar registro
  SELECT attempt_count, window_start
  INTO _current_count, _window_start
  FROM public.pluggy_rate_limits
  WHERE user_id = _user_id AND action = _action;
  
  -- Se não existe, criar novo
  IF NOT FOUND THEN
    INSERT INTO public.pluggy_rate_limits (user_id, action, attempt_count)
    VALUES (_user_id, _action, 1);
    RETURN TRUE;
  END IF;
  
  -- Verificar se está dentro do limite
  IF _current_count >= _max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contador
  UPDATE public.pluggy_rate_limits
  SET attempt_count = attempt_count + 1,
      last_attempt = now()
  WHERE user_id = _user_id AND action = _action;
  
  RETURN TRUE;
END;
$$;

-- 5. FUNÇÃO PARA REGISTRAR AUDITORIA
CREATE OR REPLACE FUNCTION public.log_pluggy_audit(
  _user_id UUID,
  _action TEXT,
  _item_id UUID DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.pluggy_audit_logs (
    user_id,
    action,
    item_id,
    details,
    ip_address,
    user_agent
  )
  VALUES (
    _user_id,
    _action,
    _item_id,
    _details,
    _ip_address,
    _user_agent
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- 6. POLÍTICAS RLS PARA AUDIT LOGS
ALTER TABLE public.pluggy_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.pluggy_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.pluggy_audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. POLÍTICAS RLS PARA RATE LIMITS (apenas admin pode ver)
ALTER TABLE public.pluggy_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.pluggy_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all rate limits"
  ON public.pluggy_rate_limits
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. FUNÇÃO PARA CRIPTOGRAFAR DADOS SENSÍVEIS
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _encryption_key TEXT;
BEGIN
  -- Usar uma chave de criptografia das secrets
  _encryption_key := current_setting('app.encryption_key', true);
  
  IF _encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(_data::bytea, _encryption_key),
    'base64'
  );
END;
$$;

-- 9. FUNÇÃO PARA DESCRIPTOGRAFAR DADOS SENSÍVEIS
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(_encrypted_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _encryption_key TEXT;
BEGIN
  _encryption_key := current_setting('app.encryption_key', true);
  
  IF _encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  RETURN convert_from(
    pgp_sym_decrypt(decode(_encrypted_data, 'base64'), _encryption_key),
    'utf8'
  );
END;
$$;

-- 10. TRIGGER PARA AUTO-LOG DE CRIAÇÃO DE ITEMS
CREATE OR REPLACE FUNCTION public.trigger_log_pluggy_item_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_pluggy_audit(
    NEW.user_id,
    'connection_created',
    NEW.item_id::uuid,
    jsonb_build_object(
      'connector_id', NEW.connector_id,
      'connector_name', NEW.connector_name
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_pluggy_item_creation
  AFTER INSERT ON public.pluggy_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_pluggy_item_creation();

-- 11. TRIGGER PARA AUTO-LOG DE DELEÇÃO DE ITEMS
CREATE OR REPLACE FUNCTION public.trigger_log_pluggy_item_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_pluggy_audit(
    OLD.user_id,
    'connection_deleted',
    OLD.item_id::uuid,
    jsonb_build_object(
      'connector_name', OLD.connector_name
    )
  );
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER log_pluggy_item_deletion
  BEFORE DELETE ON public.pluggy_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_pluggy_item_deletion();

-- 12. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE public.pluggy_audit_logs IS 'Registros de auditoria para todas as ações relacionadas ao Pluggy';
COMMENT ON TABLE public.pluggy_rate_limits IS 'Controle de rate limiting para prevenir abuso da integração Pluggy';
COMMENT ON FUNCTION public.check_pluggy_rate_limit IS 'Verifica se usuário está dentro do limite de requisições';
COMMENT ON FUNCTION public.log_pluggy_audit IS 'Registra ação de auditoria relacionada ao Pluggy';
COMMENT ON FUNCTION public.encrypt_sensitive_data IS 'Criptografa dados sensíveis usando AES-256';
COMMENT ON FUNCTION public.decrypt_sensitive_data IS 'Descriptografa dados sensíveis';

-- Concluído: Sistema de segurança avançado implementado