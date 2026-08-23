-- Adicionar coluna p_vp na tabela fundamental_data para armazenar P/VP de FIIs
ALTER TABLE public.fundamental_data
ADD COLUMN IF NOT EXISTS p_vp numeric;