import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncedDividend {
  ticker: string;
  type: string;
  value: number;
  baseDate: string | null;
  paymentDate: string;
  declarationDate: string | null;
  source: string;
}

interface FNETDocument {
  id: number;
  idTipoDocumento: number;
  dataReferencia: string;
  dataEntrega: string;
  descricaoFundo: string;
  cnpjFundo: string;
  tipoDocumento: string;
}

// Parse Brazilian date format DD/MM/YYYY to YYYY-MM-DD
function parseBrazilianDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '-') return null;
  
  // Try DD/MM/YYYY format
  const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  
  // Try YYYY-MM-DD format (already correct)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  return null;
}

// Parse Brazilian currency format (R$ 1.234,56 or 1,2345)
function parseBrazilianCurrency(valueStr: string): number {
  if (!valueStr || valueStr === '-') return 0;
  
  // Remove R$ and spaces
  let cleaned = valueStr.replace(/R\$\s*/g, '').trim();
  
  // If it has both . and ,, the . is thousand separator
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Only comma - it's decimal separator
    cleaned = cleaned.replace(',', '.');
  }
  
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

// Normalize CNPJ to digits only for comparison
function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

// =====================================================
// SOURCE: Dados de Mercado API - API brasileira estável para FIIs
// =====================================================

async function fetchFromDadosDeMercado(tickers: string[]): Promise<AnnouncedDividend[]> {
  const dividends: AnnouncedDividend[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log(`[Dados de Mercado] Fetching dividends for ${tickers.length} FII tickers...`);
  
  for (const ticker of tickers) {
    try {
      // API pública para REITs (FIIs)
      const url = `https://api.dadosdemercado.com.br/v1/reits/${ticker}/dividends`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentApp/1.0)',
        },
      });
      
      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`[Dados de Mercado] ${ticker} returned ${response.status}`);
        }
        continue;
      }
      
      const data = await response.json();
      
      // API retorna array de dividendos: { ex_date, payable_date, amount, type }
      if (Array.isArray(data)) {
        for (const div of data) {
          const paymentDate = div.payable_date || div.payment_date;
          if (!paymentDate) continue;
          
          const paymentDateObj = new Date(paymentDate);
          if (paymentDateObj >= today) {
            dividends.push({
              ticker: ticker.toUpperCase(),
              type: div.type || 'Rendimento',
              value: parseFloat(div.amount) || 0,
              paymentDate,
              baseDate: div.ex_date || null,
              declarationDate: div.declaration_date || null,
              source: 'DADOS_DE_MERCADO',
            });
            
            console.log(`[Dados de Mercado] ✓ ${ticker}: R$ ${(div.amount || 0).toFixed(4)} on ${paymentDate}`);
          }
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.error(`[Dados de Mercado] Error for ${ticker}:`, error);
    }
  }
  
  console.log(`[Dados de Mercado] Found ${dividends.length} dividends`);
  return dividends;
}

// =====================================================
// SOURCE: B3 FNET - Fonte oficial (pode não funcionar de cloud servers)
// =====================================================

interface FNETDocumentResult {
  id: number;
  cnpjFundo: string;
  descricaoFundo: string;
  dataReferencia: string;
  dataEntrega: string;
}

