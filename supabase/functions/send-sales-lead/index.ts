import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SalesLeadRequest {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, phone, message }: SalesLeadRequest = await req.json();

    console.log("Received sales lead request:", { name, email, company, phone });

    if (!name || !email) {
      console.error("Missing required fields: name or email");
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #6366f1; }
          .value { margin-top: 5px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎯 Novo Lead - Plano Profissional</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Nome:</div>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${company ? `
            <div class="field">
              <div class="label">Empresa:</div>
              <div class="value">${company}</div>
            </div>
            ` : ''}
            ${phone ? `
            <div class="field">
              <div class="label">Telefone:</div>
              <div class="value">${phone}</div>
            </div>
            ` : ''}
            ${message ? `
            <div class="field">
              <div class="label">Mensagem:</div>
              <div class="value">${message}</div>
            </div>
            ` : ''}
            <div class="footer">
              <p>Lead recebido em: ${formattedDate}</p>
              <p>Este email foi enviado automaticamente pelo MONIITOR.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email to pedro@moniitor.com.br...");

    const emailResponse = await resend.emails.send({
      from: "MONIITOR Vendas <vendas@moniitor.com.br>",
      to: ["pedro@moniitor.com.br"],
      subject: `Novo Lead - Plano Profissional: ${name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-sales-lead function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
