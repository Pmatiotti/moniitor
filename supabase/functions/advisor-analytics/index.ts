import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
  portfolio_value?: number | null;
  risk_profile?: string | null;
  onboarding_date?: string | null;
  user_id?: string | null;
  contact_frequency?: string | null;
}

// Mapeamento de frequência para dias
const frequencyDays: Record<string, number> = {
  semanal: 7,
  quinzenal: 15,
  mensal: 30,
  bimestral: 60,
  trimestral: 90,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Não autenticado");
    }

    console.log(`[advisor-analytics] Calculando métricas para ${user.id}`);

    // Buscar clientes manuais (criados pelo assessor)
    const { data: manualClients, error: clientsError } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("advisor_id", user.id);

    if (clientsError) {
      throw clientsError;
    }

    // Buscar clientes vinculados via client_advisor_links
    const { data: linkedLinks, error: linksError } = await supabaseClient
      .from("client_advisor_links")
      .select("client_id, status")
      .eq("advisor_id", user.id)
      .eq("status", "active");

    if (linksError) {
      console.error("[advisor-analytics] Erro ao buscar links:", linksError);
    }

    // Criar set de user_ids dos clientes manuais para evitar duplicatas
    const manualUserIds = new Set(
      (manualClients || []).filter((c) => c.user_id).map((c) => c.user_id)
    );

    // Filtrar links que não estão nos clientes manuais
    const newLinkedIds = (linkedLinks || [])
      .filter((link) => !manualUserIds.has(link.client_id))
      .map((link) => link.client_id);

    console.log(`[advisor-analytics] Clientes manuais: ${manualClients?.length || 0}, Novos vinculados: ${newLinkedIds.length}`);

    // Buscar dados dos clientes vinculados
    let linkedClients: ClientData[] = [];
    if (newLinkedIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", newLinkedIds);

      if (profilesError) {
        console.error("[advisor-analytics] Erro ao buscar profiles:", profilesError);
      }

      for (const profile of profiles || []) {
        // Calcular portfolio_value a partir dos assets
        const { data: assets, error: assetsError } = await supabaseClient
          .from("assets")
          .select("quantity, current_price, average_price, currency")
          .eq("user_id", profile.id);

        if (assetsError) {
          console.error(`[advisor-analytics] Erro ao buscar assets do cliente ${profile.id}:`, assetsError);
        }

        // Buscar cotação USD/BRL para conversão
        let usdToBrl = 5.0;
        try {
          const response = await fetch(
            "https://query1.finance.yahoo.com/v8/finance/chart/USDBRL=X?interval=1d&range=1d"
          );
          const data = await response.json();
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price) usdToBrl = price;
        } catch (e) {
          console.log("[advisor-analytics] Usando cotação USD padrão");
        }

        const portfolioValue = (assets || []).reduce((sum, a) => {
          const price = Number(a.current_price) || Number(a.average_price) || 0;
          let value = price * (Number(a.quantity) || 0);
          if (a.currency === "USD") {
            value *= usdToBrl;
          }
          return sum + value;
        }, 0);

        linkedClients.push({
          id: profile.id,
          name: profile.full_name || profile.email?.split("@")[0] || "Cliente",
          email: profile.email,
          status: "active",
          portfolio_value: portfolioValue,
          risk_profile: null,
          onboarding_date: null,
          user_id: profile.id,
        });
      }
    }

    // Combinar clientes manuais + vinculados
    const allClients: ClientData[] = [...(manualClients || []), ...linkedClients];

    console.log(`[advisor-analytics] Total de clientes combinados: ${allClients.length}`);

    // Buscar ações pendentes
    const { data: pendingActions, error: actionsError } = await supabaseClient
      .from("client_actions")
      .select("*")
      .eq("advisor_id", user.id)
      .eq("status", "pending")
      .not("due_date", "is", null);

    if (actionsError) {
      throw actionsError;
    }

    // Buscar interações do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const { data: recentInteractions, error: interactionsError } =
      await supabaseClient
        .from("interactions")
        .select("*")
        .eq("advisor_id", user.id)
        .gte("interaction_date", lastMonth.toISOString());

    if (interactionsError) {
      throw interactionsError;
    }

    // Buscar health scores mais recentes
    const { data: healthScores, error: scoresError } = await supabaseClient
      .from("client_health_scores")
      .select("*")
      .eq("advisor_id", user.id)
      .order("created_at", { ascending: false });

    if (scoresError) {
      throw scoresError;
    }

    // Calcular métricas usando allClients
    const totalClients = allClients.length;
    const activeClients = allClients.filter((c) => c.status === "active").length;
    const newClients = allClients.filter((c) => {
      if (!c.onboarding_date) return false;
      const onboardingDate = new Date(c.onboarding_date);
      return onboardingDate >= lastMonth;
    }).length;

    const totalAUM = allClients.reduce(
      (sum, c) => sum + Number(c.portfolio_value || 0),
      0
    );
    const avgPortfolioSize = totalClients > 0 ? totalAUM / totalClients : 0;

    // Ações pendentes
    const totalPendingActions = pendingActions?.length || 0;
    const overdueActions =
      pendingActions?.filter(
        (a) => a.due_date && new Date(a.due_date) < new Date()
      ).length || 0;
    const highPriorityActions =
      pendingActions?.filter((a) => a.priority === "high").length || 0;

    // Atividade e engajamento
    const totalInteractions = recentInteractions?.length || 0;
    const avgInteractionsPerClient =
      totalClients > 0 ? totalInteractions / totalClients : 0;

    // Clientes por tipo de interação
    const interactionsByType =
      recentInteractions?.reduce((acc, interaction) => {
        const type = interaction.interaction_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Saúde média da carteira
    const clientHealthMap = new Map();
    healthScores?.forEach((score) => {
      if (!clientHealthMap.has(score.client_id)) {
        clientHealthMap.set(score.client_id, score);
      }
    });

    const avgHealthScore =
      clientHealthMap.size > 0
        ? Array.from(clientHealthMap.values()).reduce(
            (sum, s) => sum + s.overall_score,
            0
          ) / clientHealthMap.size
        : 0;

    // Clientes por nível de saúde
    const healthDistribution = {
      excellent: 0,
      good: 0,
      attention: 0,
      critical: 0,
    };

    clientHealthMap.forEach((score) => {
      if (score.overall_score >= 80) healthDistribution.excellent++;
      else if (score.overall_score >= 60) healthDistribution.good++;
      else if (score.overall_score >= 40) healthDistribution.attention++;
      else healthDistribution.critical++;
    });

    // Top 5 clientes por patrimônio
    const topClients = allClients
      .sort((a, b) => Number(b.portfolio_value || 0) - Number(a.portfolio_value || 0))
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        portfolio_value: c.portfolio_value,
        risk_profile: c.risk_profile,
      }));

    // Clientes que precisam de atenção
    const clientsNeedingAttention = [];

    // 1. Clientes com contato atrasado baseado na régua individual
    for (const client of allClients) {
      const clientIdForInteraction = client.user_id || client.id;
      const { data: lastInteraction } = await supabaseClient
        .from("interactions")
        .select("interaction_date")
        .eq("client_id", clientIdForInteraction)
        .order("interaction_date", { ascending: false })
        .limit(1)
        .single();

      // Se não tem interação, não gera alerta (assumimos que cadastro criou interação inicial)
      if (!lastInteraction) continue;

      // Usar frequência do cliente ou padrão de 30 dias
      const clientFrequency = client.contact_frequency || "mensal";
      const maxDays = frequencyDays[clientFrequency] || 30;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - maxDays);

      if (new Date(lastInteraction.interaction_date) < thresholdDate) {
        const daysSinceContact = Math.floor(
          (Date.now() - new Date(lastInteraction.interaction_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        
        clientsNeedingAttention.push({
          client_id: client.id,
          client_name: client.name,
          reason: `Prazo de contato ${clientFrequency} excedido`,
          days_since_contact: daysSinceContact,
        });
      }
    }

    // 2. Clientes com health score baixo
    clientHealthMap.forEach((score, clientId) => {
      if (score.overall_score < 60) {
        const client = allClients.find((c) => c.id === clientId);
        clientsNeedingAttention.push({
          client_id: clientId,
          client_name: client?.name || "Desconhecido",
          reason: `Score de saúde baixo (${score.overall_score})`,
          health_score: score.overall_score,
        });
      }
    });

    const analytics = {
      summary: {
        total_clients: totalClients,
        active_clients: activeClients,
        new_clients_last_month: newClients,
        total_aum: totalAUM,
        avg_portfolio_size: avgPortfolioSize,
      },
      tasks: {
        total_pending: totalPendingActions,
        overdue: overdueActions,
        high_priority: highPriorityActions,
      },
      engagement: {
        interactions_last_month: totalInteractions,
        avg_interactions_per_client: avgInteractionsPerClient,
        interactions_by_type: interactionsByType,
      },
      portfolio_health: {
        avg_score: avgHealthScore,
        distribution: healthDistribution,
      },
      top_clients: topClients,
      needs_attention: clientsNeedingAttention.slice(0, 10),
    };

    console.log("[advisor-analytics] Métricas calculadas com sucesso:", {
      totalClients,
      activeClients,
      totalAUM,
    });

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[advisor-analytics] Erro:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
