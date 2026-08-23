import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  user_id: string;
  ticker: string;
  quantity: number;
  asset_class: string;
  sub_class: string | null;
  client_id: string | null;
}

interface BrapiDividend {
  paymentDate: string;
  rate: number;
  type: string;
  assetIssued?: string;
}

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(supabase: any, userId: string, message: string) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone, whatsapp_notifications_enabled, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.whatsapp_notifications_enabled || !profile.phone) {
      return;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ to: profile.phone, message }),
    });
  } catch (error) {
    console.error(`Error sending WhatsApp notification:`, error);
  }
}

const normalizeTicker = (ticker: string): string => {
  return ticker.replace(/\s+/g, '').toUpperCase();
};

const isDividendPayingAsset = (ticker: string, subClass: string | null): boolean => {
  const normalizedTicker = normalizeTicker(ticker);
  const isFII = /^[A-Z]{4}1[1-3]$/.test(normalizedTicker);
  const isStock = /^[A-Z]{4}[3-8]$/.test(normalizedTicker);
  const isRelevantSubClass = ['Ações', 'Fundos Imobiliário', 'ETF'].includes(subClass || '');
  return isRelevantSubClass || isFII || isStock;
};

interface DividendInsert {
  user_id: string;
  client_id?: string | null;
  ticker: string;
  dividend_type: string;
  rate: number;
  payment_date: string;
  ex_date: string | null;
  expected_amount: number;
  quantity: number;
  source: string;
  is_notified: boolean;
}

