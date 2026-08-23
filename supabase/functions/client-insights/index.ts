import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const toIso = (d: string | Date) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

  const computeStaleness = async (supabaseClient: any, clientId: string) => {
    // Last score time
    const { data: lastScore } = await supabaseClient
      .from("client_health_scores")
      .select("created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastScoreAt = lastScore?.created_at ? new Date(lastScore.created_at) : null;
    if (!lastScoreAt) return { isFresh: false, lastScoreAt: null as Date | null };

    // Latest asset update
    const { data: lastAsset } = await supabaseClient
      .from("assets")
      .select("updated_at")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Latest interaction
    const { data: lastInteraction } = await supabaseClient
      .from("interactions")
      .select("interaction_date")
      .eq("client_id", clientId)
      .order("interaction_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestSignal = [
      lastAsset?.updated_at ? new Date(lastAsset.updated_at) : null,
      lastInteraction?.interaction_date ? new Date(lastInteraction.interaction_date) : null,
    ]
      .filter(Boolean)
      .reduce<Date | null>((max, d) => (!max || (d as Date) > max ? (d as Date) : max), null);

    const isFresh = latestSignal ? lastScoreAt >= latestSignal : true;
    return { isFresh, lastScoreAt };
  };

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Não autenticado");
    }

    const { clientId } = await req.json();

    if (!clientId) {
      throw new Error("clientId é obrigatório");
    }

    console.log(`[client-insights] Analisando cliente ${clientId}`);

    // Cache-aware: if nothing changed since last score, return cached score without calling AI
    const { isFresh, lastScoreAt } = await computeStaleness(supabaseClient, clientId);
    if (isFresh) {
      const { data: cachedScore } = await supabaseClient
        .from("client_health_scores")
        .select(
          "overall_score, portfolio_health, engagement_score, risk_alignment, diversification_score, insights, recommendations, created_at"
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedScore) {
        console.log(`[client-insights] Cache hit (no changes). lastScoreAt=${cachedScore.created_at}`);
        return json(200, {
          success: true,
          cached: true,
          last_score_at: cachedScore.created_at,
          analysis: {
            overall_score: cachedScore.overall_score,
            portfolio_health: cachedScore.portfolio_health,
            engagement_score: cachedScore.engagement_score,
            risk_alignment: cachedScore.risk_alignment,
            diversification_score: cachedScore.diversification_score,
            insights: cachedScore.insights || [],
            recommendations: cachedScore.recommendations || [],
          },
        });
      }
    }

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      throw new Error("Cliente não encontrado");
    }

    // Buscar assets do cliente
    const { data: assets, error: assetsError } = await supabaseClient
      .from("assets")
      .select("*")
      .eq("client_id", clientId);

    if (assetsError) {
      console.error("Erro ao buscar assets:", assetsError);
    }

    // Buscar dados de Open Finance (Pluggy)
    const { data: pluggyAccounts } = await supabaseClient
      .from("pluggy_accounts")
      .select("*")
      .eq("user_id", clientId);

    const { data: pluggyInvestments } = await supabaseClient
      .from("pluggy_investments")
      .select("*")
      .eq("user_id", clientId);

    // Buscar metas
    const { data: goals } = await supabaseClient
      .from("financial_goals")
      .select("*")
      .eq("user_id", clientId);

    // Buscar interações recentes
    const { data: interactions } = await supabaseClient
      .from("interactions")
      .select("*")
      .eq("client_id", clientId)
      .order("interaction_date", { ascending: false })
      .limit(10);

    // Preparar contexto para IA
    const portfolioValue = client.portfolio_value || 0;
    const numAssets = assets?.length || 0;
    const numGoals = goals?.length || 0;
    const lastInteraction = interactions?.[0];
    const daysSinceLastContact = lastInteraction
      ? Math.floor(
          (Date.now() - new Date(lastInteraction.interaction_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999;

    // Calcular diversificação
    const assetClasses = new Set(assets?.map((a) => a.asset_class) || []);
    const diversificationScore = Math.min(
      100,
      (assetClasses.size / 5) * 100
    ); // 5 classes = 100%

    // Calcular concentração
    const topAssetPercentage = assets && assets.length > 0
      ? Math.max(
          ...assets.map(
            (a) =>
              ((a.quantity * (a.current_price || a.average_price)) /
                portfolioValue) *
              100
          )
        )
      : 0;

    const concentrationRisk = topAssetPercentage > 20 ? "alta" : topAssetPercentage > 10 ? "média" : "baixa";

    // Preparar prompt para IA
    const systemPrompt = `Você é um assessor de investimentos especializado em análise de carteiras.
Analise os dados do cliente e forneça insights acionáveis e recomendações práticas.
Seja objetivo, direto e focado em ações concretas que o assessor pode tomar.`;

    const userPrompt = `Analise o seguinte cliente:

DADOS DO CLIENTE:
- Nome: ${client.name}
- Perfil de Risco: ${client.risk_profile || "Não definido"}
- Patrimônio Total: R$ ${portfolioValue.toLocaleString("pt-BR")}
- Número de Ativos: ${numAssets}
- Objetivos: ${client.investment_objectives || "Não definidos"}
- Renda Mensal: R$ ${(client.monthly_income || 0).toLocaleString("pt-BR")}

PORTFÓLIO:
- Classes de Ativos: ${Array.from(assetClasses).join(", ") || "Nenhuma"}
- Score de Diversificação: ${diversificationScore.toFixed(0)}/100
- Concentração: ${concentrationRisk} (maior posição: ${topAssetPercentage.toFixed(1)}%)

METAS:
- ${numGoals} metas financeiras definidas

ENGAJAMENTO:
- Última interação: há ${daysSinceLastContact} dias
- Total de interações: ${interactions?.length || 0} (últimos registros)

Forneça:
1. SCORE DE SAÚDE GERAL (0-100): um número único baseado na análise completa
2. INSIGHTS PRINCIPAIS: 3-5 observações críticas sobre a situação atual
3. RECOMENDAÇÕES: 3-5 ações concretas que o assessor deve tomar
4. PRÓXIMOS PASSOS: 2-3 ações imediatas prioritárias

Seja específico e acionável. Foque no que realmente importa.`;

    console.log("[client-insights] Chamando Lovable AI...");

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_client",
                description: "Análise completa do cliente com insights e recomendações",
                parameters: {
                  type: "object",
                  properties: {
                    overall_score: {
                      type: "integer",
                      description: "Score geral de saúde (0-100)",
                    },
                    portfolio_health: {
                      type: "integer",
                      description: "Saúde do portfólio (0-100)",
                    },
                    engagement_score: {
                      type: "integer",
                      description: "Nível de engajamento (0-100)",
                    },
                    risk_alignment: {
                      type: "integer",
                      description: "Alinhamento com perfil (0-100)",
                    },
                    insights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string" },
                          message: { type: "string" },
                          severity: { type: "string" },
                        },
                      },
                    },
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          action: { type: "string" },
                          priority: { type: "string" },
                          reason: { type: "string" },
                        },
                      },
                    },
                    next_actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          action_type: { type: "string" },
                          priority: { type: "string" },
                          due_days: { type: "integer" },
                        },
                      },
                    },
                  },
                  required: ["overall_score", "insights", "recommendations"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "analyze_client" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[client-insights] Erro na API:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("rate_limit");
      }
      if (aiResponse.status === 402) {
        throw new Error("payment_required");
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("[client-insights] Resposta recebida");

    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("Resposta da IA não contém análise estruturada");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Salvar health score no banco
    const { error: scoreError } = await supabaseClient
      .from("client_health_scores")
      .insert({
        client_id: clientId,
        advisor_id: user.id,
        overall_score: analysis.overall_score,
        portfolio_health: analysis.portfolio_health || null,
        engagement_score: analysis.engagement_score || null,
        risk_alignment: analysis.risk_alignment || null,
        diversification_score: Math.round(diversificationScore),
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
      });

    if (scoreError) {
      console.error("Erro ao salvar score:", scoreError);
    }

    // Criar ações automáticas
    if (analysis.next_actions && analysis.next_actions.length > 0) {
      const actions = analysis.next_actions.map((action: any) => ({
        client_id: clientId,
        advisor_id: user.id,
        action_type: action.action_type || "follow_up",
        title: action.title,
        priority: action.priority || "medium",
        status: "pending",
        due_date: action.due_days
          ? new Date(Date.now() + action.due_days * 24 * 60 * 60 * 1000).toISOString()
          : null,
      }));

      const { error: actionsError } = await supabaseClient
        .from("client_actions")
        .insert(actions);

      if (actionsError) {
        console.error("Erro ao criar ações:", actionsError);
      }
    }

    return json(200, {
      success: true,
      cached: false,
      analyzed_at: toIso(new Date()),
      previous_score_at: lastScoreAt ? toIso(lastScoreAt) : null,
      analysis,
    });
  } catch (error: any) {
    console.error("[client-insights] Erro:", error);
    
    const status = error.message === "rate_limit" ? 429 
      : error.message === "payment_required" ? 402 
      : 500;
    
    return json(status, {
      error: error.message,
      details: error.toString(),
    });
  }
});
