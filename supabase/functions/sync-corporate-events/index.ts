import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrapiDividend {
  paymentDate: string;
  rate: number;
  type: string;
  assetIssued?: string;
}

interface BrapiStockDividend {
  approvedOn: string;
  isinCode: string;
  label: string;
  rate: number;
  lastDatePrior?: string;
}

interface CorporateEvent {
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
  source: string;
  raw_data?: any;
}

// Categorize relevant facts by keywords
function categorizeRelevantFact(title: string): { type: string; subtype?: string } {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('rendimento') || lowerTitle.includes('provento') || lowerTitle.includes('dividendo')) {
    if (lowerTitle.includes('amortiza')) {
      return { type: 'amortization', subtype: 'amortizacao' };
    }
    return { type: 'dividend', subtype: 'rendimento' };
  }
  
  if (lowerTitle.includes('juros sobre capital') || lowerTitle.includes('jcp') || lowerTitle.includes('jscp')) {
    return { type: 'jcp' };
  }
  
  if (lowerTitle.includes('bonifica')) {
    return { type: 'bonus' };
  }
  
  if (lowerTitle.includes('subscri') || lowerTitle.includes('direito de prefer')) {
    return { type: 'subscription' };
  }
  
  if (lowerTitle.includes('grupamento')) {
    return { type: 'reverse_split' };
  }
  
  if (lowerTitle.includes('desdobramento')) {
    return { type: 'split' };
  }
  
  return { type: 'relevant_fact' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brapiKey = Deno.env.get('BRAPI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticker, sync_all, notify, days = 30 } = await req.json().catch(() => ({}));

    console.log('sync-corporate-events called with:', { ticker, sync_all, notify, days });

    let tickers: string[] = [];

    if (ticker) {
      tickers = [ticker.toUpperCase().replace('.SA', '')];
    } else if (sync_all) {
      // Get all unique tickers from user assets
      const { data: assets } = await supabase
        .from('assets')
        .select('ticker')
        .in('asset_class', ['Ações', 'FIIs', 'Renda Variável', 'Stocks']);
      
      if (assets) {
        const uniqueTickers = new Set<string>();
        assets.forEach(a => {
          const normalizedTicker = a.ticker.toUpperCase().replace('.SA', '');
          uniqueTickers.add(normalizedTicker);
        });
        tickers = Array.from(uniqueTickers);
      }
    }

    if (tickers.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No tickers to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${tickers.length} tickers`);

    const allEvents: CorporateEvent[] = [];
    const errors: string[] = [];

    for (const tickerItem of tickers) {
      try {
        // 1. Fetch dividends from Brapi
        const brapiUrl = brapiKey 
          ? `https://brapi.dev/api/quote/${tickerItem}?dividends=true&token=${brapiKey}`
          : `https://brapi.dev/api/quote/${tickerItem}?dividends=true`;
        
        const brapiResponse = await fetch(brapiUrl);
        
        if (brapiResponse.ok) {
          const brapiData = await brapiResponse.json();
          const result = brapiData?.results?.[0];
          
          if (result) {
            // Process cash dividends
            const dividends = result.dividendsData?.cashDividends || [];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            for (const div of dividends) {
              const paymentDate = new Date(div.paymentDate);
              if (isNaN(paymentDate.getTime())) continue;
              
              // Only process recent or future dividends
              if (paymentDate >= cutoffDate) {
                const eventType = div.type?.toLowerCase().includes('jcp') ? 'jcp' : 'dividend';
                
                allEvents.push({
                  ticker: tickerItem,
                  event_type: eventType,
                  event_subtype: div.type,
                  title: `${eventType === 'jcp' ? 'JCP' : 'Dividendo'} ${tickerItem}: R$ ${div.rate?.toFixed(2) || '0.00'}`,
                  value_per_share: div.rate || 0,
                  announcement_date: div.assetIssued || paymentDate.toISOString().split('T')[0],
                  ex_date: div.assetIssued ? new Date(div.assetIssued).toISOString().split('T')[0] : undefined,
                  payment_date: paymentDate.toISOString().split('T')[0],
                  source: 'brapi',
                  raw_data: div,
                });
              }
            }
            
            // Process stock dividends (bonuses)
            const stockDividends = result.dividendsData?.stockDividends || [];
            for (const stockDiv of stockDividends) {
              if (!stockDiv.approvedOn) continue;
              
              const approvedDate = new Date(stockDiv.approvedOn);
              if (isNaN(approvedDate.getTime()) || approvedDate < cutoffDate) continue;
              
              allEvents.push({
                ticker: tickerItem,
                event_type: 'bonus',
                title: `Bonificação ${tickerItem}: ${stockDiv.label || ''}`,
                ratio: stockDiv.rate ? `1:${stockDiv.rate}` : undefined,
                announcement_date: approvedDate.toISOString().split('T')[0],
                ex_date: stockDiv.lastDatePrior ? new Date(stockDiv.lastDatePrior).toISOString().split('T')[0] : undefined,
                source: 'brapi',
                raw_data: stockDiv,
              });
            }
          }
        } else {
          console.warn(`Brapi request failed for ${tickerItem}: ${brapiResponse.status}`);
        }

        // 2. Fetch relevant facts from database (already synced by other functions)
        const { data: relevantFacts } = await supabase
          .from('fii_relevant_facts')
          .select('*')
          .eq('ticker', tickerItem)
          .gte('data_publicacao', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('data_publicacao', { ascending: false });

        if (relevantFacts) {
          for (const fact of relevantFacts) {
            const { type, subtype } = categorizeRelevantFact(fact.titulo);
            
            // Skip if it's already captured as dividend from Brapi
            if (type === 'dividend' && allEvents.some(e => 
              e.ticker === tickerItem && 
              e.event_type === 'dividend' && 
              e.announcement_date === fact.data_publicacao
            )) {
              continue;
            }
            
            allEvents.push({
              ticker: tickerItem,
              event_type: type,
              event_subtype: subtype,
              title: fact.titulo,
              description: fact.resumo,
              announcement_date: fact.data_publicacao,
              document_url: fact.url_documento,
              source: 'b3',
            });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing ticker ${tickerItem}:`, err);
        errors.push(`${tickerItem}: ${errorMessage}`);
      }
    }

    console.log(`Found ${allEvents.length} events across all tickers`);

    // Insert events into corporate_events table
    let insertedCount = 0;
    let skippedCount = 0;
    const insertedEvents: any[] = [];

    for (const event of allEvents) {
      try {
        // Check if event already exists
        let existingQuery = supabase
          .from('corporate_events')
          .select('id')
          .eq('ticker', event.ticker)
          .eq('event_type', event.event_type)
          .eq('announcement_date', event.announcement_date);
        
        if (event.value_per_share) {
          existingQuery = existingQuery.eq('value_per_share', event.value_per_share);
        }
        if (event.payment_date) {
          existingQuery = existingQuery.eq('payment_date', event.payment_date);
        }
        if (event.event_type === 'relevant_fact') {
          existingQuery = existingQuery.eq('title', event.title);
        }
        
        const { data: existing } = await existingQuery.maybeSingle();
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        const { data: inserted, error: insertError } = await supabase
          .from('corporate_events')
          .insert(event)
          .select()
          .single();
        
        if (insertError) {
          console.warn(`Failed to insert event for ${event.ticker}:`, insertError.message);
          skippedCount++;
        } else if (inserted) {
          insertedCount++;
          insertedEvents.push(inserted);
        }
      } catch (error) {
        console.warn(`Error inserting event:`, error);
        skippedCount++;
      }
    }

    console.log(`Inserted ${insertedCount} events, skipped ${skippedCount}`);

    // Optionally trigger notifications
    if (notify && insertedEvents.length > 0) {
      try {
        const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-corporate-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ event_ids: insertedEvents.map(e => e.id) }),
        });
        
        const notifyResult = await notifyResponse.json();
        console.log('Notify result:', notifyResult);
      } catch (notifyError) {
        console.error('Failed to trigger notifications:', notifyError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tickers_processed: tickers.length,
      events_found: allEvents.length,
      events_inserted: insertedCount,
      events_skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('sync-corporate-events error:', err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
