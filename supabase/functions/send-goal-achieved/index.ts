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

interface GoalAchievedRequest {
  userName: string;
  userEmail: string;
  goalName: string;
  goalValue: string;
  achievedDate: string;
  monthsToAchieve: number;
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
    const {
      userName,
      userEmail,
      goalName,
      goalValue,
      achievedDate,
      monthsToAchieve,
    }: GoalAchievedRequest = await req.json();

    console.log("Sending goal achieved email to:", userEmail);

    // Fetch template from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', 'goal_achieved')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template not found, using fallback:', templateError);
    }

    // Prepare variables
    const variables = { userName, goalName, goalValue, achievedDate, monthsToAchieve };

    // Use template from DB or fallback
    const htmlContent = template ? replaceVariables(template.html_content, variables) : getFallbackHtml(userName, goalName, goalValue, achievedDate, monthsToAchieve);
    const emailSubject = template ? replaceVariables(template.subject, variables) : `🎉 Parabéns! Você atingiu sua meta: ${goalName}`;

    const { data, error } = await resend.emails.send({
      from: "MONIITOR <metas@moniitor.com.br>",
      to: [userEmail],
      subject: emailSubject,
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending goal achieved email:", error);
      throw error;
    }

    console.log("Goal achieved email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-goal-achieved function:", error);
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
function getFallbackHtml(userName: string, goalName: string, goalValue: string, achievedDate: string, monthsToAchieve: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #4CAF50; font-size: 28px; font-weight: bold; margin: 40px 0; text-align: center; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Meta Atingida!</h1>
    <p>Olá ${userName},</p>
    <p>Parabéns! Você acabou de atingir sua meta: <strong>${goalName}</strong></p>
    <p><strong>Valor:</strong> ${goalValue}</p>
    <p><strong>Atingida em:</strong> ${achievedDate}</p>
    <p><strong>Tempo:</strong> ${monthsToAchieve} ${monthsToAchieve === 1 ? 'mês' : 'meses'}</p>
  </div>
</body>
</html>
`;
}

serve(handler);
