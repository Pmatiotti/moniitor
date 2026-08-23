import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IRPFBem {
  codigo: string;
  descricao: string;
  situacaoAnterior: number;
  situacaoAtual: number;
}

// Mapeamento de códigos do IR para categorias
const IR_CODE_MAPPING: Record<string, { category: string; subcategory: string }> = {
  // Imóveis
  '01': { category: 'imovel', subcategory: 'Prédio residencial' },
  '02': { category: 'imovel', subcategory: 'Prédio comercial' },
  '03': { category: 'imovel', subcategory: 'Galpão' },
  '11': { category: 'imovel', subcategory: 'Apartamento' },
  '12': { category: 'imovel', subcategory: 'Casa' },
  '13': { category: 'imovel', subcategory: 'Terreno' },
  '14': { category: 'imovel', subcategory: 'Imóvel rural' },
  '15': { category: 'imovel', subcategory: 'Sala ou conjunto' },
  '16': { category: 'imovel', subcategory: 'Construção' },
  '17': { category: 'imovel', subcategory: 'Benfeitorias' },
  '18': { category: 'imovel', subcategory: 'Loja' },
  '19': { category: 'imovel', subcategory: 'Outros imóveis' },
  
  // Veículos
  '21': { category: 'bem_movel', subcategory: 'Veículo automotor terrestre' },
  '22': { category: 'bem_movel', subcategory: 'Aeronave' },
  '23': { category: 'bem_movel', subcategory: 'Embarcação' },
  '24': { category: 'bem_movel', subcategory: 'Veículo agrícola' },
  
  // Participações societárias
  '31': { category: 'participacao_societaria', subcategory: 'Ações' },
  '32': { category: 'participacao_societaria', subcategory: 'Quotas de capital' },
  '39': { category: 'participacao_societaria', subcategory: 'Outras participações' },
  
  // Bens móveis e outros
  '41': { category: 'bem_movel', subcategory: 'Caderneta de poupança' },
  '45': { category: 'bem_movel', subcategory: 'Aplicação de renda fixa' },
  '46': { category: 'bem_movel', subcategory: 'Ouro' },
  '51': { category: 'direitos', subcategory: 'Crédito decorrente de alienação' },
  '52': { category: 'direitos', subcategory: 'Crédito decorrente de empréstimo' },
  '61': { category: 'bem_movel', subcategory: 'VGBL/PGBL' },
  '71': { category: 'bem_movel', subcategory: 'Fundo de investimento' },
  '72': { category: 'bem_movel', subcategory: 'FII' },
  '73': { category: 'bem_movel', subcategory: 'Fundo de ações' },
  '74': { category: 'bem_movel', subcategory: 'ETF' },
  '81': { category: 'bem_movel', subcategory: 'Criptoativos' },
  '91': { category: 'bem_movel', subcategory: 'Joia, quadro, objeto de arte' },
  '92': { category: 'bem_movel', subcategory: 'Moeda estrangeira' },
  '93': { category: 'bem_movel', subcategory: 'Dinheiro em espécie' },
  '94': { category: 'bem_movel', subcategory: 'Coleções' },
  '95': { category: 'bem_movel', subcategory: 'Consórcio não contemplado' },
  '96': { category: 'bem_movel', subcategory: 'Leasing' },
  '97': { category: 'bem_movel', subcategory: 'Ações judiciais' },
  '99': { category: 'outros', subcategory: 'Outros bens e direitos' },
};

