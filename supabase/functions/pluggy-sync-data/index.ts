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
  const response = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Pluggy auth error:", errorData);
    throw new Error(`Failed to authenticate with Pluggy: ${errorData}`);
  }

  const data = await response.json();
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
    
    // Read body once and extract both userId and itemId
    const bodyData = await req.json();
    const { userId: bodyUserId, itemId } = bodyData;
    
    let userId: string;

    // Check if this is an auto-sync call (from cron) or user-initiated
    if (bodyUserId && token === supabaseKey) {
      // Auto-sync call from cron with service role key
      userId = bodyUserId;
      console.log("Auto-sync call for user:", userId);
    } else {
      // User-initiated call - verify JWT
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
      
      // 🔒 SECURITY: Check rate limit for user-initiated syncs
      const { data: rateLimitCheck } = await supabase.rpc('check_pluggy_rate_limit', {
        _user_id: userId,
        _action: 'sync_data',
        _max_attempts: 20,
        _window_minutes: 60
      });

      if (!rateLimitCheck) {
        console.warn("Rate limit exceeded for user:", userId);
        return new Response(
          JSON.stringify({ error: "Limite de sincronizações excedido. Aguarde 1 hora." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!itemId) {
      return new Response(JSON.stringify({ error: "Item ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Syncing Pluggy data for item:", itemId);
    
    // 🔒 SECURITY: Log sync start
    await supabase.rpc('log_pluggy_audit', {
      _user_id: userId,
      _action: 'sync_started',
      _item_id: itemId,
      _details: {}
    });

    const accessToken = await getPluggyAccessToken();

    // Get item details
    const itemResponse = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
      headers: {
        "X-API-KEY": accessToken,
      },
    });

    if (!itemResponse.ok) {
      throw new Error("Failed to fetch item details");
    }

    const itemData = await itemResponse.json();

    // Update or create pluggy_items record
    const { data: existingItem } = await supabase
      .from("pluggy_items")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .single();

    if (existingItem) {
      await supabase
        .from("pluggy_items")
        .update({
          status: itemData.status,
          connector_name: itemData.connector.name,
          updated_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);
    } else {
      await supabase
        .from("pluggy_items")
        .insert({
          user_id: userId,
          item_id: itemId,
          connector_id: itemData.connector.id.toString(),
          connector_name: itemData.connector.name,
          status: itemData.status,
          last_sync_at: new Date().toISOString(),
        });
    }

    // Sync accounts with complete data
    const accountsResponse = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
      headers: {
        "X-API-KEY": accessToken,
      },
    });

    if (!accountsResponse.ok) {
      throw new Error("Failed to fetch accounts");
    }

    const accountsData = await accountsResponse.json();
    let syncedAccounts = 0;

    for (const account of accountsData.results || []) {
      const { data: existingAccount } = await supabase
        .from("pluggy_accounts")
        .select("*")
        .eq("account_id", account.id)
        .single();

      const { data: pluggyItem } = await supabase
        .from("pluggy_items")
        .select("id")
        .eq("item_id", itemId)
        .eq("user_id", userId)
        .single();

      if (!pluggyItem) {
        throw new Error("Pluggy item not found");
      }

      const accountData = {
        user_id: userId,
        pluggy_item_id: pluggyItem.id,
        account_id: account.id,
        account_type: account.type,
        account_name: account.name,
        balance: account.balance,
        available_balance: account.availableBalance,
        credit_limit: account.creditLimit,
        overdraft_limit: account.overdraftLimit,
        account_number: account.number,
        owner_name: account.owner,
        tax_number: account.taxNumber,
        currency: account.currencyCode || 'BRL',
        updated_at: new Date().toISOString(),
      };

      if (existingAccount) {
        await supabase
          .from("pluggy_accounts")
          .update(accountData)
          .eq("id", existingAccount.id);
      } else {
        await supabase
          .from("pluggy_accounts")
          .insert(accountData);
      }
      syncedAccounts++;

      // Sync credit card data if available
      if (account.type === 'CREDIT') {
        const creditCardData = account.creditData;
        if (creditCardData) {
          const { data: pluggyAccount } = await supabase
            .from("pluggy_accounts")
            .select("id")
            .eq("account_id", account.id)
            .single();

          if (pluggyAccount) {
            const { data: existingCard } = await supabase
              .from("pluggy_credit_cards")
              .select("*")
              .eq("card_id", account.id)
              .single();

          // For Open Finance, balance = creditLimit - availableCreditLimit
            const usedCredit = creditCardData.creditLimit 
              ? (creditCardData.creditLimit - (creditCardData.availableCreditLimit || 0))
              : account.balance;
          
          const cardData = {
            user_id: userId,
            pluggy_account_id: pluggyAccount.id,
              card_id: account.id,
              card_name: account.name,
              card_network: creditCardData.brand,
              available_credit: creditCardData.availableCreditLimit,
              close_day: creditCardData.closeDay,
              due_day: creditCardData.dueDay,
              minimum_payment: creditCardData.minimumPayment,
              total_balance: usedCredit,
              updated_at: new Date().toISOString(),
            };

            if (existingCard) {
              await supabase
                .from("pluggy_credit_cards")
                .update(cardData)
                .eq("id", existingCard.id);
            } else {
              await supabase
                .from("pluggy_credit_cards")
                .insert(cardData);
            }
          }
        }
      }
    }

    // Sync transactions
    const transactionsResponse = await fetch(`${PLUGGY_API_URL}/transactions?itemId=${itemId}`, {
      headers: {
        "X-API-KEY": accessToken,
      },
    });

    let syncedTransactions = 0;

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      
      for (const transaction of transactionsData.results || []) {
        // Check if transaction already exists
        const { data: existingTransaction } = await supabase
          .from("transactions")
          .select("*")
          .eq("description", transaction.description)
          .eq("amount", Math.abs(transaction.amount))
          .eq("date", transaction.date.split('T')[0])
          .eq("user_id", userId)
          .single();

        if (!existingTransaction) {
          // Determine category based on transaction description
          const isExpense = transaction.amount < 0;
          const { data: defaultCategory } = await supabase
            .from("categories")
            .select("id")
            .eq("user_id", userId)
            .eq("type", isExpense ? "expense" : "income")
            .limit(1)
            .single();

          await supabase
            .from("transactions")
            .insert({
              user_id: userId,
              description: transaction.description,
              amount: Math.abs(transaction.amount),
              type: isExpense ? "expense" : "income",
              date: transaction.date.split('T')[0],
              category_id: defaultCategory?.id,
            });
          syncedTransactions++;
        }
      }
    }

    // Sync investments and portfolios
    const investmentsResponse = await fetch(`${PLUGGY_API_URL}/investments?itemId=${itemId}`, {
      headers: {
        "X-API-KEY": accessToken,
      },
    });

    let syncedInvestments = 0;
    let syncedPortfolios = 0;

    if (investmentsResponse.ok) {
      const investmentsData = await investmentsResponse.json();
      
      // Group investments by account to create portfolio summaries
      const portfoliosByAccount = new Map();

      for (const investment of investmentsData.results || []) {
        const { data: pluggyAccount } = await supabase
          .from("pluggy_accounts")
          .select("id")
          .eq("account_id", investment.accountId)
          .single();

        if (pluggyAccount) {
          // Update/create individual investment
          const { data: existingInvestment } = await supabase
            .from("pluggy_investments")
            .select("*")
            .eq("investment_id", investment.id)
            .single();

          const investmentData = {
            user_id: userId,
            pluggy_account_id: pluggyAccount.id,
            investment_id: investment.id,
            investment_type: investment.type,
            investment_name: investment.name,
            quantity: investment.quantity,
            amount: investment.amount,
            current_price: investment.price,
            ticker: investment.code,
            updated_at: new Date().toISOString(),
          };

          if (existingInvestment) {
            await supabase
              .from("pluggy_investments")
              .update(investmentData)
              .eq("id", existingInvestment.id);
          } else {
            await supabase
              .from("pluggy_investments")
              .insert(investmentData);
          }
          syncedInvestments++;

          // Aggregate portfolio data
          const accountId = pluggyAccount.id;
          if (!portfoliosByAccount.has(accountId)) {
            portfoliosByAccount.set(accountId, {
              accountId,
              type: investment.type,
              totalValue: 0,
              totalGain: 0,
            });
          }
          const portfolio = portfoliosByAccount.get(accountId);
          portfolio.totalValue += investment.amount || 0;
          if (investment.amountProfit) {
            portfolio.totalGain += investment.amountProfit;
          }
        }
      }

      // Create/update portfolio summaries
      for (const [accountId, portfolio] of portfoliosByAccount) {
        const gainPercent = portfolio.totalValue > 0 
          ? (portfolio.totalGain / portfolio.totalValue) * 100 
          : 0;

        const { data: existingPortfolio } = await supabase
          .from("pluggy_investment_portfolios")
          .select("*")
          .eq("pluggy_account_id", accountId)
          .single();

        const portfolioData = {
          user_id: userId,
          pluggy_account_id: accountId,
          portfolio_type: portfolio.type,
          total_value: portfolio.totalValue,
          total_gain: portfolio.totalGain,
          total_gain_percent: gainPercent,
          updated_at: new Date().toISOString(),
        };

        if (existingPortfolio) {
          await supabase
            .from("pluggy_investment_portfolios")
            .update(portfolioData)
            .eq("id", existingPortfolio.id);
        } else {
          await supabase
            .from("pluggy_investment_portfolios")
            .insert(portfolioData);
        }
        syncedPortfolios++;
      }

      // Sync investments to assets table for unified portfolio view
      for (const investment of investmentsData.results || []) {
        // Skip investments without ticker or with zero/null quantity
        if (!investment.code || !investment.quantity || investment.quantity <= 0) {
          continue;
        }
          const { data: existingAsset } = await supabase
            .from("assets")
            .select("*")
            .eq("ticker", investment.code)
            .eq("user_id", userId)
            .single();

          const assetClass = investment.type === 'MUTUAL_FUND' ? 'Renda Variável' :
                           investment.type === 'SECURITY' ? 'Renda Variável' :
                           investment.type === 'EQUITY' ? 'Renda Variável' :
                           'Renda Fixa';

          const assetData = {
            user_id: userId,
            ticker: investment.code,
            asset_name: investment.name,
            asset_class: assetClass,
            quantity: investment.quantity || 0,
            average_price: investment.price || 0,
            current_price: investment.price || 0,
            currency: 'BRL',
            updated_at: new Date().toISOString(),
          };

          if (!existingAsset) {
            await supabase
              .from("assets")
              .insert(assetData);
          } else {
            await supabase
              .from("assets")
              .update({
                quantity: investment.quantity || existingAsset.quantity,
                current_price: investment.price || existingAsset.current_price,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingAsset.id);
          }
      }
    }

    // Log sync history
    const { data: pluggyItem } = await supabase
      .from("pluggy_items")
      .select("id")
      .eq("item_id", itemId)
      .eq("user_id", userId)
      .single();

    if (pluggyItem) {
      await supabase
        .from("pluggy_sync_history")
        .insert({
          user_id: userId,
          pluggy_item_id: pluggyItem.id,
          sync_type: "full",
          status: "success",
          synced_records: syncedAccounts + syncedTransactions + syncedInvestments,
        });
    }

    console.log(`Sync completed: ${syncedAccounts} accounts, ${syncedTransactions} transactions, ${syncedInvestments} investments, ${syncedPortfolios} portfolios`);

    // 🔒 SECURITY: Log successful sync
    await supabase.rpc('log_pluggy_audit', {
      _user_id: userId,
      _action: 'sync_completed',
      _item_id: itemId,
      _details: {
        accounts: syncedAccounts,
        transactions: syncedTransactions,
        investments: syncedInvestments,
        portfolios: syncedPortfolios
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        synced: {
          accounts: syncedAccounts,
          transactions: syncedTransactions,
          investments: syncedInvestments,
          portfolios: syncedPortfolios
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in pluggy-sync-data:", error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
