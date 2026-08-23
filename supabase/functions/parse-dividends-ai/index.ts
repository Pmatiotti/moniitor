import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { excelContent } = await req.json();
    
    if (!excelContent) {
      throw new Error("Conteúdo do Excel não fornecido");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log("Processando arquivo com IA...");

    const prompt = `Analise os seguintes dados de proventos de ações e extraia as informações em formato JSON.

IMPORTANTE:
- Identifique automaticamente as colunas relevantes (ticker/ativo, tipo de provento, valor, data de pagamento, data COM/ex)
- O valor pode estar em formato de moeda (ex: $663.40, R$ 100,00) - extraia apenas o número
- As datas podem estar em diversos formatos (dd/mm/yyyy, mm/dd/yy, yyyy-mm-dd) - converta para YYYY-MM-DD
- O tipo de provento pode ser: Rendimentos, Dividendos, JCP, Amortização, Cupom - mapeie para: rendimento, dividendo, jcp, amortização, cupom
- Ignore linhas de cabeçalho ou dados irrelevantes
- Se houver múltiplas linhas para o mesmo ativo, processe todas

CLASSIFICAÇÃO AUTOMÁTICA:
- Para asset_class, analise o ticker e tipo:
  * Se termina com 11 ou 12 = "FII"
  * Se contém DEB ou tipo é cupom/amortização = "Debenture"
  * Se contém CRI = "CRI"
  * Se contém CRA = "CRA"
  * Se contém FIDC = "FIDC"
  * Caso contrário = "Ações"
  
- Para market_type:
  * "Renda Fixa" para: Debenture, CRI, CRA, FIDC, ou tipos cupom/amortização
  * "Renda Variável" para: Ações, FII, ou tipos rendimento/dividendo/jcp

Dados:
${excelContent}

Retorne um array JSON com os seguintes campos para cada provento:
{
  "ticker": "string (código do ativo em maiúsculas)",
  "dividend_type": "string (rendimento, dividendo, jcp, amortização ou cupom)",
  "amount": number (valor numérico sem símbolo de moeda),
  "payment_date": "string (formato YYYY-MM-DD)",
  "ex_date": "string ou null (formato YYYY-MM-DD, data COM se disponível)",
  "asset_class": "string (FII, Ações, Debenture, CRI, CRA, FIDC)",
  "market_type": "string (Renda Fixa ou Renda Variável)"
}

Retorne APENAS o array JSON, sem texto adicional.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de uso da IA excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao seu workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Erro na API de IA:", aiResponse.status, errorText);
      throw new Error("Erro ao processar com IA");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta da IA vazia");
    }

    console.log("Resposta da IA:", content);

    // Extrair JSON da resposta (remover markdown se houver)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const dividends = JSON.parse(jsonContent);

    if (!Array.isArray(dividends)) {
      throw new Error("Formato de resposta inválido");
    }

    console.log(`${dividends.length} proventos extraídos com sucesso`);

    return new Response(
      JSON.stringify({ dividends }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao processar proventos com IA:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro ao processar arquivo" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