async function fetchAndProcessDividends(
  assets: Asset[],
  brapiKey: string | undefined,
  today: Date,
  existingSet: Set<string>,
  isClientAsset: boolean,
): Promise<DividendInsert[]> {
  const newDividends: DividendInsert[] = [];

  // Group by ticker to avoid duplicate API calls
  const tickerMap = new Map<string, Asset[]>();
  for (const asset of assets) {
    const normalized = normalizeTicker(asset.ticker);
    if (!tickerMap.has(normalized)) {
      tickerMap.set(normalized, []);
    }
    tickerMap.get(normalized)!.push({ ...asset, ticker: normalized });
  }

  for (const [ticker, tickerAssets] of tickerMap) {
    try {
      const brapiUrl = brapiKey
        ? `https://brapi.dev/api/quote/${ticker}?dividends=true&token=${brapiKey}`
        : `https://brapi.dev/api/quote/${ticker}?dividends=true`;
      const response = await fetch(brapiUrl);

      if (!response.ok) {
        console.warn(`Failed to fetch data for ${ticker}: ${response.statusText}`);
        continue;
      }

      const brapiData = await response.json();
      if (!brapiData.results || brapiData.results.length === 0) continue;

      const stockData = brapiData.results[0];
      if (!stockData.dividendsData?.cashDividends) continue;

      const dividends = stockData.dividendsData.cashDividends as BrapiDividend[];

      for (const dividend of dividends) {
        const paymentDate = new Date(dividend.paymentDate);
        if (isNaN(paymentDate.getTime())) continue;
        paymentDate.setHours(0, 0, 0, 0);
        if (paymentDate < today) continue;

        const paymentDateStr = paymentDate.toISOString().split('T')[0];
        const dividendType = dividend.type || 'Dividendo';

        let exDate: string | null = null;
        if (dividend.assetIssued) {
          const parsedExDate = new Date(dividend.assetIssued);
          if (!isNaN(parsedExDate.getTime())) {
            exDate = parsedExDate.toISOString().split('T')[0];
          }
        }

        // Create a record for each asset holder (user or client)
        for (const asset of tickerAssets) {
          const clientKey = isClientAsset ? (asset.client_id || '') : '';
          const uniqueKey = `${asset.user_id}-${clientKey}-${ticker}-${paymentDateStr}-${dividendType}`;

          if (existingSet.has(uniqueKey)) continue;

          const expectedAmount = dividend.rate * asset.quantity;

          const record: DividendInsert = {
            user_id: asset.user_id,
            ticker: ticker,
            dividend_type: dividendType,
            rate: dividend.rate,
            payment_date: paymentDateStr,
            ex_date: exDate,
            expected_amount: expectedAmount,
            quantity: asset.quantity,
            source: 'brapi',
            is_notified: false,
          };

          if (isClientAsset && asset.client_id) {
            record.client_id = asset.client_id;
          }

          newDividends.push(record);
          existingSet.add(uniqueKey);

          console.log(`New dividend: ${ticker} - R$ ${expectedAmount.toFixed(2)} on ${paymentDateStr}${isClientAsset ? ` (client: ${asset.client_id})` : ''}`);
        }
      }
    } catch (error) {
      console.error(`Error fetching dividends for ${ticker}:`, error);
    }
  }

  return newDividends;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brapiKey = Deno.env.get('BRAPI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('Starting upcoming dividends check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all existing upcoming dividends to avoid duplicates
    const { data: existingDividends } = await supabase
      .from('upcoming_dividends')
      .select('user_id, client_id, ticker, payment_date, dividend_type');

    const existingSet = new Set(
      (existingDividends || []).map(d =>
        `${d.user_id}-${d.client_id || ''}-${d.ticker}-${d.payment_date}-${d.dividend_type}`
      )
    );

    let totalNewDividends = 0;
    let totalNotifications = 0;

    // ===== PASS 1: Personal assets (client_id IS NULL) =====
    const { data: personalAssets, error: personalError } = await supabase
      .from('assets')
      .select('user_id, ticker, quantity, asset_class, sub_class, client_id')
      .eq('asset_class', 'Renda Variável')
      .is('client_id', null);

    if (personalError) {
      console.error('Error fetching personal assets:', personalError);
      throw personalError;
    }

    const filteredPersonal = (personalAssets || []).filter((a: Asset) =>
      isDividendPayingAsset(a.ticker, a.sub_class)
    );

    console.log(`Pass 1: ${filteredPersonal.length} personal dividend-paying assets`);

    const personalDividends = await fetchAndProcessDividends(
      filteredPersonal, brapiKey, today, existingSet, false
    );

    // Group personal dividends by user_id for insert + notification
    const personalByUser = new Map<string, DividendInsert[]>();
    for (const d of personalDividends) {
      if (!personalByUser.has(d.user_id)) personalByUser.set(d.user_id, []);
      personalByUser.get(d.user_id)!.push(d);
    }

    for (const [userId, divs] of personalByUser) {
      const { error: insertError } = await supabase.from('upcoming_dividends').insert(divs);
      if (insertError) {
        console.error(`Error inserting personal dividends for ${userId}:`, insertError);
        continue;
      }
      totalNewDividends += divs.length;

      // Notifications
      const notifications = divs.map(d => ({
        user_id: userId,
        title: `💰 Novo provento anunciado: ${d.ticker}`,
        message: `${d.dividend_type} de R$ ${d.expected_amount.toFixed(2)} será pago em ${new Date(d.payment_date).toLocaleDateString('pt-BR')}.`,
        notification_type: 'info',
        ticker: d.ticker,
      }));

      const { error: notifError } = await supabase.from('notifications').insert(notifications);
      if (!notifError) {
        totalNotifications += notifications.length;

        await supabase
          .from('upcoming_dividends')
          .update({ is_notified: true })
          .eq('user_id', userId)
          .is('client_id', null)
          .in('ticker', divs.map(d => d.ticker));

        const whatsappMessage = divs.map(d =>
          `💰 *${d.ticker}*\n${d.dividend_type}: R$ ${d.expected_amount.toFixed(2)}\nPagamento: ${new Date(d.payment_date).toLocaleDateString('pt-BR')}`
        ).join('\n\n');

        await sendWhatsAppNotification(supabase, userId, `📊 *Novos Proventos Anunciados*\n\n${whatsappMessage}`);
      }
    }

    // ===== PASS 2: CRM client assets (client_id IS NOT NULL) =====
    const { data: clientAssets, error: clientError } = await supabase
      .from('assets')
      .select('user_id, ticker, quantity, asset_class, sub_class, client_id')
      .eq('asset_class', 'Renda Variável')
      .not('client_id', 'is', null);

    if (clientError) {
      console.error('Error fetching client assets:', clientError);
    } else {
      const filteredClient = (clientAssets || []).filter((a: Asset) =>
        isDividendPayingAsset(a.ticker, a.sub_class)
      );

      console.log(`Pass 2: ${filteredClient.length} CRM client dividend-paying assets`);

      const clientDividends = await fetchAndProcessDividends(
        filteredClient, brapiKey, today, existingSet, true
      );

      if (clientDividends.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < clientDividends.length; i += 50) {
          const batch = clientDividends.slice(i, i + 50);
          const { error: insertError } = await supabase.from('upcoming_dividends').insert(batch);
          if (insertError) {
            console.error(`Error inserting CRM dividends batch:`, insertError);
          } else {
            totalNewDividends += batch.length;
          }
        }
      }
    }

    // ===== PASS 3: Linked client assets (user has advisor link, assets under user_id with client_id NULL) =====
    const { data: linkedClients } = await supabase
      .from('client_advisor_links')
      .select('client_id, advisor_id')
      .eq('status', 'active');

    if (linkedClients && linkedClients.length > 0) {
      const linkedClientIds = linkedClients.map(l => l.client_id);

      const { data: linkedAssets } = await supabase
        .from('assets')
        .select('user_id, ticker, quantity, asset_class, sub_class, client_id')
        .eq('asset_class', 'Renda Variável')
        .is('client_id', null)
        .in('user_id', linkedClientIds);

      if (linkedAssets && linkedAssets.length > 0) {
        const filteredLinked = linkedAssets.filter((a: Asset) =>
          isDividendPayingAsset(a.ticker, a.sub_class)
        );

        console.log(`Pass 3: ${filteredLinked.length} linked client dividend-paying assets`);

        // These are already processed in Pass 1 (personal assets include all user_id with client_id NULL)
        // No additional processing needed - they share the same user_id record
      }
    }

    // Clean up old dividends
    const { error: cleanupError } = await supabase
      .from('upcoming_dividends')
      .delete()
      .lt('payment_date', today.toISOString().split('T')[0]);

    if (cleanupError) {
      console.error('Error cleaning up old dividends:', cleanupError);
    }

    console.log(`Completed: ${totalNewDividends} new dividends, ${totalNotifications} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Upcoming dividends check completed',
        newDividends: totalNewDividends,
        notificationsSent: totalNotifications,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-upcoming-dividends:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
