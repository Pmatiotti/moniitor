import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get user's portfolio data
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id);

    const { data: dividends } = await supabase
      .from('dividends')
      .select('*')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false })
      .limit(10);

    // Calculate portfolio stats
    const totalValue = assets?.reduce((sum, asset) => 
      sum + (Number(asset.current_price) * Number(asset.quantity)), 0) || 0;
    
    const totalCost = assets?.reduce((sum, asset) => 
      sum + (Number(asset.average_price) * Number(asset.quantity)), 0) || 0;
    
    const profitLoss = totalValue - totalCost;
    const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    const assetsByClass = assets?.reduce((acc, asset) => {
      acc[asset.asset_class] = (acc[asset.asset_class] || 0) + 
        (Number(asset.current_price) * Number(asset.quantity));
      return acc;
    }, {} as Record<string, number>);

    // Build context for AI
    const portfolioContext = `
Dados da Carteira do Usuário:

Resumo Geral:
- Patrimônio Total: R$ ${totalValue.toFixed(2)}
- Custo Total: R$ ${totalCost.toFixed(2)}
- Lucro/Prejuízo: R$ ${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(2)}%)
- Número de Ativos: ${assets?.length || 0}

Alocação por Classe:
${Object.entries(assetsByClass || {}).map(([cls, val]) => 
  `- ${cls}: R$ ${(val as number).toFixed(2)} (${(((val as number) / totalValue) * 100).toFixed(1)}%)`
).join('\n')}

Ativos na Carteira:
${assets?.map(a => {
  let info = `- ${a.ticker} (${a.asset_name}): ${a.quantity} unidades a R$ ${Number(a.current_price).toFixed(2)}, Classe: ${a.asset_class}`;
  
  if (a.sector) info += `, Setor: ${a.sector}`;
  if (a.broker) info += `, Corretora: ${a.broker}`;
  if (a.rate) info += `, Taxa: ${a.rate}`;
  if (a.maturity_date) info += `, Vencimento: ${a.maturity_date}`;
  if (a.application_date) info += `, Aplicação: ${a.application_date}`;
  if (a.invested_amount) info += `, Valor Investido: R$ ${Number(a.invested_amount).toFixed(2)}`;
  
  return info;
}).join('\n') || 'Nenhum ativo'}

Últimos Proventos Recebidos:
${dividends?.map(d => 
  `- ${d.ticker}: R$ ${Number(d.amount).toFixed(2)} (${d.dividend_type}) em ${d.payment_date}`
).join('\n') || 'Nenhum provento registrado'}
`;

    const systemPrompt = `Você é um assistente financeiro especializado da plataforma MONITOR, focado em análise de investimentos para investidores de alta renda.

Seu papel:
- Explicar a carteira de forma clara e profissional
- Dar insights sobre diversificação, riscos e oportunidades
- Responder perguntas sobre os ativos e estratégias
- Sugerir melhorias quando apropriado
- Usar linguagem sofisticada mas acessível
- Focar em valor agregado e inteligência de mercado

Contexto da carteira atual:
${portfolioContext}

Tom: Premium, analítico, consultivo, direto.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("portfolio-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
