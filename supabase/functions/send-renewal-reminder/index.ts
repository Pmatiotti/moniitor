import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RenewalReminderRequest {
  userName: string;
  userEmail: string;
  planType: string;
  renewalDate: string;
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
    const { userName, userEmail, planType, renewalDate }: RenewalReminderRequest = await req.json();
    
    console.log("Sending renewal reminder to:", userEmail);

    // Fetch template from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', 'renewal_reminder')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found, using fallback:', templateError);
    }

    // Prepare variables
    const variables = { userName, planType, renewalDate };

    // Use template from DB or fallback
    const htmlContent = template ? replaceVariables(template.html_content, variables) : getFallbackHtml(userName, planType, renewalDate);
    const emailSubject = template ? replaceVariables(template.subject, variables) : "Lembrete: Sua assinatura será renovada em breve";

    const emailResponse = await resend.emails.send({
      from: "MONIITOR <assinatura@moniitor.com.br>",
      to: [userEmail],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email to database
    await supabase.from('email_logs').insert({
      email_type: 'renewal_reminder',
      recipient_email: userEmail,
      subject: 'Lembrete: Sua assinatura será renovada em breve',
      status: 'sent',
      metadata: { planType, renewalDate }
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-renewal-reminder function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Fallback HTML
function getFallbackHtml(userName: string, planType: string, renewalDate: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; font-size: 24px; font-weight: bold; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔔 Lembrete de Renovação</h1>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Sua assinatura do plano <strong>${planType}</strong> será renovada em breve!</p>
    <p><strong>Data de renovação:</strong> ${new Date(renewalDate).toLocaleDateString('pt-BR')}</p>
  </div>
</body>
</html>
`;
}

serve(handler);
