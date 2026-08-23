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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Start logging
  const { data: logEntry } = await supabase
    .from("sync_execution_logs")
    .insert({
      function_name: "daily-portfolio-update",
      status: "running",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  try {
    console.log("Starting daily portfolio update...");

    const results = {
      pluggySync: { success: false, details: null as unknown },
      economicIndicators: { success: false, details: null as unknown },
      fixedIncomeUpdate: { success: false, details: null as unknown },
      pricesUpdate: { success: false, details: null as unknown },
      upcomingDividends: { success: false, details: null as unknown },
      snapshotsCreated: 0,
      errors: [] as string[],
    };

    // Step 1: Run Pluggy auto-sync for all users
    console.log("Step 1: Running Pluggy auto-sync...");
    try {
      const pluggySyncResponse = await fetch(`${supabaseUrl}/functions/v1/pluggy-auto-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      
      if (pluggySyncResponse.ok) {
        results.pluggySync.success = true;
        results.pluggySync.details = await pluggySyncResponse.json();
        console.log("Pluggy sync completed:", results.pluggySync.details);
      } else {
        const errorText = await pluggySyncResponse.text();
        results.errors.push(`Pluggy sync failed: ${errorText}`);
        console.error("Pluggy sync failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`Pluggy sync error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("Pluggy sync error:", error);
    }

    // Step 2: Sync economic indicators (CDI, SELIC, IPCA)
    console.log("Step 2: Syncing economic indicators...");
    try {
      const indicatorsResponse = await fetch(`${supabaseUrl}/functions/v1/sync-economic-indicators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      
      if (indicatorsResponse.ok) {
        results.economicIndicators.success = true;
        results.economicIndicators.details = await indicatorsResponse.json();
        console.log("Economic indicators sync completed:", results.economicIndicators.details);
      } else {
        const errorText = await indicatorsResponse.text();
        results.errors.push(`Economic indicators sync failed: ${errorText}`);
        console.error("Economic indicators sync failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`Economic indicators sync error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("Economic indicators sync error:", error);
    }

    // Step 3: Update fixed income values
    console.log("Step 3: Updating fixed income values...");
    try {
      const fixedIncomeResponse = await fetch(`${supabaseUrl}/functions/v1/update-fixed-income-values`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      
      if (fixedIncomeResponse.ok) {
        results.fixedIncomeUpdate.success = true;
        results.fixedIncomeUpdate.details = await fixedIncomeResponse.json();
        console.log("Fixed income update completed:", results.fixedIncomeUpdate.details);
      } else {
        const errorText = await fixedIncomeResponse.text();
        results.errors.push(`Fixed income update failed: ${errorText}`);
        console.error("Fixed income update failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`Fixed income update error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("Fixed income update error:", error);
    }

    // Step 4: Update market prices for exchange-traded assets
    console.log("Step 4: Updating market prices...");
    try {
      const pricesResponse = await fetch(`${supabaseUrl}/functions/v1/update-portfolio-prices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ updateAll: true }),
      });
      
      if (pricesResponse.ok) {
        results.pricesUpdate.success = true;
        results.pricesUpdate.details = await pricesResponse.json();
        console.log("Prices update completed:", results.pricesUpdate.details);
      } else {
        const errorText = await pricesResponse.text();
        results.errors.push(`Prices update failed: ${errorText}`);
        console.error("Prices update failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`Prices update error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("Prices update error:", error);
    }

    // Step 5: Check for upcoming dividends and notify users
    console.log("Step 5: Checking upcoming dividends...");
    try {
      const dividendsResponse = await fetch(`${supabaseUrl}/functions/v1/check-upcoming-dividends`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      
      if (dividendsResponse.ok) {
        results.upcomingDividends.success = true;
        results.upcomingDividends.details = await dividendsResponse.json();
        console.log("Upcoming dividends check completed:", results.upcomingDividends.details);
      } else {
        const errorText = await dividendsResponse.text();
        results.errors.push(`Upcoming dividends check failed: ${errorText}`);
        console.error("Upcoming dividends check failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`Upcoming dividends error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("Upcoming dividends error:", error);
    }

    // Step 5.5: Sync CVM fund quotes and update fund values
    console.log("Step 5.5: Syncing CVM fund quotes...");
    try {
      const cvmSyncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-cvm-fund-quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ months: 1 }),
      });
      
      if (cvmSyncResponse.ok) {
        console.log("CVM fund quotes sync completed:", await cvmSyncResponse.json());
        
        // Now update fund values
        console.log("Updating fund values...");
        const fundValuesResponse = await fetch(`${supabaseUrl}/functions/v1/update-fund-values`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
        });
        
        if (fundValuesResponse.ok) {
          console.log("Fund values update completed:", await fundValuesResponse.json());
        } else {
          const errorText = await fundValuesResponse.text();
          results.errors.push(`Fund values update failed: ${errorText}`);
          console.error("Fund values update failed:", errorText);
        }
      } else {
        const errorText = await cvmSyncResponse.text();
        results.errors.push(`CVM fund quotes sync failed: ${errorText}`);
        console.error("CVM fund quotes sync failed:", errorText);
      }
    } catch (error) {
      results.errors.push(`CVM fund sync error: ${error instanceof Error ? error.message : "Unknown"}`);
      console.error("CVM fund sync error:", error);
    }

    // Step 6: Create snapshots for all users with assets
    console.log("Step 6: Creating portfolio snapshots for all users...");
    
    // Get all unique user_ids that have assets
    const { data: usersWithAssets, error: usersError } = await supabase
      .from("assets")
      .select("user_id")
      .not("user_id", "is", null);

    if (usersError) {
      results.errors.push(`Failed to get users: ${usersError.message}`);
      console.error("Failed to get users:", usersError);
    } else {
      // Get unique user IDs
      const uniqueUserIds = [...new Set(usersWithAssets?.map(a => a.user_id) || [])];
      console.log(`Found ${uniqueUserIds.length} users with assets`);

      const today = new Date().toISOString().split('T')[0];

      for (const userId of uniqueUserIds) {
        try {
          // Get user's personal assets only (exclude CRM client assets)
          const { data: assets, error: assetsError } = await supabase
            .from("assets")
            .select("*")
            .eq("user_id", userId)
            .is("client_id", null);

          if (assetsError || !assets || assets.length === 0) {
            continue;
          }

          // Calculate totals
          let totalValue = 0;
          let totalInvested = 0;
          const assetsBreakdown: Record<string, { value: number; invested: number; ticker: string }> = {};

          for (const asset of assets) {
            const currentPrice = asset.current_price || asset.average_price;
            
            // Asset classes that use invested_amount as base
            const usesInvestedAmount = ["Renda Fixa", "Multimercado", "Fundos de Investimento", "Previdência"].includes(asset.asset_class) && 
                                        asset.invested_amount && Number(asset.invested_amount) > 0;
            
            let value: number;
            let invested: number;
            
            if (usesInvestedAmount) {
              // For fixed income/funds: invested_amount is the total
              invested = Number(asset.invested_amount);
              
              // Check if current_price is set and determine if it's unit price or total
              if (asset.current_price && asset.current_price > 0) {
                const avgPrice = Number(asset.average_price);
                const curPrice = Number(asset.current_price);
                const qty = Number(asset.quantity);
                
                // If current_price is similar in magnitude to average_price, it's a unit price
                if (avgPrice > 0 && curPrice / avgPrice < 10) {
                  value = curPrice * qty;
                } else {
                  // current_price might already be total value
                  value = curPrice;
                }
              } else {
                value = invested; // No current price, use invested
              }
            } else {
              // For stocks/FIIs: always quantity * price
              invested = Number(asset.average_price) * Number(asset.quantity);
              value = Number(currentPrice) * Number(asset.quantity);
            }
            
            totalValue += value;
            totalInvested += invested;
            
            assetsBreakdown[asset.id] = {
              ticker: asset.ticker,
              value,
              invested
            };
          }

          // Get previous snapshot for daily return calculation
          const { data: previousSnapshot } = await supabase
            .from("portfolio_snapshots")
            .select("total_value")
            .eq("user_id", userId)
            .lt("snapshot_date", today)
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .single();

          const dailyReturn = previousSnapshot && previousSnapshot.total_value > 0
            ? ((totalValue - previousSnapshot.total_value) / previousSnapshot.total_value) * 100
            : null;

          const cumulativeReturn = totalInvested > 0
            ? ((totalValue - totalInvested) / totalInvested) * 100
            : 0;

          // Upsert snapshot
          const { error: snapshotError } = await supabase
            .from("portfolio_snapshots")
            .upsert({
              user_id: userId,
              snapshot_date: today,
              total_value: totalValue,
              total_invested: totalInvested,
              daily_return_percent: dailyReturn,
              cumulative_return_percent: cumulativeReturn,
              asset_breakdown: assetsBreakdown,
            }, {
              onConflict: "user_id,snapshot_date"
            });

          if (!snapshotError) {
            results.snapshotsCreated++;
          } else {
            console.error(`Failed to create snapshot for user ${userId}:`, snapshotError);
          }
        } catch (userError) {
          console.error(`Error processing user ${userId}:`, userError);
        }
      }
    }

    console.log(`Daily update completed: ${results.snapshotsCreated} snapshots created`);

    // Update log entry on success
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: results.errors.length > 0 ? "partial" : "success",
          records_processed: results.snapshotsCreated,
          details: results,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily portfolio update completed",
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily-portfolio-update:", error);

    // Update log entry on failure
    if (logId) {
      await supabase
        .from("sync_execution_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
