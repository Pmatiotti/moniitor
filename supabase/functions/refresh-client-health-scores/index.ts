import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClientRow = {
  id: string;
  advisor_id: string | null;
  name: string | null;
  portfolio_value: number | null;
  risk_profile: string | null;
  investment_objectives: string | null;
  monthly_income: number | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Backend keys not configured" });
    }
    if (!lovableKey) {
      return json(500, { error: "LOVABLE_API_KEY not configured" });
    }

    // Hard-guard: only allow calls signed with the service role key.
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return json(401, { error: "Unauthorized" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => ({}))) as {
      maxClients?: number;
      delayMs?: number;
    };

    const maxClients = Math.max(1, Math.min(Number(body.maxClients ?? 50), 200));
    const delayMs = Math.max(0, Math.min(Number(body.delayMs ?? 400), 2000));

    console.log(`[refresh-client-health-scores] start maxClients=${maxClients} delayMs=${delayMs}`);

    // Fetch a pool of clients. We'll filter down to only those that changed.
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select(
        "id, advisor_id, name, portfolio_value, risk_profile, investment_objectives, monthly_income, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(maxClients);

    if (clientsError) {
      console.error("[refresh-client-health-scores] clientsError", clientsError);
      return json(500, { error: "Failed to load clients", details: clientsError.message });
    }

    const results = {
      scanned: clients?.length || 0,
      recalculated: 0,
      skipped_fresh: 0,
      errors: [] as { client_id: string; error: string; status?: number }[],
      stopped_reason: null as null | "rate_limit" | "payment_required" | "unknown",
    };

    for (const c of (clients as any as ClientRow[]) || []) {
      try {
        if (!c?.id || !c.advisor_id) {
          results.skipped_fresh += 1;
          continue;
        }

        // Last score time
        const { data: lastScore } = await supabase
          .from("client_health_scores")
          .select("created_at")
          .eq("client_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastScoreAt = lastScore?.created_at ? new Date(lastScore.created_at) : null;

        // Latest asset update
        const { data: lastAsset } = await supabase
          .from("assets")
          .select("updated_at")
          .eq("client_id", c.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Latest interaction
        const { data: lastInteraction } = await supabase
          .from("interactions")
          .select("interaction_date")
          .eq("client_id", c.id)
          .order("interaction_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const latestSignal = [
          lastAsset?.updated_at ? new Date(lastAsset.updated_at) : null,
          lastInteraction?.interaction_date ? new Date(lastInteraction.interaction_date) : null,
        ]
          .filter(Boolean)
          .reduce<Date | null>((max, d) => (!max || (d as Date) > max ? (d as Date) : max), null);

        const isFresh = lastScoreAt ? (latestSignal ? lastScoreAt >= latestSignal : true) : false;
        if (isFresh) {
          results.skipped_fresh += 1;
          continue;
        }

        // Load full context similar to client-insights
        const { data: assets } = await supabase
          .from("assets")
          .select("*")
          .eq("client_id", c.id);

        const { data: pluggyAccounts } = await supabase
          .from("pluggy_accounts")
          .select("*")
          .eq("user_id", c.id);

        const { data: pluggyInvestments } = await supabase
          .from("pluggy_investments")
          .select("*")
          .eq("user_id", c.id);

        const { data: goals } = await supabase
          .from("financial_goals")
          .select("*")
          .eq("user_id", c.id);

        const { data: interactions } = await supabase
          .from("interactions")
          .select("*")
          .eq("client_id", c.id)
          .order("interaction_date", { ascending: false })
          .limit(10);

        const portfolioValue = c.portfolio_value || 0;
        const assetClasses = new Set((assets || []).map((a: any) => a.asset_class).filter(Boolean));
        const diversificationScore = Math.min(100, (assetClasses.size / 5) * 100);
        const topAssetPercentage = assets && assets.length > 0
          ? Math.max(
              ...assets.map(
                (a: any) =>
                  ((Number(a.quantity) * (Number(a.current_price) || Number(a.average_price) || 0)) /
                    (Number(portfolioValue) || 1)) *
                  100
              )
            )
          : 0;
        const concentrationRisk = topAssetPercentage > 20 ? "alta" : topAssetPercentage > 10 ? "média" : "baixa";
        const lastInteractionRow = interactions?.[0];
        const daysSinceLastContact = lastInteractionRow
          ? Math.floor(
              (Date.now() - new Date(lastInteractionRow.interaction_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 999;

        const systemPrompt = `Você é um assessor de investimentos especializado em análise de carteiras.
Analise os dados do cliente e forneça insights acionáveis e recomendações práticas.
Seja objetivo, direto e focado em ações concretas que o assessor pode tomar.`;

        const userPrompt = `Analise o seguinte cliente:

DADOS DO CLIENTE:
- Nome: ${c.name || "(Sem nome)"}
- Perfil de Risco: ${c.risk_profile || "Não definido"}
- Patrimônio Total: R$ ${Number(portfolioValue).toLocaleString("pt-BR")}
- Número de Ativos: ${(assets || []).length}
- Objetivos: ${c.investment_objectives || "Não definidos"}
- Renda Mensal: R$ ${(c.monthly_income || 0).toLocaleString("pt-BR")}

PORTFÓLIO:
- Classes de Ativos: ${Array.from(assetClasses).join(", ") || "Nenhuma"}
- Score de Diversificação: ${diversificationScore.toFixed(0)}/100
- Concentração: ${concentrationRisk} (maior posição: ${topAssetPercentage.toFixed(1)}%)

OPEN FINANCE (se existir):
- Contas: ${(pluggyAccounts || []).length}
- Investimentos: ${(pluggyInvestments || []).length}

METAS:
- ${(goals || []).length} metas financeiras definidas

ENGAJAMENTO:
- Última interação: há ${daysSinceLastContact} dias
- Total de interações: ${(interactions || []).length} (últimos registros)

Forneça:
1. SCORE DE SAÚDE GERAL (0-100): um número único baseado na análise completa
2. INSIGHTS PRINCIPAIS: 3-5 observações críticas sobre a situação atual
3. RECOMENDAÇÕES: 3-5 ações concretas que o assessor deve tomar
4. PRÓXIMOS PASSOS: 2-3 ações imediatas prioritárias

Seja específico e acionável. Foque no que realmente importa.`;

        console.log(`[refresh-client-health-scores] AI call client=${c.id}`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
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
                      overall_score: { type: "integer" },
                      portfolio_health: { type: "integer" },
                      engagement_score: { type: "integer" },
                      risk_alignment: { type: "integer" },
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
            tool_choice: { type: "function", function: { name: "analyze_client" } },
          }),
        });

        if (!aiResponse.ok) {
          const t = await aiResponse.text();
          console.error(`[refresh-client-health-scores] AI error ${aiResponse.status}`, t);
          if (aiResponse.status === 429) {
            results.stopped_reason = "rate_limit";
            break;
          }
          if (aiResponse.status === 402) {
            results.stopped_reason = "payment_required";
            break;
          }
          results.errors.push({ client_id: c.id, error: `AI error ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          results.errors.push({ client_id: c.id, error: "No tool_call" });
          continue;
        }

        const analysis = JSON.parse(toolCall.function.arguments);

        await supabase.from("client_health_scores").insert({
          client_id: c.id,
          advisor_id: c.advisor_id,
          overall_score: analysis.overall_score,
          portfolio_health: analysis.portfolio_health || null,
          engagement_score: analysis.engagement_score || null,
          risk_alignment: analysis.risk_alignment || null,
          diversification_score: Math.round(diversificationScore),
          insights: analysis.insights || [],
          recommendations: analysis.recommendations || [],
        });

        if (analysis.next_actions && analysis.next_actions.length > 0) {
          const actions = analysis.next_actions.map((action: any) => ({
            client_id: c.id,
            advisor_id: c.advisor_id,
            action_type: action.action_type || "follow_up",
            title: action.title,
            priority: action.priority || "medium",
            status: "pending",
            due_date: action.due_days
              ? new Date(Date.now() + action.due_days * 24 * 60 * 60 * 1000).toISOString()
              : null,
          }));
          await supabase.from("client_actions").insert(actions);
        }

        results.recalculated += 1;

        if (delayMs) await sleep(delayMs);
      } catch (e) {
        console.error("[refresh-client-health-scores] client error", c?.id, e);
        results.errors.push({
          client_id: c?.id || "unknown",
          error: e instanceof Error ? e.message : "unknown",
        });
        results.stopped_reason = results.stopped_reason || "unknown";
      }
    }

    console.log("[refresh-client-health-scores] done", results);
    return json(200, { success: true, results });
  } catch (e) {
    console.error("[refresh-client-health-scores] fatal", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
