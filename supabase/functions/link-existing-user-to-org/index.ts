import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkUserRequest {
  emails: Array<{
    email: string;
    role: string;
  }>;
  organization_id: string;
}

interface LinkResult {
  email: string;
  status: 'linked' | 'pending' | 'error';
  message: string;
}

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

    // Check if user has admin or gestor role for the organization
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'gestor']);

    if (roleError || !roleData || roleData.length === 0) {
      throw new Error('Only admins or managers can authorize emails');
    }

    const { emails, organization_id }: LinkUserRequest = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      throw new Error('Emails array is required');
    }

    if (!organization_id) {
      throw new Error('Organization ID is required');
    }

    // Verify caller has access to this organization
    const hasOrgAccess = roleData.some(r => 
      r.role === 'admin' || r.organization_id === organization_id
    );
    
    if (!hasOrgAccess) {
      throw new Error('No access to this organization');
    }

    const results: LinkResult[] = [];

    for (const { email, role } of emails) {
      const normalizedEmail = email.trim().toLowerCase();
      
      try {
        // Check if user already exists in profiles
        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, organization_id')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (profileError) {
          console.error(`Error checking profile for ${normalizedEmail}:`, profileError);
          results.push({
            email: normalizedEmail,
            status: 'error',
            message: `Erro ao verificar usuário: ${profileError.message}`
          });
          continue;
        }

        if (existingProfile) {
          // User exists - link them directly
          console.log(`User ${normalizedEmail} exists, linking to organization...`);

          // Check if already linked to this organization
          if (existingProfile.organization_id === organization_id) {
            results.push({
              email: normalizedEmail,
              status: 'linked',
              message: 'Usuário já vinculado a esta organização'
            });
            continue;
          }

          // Check if linked to another organization
          if (existingProfile.organization_id && existingProfile.organization_id !== organization_id) {
            results.push({
              email: normalizedEmail,
              status: 'error',
              message: 'Usuário já pertence a outra organização'
            });
            continue;
          }

          // Update profile with organization_id
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ organization_id })
            .eq('id', existingProfile.id);

          if (updateProfileError) {
            console.error(`Error updating profile for ${normalizedEmail}:`, updateProfileError);
            results.push({
              email: normalizedEmail,
              status: 'error',
              message: `Erro ao vincular: ${updateProfileError.message}`
            });
            continue;
          }

          // Check existing roles for this user
          const { data: existingRoles } = await supabaseAdmin
            .from('user_roles')
            .select('id, role, organization_id')
            .eq('user_id', existingProfile.id);

          // Update existing roles to include organization_id, or add new role
          if (existingRoles && existingRoles.length > 0) {
            // Update roles that don't have organization_id
            const rolesToUpdate = existingRoles.filter(r => !r.organization_id);
            for (const r of rolesToUpdate) {
              await supabaseAdmin
                .from('user_roles')
                .update({ organization_id })
                .eq('id', r.id);
            }

            // Check if user has the requested role
            const hasRole = existingRoles.some(r => r.role === role);
            if (!hasRole) {
              // Add the new role
              await supabaseAdmin
                .from('user_roles')
                .insert({
                  user_id: existingProfile.id,
                  role: role,
                  organization_id
                });
            }
          } else {
            // No roles exist, create one
            await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: existingProfile.id,
                role: role,
                organization_id
              });
          }

          // Create authorized_organization_emails record marked as used
          const { error: authEmailError } = await supabaseAdmin
            .from('authorized_organization_emails')
            .insert({
              organization_id,
              email: normalizedEmail,
              role: role,
              invited_by: user.id,
              used_at: new Date().toISOString(),
              used_by: existingProfile.id
            });

          // Ignore duplicate key errors (email already authorized)
          if (authEmailError && authEmailError.code !== '23505') {
            console.error(`Error creating auth email record:`, authEmailError);
          }

          results.push({
            email: normalizedEmail,
            status: 'linked',
            message: 'Usuário vinculado com sucesso!'
          });

        } else {
          // User doesn't exist - create pending authorization
          console.log(`User ${normalizedEmail} doesn't exist, creating pending authorization...`);

          const { error: insertError } = await supabaseAdmin
            .from('authorized_organization_emails')
            .insert({
              organization_id,
              email: normalizedEmail,
              role: role,
              invited_by: user.id
            });

          if (insertError) {
            if (insertError.code === '23505') {
              results.push({
                email: normalizedEmail,
                status: 'pending',
                message: 'Email já autorizado (aguardando cadastro)'
              });
            } else {
              console.error(`Error inserting auth email:`, insertError);
              results.push({
                email: normalizedEmail,
                status: 'error',
                message: `Erro: ${insertError.message}`
              });
            }
          } else {
            results.push({
              email: normalizedEmail,
              status: 'pending',
              message: 'Email autorizado (aguardando cadastro)'
            });
          }
        }
      } catch (emailError: any) {
        console.error(`Error processing ${normalizedEmail}:`, emailError);
        results.push({
          email: normalizedEmail,
          status: 'error',
          message: emailError.message || 'Erro desconhecido'
        });
      }
    }

    const linkedCount = results.filter(r => r.status === 'linked').length;
    const pendingCount = results.filter(r => r.status === 'pending').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Processed ${emails.length} emails: ${linkedCount} linked, ${pendingCount} pending, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: emails.length,
          linked: linkedCount,
          pending: pendingCount,
          errors: errorCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in link-existing-user-to-org:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
