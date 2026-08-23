import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FNETDocument {
  id: number;
  idCategoria: number;
  idTipoDocumento: number;
  idEspecie: number;
  dataReferencia: string;
  dataEntrega: string;
  status: string;
  descricaoFundo: string;
  cnpjFundo: string;
  situacaoDocumento: string;
  tipoDocumento: string;
  especie: string;
  nomeAdm: string;
  cnpjAdm: string;
  tipoFundo: string;
  alta: boolean;
}

interface B3Dividend {
  ticker: string;
  cnpj: string;
  fundName: string;
  value: number;
  paymentDate: string;
  baseDate: string | null;
  declarationDate: string;
  source: string;
}

// Parse Brazilian date format DD/MM/YYYY to YYYY-MM-DD
function parseBrazilianDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
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
  if (!valueStr) return 0;
  
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

// Format CNPJ to standard format (XX.XXX.XXX/XXXX-XX)
function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Normalize CNPJ to digits only for comparison
function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

async function fetchFNETDocuments(startDate: string, endDate: string): Promise<FNETDocument[]> {
  // Try multiple endpoints - B3 may block some from cloud servers
  const endpoints = [
    {
      url: 'https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosCVM',
      referer: 'https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM?tipoFundo=1',
    },
    {
      url: 'https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados',
      referer: 'https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentos',
    },
  ];
  
  console.log(`Fetching FNET documents from ${startDate} to ${endDate}...`);
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
      
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`FNET returned ${data.records || 0} documents from ${endpoint.url}`);
        
        if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
          return data.rows;
        }
        
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      } else {
        console.warn(`Endpoint ${endpoint.url} returned ${response.status}`);
      }
    } catch (error) {
      console.error(`Error with endpoint ${endpoint.url}:`, error);
    }
  }
  
  // If B3 FNET is not accessible, return empty (will use database fallback)
  console.log('B3 FNET not accessible from this server - using database fallback');
  return [];
}

