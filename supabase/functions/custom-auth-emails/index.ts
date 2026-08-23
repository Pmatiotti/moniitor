import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite';
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

interface EmailConfig {
  from: string;
  templateKey: string;
  fallbackSubject: string;
}

const emailConfigs: Record<string, EmailConfig> = {
  signup: {
    from: "MONIITOR <cadastro@moniitor.com.br>",
    templateKey: "auth_signup",
    fallbackSubject: "Confirme seu cadastro no MONIITOR",
  },
  recovery: {
    from: "MONIITOR <seguranca@moniitor.com.br>",
    templateKey: "auth_recovery",
    fallbackSubject: "Redefinição de senha - MONIITOR",
  },
  magiclink: {
    from: "MONIITOR <acesso@moniitor.com.br>",
    templateKey: "auth_magiclink",
    fallbackSubject: "Seu link de acesso - MONIITOR",
  },
  email_change: {
    from: "MONIITOR <seguranca@moniitor.com.br>",
    templateKey: "auth_email_change",
    fallbackSubject: "Confirme seu novo email - MONIITOR",
  },
};

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(variables[key] ?? ''));
  });
  return result;
}

// Verify webhook signature if hook secret is configured
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  if (!hookSecret) {
    console.log("No hook secret configured, skipping signature verification");
    return true;
  }
  
  try {
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      encoder.encode(hookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    return await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

function getFallbackHtml(type: string, confirmUrl: string, userName: string): string {
  const templates: Record<string, string> = {
    signup: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 40px; max-width: 600px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h2 { color: #1a1a2e; font-size: 28px; margin: 0; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 24px 0 16px; }
    p { color: #555; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
    .button:hover { opacity: 0.9; }
    .link-text { color: #8898aa; font-size: 12px; word-break: break-all; margin-top: 16px; }
    .footer { color: #8898aa; font-size: 12px; line-height: 18px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><h2>MONIITOR</h2></div>
    <h1>Bem-vindo${userName ? ', ' + userName : ''}! 🎉</h1>
    <p>Obrigado por se cadastrar no MONIITOR. Para começar a usar sua conta, confirme seu email clicando no botão abaixo:</p>
    <p style="text-align: center;"><a href="${confirmUrl}" class="button">Confirmar Email</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>${confirmUrl}</p>
    <p class="footer">Se você não criou esta conta, ignore este email.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>`,
    recovery: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
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
    <p style="text-align: center;"><a href="${confirmUrl}" class="button">Redefinir Senha</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>${confirmUrl}</p>
    <div class="warning"><p>⚠️ Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p></div>
    <p class="footer">Este link expira em 1 hora por motivos de segurança.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>`,
    magiclink: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
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
    <p style="text-align: center;"><a href="${confirmUrl}" class="button">Acessar Conta</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>${confirmUrl}</p>
    <p class="footer">Este link é válido por apenas 10 minutos e pode ser usado uma única vez.<br><br>© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>`,
    email_change: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
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
    <p style="text-align: center;"><a href="${confirmUrl}" class="button">Confirmar Novo Email</a></p>
    <p class="link-text">Ou copie e cole este link no seu navegador:<br>${confirmUrl}</p>
    <div class="warning"><p>⚠️ Se você não solicitou esta mudança, ignore este email e entre em contato conosco.</p></div>
    <p class="footer">© 2025 MONIITOR - Gestão de Investimentos</p>
  </div>
</body>
</html>`,
  };

  return templates[type] || templates.signup;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payloadText = await req.text();
    console.log("Received auth email hook payload");

    // Verify signature if configured
    const signature = req.headers.get("x-supabase-webhook-signature");
    if (hookSecret && signature) {
      const isValid = await verifySignature(payloadText, signature);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const payload: AuthEmailPayload = JSON.parse(payloadText);
    const { user, email_data } = payload;

    const emailType = email_data.email_action_type;
    console.log(`Processing ${emailType} email for ${user.email}`);

    // Get email config
    const config = emailConfigs[emailType];
    if (!config) {
      console.log(`Unsupported email type: ${emailType}, skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build confirmation URL
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(email_data.redirect_to || email_data.site_url)}`;

    const userName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || '';

    // Try to fetch template from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', config.templateKey)
      .eq('is_active', true)
      .single();

    if (templateError) {
      console.log(`Template ${config.templateKey} not found, using fallback`);
    }

    // Prepare variables
    const variables = {
      userName,
      userEmail: user.email,
      confirmUrl,
      siteUrl: email_data.site_url,
    };

    // Use template from DB or fallback
    const htmlContent = template 
      ? replaceVariables(template.html_content, variables) 
      : getFallbackHtml(emailType, confirmUrl, userName);
    
    const emailSubject = template 
      ? replaceVariables(template.subject, variables) 
      : config.fallbackSubject;

    // Send email
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: [user.email],
      subject: emailSubject,
      html: htmlContent,
    });

    if (error) {
      console.error(`Error sending ${emailType} email:`, error);
      throw error;
    }

    console.log(`${emailType} email sent successfully:`, data);

    // Log the email
    try {
      await supabase.from('email_logs').insert({
        email_type: `auth_${emailType}`,
        recipient_email: user.email,
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { resend_id: data?.id },
      });
    } catch (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in custom-auth-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
