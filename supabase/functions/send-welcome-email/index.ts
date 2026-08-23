import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userName: string;
  userEmail: string;
}

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(variables[key] ?? ''));
  });
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", userEmail);

    // Fetch template from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', 'welcome_email')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found, using fallback:', templateError);
    }

    // Prepare variables
    const variables = { userName, userEmail };

    // Use template from DB or fallback
    const htmlContent = template ? replaceVariables(template.html_content, variables) : getFallbackHtml(userName, userEmail);
    const emailSubject = template ? replaceVariables(template.subject, variables) : "Bem-vindo à sua jornada de investimentos!";

    const { data, error } = await resend.emails.send({
      from: "MONIITOR <boas-vindas@moniitor.com.br>",
      to: [userEmail],
      subject: emailSubject,
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }

    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Fallback HTML for when template is not found
function getFallbackHtml(userName: string, userEmail: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .footer { color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bem-vindo, ${userName}! 🎉</h1>
    <p>Estamos muito felizes em tê-lo conosco! Sua conta foi criada com sucesso.</p>
    <p class="footer">Email: ${userEmail}<br>Equipe de Investimentos</p>
  </div>
</body>
</html>
`;
}

serve(handler);