async function fetchFNETDocuments(startDate: string, endDate: string): Promise<FNETDocumentResult[]> {
  const endpoints = [
    {
      url: 'https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosCVM',
      referer: 'https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM?tipoFundo=1',
    },
  ];
  
  console.log(`[B3 FNET] Fetching documents from ${startDate} to ${endDate}...`);
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://fnet.bmfbovespa.com.br',
          'Referer': endpoint.referer,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          tipoFundo: 1,
          idCategoria: 6,
          idTipoDocumento: '',
          idEspecieDocumento: '',
          situacao: 'A',
          dataInicial: startDate,
          dataFinal: endDate,
          paginaCertificados: false,
          rows: 100,
          page: 1,
          sidx: 'dataEntrega',
          sord: 'desc',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[B3 FNET] Response: ${data.records || 0} documents`);
        
        if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
          return data.rows;
        }
      } else {
        console.warn(`[B3 FNET] Returned ${response.status} - may be blocked from cloud`);
      }
    } catch (error) {
      console.error(`[B3 FNET] Error:`, error);
    }
  }
  
  return [];
}

// Parse document HTML to extract dividend value and dates
async function parseDocumentHTML(docId: number): Promise<{ value: number; paymentDate: string | null; baseDate: string | null } | null> {
  const url = `https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?id=${docId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    let value = 0;
    let paymentDate: string | null = null;
    let baseDate: string | null = null;
    
    const valuePatterns = [
      /Valor\s*(?:por\s*cota|do\s*Rendimento)[^\d]*R?\$?\s*([\d.,]+)/i,
      /R\$\s*([\d]+[,.][\d]{4,})/g,
    ];
    
    for (const pattern of valuePatterns) {
      const match = html.match(pattern);
      if (match) {
        const parsed = parseBrazilianCurrency(match[1]);
        if (parsed > 0.01 && parsed < 10) {
          value = parsed;
          break;
        }
      }
    }
    
    const paymentPatterns = [
      /(?:Data\s*(?:de\s*)?Pagamento)[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of paymentPatterns) {
      const match = html.match(pattern);
      if (match) {
        paymentDate = parseBrazilianDate(match[1]);
        if (paymentDate) break;
      }
    }
    
    const baseDatePatterns = [
      /(?:Data[- ]?Base|Data[- ]?Com)[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of baseDatePatterns) {
      const match = html.match(pattern);
      if (match) {
        baseDate = parseBrazilianDate(match[1]);
        if (baseDate) break;
      }
    }
    
    if (value > 0) {
      return { value, paymentDate, baseDate };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch dividends from B3 FNET (may fail from cloud servers)
async function fetchFromB3FNET(cnpjToTicker: Map<string, { ticker: string; name: string }>): Promise<AnnouncedDividend[]> {
  const dividends: AnnouncedDividend[] = [];
  const today = new Date();
  
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 60);
  
  const formatDate = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  
  const documents = await fetchFNETDocuments(formatDate(startDate), formatDate(endDate));
  
  if (documents.length === 0) {
    console.log('[B3 FNET] No documents returned - API may be blocked');
    return [];
  }
  
  console.log(`[B3 FNET] Processing ${documents.length} documents...`);
  
  const processedCnpjs = new Set<string>();
  
  for (const doc of documents) {
    try {
      const normalizedCnpj = normalizeCNPJ(doc.cnpjFundo);
      if (processedCnpjs.has(normalizedCnpj)) continue;
      
      const fiiInfo = cnpjToTicker.get(normalizedCnpj);
      if (!fiiInfo) continue;
      
      const dividendData = await parseDocumentHTML(doc.id);
      
      if (dividendData && dividendData.value > 0) {
        processedCnpjs.add(normalizedCnpj);
        
        let paymentDate = dividendData.paymentDate;
        if (!paymentDate) {
          const docDate = parseBrazilianDate(doc.dataReferencia);
          if (docDate) {
            const estDate = new Date(docDate);
            estDate.setDate(estDate.getDate() + 15);
            paymentDate = estDate.toISOString().split('T')[0];
          }
        }
        
        if (paymentDate && new Date(paymentDate) >= today) {
          dividends.push({
            ticker: fiiInfo.ticker,
            type: 'Rendimento',
            value: dividendData.value,
            paymentDate,
            baseDate: dividendData.baseDate,
            declarationDate: parseBrazilianDate(doc.dataEntrega),
            source: 'B3_FNET',
          });
          
          console.log(`[B3 FNET] ✓ ${fiiInfo.ticker}: R$ ${dividendData.value.toFixed(4)} on ${paymentDate}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (docError) {
      console.error(`[B3 FNET] Error processing doc:`, docError);
    }
  }
  
  console.log(`[B3 FNET] Total: ${dividends.length} dividends found`);
  return dividends;
}

// Fallback: Buscar dados do banco fii_dividends
async function fetchFromDatabase(supabase: any, tickers: string[]): Promise<AnnouncedDividend[]> {
  console.log(`[Database] Checking fii_dividends for ${tickers.length} tickers...`);
  
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  
  const { data: recentDividends, error } = await supabase
    .from('fii_dividends')
    .select('ticker, valor_por_cota, data_pagamento, data_base, tipo, source')
    .in('ticker', tickers)
    .gte('data_pagamento', today)
    .lte('data_pagamento', futureDate.toISOString().split('T')[0])
    .order('data_pagamento', { ascending: true });
  
  if (error) {
    console.error('[Database] Error:', error);
    return [];
  }
  
  const dividends: AnnouncedDividend[] = (recentDividends || []).map((d: any) => ({
    ticker: d.ticker,
    type: d.tipo || 'Rendimento',
    value: d.valor_por_cota,
    baseDate: d.data_base,
    paymentDate: d.data_pagamento,
    declarationDate: null,
    source: 'DATABASE',
  }));
  
  console.log(`[Database] Found ${dividends.length} future dividends`);
  return dividends;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('=== FII Announced Dividends Fetch Started ===');

    // Load FII registry for CNPJ to ticker mapping
    const { data: fiiRegistry, error: registryError } = await supabase
      .from('fii_registry')
      .select('ticker, cnpj, nome_fundo');
    
    if (registryError) {
      console.error('Error loading FII registry:', registryError);
    }
    
    const cnpjToTicker = new Map<string, { ticker: string; name: string }>();
    if (fiiRegistry) {
      for (const fii of fiiRegistry) {
        const normalizedCnpj = normalizeCNPJ(fii.cnpj);
        cnpjToTicker.set(normalizedCnpj, { 
          ticker: fii.ticker, 
          name: fii.nome_fundo || fii.ticker 
        });
      }
      console.log(`Loaded ${cnpjToTicker.size} FIIs from registry`);
    }

    // ==============================================
    // STRATEGY: 1) Dados de Mercado API 2) B3 FNET 3) Database
    // ==============================================
    
    // Buscar ativos de usuários primeiro
    const { data: userAssets, error: assetsError } = await supabase
      .from('assets')
      .select('id, user_id, ticker, quantity')
      .eq('asset_class', 'Renda Variável')
      .ilike('ticker', '%11');

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    const userTickers = [...new Set((userAssets || []).map(a => a.ticker.replace(/\s+/g, '').toUpperCase()))];
    console.log(`Found ${userTickers.length} unique FII tickers from users`);
    
    let announcedDividends: AnnouncedDividend[] = [];
    let primarySource = 'DADOS_DE_MERCADO';
    
    // 1. Tentar Dados de Mercado API (funciona de cloud)
    console.log('\n--- Buscando do Dados de Mercado API ---');
    announcedDividends = await fetchFromDadosDeMercado(userTickers);
    
    // 2. Se não encontrou, tentar B3 FNET
    if (announcedDividends.length === 0) {
      console.log('\n--- Dados de Mercado vazio, tentando B3 FNET ---');
      primarySource = 'B3_FNET';
      announcedDividends = await fetchFromB3FNET(cnpjToTicker);
    }
    
    // 3. Fallback to fii_dividends table
    if (announcedDividends.length === 0) {
      console.log('\n--- Fontes externas vazias, usando database ---');
      primarySource = 'DATABASE';
      
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const { data: recentDividends, error } = await supabase
        .from('fii_dividends')
        .select('ticker, valor_por_cota, data_pagamento, data_base, tipo, source')
        .gte('data_pagamento', today)
        .lte('data_pagamento', futureDate.toISOString().split('T')[0])
        .order('data_pagamento', { ascending: true });
      
      if (!error && recentDividends) {
        announcedDividends = recentDividends.map(d => ({
          ticker: d.ticker,
          type: d.tipo || 'Rendimento',
          value: d.valor_por_cota,
          baseDate: d.data_base,
          paymentDate: d.data_pagamento,
          declarationDate: null,
          source: d.source || 'DATABASE',
        }));
        console.log(`Found ${announcedDividends.length} future dividends from database`);
      }
    }

    console.log(`\n=== Total: ${announcedDividends.length} announced dividends ===`);

    // Store dividends in fii_dividends for future reference
    for (const div of announcedDividends) {
      if (div.source !== 'DATABASE') {
        await supabase
          .from('fii_dividends')
          .upsert({
            ticker: div.ticker,
            valor_por_cota: div.value,
            data_pagamento: div.paymentDate,
            data_base: div.baseDate,
            data_declaracao: div.declarationDate,
            tipo: div.type,
            source: div.source,
          }, {
            onConflict: 'ticker,data_pagamento',
            ignoreDuplicates: true,
          });
      }
    }

    // Create user-specific upcoming dividends
    const userUpcomingDividends: any[] = [];
    const existingKeys = new Set<string>();

    const { data: existingUpcoming } = await supabase
      .from('upcoming_dividends')
      .select('user_id, ticker, payment_date');
    
    for (const existing of existingUpcoming || []) {
      existingKeys.add(`${existing.user_id}|${existing.ticker}|${existing.payment_date}`);
    }

    for (const asset of userAssets || []) {
      const normalizedTicker = asset.ticker.replace(/\s+/g, '').toUpperCase();
      
      for (const div of announcedDividends) {
        if (div.ticker !== normalizedTicker) continue;
        
        const key = `${asset.user_id}|${div.ticker}|${div.paymentDate}`;
        if (existingKeys.has(key)) continue;
        
        userUpcomingDividends.push({
          user_id: asset.user_id,
          ticker: div.ticker,
          dividend_type: div.type,
          rate: div.value,
          expected_amount: div.value * asset.quantity,
          quantity: asset.quantity,
          payment_date: div.paymentDate,
          ex_date: div.baseDate,
          source: div.source,
          is_notified: false,
        });
        
        existingKeys.add(key);
      }
    }

    let inserted = 0;
    let notifications = 0;

    if (userUpcomingDividends.length > 0) {
      const { error: insertError } = await supabase
        .from('upcoming_dividends')
        .insert(userUpcomingDividends);
      
      if (insertError) {
        console.error('Error inserting upcoming dividends:', insertError);
      } else {
        inserted = userUpcomingDividends.length;
        console.log(`Inserted ${inserted} upcoming dividends`);
        
        // Create notifications grouped by user
        const byUser = new Map<string, any[]>();
        for (const div of userUpcomingDividends) {
          if (!byUser.has(div.user_id)) {
            byUser.set(div.user_id, []);
          }
          byUser.get(div.user_id)!.push(div);
        }
        
        const notificationsToInsert: any[] = [];
        for (const [userId, divs] of byUser) {
          const totalAmount = divs.reduce((sum, d) => sum + d.expected_amount, 0);
          const tickers = [...new Set(divs.map(d => d.ticker))].slice(0, 3);
          
          notificationsToInsert.push({
            user_id: userId,
            title: `📅 Proventos anunciados: ${tickers.join(', ')}${divs.length > 3 ? '...' : ''}`,
            message: `${divs.length} provento(s) totalizam R$ ${totalAmount.toFixed(2)} previstos.`,
            notification_type: 'info',
          });
        }
        
        if (notificationsToInsert.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);
          
          if (!notifError) {
            notifications = notificationsToInsert.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        primarySource,
        announcedFound: announcedDividends.length,
        inserted,
        notifications,
        sources: {
          b3_fnet: announcedDividends.filter(d => d.source === 'B3_FNET').length,
          database: announcedDividends.filter(d => d.source === 'DATABASE').length,
        },
        message: `Encontrados ${announcedDividends.length} proventos anunciados, ${inserted} novos salvos`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-fii-announced-dividends:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro ao buscar proventos anunciados',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
