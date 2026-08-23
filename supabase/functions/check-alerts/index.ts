import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(supabase: any, userId: string, message: string) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone, whatsapp_notifications_enabled, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log(`No profile found for user ${userId}`);
      return false;
    }

    if (!profile.whatsapp_notifications_enabled) {
      console.log(`WhatsApp notifications disabled for user ${userId}`);
      return false;
    }

    if (!profile.phone) {
      console.log(`No phone number for user ${userId}`);
      return false;
    }

    console.log(`Sending WhatsApp to ${profile.phone}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: profile.phone,
        message: message,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`WhatsApp sent successfully to user ${userId}`);
      return true;
    } else {
      console.error(`Failed to send WhatsApp:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`Error sending WhatsApp notification:`, error);
    return false;
  }
}

// Helper function to log alert history
async function logAlertHistory(
  supabase: any, 
  alert: any, 
  triggerValue: number | null, 
  triggerDetails: any,
  notificationSent: boolean,
  whatsappSent: boolean
) {
  try {
    await supabase.from('alert_history').insert({
      alert_id: alert.id,
      user_id: alert.user_id,
      alert_type: alert.alert_type,
      ticker: alert.ticker,
      trigger_value: triggerValue,
      trigger_details: triggerDetails,
      notification_sent: notificationSent,
      whatsapp_sent: whatsappSent,
    });
  } catch (error) {
    console.error('Error logging alert history:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting alert check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) throw alertsError;
    console.log(`Found ${alerts?.length || 0} active alerts`);

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active alerts to check' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notifications = [];
    const whatsappMessages: { userId: string; message: string }[] = [];
    const alertHistoryQueue: { alert: any; triggerValue: number | null; triggerDetails: any; notificationSent: boolean }[] = [];

    // Check each alert
    for (const alert of alerts) {
      try {
        // Get current market data
        const { data: marketData } = await supabase
          .from('fundamental_data')
          .select('*')
          .eq('ticker', alert.ticker)
          .single();

        let shouldTrigger = false;
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationType = 'info';
        let triggerValue: number | null = null;
        let triggerDetails: any = {};

        // Check alert conditions based on type
        switch (alert.alert_type) {
          case 'price_variation': {
            if (!marketData) {
              console.log(`No market data for ${alert.ticker}`);
              continue;
            }
            const variation = marketData.day_change_percent;
            if (variation !== null && alert.threshold_value) {
              if (alert.comparison_type === 'above' && variation > alert.threshold_value) {
                shouldTrigger = true;
                notificationTitle = `${alert.ticker} subiu ${variation.toFixed(2)}%`;
                notificationMessage = `O ativo ${alert.ticker} teve uma alta de ${variation.toFixed(2)}% hoje.`;
                notificationType = 'success';
                triggerValue = variation;
                triggerDetails = { type: 'price_variation', direction: 'up', threshold: alert.threshold_value };
              } else if (alert.comparison_type === 'below' && variation < -alert.threshold_value) {
                shouldTrigger = true;
                notificationTitle = `${alert.ticker} caiu ${Math.abs(variation).toFixed(2)}%`;
                notificationMessage = `O ativo ${alert.ticker} teve uma queda de ${Math.abs(variation).toFixed(2)}% hoje.`;
                notificationType = 'warning';
                triggerValue = variation;
                triggerDetails = { type: 'price_variation', direction: 'down', threshold: alert.threshold_value };
              }
            }
            break;
          }

          case 'price_drop': {
            if (!marketData) {
              console.log(`No market data for ${alert.ticker}`);
              continue;
            }
            const variation = marketData.day_change_percent;
            if (variation !== null && alert.threshold_value && variation < -alert.threshold_value) {
              shouldTrigger = true;
              notificationTitle = `⚠️ ${alert.ticker} caiu ${Math.abs(variation).toFixed(2)}%`;
              notificationMessage = `Atenção! O ativo ${alert.ticker} teve uma queda significativa de ${Math.abs(variation).toFixed(2)}% hoje.`;
              notificationType = 'error';
              triggerValue = variation;
              triggerDetails = { type: 'price_drop', threshold: alert.threshold_value };
            }
            break;
          }

          case 'target_price': {
            if (!marketData) {
              console.log(`No market data for ${alert.ticker}`);
              continue;
            }
            const currentPrice = marketData.current_price;
            const targetPrice = alert.target_price;
            if (currentPrice !== null && targetPrice !== null) {
              if (alert.comparison_type === 'above' && currentPrice >= targetPrice) {
                shouldTrigger = true;
                notificationTitle = `🎯 ${alert.ticker} atingiu R$ ${currentPrice.toFixed(2)}`;
                notificationMessage = `O ativo ${alert.ticker} atingiu ou ultrapassou seu preço alvo de R$ ${targetPrice.toFixed(2)}. Preço atual: R$ ${currentPrice.toFixed(2)}.`;
                notificationType = 'success';
                triggerValue = currentPrice;
                triggerDetails = { type: 'target_price', direction: 'above', targetPrice, currentPrice };
              } else if (alert.comparison_type === 'below' && currentPrice <= targetPrice) {
                shouldTrigger = true;
                notificationTitle = `🎯 ${alert.ticker} caiu para R$ ${currentPrice.toFixed(2)}`;
                notificationMessage = `O ativo ${alert.ticker} atingiu ou caiu abaixo do seu preço alvo de R$ ${targetPrice.toFixed(2)}. Preço atual: R$ ${currentPrice.toFixed(2)}.`;
                notificationType = 'warning';
                triggerValue = currentPrice;
                triggerDetails = { type: 'target_price', direction: 'below', targetPrice, currentPrice };
              }
            }
            break;
          }

          case 'dividend': {
            // Check for new dividends in the last 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recentDividends } = await supabase
              .from('dividends')
              .select('*')
              .eq('ticker', alert.ticker)
              .gte('created_at', oneDayAgo)
              .limit(1);

            if (recentDividends && recentDividends.length > 0) {
              shouldTrigger = true;
              const dividend = recentDividends[0];
              notificationTitle = `💰 Novo provento: ${alert.ticker}`;
              notificationMessage = `Foi registrado um novo ${dividend.dividend_type} de R$ ${Number(dividend.amount).toFixed(2)} para ${alert.ticker}.`;
              notificationType = 'success';
              triggerValue = Number(dividend.amount);
              triggerDetails = { type: 'dividend', dividendType: dividend.dividend_type, amount: dividend.amount };
            }
            break;
          }

          case 'dividend_paid': {
            // Check for dividends paid today or yesterday
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const { data: paidDividends } = await supabase
              .from('dividends')
              .select('*')
              .eq('ticker', alert.ticker)
              .gte('payment_date', yesterday.toISOString().split('T')[0])
              .lte('payment_date', today.toISOString().split('T')[0]);

            if (paidDividends && paidDividends.length > 0) {
              // Check if we already notified about this payment
              const { data: existingHistory } = await supabase
                .from('alert_history')
                .select('id')
                .eq('alert_id', alert.id)
                .gte('triggered_at', yesterday.toISOString())
                .limit(1);

              if (!existingHistory || existingHistory.length === 0) {
                shouldTrigger = true;
                const dividend = paidDividends[0];
                const totalAmount = Number(dividend.amount) * (dividend.quantity || 1);
                notificationTitle = `✅ Provento pago: ${alert.ticker}`;
                notificationMessage = `O provento de R$ ${totalAmount.toFixed(2)} referente a ${alert.ticker} foi creditado hoje.`;
                notificationType = 'success';
                triggerValue = totalAmount;
                triggerDetails = { type: 'dividend_paid', amount: dividend.amount, paymentDate: dividend.payment_date };
              }
            }
            break;
          }

          case 'fixed_income_maturity': {
            // This is handled by a separate function, skip here
            continue;
          }
        }

        // Create notification if alert should trigger
        if (shouldTrigger) {
          notifications.push({
            user_id: alert.user_id,
            alert_id: alert.id,
            title: notificationTitle,
            message: notificationMessage,
            notification_type: notificationType,
            ticker: alert.ticker,
            current_value: marketData?.current_price || triggerValue,
          });

          // Queue WhatsApp message
          whatsappMessages.push({
            userId: alert.user_id,
            message: `📊 *${notificationTitle}*\n\n${notificationMessage}`,
          });

          // Queue history entry
          alertHistoryQueue.push({
            alert,
            triggerValue,
            triggerDetails,
            notificationSent: true,
          });

          // Update alert metadata
          await supabase
            .from('alerts')
            .update({
              last_triggered: new Date().toISOString(),
              trigger_count: alert.trigger_count + 1,
            })
            .eq('id', alert.id);
        }
      } catch (error) {
        console.error(`Error checking alert ${alert.id}:`, error);
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} notifications`);
      }
    }

    // Send WhatsApp notifications (deduplicate by user)
    const uniqueUserMessages = new Map<string, string[]>();
    for (const msg of whatsappMessages) {
      if (!uniqueUserMessages.has(msg.userId)) {
        uniqueUserMessages.set(msg.userId, []);
      }
      uniqueUserMessages.get(msg.userId)!.push(msg.message);
    }

    let whatsappSent = 0;
    for (const [userId, messages] of uniqueUserMessages) {
      const combinedMessage = messages.join('\n\n---\n\n');
      const sent = await sendWhatsAppNotification(supabase, userId, combinedMessage);
      if (sent) whatsappSent++;
    }

    // Log alert history
    for (const historyEntry of alertHistoryQueue) {
      const userWhatsappSent = uniqueUserMessages.has(historyEntry.alert.user_id);
      await logAlertHistory(
        supabase,
        historyEntry.alert,
        historyEntry.triggerValue,
        historyEntry.triggerDetails,
        historyEntry.notificationSent,
        userWhatsappSent
      );
    }

    return new Response(JSON.stringify({ 
      success: true, 
      alertsChecked: alerts.length,
      notificationsCreated: notifications.length,
      whatsappSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('check-alerts error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
