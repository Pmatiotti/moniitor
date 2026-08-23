import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID");
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET");
const PLUGGY_API_URL = "https://api.pluggy.ai";

async function getPluggyAccessToken() {
    console.log("=== Starting Pluggy Authentication ===");
    console.log("Client ID present:", !!PLUGGY_CLIENT_ID);
    console.log("Client Secret present:", !!PLUGGY_CLIENT_SECRET);
    
    if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
      throw new Error("Pluggy credentials not configured");
    }
    
    const authPayload = {
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    };
    
    console.log("Auth payload:", { clientId: PLUGGY_CLIENT_ID?.substring(0, 8) + "..." });
    
    const response = await fetch(`${PLUGGY_API_URL}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authPayload),
    });

    console.log("Auth response status:", response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Pluggy auth error response:", errorData);
      throw new Error(`Failed to authenticate with Pluggy (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    console.log("Auth response data keys:", Object.keys(data));
    console.log("Successfully authenticated with Pluggy, apiKey present:", !!data.apiKey);
    
    return data.apiKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Creating Pluggy Connect Token for user:", user.id);

    // 🔒 SECURITY: Check rate limit
    const { data: rateLimitCheck } = await supabase.rpc('check_pluggy_rate_limit', {
      _user_id: user.id,
      _action: 'create_token',
      _max_attempts: 10,
      _window_minutes: 60
    });

    if (!rateLimitCheck) {
      console.warn("Rate limit exceeded for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Limite de tentativas excedido. Aguarde 1 hora." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Pluggy API key
    const apiKey = await getPluggyAccessToken();

    console.log("=== Creating Connect Token ===");
    console.log("API Key present:", !!apiKey);
    console.log("API Key length:", apiKey?.length);
    console.log("User ID:", user.id);

    // Create Connect Token
    const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        clientUserId: user.id,
      }),
    });
    
    console.log("Connect token response status:", response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Pluggy API error:", errorData);
      
      // 🔒 SECURITY: Log failed attempt
      await supabase.rpc('log_pluggy_audit', {
        _user_id: user.id,
        _action: 'token_created',
        _details: { success: false, error: errorData }
      });
      
      throw new Error("Failed to create connect token");
    }

    const data = await response.json();

    // 🔒 SECURITY: Log successful token creation
    await supabase.rpc('log_pluggy_audit', {
      _user_id: user.id,
      _action: 'token_created',
      _details: { success: true }
    });

    console.log("Connect token created successfully");

    return new Response(
      JSON.stringify({ 
        connectToken: data.accessToken,
        expiresAt: data.expiresAt
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in pluggy-create-connect-token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
