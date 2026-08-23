import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get advisor ID from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const advisorId = userData.user.id;
    console.log("Generating alerts for advisor:", advisorId);

    // Fetch advisor's clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, portfolio_value, last_portfolio_update, risk_profile, status")
      .eq("advisor_id", advisorId);

    if (clientsError) throw clientsError;

    // Fetch assets for all clients
    const clientIds = clients?.map(c => c.id) || [];
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("client_id, asset_class, sub_class, current_price, average_price, quantity, invested_amount")
      .in("client_id", clientIds);

    if (assetsError) throw assetsError;

    // Fetch goals for all clients
    const { data: goals, error: goalsError } = await supabase
      .from("financial_goals")
      .select("client_id, title, target_amount, current_amount, deadline, status")
      .in("client_id", clientIds);

    if (goalsError) throw goalsError;

    // Calculate portfolio concentrations and issues
    const clientAnalysis = clients?.map(client => {
      const clientAssets = assets?.filter(a => a.client_id === client.id) || [];
      const clientGoals = goals?.filter(g => g.client_id === client.id) || [];

      // Calculate total portfolio value
      const totalValue = clientAssets.reduce((sum, asset) => {
        const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                             asset.invested_amount && Number(asset.invested_amount) > 0;
        const value = usesInvested 
          ? Number(asset.current_price) 
          : Number(asset.current_price) * Number(asset.quantity);
        return sum + value;
      }, 0);

      // Calculate allocation by class
      const allocationByClass = clientAssets.reduce((acc, asset) => {
        const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                             asset.invested_amount && Number(asset.invested_amount) > 0;
        const value = usesInvested 
          ? Number(asset.current_price) 
          : Number(asset.current_price) * Number(asset.quantity);
        acc[asset.asset_class] = (acc[asset.asset_class] || 0) + value;
        return acc;
      }, {} as Record<string, number>);

      const allocations = Object.entries(allocationByClass).map(([name, value]) => ({
        name,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }));

      // Days since last update
      const daysSinceUpdate = client.last_portfolio_update 
        ? Math.floor((Date.now() - new Date(client.last_portfolio_update).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Goals at risk
      const goalsAtRisk = clientGoals.filter(g => {
        if (g.status !== 'in_progress' || !g.deadline) return false;
        const daysToDeadline = Math.floor((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const progress = g.target_amount > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0;
        return daysToDeadline < 90 && progress < 70; // Less than 70% with 90 days to go
      });

      return {
        client_name: client.name,
        client_id: client.id,
        risk_profile: client.risk_profile,
        status: client.status,
        total_value: totalValue,
        portfolio_value_reported: client.portfolio_value,
        days_since_update: daysSinceUpdate,
        allocation: allocations,
        goals_at_risk: goalsAtRisk.length,
        total_assets: clientAssets.length,
      };
    }) || [];

    // Use Lovable AI to generate intelligent alerts
    if (lovableApiKey) {
      const prompt = `Analise os dados de clientes de um assessor financeiro e gere alertas inteligentes e acionáveis em português brasileiro.

Dados dos clientes:
${JSON.stringify(clientAnalysis, null, 2)}

Critérios importantes:
- Clientes sem atualização há mais de 30 dias merecem atenção
- Concentração acima de 40% em uma única classe de ativo indica risco
- Metas em risco (menos de 70% de progresso com 90 dias para prazo) precisam de ação
- Clientes com status "inactive" devem ser priorizados
- Carteiras com menos de 5 ativos podem estar mal diversificadas

Gere 3-5 alertas práticos e específicos, ordenados por prioridade (alto a baixo). Para cada alerta inclua:
- Título curto e direto
- Descrição clara do problema e impacto
- Ação recomendada específica
- Nome do cliente afetado
- Nível de prioridade (high, medium, low)`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Você é um assistente financeiro especializado em análise de carteiras e gestão de relacionamento com clientes. Seja objetivo, técnico e prático nas recomendações.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_alerts",
                description: "Gera alertas estruturados para o assessor",
                parameters: {
                  type: "object",
                  properties: {
                    alerts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          action: { type: "string" },
                          client_id: { type: "string" },
                          client_name: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                        },
                        required: ["title", "description", "action", "client_id", "client_name", "priority"],
                      },
                    },
                  },
                  required: ["alerts"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_alerts" } },
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          console.error("Rate limit exceeded");
          return new Response(
            JSON.stringify({ 
              error: "Rate limit exceeded", 
              fallback_alerts: generateFallbackAlerts(clientAnalysis) 
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          console.error("Payment required");
          return new Response(
            JSON.stringify({ 
              error: "Payment required", 
              fallback_alerts: generateFallbackAlerts(clientAnalysis) 
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log("AI Response:", JSON.stringify(aiData, null, 2));

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsedArgs = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ 
            alerts: parsedArgs.alerts,
            client_summary: clientAnalysis,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: Generate alerts without AI
    const fallbackAlerts = generateFallbackAlerts(clientAnalysis);
    return new Response(
      JSON.stringify({ 
        alerts: fallbackAlerts,
        client_summary: clientAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in advisor-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackAlerts(clientAnalysis: any[]): any[] {
  const alerts: any[] = [];

  clientAnalysis.forEach(client => {
    // Alert for outdated portfolios
    if (client.days_since_update > 30) {
      alerts.push({
        title: `Portfólio desatualizado: ${client.client_name}`,
        description: `Há ${client.days_since_update} dias sem atualização de posições`,
        action: "Solicitar posição atualizada e agendar reunião",
        client_id: client.client_id,
        client_name: client.client_name,
        priority: client.days_since_update > 60 ? "high" : "medium",
      });
    }

    // Alert for concentration risk
    const maxConcentration = Math.max(...client.allocation.map((a: any) => a.percentage));
    if (maxConcentration > 40) {
      const concentratedClass = client.allocation.find((a: any) => a.percentage === maxConcentration);
      alerts.push({
        title: `Concentração alta: ${client.client_name}`,
        description: `${maxConcentration.toFixed(1)}% em ${concentratedClass.name}. Risco elevado de volatilidade.`,
        action: "Propor rebalanceamento para diversificar exposição",
        client_id: client.client_id,
        client_name: client.client_name,
        priority: maxConcentration > 60 ? "high" : "medium",
      });
    }

    // Alert for goals at risk
    if (client.goals_at_risk > 0) {
      alerts.push({
        title: `Metas em risco: ${client.client_name}`,
        description: `${client.goals_at_risk} meta(s) com progresso abaixo do esperado`,
        action: "Revisar estratégia de aportes e projeções",
        client_id: client.client_id,
        client_name: client.client_name,
        priority: "high",
      });
    }

    // Alert for low diversification
    if (client.total_assets < 5 && client.total_value > 50000) {
      alerts.push({
        title: `Baixa diversificação: ${client.client_name}`,
        description: `Apenas ${client.total_assets} ativo(s) em carteira de R$ ${(client.total_value / 1000).toFixed(0)}k`,
        action: "Sugerir ampliação da diversificação",
        client_id: client.client_id,
        client_name: client.client_name,
        priority: "low",
      });
    }

    // Alert for inactive clients
    if (client.status === "inactive" && client.total_value > 0) {
      alerts.push({
        title: `Cliente inativo com patrimônio: ${client.client_name}`,
        description: `Cliente marcado como inativo possui R$ ${(client.total_value / 1000).toFixed(0)}k em carteira`,
        action: "Reavaliar status e reativar relacionamento",
        client_id: client.client_id,
        client_name: client.client_name,
        priority: "medium",
      });
    }
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

  return alerts.slice(0, 8); // Return top 8 alerts
}