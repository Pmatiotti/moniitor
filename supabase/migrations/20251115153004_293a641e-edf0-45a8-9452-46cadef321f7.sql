-- Adicionar constraint UNIQUE no email da tabela profiles
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_email_unique UNIQUE (email);