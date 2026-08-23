-- Insert auth email templates
INSERT INTO email_templates (template_key, name, description, subject, html_content, variables, is_active) VALUES
(
  'auth_signup',
  'Confirmação de Cadastro',
  'Email enviado para confirmar o cadastro de novos usuários',
  'Confirme seu cadastro no MONIITOR',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 40px; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h2 { color: #1a1a2e; font-size: 28px; margin: 0; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
    p { color: #555; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .link-text { color: #8898aa; font-size: 12px; word-break: break-all; margin-top: 16px; }
    .footer { color: #8898aa; font-size: 12px; line-height: 18px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><h2>MONIITOR</h2></div>
    <h1>Bem-vindo, {{userName}}! 🎉</h1>
    <p>Obrigado por se cadastrar no MONIITOR. Para começar a usar sua conta, confirme seu email clicando no botão abaixo:</p>
    <p style="text-align: center;"><a href="{{confirmUrl}}" class="button">Confirmar Email</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>{{confirmUrl}}</p>
    <p class="footer">Se você não criou esta conta, ignore este email.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "userEmail", "confirmUrl"]'::jsonb,
  true
),
(
  'auth_recovery',
  'Recuperação de Senha',
  'Email para redefinir a senha do usuário',
  'Redefinição de senha - MONIITOR',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 40px; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h2 { color: #1a1a2e; font-size: 28px; margin: 0; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
    p { color: #555; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px; }
    .warning p { margin: 0; color: #92400e; font-size: 14px; }
    .link-text { color: #8898aa; font-size: 12px; word-break: break-all; margin-top: 16px; }
    .footer { color: #8898aa; font-size: 12px; line-height: 18px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><h2>MONIITOR</h2></div>
    <h1>Redefinição de Senha 🔐</h1>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
    <p style="text-align: center;"><a href="{{confirmUrl}}" class="button">Redefinir Senha</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>{{confirmUrl}}</p>
    <div class="warning"><p>⚠️ Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p></div>
    <p class="footer">Este link expira em 1 hora por motivos de segurança.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "userEmail", "confirmUrl"]'::jsonb,
  true
),
(
  'auth_magiclink',
  'Magic Link',
  'Email de acesso sem senha',
  'Seu link de acesso - MONIITOR',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 40px; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h2 { color: #1a1a2e; font-size: 28px; margin: 0; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
    p { color: #555; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .link-text { color: #8898aa; font-size: 12px; word-break: break-all; margin-top: 16px; }
    .footer { color: #8898aa; font-size: 12px; line-height: 18px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><h2>MONIITOR</h2></div>
    <h1>Seu Link de Acesso ✨</h1>
    <p>Clique no botão abaixo para acessar sua conta de forma segura:</p>
    <p style="text-align: center;"><a href="{{confirmUrl}}" class="button">Acessar Conta</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>{{confirmUrl}}</p>
    <p class="footer">Este link é válido por apenas 10 minutos e pode ser usado uma única vez.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "userEmail", "confirmUrl"]'::jsonb,
  true
),
(
  'auth_email_change',
  'Confirmação de Mudança de Email',
  'Email para confirmar a mudança de email do usuário',
  'Confirme seu novo email - MONIITOR',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 40px; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h2 { color: #1a1a2e; font-size: 28px; margin: 0; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
    p { color: #555; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px; }
    .warning p { margin: 0; color: #92400e; font-size: 14px; }
    .link-text { color: #8898aa; font-size: 12px; word-break: break-all; margin-top: 16px; }
    .footer { color: #8898aa; font-size: 12px; line-height: 18px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><h2>MONIITOR</h2></div>
    <h1>Confirme seu Novo Email 📧</h1>
    <p>Você solicitou a mudança do email da sua conta. Clique no botão abaixo para confirmar:</p>
    <p style="text-align: center;"><a href="{{confirmUrl}}" class="button">Confirmar Novo Email</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>{{confirmUrl}}</p>
    <div class="warning"><p>⚠️ Se você não solicitou esta mudança, ignore este email e entre em contato conosco.</p></div>
    <p class="footer">© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "userEmail", "confirmUrl"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();