async function parseDocumentHTML(docId: number): Promise<{ value: number; paymentDate: string | null; baseDate: string | null } | null> {
  const url = `https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?id=${docId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.warn(`Document ${docId} returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract value per share - look for various patterns
    // Pattern 1: "Valor por cota" or "Valor do Rendimento" followed by currency
    // Pattern 2: Table with "Valor" column
    // Pattern 3: JSON-LD or structured data
    
    let value = 0;
    let paymentDate: string | null = null;
    let baseDate: string | null = null;
    
    // Try to find value - look for patterns like "R$ 0,xx" or "R$ x,xxxx"
    const valuePatterns = [
      /Valor\s*(?:por\s*cota|do\s*Rendimento|a\s*ser\s*pago)[^\d]*R?\$?\s*([\d.,]+)/i,
      /Rendimento\s*(?:por\s*cota)?[^\d]*R?\$?\s*([\d.,]+)/i,
      /R\$\s*([\d]+[,.][\d]{4,})/g, // Match R$ X,XXXX (4+ decimals typical for dividends)
      /(?:valor|rendimento).*?([\d]+[,.][\d]+)/i,
    ];
    
    for (const pattern of valuePatterns) {
      const match = html.match(pattern);
      if (match) {
        const parsed = parseBrazilianCurrency(match[1]);
        // FII dividends are typically between 0.01 and 5.00 per share
        if (parsed > 0.01 && parsed < 10) {
          value = parsed;
          console.log(`Document ${docId}: Found value ${value} using pattern`);
          break;
        }
      }
    }
    
    // Try to find payment date
    const paymentPatterns = [
      /(?:Data\s*(?:de\s*)?Pagamento|Pagamento\s*em|Data\s*Pagto)[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
      /(?:ser[áa]\s*pago\s*em|pagamento\s*(?:ser[áa]\s*)?(?:realizado\s*)?em)[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of paymentPatterns) {
      const match = html.match(pattern);
      if (match) {
        paymentDate = parseBrazilianDate(match[1]);
        if (paymentDate) {
          console.log(`Document ${docId}: Found payment date ${paymentDate}`);
          break;
        }
      }
    }
    
    // Try to find base date (data-base or data-com)
    const baseDatePatterns = [
      /(?:Data[- ]?Base|Data[- ]?Com|Data\s*de\s*Corte)[^\d]*(\d{2}\/\d{2}\/\d{4})/i,
    ];
    
    for (const pattern of baseDatePatterns) {
      const match = html.match(pattern);
      if (match) {
        baseDate = parseBrazilianDate(match[1]);
        if (baseDate) {
          console.log(`Document ${docId}: Found base date ${baseDate}`);
          break;
        }
      }
    }
    
    if (value > 0) {
      return { value, paymentDate, baseDate };
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing document ${docId}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== B3 FNET Dividends Fetch Started ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate date range - last 30 days to next 60 days
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    
    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Fetch documents from B3 FNET
    const documents = await fetchFNETDocuments(formatDate(startDate), formatDate(endDate));
    console.log(`Found ${documents.length} FNET documents`);
    
    if (documents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No FNET documents found',
          dividends: [],
          source: 'B3_FNET',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Load FII registry for CNPJ to ticker mapping
    const { data: fiiRegistry, error: registryError } = await supabase
      .from('fii_registry')
      .select('ticker, cnpj, nome_fundo');
    
    if (registryError) {
      console.error('Error loading FII registry:', registryError);
    }
    
    // Create CNPJ -> ticker map (normalize CNPJ for comparison)
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
    
    const dividends: B3Dividend[] = [];
    const processedCnpjs = new Set<string>();
    
    // Process each document
    for (const doc of documents) {
      try {
        const normalizedCnpj = normalizeCNPJ(doc.cnpjFundo);
        
        // Skip if we already processed this CNPJ (take most recent)
        if (processedCnpjs.has(normalizedCnpj)) {
          continue;
        }
        
        // Get ticker from registry
        const fiiInfo = cnpjToTicker.get(normalizedCnpj);
        if (!fiiInfo) {
          console.log(`CNPJ ${doc.cnpjFundo} not found in registry, skipping`);
          continue;
        }
        
        console.log(`Processing document ${doc.id} for ${fiiInfo.ticker} (${doc.descricaoFundo})`);
        
        // Parse the document HTML to extract dividend details
        const dividendData = await parseDocumentHTML(doc.id);
        
        if (dividendData && dividendData.value > 0) {
          processedCnpjs.add(normalizedCnpj);
          
          // Use parsed payment date or estimate from document date
          let paymentDate = dividendData.paymentDate;
          if (!paymentDate) {
            // If no payment date found, estimate ~15 days from document date
            const docDate = new Date(doc.dataReferencia.split('/').reverse().join('-'));
            docDate.setDate(docDate.getDate() + 15);
            paymentDate = docDate.toISOString().split('T')[0];
          }
          
          // Only include future payments
          const paymentDateObj = new Date(paymentDate);
          if (paymentDateObj >= today) {
            dividends.push({
              ticker: fiiInfo.ticker,
              cnpj: doc.cnpjFundo,
              fundName: doc.descricaoFundo || fiiInfo.name,
              value: dividendData.value,
              paymentDate: paymentDate,
              baseDate: dividendData.baseDate,
              declarationDate: parseBrazilianDate(doc.dataEntrega) || doc.dataEntrega,
              source: 'B3_FNET',
            });
            
            console.log(`✓ Added dividend: ${fiiInfo.ticker} - R$ ${dividendData.value.toFixed(4)} on ${paymentDate}`);
          }
        }
        
        // Rate limiting - don't hammer B3
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
      }
    }
    
    console.log(`=== B3 FNET Fetch Complete: ${dividends.length} dividends found ===`);
    
    // Store dividends in fii_dividends table for reference
    if (dividends.length > 0) {
      for (const dividend of dividends) {
        const { error: upsertError } = await supabase
          .from('fii_dividends')
          .upsert({
            ticker: dividend.ticker,
            valor_por_cota: dividend.value,
            data_pagamento: dividend.paymentDate,
            data_base: dividend.baseDate,
            data_declaracao: dividend.declarationDate,
            tipo: 'Rendimento',
            source: 'B3_FNET',
          }, {
            onConflict: 'ticker,data_pagamento',
            ignoreDuplicates: true,
          });
        
        if (upsertError) {
          console.warn(`Error upserting dividend for ${dividend.ticker}:`, upsertError.message);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Found ${dividends.length} dividends from B3 FNET`,
        dividends,
        documentsProcessed: documents.length,
        source: 'B3_FNET',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in B3 FNET fetch:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'B3_FNET',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
