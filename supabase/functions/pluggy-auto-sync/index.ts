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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting automatic Pluggy sync for all users...");

    // Get all active Pluggy items (connections) - sync ALL, not just UPDATED
    const { data: items, error: itemsError } = await supabase
      .from("pluggy_items")
      .select("item_id, user_id")
      .in("status", ["UPDATED", "LOGIN_ERROR", "OUTDATED", "WAITING_USER_INPUT"]);

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      console.log("No active connections to sync");
      return new Response(
        JSON.stringify({ message: "No active connections found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${items.length} connections to sync`);

    let successCount = 0;
    let failCount = 0;

    // Sync each item
    for (const item of items) {
      try {
        console.log(`Syncing item ${item.item_id} for user ${item.user_id}`);

        // Call the sync function
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/pluggy-sync-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            itemId: item.item_id,
            userId: item.user_id,
          }),
        });

        if (syncResponse.ok) {
          successCount++;
          console.log(`Successfully synced item ${item.item_id}`);
        } else {
          failCount++;
          console.error(`Failed to sync item ${item.item_id}: ${await syncResponse.text()}`);
        }
      } catch (itemError) {
        failCount++;
        console.error(`Error syncing item ${item.item_id}:`, itemError);
      }
    }

    console.log(`Auto-sync completed: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Auto-sync completed",
        results: {
          total: items.length,
          successful: successCount,
          failed: failCount,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in pluggy-auto-sync:", error);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
