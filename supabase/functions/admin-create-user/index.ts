import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can create users')
    }

    const { email, password, full_name, role = 'cliente' } = await req.json()

    if (!email || !password || !full_name) {
      throw new Error('Email, password and full_name are required')
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    if (!newUser.user) {
      throw new Error('User creation failed')
    }

    // Assign role to the new user
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role
      })

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError)
      // Try to clean up the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error('Failed to assign role to user')
    }

    console.log(`User created successfully: ${email} with role ${role}`)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in admin-create-user:', error)
    // Map specific errors to safe messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let safeMessage = 'Failed to create user';
    
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('admin')) {
      safeMessage = 'Unauthorized';
    } else if (errorMessage.includes('already') || errorMessage.includes('exists')) {
      safeMessage = 'User already exists';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: safeMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