function parseIRPFXml(xmlContent: string): { year: number; bens: IRPFBem[] } {
  console.log('Parsing IRPF XML...');
  
  // Extract year from declaração
  const yearMatch = xmlContent.match(/anoCalendario[\"\s]*[:=][\"\s]*(\d{4})/i) 
    || xmlContent.match(/exercicio[\"\s]*[:=][\"\s]*(\d{4})/i)
    || xmlContent.match(/<anoCalendario>(\d{4})<\/anoCalendario>/i)
    || xmlContent.match(/ano[\"\s]*[:=][\"\s]*\"?(\d{4})/i);
  
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear() - 1;
  console.log(`Detected year: ${year}`);
  
  const bens: IRPFBem[] = [];
  
  // Try to parse as JSON (some tools export as JSON)
  try {
    const jsonData = JSON.parse(xmlContent);
    if (jsonData.bensEDireitos || jsonData.bens) {
      const items = jsonData.bensEDireitos || jsonData.bens;
      for (const item of items) {
        bens.push({
          codigo: item.codigo || item.codigoBem || '99',
          descricao: item.descricao || item.discriminacao || '',
          situacaoAnterior: parseFloat(item.situacaoAnterior || item.valorAnterior || '0') || 0,
          situacaoAtual: parseFloat(item.situacaoAtual || item.valorAtual || '0') || 0,
        });
      }
      console.log(`Parsed ${bens.length} items from JSON format`);
      return { year, bens };
    }
  } catch {
    // Not JSON, continue with XML parsing
  }
  
  // Parse XML format
  // Pattern 1: <bem> or <bensEDireitos> tags
  const bemPattern = /<(?:bem|bensEDireitos|item)[^>]*>([\s\S]*?)<\/(?:bem|bensEDireitos|item)>/gi;
  let match;
  
  while ((match = bemPattern.exec(xmlContent)) !== null) {
    const bemContent = match[1];
    
    const codigoMatch = bemContent.match(/<(?:codigo|codigoBem|cd)[^>]*>(\d+)<\/(?:codigo|codigoBem|cd)>/i)
      || bemContent.match(/codigo[\"\s]*[:=][\"\s]*\"?(\d+)/i);
    
    const descricaoMatch = bemContent.match(/<(?:descricao|discriminacao|ds)[^>]*>([\s\S]*?)<\/(?:descricao|discriminacao|ds)>/i)
      || bemContent.match(/descricao[\"\s]*[:=][\"\s]*\"([^\"]+)\"/i);
    
    const anteriorMatch = bemContent.match(/<(?:situacaoAnterior|valorAnterior|vlAnterior)[^>]*>([\d.,]+)<\/(?:situacaoAnterior|valorAnterior|vlAnterior)>/i)
      || bemContent.match(/situacaoAnterior[\"\s]*[:=][\"\s]*\"?([\d.,]+)/i);
    
    const atualMatch = bemContent.match(/<(?:situacaoAtual|valorAtual|vlAtual)[^>]*>([\d.,]+)<\/(?:situacaoAtual|valorAtual|vlAtual)>/i)
      || bemContent.match(/situacaoAtual[\"\s]*[:=][\"\s]*\"?([\d.,]+)/i);
    
    if (codigoMatch || descricaoMatch) {
      bens.push({
        codigo: codigoMatch ? codigoMatch[1].padStart(2, '0') : '99',
        descricao: descricaoMatch ? descricaoMatch[1].trim() : 'Bem não identificado',
        situacaoAnterior: anteriorMatch ? parseFloat(anteriorMatch[1].replace(/\./g, '').replace(',', '.')) : 0,
        situacaoAtual: atualMatch ? parseFloat(atualMatch[1].replace(/\./g, '').replace(',', '.')) : 0,
      });
    }
  }
  
  console.log(`Parsed ${bens.length} items from XML format`);
  return { year, bens };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { xmlContent, clientId } = await req.json();
    
    if (!xmlContent) {
      throw new Error('XML content is required');
    }

    console.log(`Processing IRPF for user ${user.id}, client: ${clientId || 'self'}`);

    // Parse the XML
    const { year, bens } = parseIRPFXml(xmlContent);
    
    if (bens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum bem encontrado no arquivo. Verifique se o formato está correto.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out investment items (will be handled by portfolio)
    // Keep: imóveis, participações, veículos, joias, etc.
    const investmentCodes = ['41', '45', '46', '61', '71', '72', '73', '74', '81'];
    const patrimonyBens = bens.filter(bem => !investmentCodes.includes(bem.codigo));

    console.log(`Filtered to ${patrimonyBens.length} patrimony items (excluding pure investments)`);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('irpf_imports')
      .insert({
        user_id: user.id,
        client_id: clientId || null,
        year,
        file_name: `IRPF_${year}.xml`,
        total_assets_imported: patrimonyBens.length,
        raw_data: { bens: patrimonyBens },
        status: 'processed',
      })
      .select()
      .single();

    if (importError) {
      console.error('Error creating import record:', importError);
      throw importError;
    }

    // Insert patrimony assets
    const assetsToInsert = patrimonyBens.map(bem => {
      const mapping = IR_CODE_MAPPING[bem.codigo] || { category: 'outros', subcategory: 'Outros' };
      
      return {
        user_id: user.id,
        client_id: clientId || null,
        category: mapping.category,
        subcategory: mapping.subcategory,
        name: bem.descricao.substring(0, 100),
        description: bem.descricao,
        acquisition_value: bem.situacaoAnterior || bem.situacaoAtual,
        current_value: bem.situacaoAtual,
        ir_code: bem.codigo,
        ir_description: bem.descricao,
        ir_year: year,
        source: 'irpf',
      };
    });

    const { data: insertedAssets, error: insertError } = await supabase
      .from('patrimony_assets')
      .insert(assetsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting assets:', insertError);
      throw insertError;
    }

    console.log(`Successfully imported ${insertedAssets?.length || 0} assets`);

    // Calculate totals by category
    const totals = patrimonyBens.reduce((acc, bem) => {
      const mapping = IR_CODE_MAPPING[bem.codigo] || { category: 'outros', subcategory: 'Outros' };
      acc[mapping.category] = (acc[mapping.category] || 0) + bem.situacaoAtual;
      return acc;
    }, {} as Record<string, number>);

    return new Response(
      JSON.stringify({
        success: true,
        year,
        totalAssets: patrimonyBens.length,
        totals,
        importId: importRecord.id,
        message: `Importados ${patrimonyBens.length} bens do IRPF ${year}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing IRPF:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
