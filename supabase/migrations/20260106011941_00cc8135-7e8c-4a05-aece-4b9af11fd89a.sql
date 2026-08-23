-- Adicionar coluna target_price na tabela alerts
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS target_price numeric;

-- Adicionar coluna notification_preferences na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}';

-- Criar tabela alert_history
CREATE TABLE IF NOT EXISTS public.alert_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  ticker text,
  triggered_at timestamptz DEFAULT now(),
  trigger_value numeric,
  trigger_details jsonb,
  notification_sent boolean DEFAULT false,
  whatsapp_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS para alert_history
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para alert_history
CREATE POLICY "Users can view their own alert history"
  ON public.alert_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert alert history"
  ON public.alert_history FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON public.alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at ON public.alert_history(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alerts_target_price ON public.alerts(target_price) WHERE target_price IS NOT NULL;