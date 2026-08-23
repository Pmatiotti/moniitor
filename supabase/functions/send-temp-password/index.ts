import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TempPasswordRequest {
  email: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.log(`Unauthorized attempt to send temp password by user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Only admins can send temporary passwords' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, userId }: TempPasswordRequest = await req.json();

    // Generate temporary password
    const { data: tempPasswordData, error: tempPasswordError } = await supabase
      .rpc('generate_temp_password');

    if (tempPasswordError) throw tempPasswordError;

    const tempPassword = tempPasswordData as string;

    // Hash the temporary password before storing
    const { data: hashedPassword, error: hashError } = await supabase
      .rpc('hash_password', { password: tempPassword });

    if (hashError) throw hashError;

    // Store hashed temporary password
    const { error: insertError } = await supabase
      .from('temporary_passwords')
      .insert({
        user_id: userId,
        temp_password: hashedPassword as string,
      });

    if (insertError) throw insertError;

    // Send email with temporary password
    const emailResponse = await resend.emails.send({
      from: "MONIITOR <seguranca@moniitor.com.br>",
      to: [email],
      subject: "Sua senha temporária de acesso",
      html: `
        <h1>Bem-vindo!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Use a senha temporária abaixo para fazer seu primeiro acesso:</p>
        <h2 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 2px;">
          ${tempPassword}
        </h2>
        <p><strong>Esta senha é válida por 24 horas.</strong></p>
        <p>Após o primeiro acesso, você será solicitado a alterar sua senha e completar seu cadastro.</p>
        <p>Atenciosamente,<br>Equipe do Sistema</p>
      `,
    });

    console.log("Temporary password email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha temporária enviada com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-temp-password function:", error);
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
