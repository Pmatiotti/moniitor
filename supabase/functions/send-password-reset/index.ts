import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
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

    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error listing users:", authError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá as instruções." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("User not found for email:", email);
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá as instruções." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing pending reset tokens for this user
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id)
      .is("used_at", null);

    // Insert new reset token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting reset token:", insertError);
      throw new Error("Failed to create reset token");
    }

    // Get base URL from environment or use default
    const baseUrl = Deno.env.get("APP_URL") || "https://moniitor.lovable.app";
    const resetUrl = `${baseUrl}/auth?reset=${token}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "MONIITOR <seguranca@moniitor.com.br>",
      to: [email],
      subject: "Redefinição de senha - MONIITOR",
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
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: #fef3c7; border-radius: 50%; width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">🔐</span>
                </div>
              </div>
              
              <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Redefinição de Senha</h2>
              
              <p style="color: #52525b; margin: 0 0 24px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, pode ignorar este email com segurança.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Redefinir Senha
                </a>
              </div>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #dc2626; font-size: 13px; margin: 0; font-weight: 500;">
                  ⚠️ Este link expira em 1 hora por motivos de segurança.
                </p>
              </div>
              
              <p style="color: #a1a1aa; font-size: 13px; margin: 24px 0 0 0;">
                Se você não solicitou essa alteração, sua conta pode estar em risco. Por favor, entre em contato conosco imediatamente.
              </p>
              
              <div style="border-top: 1px solid #e4e4e7; margin-top: 32px; padding-top: 24px;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:
                </p>
                <p style="color: #22c55e; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${resetUrl}
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

    console.log("Password reset email sent:", emailResponse);

    // Log to email_logs
    await supabase.from("email_logs").insert({
      email_type: "password_reset",
      recipient_email: email,
      subject: "Redefinição de senha - MONIITOR",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { userId: user.id },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Se o email existir, você receberá as instruções." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
