import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id);

    if (rolesError || !roles?.some((r) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Target user ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user email
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", targetUserId)
      .single();

    if (profileError || !targetProfile) {
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate impersonation token (expires in 1 hour)
    const impersonationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store impersonation token
    const { error: tokenError } = await supabase
      .from("impersonation_tokens")
      .insert({
        admin_id: adminUser.id,
        target_user_id: targetUserId,
        token: impersonationToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error storing impersonation token:", tokenError);
      return new Response(JSON.stringify({ error: "Failed to create impersonation session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate session for target user using OTP
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: targetProfile.email,
    });

    if (linkError || !linkData.properties?.email_otp) {
      console.error("Error generating magic link:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify OTP to create actual session
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      email: targetProfile.email,
      token: linkData.properties.email_otp,
      type: 'magiclink'
    });

    if (sessionError || !sessionData.session) {
      console.error("Error creating session:", sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log impersonation
    await supabase.from("audit_logs").insert({
      user_id: adminUser.id,
      action: "user_impersonated",
      details: {
        target_user_id: targetUserId,
        target_email: targetProfile.email,
      },
    });

    console.log(`Admin ${adminUser.email} impersonating user ${targetProfile.email}`);

    return new Response(
      JSON.stringify({
        impersonationToken,
        adminEmail: adminUser.email,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in start-impersonation:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
