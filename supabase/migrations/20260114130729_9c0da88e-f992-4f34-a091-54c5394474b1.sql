-- Tabela unificada de eventos corporativos
CREATE TABLE public.corporate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('dividend', 'jcp', 'bonus', 'subscription', 'split', 'reverse_split', 'amortization', 'relevant_fact')),
  event_subtype TEXT,
  title TEXT NOT NULL,
  description TEXT,
  value_per_share NUMERIC,
  ratio TEXT,
  announcement_date DATE NOT NULL,
  ex_date DATE,
  payment_date DATE,
  deadline_date DATE,
  document_url TEXT,
  source TEXT DEFAULT 'brapi',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_corporate_events_ticker ON public.corporate_events(ticker);
CREATE INDEX idx_corporate_events_type ON public.corporate_events(event_type);
CREATE INDEX idx_corporate_events_announcement ON public.corporate_events(announcement_date DESC);
CREATE INDEX idx_corporate_events_payment ON public.corporate_events(payment_date);

-- Índice único simplificado (sem COALESCE para evitar erro IMMUTABLE)
CREATE UNIQUE INDEX idx_corporate_events_unique ON public.corporate_events(
  ticker, 
  event_type, 
  announcement_date, 
  value_per_share,
  payment_date
) WHERE value_per_share IS NOT NULL AND payment_date IS NOT NULL;

-- Índice único para eventos sem valor (fatos relevantes)
CREATE UNIQUE INDEX idx_corporate_events_unique_facts ON public.corporate_events(
  ticker, 
  event_type, 
  announcement_date,
  title
) WHERE event_type = 'relevant_fact';

-- Tabela de notificações de eventos por usuário
CREATE TABLE public.user_event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.corporate_events(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ DEFAULT now(),
  whatsapp_sent BOOLEAN DEFAULT false,
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_user_event_notifications_user ON public.user_event_notifications(user_id);
CREATE INDEX idx_user_event_notifications_event ON public.user_event_notifications(event_id);

-- Enable RLS
ALTER TABLE public.corporate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_event_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para corporate_events (leitura pública)
CREATE POLICY "Anyone can read corporate events"
ON public.corporate_events FOR SELECT
USING (true);

-- Políticas para user_event_notifications
CREATE POLICY "Users can read own notifications"
ON public.user_event_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
ON public.user_event_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);