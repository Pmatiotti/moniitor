import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Mapeamento de price IDs para planos
const priceToPlano: Record<string, string> = {
  'price_1SOmjBQVZAXJJ8v6xvqBqgK4': 'investor',
  'price_1SOmkuQVZAXJJ8v6K1KvSMrf': 'pro',
  'price_1SOml4QVZAXJJ8v6xEzsp8tn': 'professional',
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
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verificar assinatura do webhook se tiver secret configurado
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Para desenvolvimento, parsear o body diretamente
      event = JSON.parse(body);
      logStep("Webhook parsed (no signature verification)");
    }

    logStep("Event type", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id, customerId: session.customer });

        if (session.mode === "subscription" && session.subscription) {
          // Buscar detalhes da subscription
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = session.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          
          if (!customer.email) {
            logStep("Customer has no email");
            break;
          }

          // Buscar usuário pelo email
          const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email?.toLowerCase() === customer.email?.toLowerCase());
          
          if (!user) {
            logStep("User not found for email", { email: customer.email });
            break;
          }

          const priceId = subscription.items.data[0]?.price.id;
          const planType = priceToPlano[priceId] || 'investor';

          // Buscar organização do usuário
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          // Atualizar ou criar subscription
          const subscriptionData = {
            user_id: user.id,
            organization_id: profile?.organization_id || null,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan_type: planType,
            status: subscription.status === 'active' ? 'active' : 'trialing',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            max_users: planType === 'professional' ? 50 : planType === 'pro' ? 15 : 5,
          };

          const { error: upsertError } = await supabaseClient
            .from('subscriptions')
            .upsert(subscriptionData, { onConflict: 'user_id' });

          if (upsertError) {
            logStep("Error upserting subscription", { error: upsertError.message });
          } else {
            logStep("Subscription created/updated", { userId: user.id, plan: planType });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id, subscriptionId: invoice.subscription });

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          // Atualizar período da subscription
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            logStep("Error updating subscription period", { error: error.message });
          } else {
            logStep("Subscription period updated");
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription });

        if (invoice.subscription) {
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            logStep("Error updating subscription to past_due", { error: error.message });
          } else {
            logStep("Subscription marked as past_due");
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

        const priceId = subscription.items.data[0]?.price.id;
        const planType = priceToPlano[priceId] || 'investor';

        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            status: subscription.status === 'active' ? 'active' : 
                    subscription.status === 'trialing' ? 'trialing' :
                    subscription.status === 'canceled' ? 'canceled' :
                    subscription.status === 'past_due' ? 'past_due' : 'expired',
            stripe_price_id: priceId,
            plan_type: planType,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          logStep("Error updating subscription", { error: error.message });
        } else {
          logStep("Subscription updated in database");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const { error } = await supabaseClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          logStep("Error marking subscription as canceled", { error: error.message });
        } else {
          logStep("Subscription marked as canceled");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
