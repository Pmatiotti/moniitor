-- Add contact_frequency column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_frequency TEXT DEFAULT 'mensal';

COMMENT ON COLUMN public.clients.contact_frequency IS 
'Frequência de contato: semanal, quinzenal, mensal, bimestral, trimestral';