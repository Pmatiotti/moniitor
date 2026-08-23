-- ============================================================================
-- LGPD/Compliance: Termos, Aceites e Menores (Fase 1)
-- ============================================================================

-- 1. Enum para tipos de documentos de política
CREATE TYPE public.policy_document_type AS ENUM ('terms', 'privacy', 'cookies', 'marketing');

-- 2. Enum para faixas etárias (minimiza coleta de dado sensível)
CREATE TYPE public.age_range AS ENUM ('under_13', '13_15', '16_17', '18_plus');

-- 3. Enum para status de consentimento
CREATE TYPE public.consent_status AS ENUM ('accepted', 'rejected', 'revoked');

-- 4. Tabela de documentos de política (master)
CREATE TABLE public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.policy_document_type NOT NULL UNIQUE,
  current_version_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Tabela de versões de documentos
CREATE TABLE public.policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.policy_documents(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(document_id, version)
);

-- 6. Adicionar FK reversa (current_version)
ALTER TABLE public.policy_documents
ADD CONSTRAINT fk_current_version
FOREIGN KEY (current_version_id) 
REFERENCES public.policy_versions(id) ON DELETE SET NULL;

-- 7. Tabela de aceites/consentimentos (append-only para auditoria)
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type public.policy_document_type NOT NULL,
  document_version_id UUID REFERENCES public.policy_versions(id) ON DELETE SET NULL,
  consent_status public.consent_status DEFAULT 'accepted' NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'web',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Índices para performance
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_document_type ON public.user_consents(document_type);
CREATE INDEX idx_user_consents_consented_at ON public.user_consents(consented_at DESC);

-- 9. Tabela de consentimentos parentais (para menores)
CREATE TABLE public.parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_user_id UUID NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  verification_method TEXT DEFAULT 'email_link',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_parental_consents_minor_user_id ON public.parental_consents(minor_user_id);

-- 10. Tabela de solicitações LGPD (DSAR)
CREATE TABLE public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('access', 'export', 'delete', 'rectify')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_data_subject_requests_user_id ON public.data_subject_requests(user_id);
CREATE INDEX idx_data_subject_requests_status ON public.data_subject_requests(status);

-- 11. Adicionar campos no profiles para faixa etária
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_range public.age_range,
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN GENERATED ALWAYS AS (
  age_range IN ('under_13', '13_15', '16_17')
) STORED;

-- 12. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_consent_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_parental_consents_updated_at
BEFORE UPDATE ON public.parental_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_consent_updated_at();

CREATE TRIGGER update_data_subject_requests_updated_at
BEFORE UPDATE ON public.data_subject_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_consent_updated_at();

-- 13. RLS Policies
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (leitura)
CREATE POLICY "Policy documents are viewable by everyone"
ON public.policy_documents FOR SELECT
USING (true);

CREATE POLICY "Active policy versions are viewable by everyone"
ON public.policy_versions FOR SELECT
USING (is_active = true);

-- Usuários podem ver apenas seus próprios consentimentos
CREATE POLICY "Users can view their own consents"
ON public.user_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents"
ON public.user_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver seus próprios DSARs
CREATE POLICY "Users can view their own data subject requests"
ON public.data_subject_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own data subject requests"
ON public.data_subject_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Menores podem ver seus próprios consentimentos parentais
CREATE POLICY "Users can view their own parental consents"
ON public.parental_consents FOR SELECT
USING (auth.uid() = minor_user_id);

-- Admins podem ver tudo (via backend function com service role)
CREATE POLICY "Admins can view all consents"
ON public.user_consents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all DSARs"
ON public.data_subject_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage parental consents"
ON public.parental_consents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 14. Inserir documentos padrão e versões iniciais
INSERT INTO public.policy_documents (type) VALUES 
  ('terms'),
  ('privacy'),
  ('cookies'),
  ('marketing');

-- Inserir versão inicial para cada documento
DO $$
DECLARE
  terms_doc_id UUID;
  privacy_doc_id UUID;
  cookies_doc_id UUID;
  marketing_doc_id UUID;
  terms_version_id UUID;
  privacy_version_id UUID;
  cookies_version_id UUID;
  marketing_version_id UUID;
BEGIN
  SELECT id INTO terms_doc_id FROM public.policy_documents WHERE type = 'terms';
  SELECT id INTO privacy_doc_id FROM public.policy_documents WHERE type = 'privacy';
  SELECT id INTO cookies_doc_id FROM public.policy_documents WHERE type = 'cookies';
  SELECT id INTO marketing_doc_id FROM public.policy_documents WHERE type = 'marketing';

  INSERT INTO public.policy_versions (document_id, version, content) VALUES
    (terms_doc_id, '1.0', '# Termos de Uso

Versão 1.0 - Janeiro 2026

## 1. Aceitação dos Termos
Ao utilizar o MONIITOR, você concorda com estes termos.

## 2. Uso da Plataforma
O MONIITOR é uma plataforma de gestão financeira pessoal.

## 3. Responsabilidades
Você é responsável pela veracidade dos dados informados.

## 4. Privacidade
Seus dados são protegidos conforme nossa Política de Privacidade.

## 5. Alterações
Podemos atualizar estes termos. Você será notificado.')
  RETURNING id INTO terms_version_id;

  INSERT INTO public.policy_versions (document_id, version, content) VALUES
    (privacy_doc_id, '1.0', '# Política de Privacidade

Versão 1.0 - Janeiro 2026

## 1. Dados Coletados
Coletamos: nome, email, CPF, telefone, data de nascimento (faixa etária), dados financeiros.

## 2. Finalidade
Seus dados são usados para prover os serviços da plataforma.

## 3. Compartilhamento
Não compartilhamos seus dados com terceiros, exceto quando exigido por lei.

## 4. Segurança
Utilizamos criptografia e boas práticas para proteger seus dados.

## 5. Seus Direitos (LGPD)
Você pode solicitar acesso, correção, exclusão dos seus dados a qualquer momento.

## 6. Open Finance
Integramos com Pluggy para conexão com instituições financeiras. Seu consentimento é necessário.')
  RETURNING id INTO privacy_version_id;

  INSERT INTO public.policy_versions (document_id, version, content) VALUES
    (cookies_doc_id, '1.0', '# Política de Cookies

Versão 1.0 - Janeiro 2026

## 1. O que são cookies
Cookies são pequenos arquivos de texto armazenados no seu navegador.

## 2. Cookies que utilizamos
- **Essenciais**: necessários para funcionamento (autenticação)
- **Analytics**: entender uso da plataforma
- **Marketing**: personalizar comunicações

## 3. Seu Controle
Você pode gerenciar preferências de cookies nas configurações.')
  RETURNING id INTO cookies_version_id;

  INSERT INTO public.policy_versions (document_id, version, content) VALUES
    (marketing_doc_id, '1.0', '# Consentimento de Marketing

Versão 1.0 - Janeiro 2026

## Comunicações
Ao aceitar, você concorda em receber:
- Newsletters sobre gestão financeira
- Novidades da plataforma
- Ofertas personalizadas

Você pode cancelar a qualquer momento.')
  RETURNING id INTO marketing_version_id;

  -- Atualizar current_version_id
  UPDATE public.policy_documents SET current_version_id = terms_version_id WHERE type = 'terms';
  UPDATE public.policy_documents SET current_version_id = privacy_version_id WHERE type = 'privacy';
  UPDATE public.policy_documents SET current_version_id = cookies_version_id WHERE type = 'cookies';
  UPDATE public.policy_documents SET current_version_id = marketing_version_id WHERE type = 'marketing';
END $$;