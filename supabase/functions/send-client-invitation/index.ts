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

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is an advisor
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'assessor');

    if (!roleData || roleData.length === 0) {
      throw new Error('Apenas assessores podem enviar convites');
    }

    const { email, message } = await req.json();

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's already a pending invitation from this advisor to this email
    const { data: existingInvitation } = await supabaseAdmin
      .from('advisor_client_invitations')
      .select('id, status')
      .eq('advisor_id', user.id)
      .ilike('client_email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Já existe um convite pendente para este email');
    }

    // Check if user already exists in the platform
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', normalizedEmail)
      .single();

    const invitationType = existingProfile ? 'existing_user' : 'new_user';
    const clientUserId = existingProfile?.id || null;

    // Get advisor info
    const { data: advisorProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const advisorName = advisorProfile?.full_name || 'Seu assessor';

    // Create invitation
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('advisor_client_invitations')
      .insert({
        advisor_id: user.id,
        client_email: normalizedEmail,
        client_user_id: clientUserId,
        token: invitationToken,
        invitation_type: invitationType,
        message: message || null,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error('Falha ao criar convite');
    }

    // For new users, send email invitation
    if (invitationType === 'new_user') {
      const appUrl = 'https://moniitor.com.br';
      const invitationUrl = `${appUrl}/invite/${invitationToken}`;

      const { error: emailError } = await resend.emails.send({
        from: 'MONIITOR <convite@moniitor.com.br>',
        to: [normalizedEmail],
        subject: `${advisorName} convidou você para o MONIITOR`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Convite para MONIITOR</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Você foi convidado!</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong style="color: #667eea;">${advisorName}</strong> convidou você para se conectar na plataforma MONIITOR.
              </p>
              ${message ? `
              <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; font-style: italic;">"${message}"</p>
              </div>
              ` : ''}
              <p style="font-size: 16px; margin-bottom: 30px;">
                Ao aceitar, você terá acesso a:
              </p>
              <ul style="font-size: 14px; color: #666; margin-bottom: 30px;">
                <li>Acompanhamento personalizado do seu patrimônio</li>
                <li>Relatórios e análises da sua carteira</li>
                <li>Comunicação direta com seu assessor</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Aceitar Convite e Criar Conta
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
                Se você não conhece ${advisorName}, pode ignorar este email.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        // Don't throw - invitation was created, just log the email error
        console.warn('Invitation created but email failed to send');
      }
    }

    console.log(`Invitation sent to ${normalizedEmail} (type: ${invitationType})`);

    // Log audit
    await supabaseAdmin.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'client_invitation_sent',
      p_details: { 
        client_email: normalizedEmail, 
        invitation_type: invitationType,
        invitation_id: invitation.id
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        invitation_type: invitationType,
        client_name: existingProfile?.full_name || null,
        message: invitationType === 'existing_user' 
          ? 'Convite enviado! O cliente receberá uma notificação na plataforma.'
          : 'Convite enviado por email! O cliente receberá um link para criar sua conta.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in send-client-invitation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
