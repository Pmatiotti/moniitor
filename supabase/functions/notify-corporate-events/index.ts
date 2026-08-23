import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorporateEvent {
  id: string;
  ticker: string;
  event_type: string;
  event_subtype?: string;
  title: string;
  description?: string;
  value_per_share?: number;
  ratio?: string;
  announcement_date: string;
  ex_date?: string;
  payment_date?: string;
  deadline_date?: string;
  document_url?: string;
}

function getEventEmoji(eventType: string): string {
  switch (eventType) {
    case 'dividend': return '💰';
    case 'jcp': return '💵';
    case 'bonus': return '🎁';
    case 'subscription': return '📝';
    case 'split': return '➗';
    case 'reverse_split': return '✖️';
    case 'amortization': return '💸';
    case 'relevant_fact': return '📋';
    default: return '📢';
  }
}

function getEventTypeName(eventType: string): string {
  switch (eventType) {
    case 'dividend': return 'Dividendo';
    case 'jcp': return 'JCP';
    case 'bonus': return 'Bonificação';
    case 'subscription': return 'Subscrição';
    case 'split': return 'Desdobramento';
    case 'reverse_split': return 'Grupamento';
    case 'amortization': return 'Amortização';
    case 'relevant_fact': return 'Fato Relevante';
    default: return 'Evento';
  }
}

function formatNotificationMessage(event: CorporateEvent): { title: string; message: string } {
  const emoji = getEventEmoji(event.event_type);
  const typeName = getEventTypeName(event.event_type);
  
  let title = `${emoji} ${typeName}: ${event.ticker}`;
  let message = '';
  
  switch (event.event_type) {
    case 'dividend':
    case 'jcp':
    case 'amortization':
      message = event.value_per_share 
        ? `R$ ${event.value_per_share.toFixed(2)} por cota`
        : event.title;
      if (event.payment_date) {
        message += ` - Pgto: ${new Date(event.payment_date).toLocaleDateString('pt-BR')}`;
      }
      break;
    
    case 'bonus':
      message = event.ratio ? `Proporção: ${event.ratio}` : event.title;
      if (event.ex_date) {
        message += ` - Data-ex: ${new Date(event.ex_date).toLocaleDateString('pt-BR')}`;
      }
      break;
    
    case 'subscription':
      message = event.title;
      if (event.deadline_date) {
        message += ` - Prazo: ${new Date(event.deadline_date).toLocaleDateString('pt-BR')}`;
      }
      break;
    
    case 'split':
    case 'reverse_split':
      message = event.ratio ? `Proporção: ${event.ratio}` : event.title;
      break;
    
    case 'relevant_fact':
    default:
      message = event.title.length > 100 ? event.title.substring(0, 100) + '...' : event.title;
      break;
  }
  
  return { title, message };
}

function formatWhatsAppMessage(event: CorporateEvent): string {
  const emoji = getEventEmoji(event.event_type);
  const typeName = getEventTypeName(event.event_type);
  
  let msg = `${emoji} *${typeName} - ${event.ticker}*\n\n`;
  
  switch (event.event_type) {
    case 'dividend':
    case 'jcp':
    case 'amortization':
      if (event.value_per_share) {
        msg += `Valor: R$ ${event.value_per_share.toFixed(2)} por cota\n`;
      }
      if (event.ex_date) {
        msg += `Data-ex: ${new Date(event.ex_date).toLocaleDateString('pt-BR')}\n`;
      }
      if (event.payment_date) {
        msg += `Pagamento: ${new Date(event.payment_date).toLocaleDateString('pt-BR')}\n`;
      }
      break;
    
    case 'bonus':
      if (event.ratio) {
        msg += `Proporção: ${event.ratio}\n`;
      }
      if (event.ex_date) {
        msg += `Data-ex: ${new Date(event.ex_date).toLocaleDateString('pt-BR')}\n`;
      }
      break;
    
    case 'subscription':
      msg += `${event.title}\n`;
      if (event.deadline_date) {
        msg += `⚠️ Prazo: ${new Date(event.deadline_date).toLocaleDateString('pt-BR')}\n`;
      }
      break;
    
    default:
      msg += `${event.title}\n`;
      break;
  }
  
  msg += `\n📅 Anunciado em: ${new Date(event.announcement_date).toLocaleDateString('pt-BR')}`;
  
  return msg;
}

