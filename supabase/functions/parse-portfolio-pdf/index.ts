import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfContent, selectedBroker } = await req.json();
    
    if (!pdfContent) {
      throw new Error("PDF content is required");
    }

    console.log("Selected broker from user:", selectedBroker || "none");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing PDF with AI...");

    // Adiciona contexto da corretora selecionada pelo usuário
    const brokerContext = selectedBroker 
      ? `\n\nIMPORTANTE: O usuário informou que este relatório é da corretora "${selectedBroker}". USE ESTA CORRETORA para TODOS os ativos extraídos, independente do que aparecer no PDF.`
      : '';

    const systemPrompt = `Você é um especialista em extrair dados de relatórios financeiros brasileiros (BTG Pactual, XP, Rico, etc).

Analise o conteúdo do PDF e extraia TODOS os ativos encontrados.${brokerContext}

REGRAS CRÍTICAS DE EXTRAÇÃO:

1. RENDA VARIÁVEL (Ações, FIIs, ETFs, BDRs):
   - quantity: número de ações/cotas (QTD ou QUANTIDADE no PDF)
   - average_price: preço médio de compra por unidade
   - current_price: cotação atual por unidade (PREÇO ATUAL ou COTAÇÃO)
   - O valor total da posição = quantity × current_price

2. RENDA FIXA (CDB, LCI, LCA, Debêntures, CRA, CRI, Tesouro):
   - quantity: SEMPRE 1 (uma aplicação)
   - invested_amount: valor original aplicado (VALOR APLICADO)
   - current_price: valor atual da posição TOTAL (POSIÇÃO ou VALOR LÍQUIDO)
   - average_price: igual ao invested_amount
   - rate: taxa contratada (ex: "120% CDI", "IPCA + 6%")

3. COE (Certificado de Operações Estruturadas):
   - quantity: SEMPRE 1
   - invested_amount: valor original aplicado (VALOR APLICADO)
   - current_price: valor atual da posição TOTAL (POSIÇÃO ou VALOR ATUAL)
   - average_price: igual ao invested_amount

4. FUNDOS DE INVESTIMENTO:
   - quantity: número de cotas (QTD COTAS)
   - current_price: valor da cota (VALOR COTA)
   - invested_amount: valor líquido da posição (POSIÇÃO ou VALOR LÍQUIDO)
   - average_price: invested_amount / quantity

Para cada ativo, extraia:
- ticker: código do ativo SEM ESPAÇOS (obrigatório)
- asset_name: nome completo do ativo (obrigatório)
- asset_class: DEVE SER uma destas opções EXATAS: "Renda Variável", "Renda Fixa", "Fundos de Investimento", "COE", "Previdência"
- sub_class: subclasse do ativo baseada no asset_class:
  * Para "Renda Variável": "Ações", "Fundos Imobiliário", "ETF", "BDR", ou "Derivativos"
  * Para "Renda Fixa": "Pós", "Pré", "Inflação", "CDB", "LCI", "LCA", "Debêntures", ou "Tesouro Direto"
  * Para "Fundos de Investimento": "Renda Fixa", "Multimercado", "Ações", "FIDIC", "Alternativos", "FIAGRO", ou "FIP"
  * Para "COE": null
  * Para "Previdência": "Renda Fixa", "Multimercado", ou "Ações"
- quantity: quantidade (número)
- average_price: preço médio (número)
- current_price: preço/valor atual (número)
- currency: moeda ("BRL" ou "USD")
- broker: corretora${selectedBroker ? ` (USE "${selectedBroker}" para todos os ativos)` : ''}
- application_date: data de aplicação (YYYY-MM-DD)
- maturity_date: data de vencimento (YYYY-MM-DD)
- rate: taxa do ativo
- invested_amount: valor aplicado/investido

CLASSIFICAÇÃO:
- FIIs (termina em 11, ex: HGLG11) → "Renda Variável" / "Fundos Imobiliário"
- ETFs (BOVA11, IVVB11) → "Renda Variável" / "ETF"
- BDRs (termina em 31, 34, 35) → "Renda Variável" / "BDR"
- Ações (PETR4, VALE3) → "Renda Variável" / "Ações"
- COE (XP MAP TREND, etc) → "COE" / null

IMPORTANTE:
- Para FIIs e Ações, ticker NUNCA deve conter espaços
- Para Renda Fixa e COE, quantity deve ser SEMPRE 1
- USE EXATAMENTE os valores de asset_class e sub_class especificados`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia todos os ativos deste relatório financeiro:\n\n${pdfContent}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_portfolio_assets",
              description: "Extrai os ativos do portfólio do relatório",
              parameters: {
                type: "object",
                properties: {
                  assets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ticker: { type: "string" },
                        asset_name: { type: "string" },
                        asset_class: { 
                          type: "string",
                          enum: ["Renda Variável", "Renda Fixa", "Fundos de Investimento", "COE", "Previdência"]
                        },
                        sub_class: { 
                          type: "string",
                          nullable: true
                        },
                        quantity: { type: "number" },
                        average_price: { type: "number" },
                        current_price: { type: "number" },
                        currency: { type: "string" },
                        broker: { type: "string" },
                        sector: { type: "string" },
                        application_date: { type: "string" },
                        maturity_date: { type: "string" },
                        rate: { type: "string" },
                        invested_amount: { type: "number" }
                      },
                      required: ["ticker", "asset_name", "asset_class", "quantity", "average_price", "current_price"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["assets"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_portfolio_assets" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    let assets = extractedData.assets || [];

    // Normalize sub_class values to match database constraints
    const subClassMap: Record<string, Record<string, string | null>> = {
      "Renda Variável": {
        "Ações": "Ações", "Acoes": "Ações", "Fundos Imobiliário": "Fundos Imobiliário", 
        "Fundos Imobiliarios": "Fundos Imobiliário", "FII": "Fundos Imobiliário",
        "ETF": "ETF", "BDR": "BDR", "Derivativos": "Derivativos"
      },
      "Renda Fixa": {
        "Pós": "Pós", "Pos": "Pós", "Pré": "Pré", "Pre": "Pré", "Inflação": "Inflação",
        "Inflacao": "Inflação", "CDB": "CDB", "LCI": "LCI", "LCA": "LCA",
        "Debêntures": "Debêntures", "Debentures": "Debêntures", "CRA": "Debêntures",
        "CRI": "Debêntures", "Tesouro Direto": "Tesouro Direto", "NTN-B": "Tesouro Direto"
      },
      "Fundos de Investimento": {
        "Renda Fixa": "Renda Fixa", "Multimercado": "Multimercado", "Ações": "Ações",
        "Acoes": "Ações", "FIDC": "FIDC", "FIDIC": "FIDC", "Alternativos": "Alternativos",
        "FIAGRO": "FIAGRO", "FIP": "FIP", "Internacionais": "Alternativos"
      },
      "Previdência": {
        "Renda Fixa": "Renda Fixa", "Multimercado": "Multimercado", "Ações": "Ações"
      },
      "COE": {
        "Estruturado": "Estruturado", "Proteção": "Proteção", "Protecao": "Proteção",
        "Alavancado": "Alavancado", "Bidirecional": null, "Capital Protegido": "Proteção"
      }
    };

    assets = assets.map((asset: any) => {
      const assetClass = asset.asset_class;
      const subClass = asset.sub_class;
      
      // Normalize sub_class based on asset_class
      if (subClassMap[assetClass] && subClass) {
        asset.sub_class = subClassMap[assetClass][subClass] ?? null;
      } else if (assetClass === "COE") {
        asset.sub_class = null;
      }
      
      // CRITICAL: Fix value extraction for assets where PDF shows total position value
      // For COE and Renda Fixa: quantity should be 1, current_price is the total value
      if (assetClass === "COE" || assetClass === "Renda Fixa") {
        // Use the actual position value (current_price from AI) as the total
        const positionValue = asset.current_price || asset.invested_amount || 0;
        const investedValue = asset.invested_amount || asset.average_price || positionValue;
        
        console.log(`${assetClass} normalization: ${asset.ticker}, positionValue=${positionValue}, investedValue=${investedValue}`);
        
        asset.quantity = 1;
        asset.current_price = positionValue;
        asset.average_price = investedValue;
        asset.invested_amount = investedValue;
      }
      
      // For Fundos de Investimento: ensure average_price is per-unit, not total
      if (assetClass === "Fundos de Investimento") {
        if (asset.quantity > 0 && asset.current_price > 0) {
          // If average_price is absurdly higher than current_price (100x+), it's likely the total invested amount
          if (asset.average_price > asset.current_price * 100) {
            console.log(`Fund avg_price fix: ${asset.ticker}, avg=${asset.average_price}, cur=${asset.current_price}, qty=${asset.quantity}`);
            // average_price was set to invested_amount instead of per-unit cost
            if (asset.invested_amount && asset.invested_amount > 0) {
              asset.average_price = asset.invested_amount / asset.quantity;
            } else {
              asset.average_price = asset.current_price;
            }
            console.log(`  -> Fixed avg_price to ${asset.average_price}`);
          }
          // Also ensure invested_amount is the total, not per-unit
          if (!asset.invested_amount || asset.invested_amount <= 0) {
            asset.invested_amount = asset.average_price * asset.quantity;
          }
        }
      }
      
      // General sanity check: if average_price > current_price * 100, likely a parsing error
      if (asset.quantity > 0 && asset.current_price > 0 && asset.average_price > asset.current_price * 100) {
        console.log(`Sanity fix: ${asset.ticker}, avg=${asset.average_price} >> cur=${asset.current_price}`);
        if (asset.invested_amount && asset.invested_amount > 0 && asset.quantity > 0) {
          asset.average_price = asset.invested_amount / asset.quantity;
        } else {
          asset.average_price = asset.current_price;
        }
      }
      
      return asset;
    });

    console.log(`Extracted ${assets.length} assets`);

    return new Response(JSON.stringify({ 
      success: true,
      assets,
      count: assets.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in parse-portfolio-pdf:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro ao processar PDF",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
