import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(supabase: any, userId: string, message: string): Promise<boolean> {
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
    return result.success || false;
  } catch (error) {
    console.error(`Error sending WhatsApp notification:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting fixed income maturity check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active fixed income maturity alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .eq('alert_type', 'fixed_income_maturity');

    if (alertsError) throw alertsError;
    console.log(`Found ${alerts?.length || 0} fixed income maturity alerts`);

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No fixed income maturity alerts to check' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notifications = [];
    const whatsappMessages: { userId: string; message: string }[] = [];

    // Group alerts by user to check their fixed income assets
    const userAlerts = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      if (!userAlerts.has(alert.user_id)) {
        userAlerts.set(alert.user_id, []);
      }
      userAlerts.get(alert.user_id)!.push(alert);
    }

    const today = new Date();
    
    for (const [userId, userAlertsList] of userAlerts) {
      // Get user's fixed income assets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_class', 'Renda Fixa');

      if (assetsError || !assets || assets.length === 0) {
        console.log(`No fixed income assets for user ${userId}`);
        continue;
      }

      for (const asset of assets) {
        if (!asset.maturity_date) continue;

        const maturityDate = new Date(asset.maturity_date);
        const daysUntilMaturity = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if we should alert based on threshold
        for (const alert of userAlertsList) {
          const threshold = alert.threshold_value || 30; // Default 30 days

          if (daysUntilMaturity <= threshold && daysUntilMaturity > 0) {
            // Check if we already notified about this asset recently
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            const { data: existingHistory } = await supabase
              .from('alert_history')
              .select('id')
              .eq('alert_id', alert.id)
              .eq('ticker', asset.ticker)
              .gte('triggered_at', oneWeekAgo.toISOString())
              .limit(1);

            if (existingHistory && existingHistory.length > 0) {
              console.log(`Already notified about ${asset.ticker} maturity recently`);
              continue;
            }

            const formattedDate = maturityDate.toLocaleDateString('pt-BR');
            const notificationTitle = `📅 Vencimento próximo: ${asset.ticker}`;
            let notificationMessage = '';
            let notificationType = 'info';

            if (daysUntilMaturity <= 7) {
              notificationMessage = `⚠️ URGENTE: ${asset.ticker} vence em ${daysUntilMaturity} dia${daysUntilMaturity > 1 ? 's' : ''} (${formattedDate}). Valor: R$ ${Number(asset.total_invested || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              notificationType = 'error';
            } else if (daysUntilMaturity <= 15) {
              notificationMessage = `${asset.ticker} vence em ${daysUntilMaturity} dias (${formattedDate}). Valor: R$ ${Number(asset.total_invested || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              notificationType = 'warning';
            } else {
              notificationMessage = `${asset.ticker} vence em ${daysUntilMaturity} dias (${formattedDate}). Valor: R$ ${Number(asset.total_invested || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }

            notifications.push({
              user_id: userId,
              alert_id: alert.id,
              title: notificationTitle,
              message: notificationMessage,
              notification_type: notificationType,
              ticker: asset.ticker,
              current_value: Number(asset.total_invested || 0),
            });

            whatsappMessages.push({
              userId,
              message: `📊 *${notificationTitle}*\n\n${notificationMessage}`,
            });

            // Log to alert history
            await supabase.from('alert_history').insert({
              alert_id: alert.id,
              user_id: userId,
              alert_type: 'fixed_income_maturity',
              ticker: asset.ticker,
              trigger_value: daysUntilMaturity,
              trigger_details: {
                maturityDate: asset.maturity_date,
                daysUntilMaturity,
                totalInvested: asset.total_invested,
              },
              notification_sent: true,
              whatsapp_sent: false, // Will update after sending
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
        }
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

    return new Response(JSON.stringify({ 
      success: true, 
      alertsChecked: alerts.length,
      notificationsCreated: notifications.length,
      whatsappSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('check-fixed-income-maturity error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
