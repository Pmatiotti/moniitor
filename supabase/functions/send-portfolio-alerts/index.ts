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

interface AlertItem {
  ticker: string;
  alertType: string;
  currentValue: number;
  threshold: number;
  message: string;
}

interface PortfolioAlertsRequest {
  userName: string;
  userEmail: string;
  alerts: AlertItem[];
}

function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // Handle array loops {{#each arrayName}}...{{/each}}
  const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
  result = result.replace(eachRegex, (match, arrayName, blockContent) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';
    
    return array.map(item => {
      let itemHtml = blockContent;
      Object.keys(item).forEach(key => {
        itemHtml = itemHtml.replace(new RegExp(`{{${key}}}`, 'g'), String(item[key]));
      });
      return itemHtml;
    }).join('');
  });
  
  // Handle simple variables
  Object.keys(variables).forEach(key => {
    if (!Array.isArray(variables[key])) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(variables[key] ?? ''));
    }
  });
  
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userEmail, alerts }: PortfolioAlertsRequest = await req.json();
    
    console.log("Sending portfolio alerts to:", userEmail);

    // Fetch template from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', 'portfolio_alerts')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found, using fallback:', templateError);
    }

    // Prepare variables
    const alertCount = alerts.length;
    const variables = { userName, alerts, alertCount };

    // Use template from DB or fallback
    const htmlContent = template ? replaceVariables(template.html_content, variables) : getFallbackHtml(userName, alerts);
    const emailSubject = template ? replaceVariables(template.subject, variables) : `⚠️ ${alertCount} ${alertCount === 1 ? 'Alerta' : 'Alertas'} na Sua Carteira`;

    const emailResponse = await resend.emails.send({
      from: "MONIITOR <alertas@moniitor.com.br>",
      to: [userEmail],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email to database
    await supabase.from('email_logs').insert({
      email_type: 'portfolio_alerts',
      recipient_email: userEmail,
      subject: `⚠️ ${alerts.length} ${alerts.length === 1 ? 'Alerta' : 'Alertas'} na Sua Carteira`,
      status: 'sent',
      metadata: { alertCount: alerts.length, alerts }
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-portfolio-alerts function:", error);
    
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
function getFallbackHtml(userName: string, alerts: AlertItem[]): string {
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
    <h1>⚠️ Alertas da Sua Carteira</h1>
    <p>Olá <strong>${userName}</strong>,</p>
    <p>Você tem <strong>${alerts.length}</strong> ${alerts.length === 1 ? 'alerta ativo' : 'alertas ativos'} em sua carteira.</p>
  </div>
</body>
</html>
`;
}

serve(handler);
