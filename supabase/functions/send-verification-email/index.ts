import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  userId: string;
  email: string;
  type?: "signup" | "email_change";
}

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, type = "signup" }: VerificationEmailRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing pending verifications for this user
    await supabase
      .from("email_verifications")
      .delete()
      .eq("user_id", userId)
      .eq("verification_type", type)
      .is("verified_at", null);

    // Insert new verification record
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        user_id: userId,
        email,
        token,
        verification_type: type,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting verification:", insertError);
      throw new Error("Failed to create verification record");
    }

    // Get base URL from environment or use default
    const baseUrl = Deno.env.get("APP_URL") || "https://moniitor.lovable.app";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "MONIITOR <verificacao@moniitor.com.br>",
      to: [email],
      subject: "Confirme seu email - MONIITOR",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; text-align: center;">
              <h1 style="color: #22c55e; font-size: 32px; margin: 0 0 10px 0; font-weight: 700;">MONIITOR</h1>
              <p style="color: #a1a1aa; margin: 0; font-size: 14px;">Plataforma de Gestão Patrimonial</p>
            </div>
            
            <div style="background: white; border-radius: 16px; padding: 40px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Confirme seu email</h2>
              
              <p style="color: #52525b; margin: 0 0 24px 0;">
                Olá! Para completar seu cadastro e garantir a segurança da sua conta, por favor confirme seu endereço de email clicando no botão abaixo.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Confirmar Email
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 13px; margin: 24px 0 0 0;">
                Este link expira em 24 horas. Se você não criou uma conta no MONIITOR, pode ignorar este email com segurança.
              </p>
              
              <div style="border-top: 1px solid #e4e4e7; margin-top: 32px; padding-top: 24px;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:
                </p>
                <p style="color: #22c55e; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${verificationUrl}
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} MONIITOR. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent:", emailResponse);

    // Log to email_logs
    await supabase.from("email_logs").insert({
      email_type: "email_verification",
      recipient_email: email,
      subject: "Confirme seu email - MONIITOR",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { userId, type },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
