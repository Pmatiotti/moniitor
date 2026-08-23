import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin (user may have multiple roles)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('Only admins can send invitations');
    }

    const { email, role = 'cliente' } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Store invitation in database
    const { error: inviteError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role,
        invited_by: user.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString()
      });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error('Failed to create invitation');
    }

    // Send invitation email
    const appUrl = 'https://moniitor.com.br';
    const invitationUrl = `${appUrl}/invite/${invitationToken}`;

    const { error: emailError } = await resend.emails.send({
      from: 'MONIITOR <convite@moniitor.com.br>',
      to: [email],
      subject: 'Convite para MONIITOR - Plataforma de Gestão Patrimonial',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite para MONITOR</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Você foi convidado!</h1>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Você recebeu um convite para se juntar à plataforma MONIITOR como <strong style="color: #667eea;">${role}</strong>.
            </p>
            <p style="font-size: 16px; margin-bottom: 30px;">
              Clique no botão abaixo para aceitar o convite e criar sua conta:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                Aceitar Convite
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Ou copie e cole este link no seu navegador:
            </p>
            <p style="background: white; padding: 12px; border-radius: 5px; word-break: break-all; font-size: 13px; border: 1px solid #ddd;">
              ${invitationUrl}
            </p>
            <p style="font-size: 13px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              ⏰ Este convite expira em 7 dias.
            </p>
            <p style="font-size: 13px; color: #999;">
              Se você não esperava este convite, pode ignorar este email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      
      // Check if it's a domain verification error
      if (emailError.message && emailError.message.includes('verify a domain')) {
        throw new Error('Configure o Resend: Você precisa verificar um domínio em resend.com/domains para enviar convites. Atualmente só é possível enviar para pedro.matiotti@gmail.com');
      }
      
      throw new Error('Failed to send invitation email');
    }

    console.log(`Invitation sent to ${email} with role ${role}`);

    // Log audit event
    await supabaseAdmin.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'invitation_sent',
      p_details: { email, role }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in send-invitation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