async function sendWhatsApp(supabaseUrl: string, supabaseKey: string, to: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ to, message }),
    });
    return response.ok;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_ids, days = 7 } = await req.json().catch(() => ({}));

    console.log('notify-corporate-events called with:', { event_ids, days });

    // Fetch events to notify
    let eventsQuery = supabase
      .from('corporate_events')
      .select('*')
      .order('announcement_date', { ascending: false });
    
    if (event_ids && event_ids.length > 0) {
      eventsQuery = eventsQuery.in('id', event_ids);
    } else {
      // Get events from last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      eventsQuery = eventsQuery.gte('announcement_date', cutoffDate.toISOString().split('T')[0]);
    }
    
    const { data: events, error: eventsError } = await eventsQuery;
    
    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }
    
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No events to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${events.length} events for notifications`);

    let notificationsCreated = 0;
    let whatsappSent = 0;
    let skipped = 0;

    // Get unique tickers from events
    const eventTickers = [...new Set(events.map(e => e.ticker))];
    
    // Find users who have these tickers in their portfolio
    const { data: userAssets } = await supabase
      .from('assets')
      .select('user_id, ticker')
      .in('ticker', eventTickers.map(t => [t, `${t}.SA`]).flat());
    
    if (!userAssets || userAssets.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No users have these tickers in their portfolio' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group users by ticker
    const usersByTicker: Record<string, string[]> = {};
    for (const asset of userAssets) {
      const normalizedTicker = asset.ticker.replace('.SA', '').toUpperCase();
      if (!usersByTicker[normalizedTicker]) {
        usersByTicker[normalizedTicker] = [];
      }
      if (!usersByTicker[normalizedTicker].includes(asset.user_id)) {
        usersByTicker[normalizedTicker].push(asset.user_id);
      }
    }

    // Get user profiles for WhatsApp notifications
    const allUserIds = [...new Set(userAssets.map(a => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, phone, whatsapp_notifications_enabled')
      .in('id', allUserIds);
    
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Process each event
    for (const event of events) {
      const usersToNotify = usersByTicker[event.ticker] || [];
      
      for (const userId of usersToNotify) {
        // Check if user already notified for this event
        const { data: existingNotification } = await supabase
          .from('user_event_notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('event_id', event.id)
          .maybeSingle();
        
        if (existingNotification) {
          skipped++;
          continue;
        }

        const { title, message } = formatNotificationMessage(event);
        
        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type: 'dividend', // Use existing type for compatibility
            is_read: false,
          });
        
        if (notifError) {
          console.warn(`Failed to create notification for user ${userId}:`, notifError.message);
          continue;
        }
        
        notificationsCreated++;
        
        // Send WhatsApp if enabled
        let whatsappSuccess = false;
        const profile = profilesMap.get(userId);
        
        if (profile?.whatsapp_notifications_enabled && profile?.phone) {
          const whatsappMessage = formatWhatsAppMessage(event);
          whatsappSuccess = await sendWhatsApp(supabaseUrl, supabaseServiceKey, profile.phone, whatsappMessage);
          if (whatsappSuccess) {
            whatsappSent++;
          }
        }
        
        // Mark as notified
        await supabase
          .from('user_event_notifications')
          .insert({
            user_id: userId,
            event_id: event.id,
            whatsapp_sent: whatsappSuccess,
          });
      }
    }

    console.log(`Created ${notificationsCreated} notifications, sent ${whatsappSent} WhatsApp messages, skipped ${skipped}`);

    return new Response(JSON.stringify({
      success: true,
      events_processed: events.length,
      notifications_created: notificationsCreated,
      whatsapp_sent: whatsappSent,
      skipped,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('notify-corporate-events error:', err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
