import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requesting user's ID from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error('Permission denied:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting user:', userId);

    try {
      // Step 1: Delete clients owned by this advisor (will cascade to related data)
      const { error: clientsError } = await supabase
        .from('clients')
        .delete()
        .eq('advisor_id', userId);

      if (clientsError) {
        console.error('Error deleting clients:', clientsError);
      }

      // Step 2: Delete from all main tables referencing user_id
      const tables = [
        'alerts', 'assets', 'budgets', 'categories', 'dividends',
        'financial_goals', 'goal_portfolio_mappings', 'goal_progress_history',
        'notifications', 'subscriptions', 'transactions', 'target_allocations',
        'user_achievements', 'user_education_progress', 'tasks',
        'client_advisor_links', 'client_portfolio_snapshots', 'deal_pipeline',
        'interactions', 'meetings', 'impersonation_tokens'
      ];

      for (const table of tables) {
        try {
          if (table === 'tasks') {
            await supabase.from(table).delete().eq('advisor_id', userId);
          } else if (['client_advisor_links', 'client_portfolio_snapshots', 'deal_pipeline', 'interactions', 'meetings'].includes(table)) {
            await supabase.from(table).delete().eq('advisor_id', userId);
            if (table !== 'client_portfolio_snapshots') {
              await supabase.from(table).delete().eq('client_id', userId);
            }
          } else if (table === 'impersonation_tokens') {
            await supabase.from(table).delete().eq('admin_id', userId);
            await supabase.from(table).delete().eq('target_user_id', userId);
          } else {
            await supabase.from(table).delete().eq('user_id', userId);
          }
        } catch (error) {
          console.error(`Error deleting from ${table}:`, error);
        }
      }

      // Step 3: Clean up authorized_organization_emails references
      await supabase.from('authorized_organization_emails').update({ invited_by: null }).eq('invited_by', userId);
      await supabase.from('authorized_organization_emails').update({ used_by: null }).eq('used_by', userId);

      // Step 4: Delete from user_roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Step 5: Delete from profiles
      await supabase.from('profiles').delete().eq('id', userId);

      // Step 6: Finally, delete user from auth.users
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user from auth:', deleteError);
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete user from authentication system',
            details: deleteError.message,
            code: deleteError.code || 'unknown'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User deleted successfully:', userId);

      // Log the deletion in audit logs
      try {
        await supabase.from('audit_logs').insert({
          user_id: requestingUser.id,
          action: 'user_deleted',
          details: { deleted_user_id: userId }
        });
      } catch (auditError) {
        console.error('Failed to log audit:', auditError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error during user deletion:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user',
          details: error.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
