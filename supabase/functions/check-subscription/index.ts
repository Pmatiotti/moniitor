import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header - returning not subscribed");
      return new Response(
        JSON.stringify({ subscribed: false, reason: 'not_authenticated' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check local subscription first
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    logStep("Local subscription", { localSub });

    // Helper function to check if trial is valid
    const isTrialValid = (sub: any) => {
      return sub && sub.status === 'trialing' && new Date(sub.trial_end) > new Date();
    };

    // Helper function to return free plan response
    const returnFreePlan = () => {
      logStep("Returning free plan");
      return new Response(
        JSON.stringify({
          subscribed: true,
          plan: 'free',
          status: 'active',
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    };

    // Check Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      
      // If no Stripe customer but has valid local trial, return trial info
      if (isTrialValid(localSub)) {
        return new Response(
          JSON.stringify({
            subscribed: true,
            plan: localSub.plan_type,
            status: localSub.status,
            trial_end: localSub.trial_end,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // No Stripe customer and no valid trial = free plan
      return returnFreePlan();
    }

    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active Stripe subscription");
      
      // Check if trial is still valid
      if (isTrialValid(localSub)) {
        return new Response(
          JSON.stringify({
            subscribed: true,
            plan: localSub.plan_type,
            status: localSub.status,
            trial_end: localSub.trial_end,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // No active subscription and no valid trial = free plan
      return returnFreePlan();
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;
    
    // Map price to plan (includes old and new price IDs for compatibility)
    const priceToPlano: Record<string, string> = {
      // New prices (R$ 29,90 and R$ 69,90)
      'price_1SpFNrQVZAXJJ8v6IJ6VayGk': 'investor',
      'price_1SpFO7QVZAXJJ8v6hZlw8K4h': 'pro',
      // Old prices (kept for backward compatibility)
      'price_1SOmjBQVZAXJJ8v6xvqBqgK4': 'investor',
      'price_1SOmkuQVZAXJJ8v6K1KvSMrf': 'pro',
      'price_1SOml4QVZAXJJ8v6xEzsp8tn': 'professional',
    };

    const planType = priceToPlano[priceId] || 'investor';
    
    logStep("Active subscription found", {
      subscriptionId: subscription.id,
      plan: planType,
      priceId,
    });

    // Update local subscription
    await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_type: planType,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan: planType,
        status: 'active',
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
