import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extended list of common FIIs with their CNPJs
const KNOWN_FIIS: Record<string, { cnpj: string; nome: string; tipo: string; segmento: string }> = {
  // Logística
  "HGLG11": { cnpj: "11.728.688/0001-47", nome: "CSHG Logística FII", tipo: "Tijolo", segmento: "Logística" },
  "BRCO11": { cnpj: "20.748.515/0001-81", nome: "Bresco Logística FII", tipo: "Tijolo", segmento: "Logística" },
  "XPLG11": { cnpj: "26.502.794/0001-85", nome: "XP Log FII", tipo: "Tijolo", segmento: "Logística" },
  "BTLG11": { cnpj: "35.481.595/0001-23", nome: "BTG Pactual Logística FII", tipo: "Tijolo", segmento: "Logística" },
  "VILG11": { cnpj: "24.853.044/0001-22", nome: "Vinci Logística FII", tipo: "Tijolo", segmento: "Logística" },
  "GGRC11": { cnpj: "26.614.291/0001-00", nome: "GGR Covepi Renda FII", tipo: "Tijolo", segmento: "Logística" },
  "LVBI11": { cnpj: "27.769.359/0001-69", nome: "VBI Logístico FII", tipo: "Tijolo", segmento: "Logística" },
  
  // Shopping/Varejo
  "XPML11": { cnpj: "28.757.546/0001-00", nome: "XP Malls FII", tipo: "Tijolo", segmento: "Shopping" },
  "VISC11": { cnpj: "17.554.274/0001-25", nome: "Vinci Shopping Centers FII", tipo: "Tijolo", segmento: "Shopping" },
  "HSML11": { cnpj: "32.892.018/0001-31", nome: "HSI Malls FII", tipo: "Tijolo", segmento: "Shopping" },
  "MALL11": { cnpj: "26.499.833/0001-32", nome: "Malls Brasil Plural FII", tipo: "Tijolo", segmento: "Shopping" },
  
  // Lajes Corporativas
  "BRCR11": { cnpj: "08.924.783/0001-01", nome: "BC Fund FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "HGRE11": { cnpj: "09.072.017/0001-29", nome: "CSHG Real Estate FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "KNRI11": { cnpj: "12.005.956/0001-65", nome: "Kinea Renda Imobiliária FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "JSRE11": { cnpj: "13.371.132/0001-71", nome: "JS Real Estate Multigestão FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "RBRP11": { cnpj: "29.467.977/0001-03", nome: "RBR Properties FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "PVBI11": { cnpj: "35.652.102/0001-76", nome: "VBI Prime Properties FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  
  // Recebíveis/Papel
  "KNCR11": { cnpj: "16.706.958/0001-32", nome: "Kinea Rendimentos Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  "KNIP11": { cnpj: "24.960.430/0001-53", nome: "Kinea Índices de Preços FII", tipo: "Papel", segmento: "CRI" },
  "MXRF11": { cnpj: "97.521.225/0001-25", nome: "Maxi Renda FII", tipo: "Papel", segmento: "CRI" },
  "CPTS11": { cnpj: "18.979.895/0001-13", nome: "Capitânia Securities II FII", tipo: "Papel", segmento: "CRI" },
  "HGCR11": { cnpj: "11.160.521/0001-22", nome: "CSHG Recebíveis Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  "RBRR11": { cnpj: "29.467.977/0001-03", nome: "RBR Rendimento High Grade FII", tipo: "Papel", segmento: "CRI" },
  "VGIR11": { cnpj: "36.400.062/0001-38", nome: "Valora RE III FII", tipo: "Papel", segmento: "CRI" },
  "IRDM11": { cnpj: "28.830.325/0001-10", nome: "Iridium Recebíveis Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  "RECR11": { cnpj: "36.501.159/0001-64", nome: "REC Recebíveis Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  "VRTA11": { cnpj: "14.410.722/0001-29", nome: "Fator Veritá FII", tipo: "Papel", segmento: "CRI" },
  "PLCR11": { cnpj: "32.892.018/0001-31", nome: "Plural Recebíveis Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  
  // Híbridos/FOF
  "BCFF11": { cnpj: "11.026.627/0001-38", nome: "BTG Pactual Fundo de Fundos FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "HFOF11": { cnpj: "18.307.582/0001-19", nome: "Hedge TOP FOFII 3 FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "MGFF11": { cnpj: "29.216.463/0001-83", nome: "Mogno Fundo de Fundos FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "KFOF11": { cnpj: "35.865.537/0001-00", nome: "Kinea Fundo de Fundos FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "RBFF11": { cnpj: "30.978.895/0001-70", nome: "Rio Bravo Fundo de Fundos FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  
  // Residencial
  "MFII11": { cnpj: "07.300.137/0001-09", nome: "Mérito Desenvolvimento Imobiliário I FII", tipo: "Tijolo", segmento: "Residencial" },
  "TGAR11": { cnpj: "25.032.881/0001-53", nome: "TG Ativo Real FII", tipo: "Híbrido", segmento: "Desenvolvimento" },
  
  // Agro
  "RZAK11": { cnpj: "39.438.040/0001-06", nome: "Riza Akin FII", tipo: "Papel", segmento: "Agro" },
  "KNCA11": { cnpj: "38.065.012/0001-77", nome: "Kinea Crédito Agro FII", tipo: "Papel", segmento: "Agro" },
  
  // Renda Urbana
  "HGRU11": { cnpj: "29.641.226/0001-53", nome: "CSHG Renda Urbana FII", tipo: "Tijolo", segmento: "Renda Urbana" },
  "TRXF11": { cnpj: "28.548.288/0001-52", nome: "TRX Real Estate FII", tipo: "Tijolo", segmento: "Renda Urbana" },
  "RBVA11": { cnpj: "15.769.670/0001-24", nome: "Rio Bravo Renda Varejo FII", tipo: "Tijolo", segmento: "Renda Urbana" },
  
  // Hospitais/Educacional
  "NSLU11": { cnpj: "08.786.183/0001-86", nome: "Hospital Nossa Senhora de Lourdes FII", tipo: "Tijolo", segmento: "Hospitalar" },
  "HCTR11": { cnpj: "30.248.180/0001-96", nome: "Hectare CE FII", tipo: "Papel", segmento: "CRI" },
  
  // Outros populares
  "VINO11": { cnpj: "32.006.830/0001-68", nome: "Vinci Offices FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "RZTR11": { cnpj: "36.501.159/0001-64", nome: "Riza Terrax FII", tipo: "Tijolo", segmento: "Agro" },
  "SADI11": { cnpj: "36.868.288/0001-02", nome: "Santander Papéis Imobiliários CDI FII", tipo: "Papel", segmento: "CRI" },
  "DEVA11": { cnpj: "37.087.810/0001-37", nome: "Devant Recebíveis Imobiliários FII", tipo: "Papel", segmento: "CRI" },
  "HABT11": { cnpj: "36.501.159/0001-64", nome: "Habitat II FII", tipo: "Papel", segmento: "CRI" },
  "AFHI11": { cnpj: "38.079.343/0001-98", nome: "AF Invest CRI FII", tipo: "Papel", segmento: "CRI" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticker } = await req.json();

    if (!ticker) {
      return new Response(
        JSON.stringify({ success: false, error: "Ticker é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedTicker = ticker.toUpperCase().replace(/\.SA$/, "");
    console.log(`[discover-fii-ticker] Looking up ${normalizedTicker}`);

    // Check if ticker ends with "11" (FII pattern)
    if (!normalizedTicker.endsWith("11")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Ticker não parece ser um FII (deve terminar em 11)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we have this FII in our known list
    const knownFII = KNOWN_FIIS[normalizedTicker];

    if (knownFII) {
      console.log(`[discover-fii-ticker] Found ${normalizedTicker} in known list`);
      
      // Insert into fii_registry
      const { error: insertError } = await supabase
        .from("fii_registry")
        .upsert({
          ticker: normalizedTicker,
          cnpj: knownFII.cnpj,
          nome_fundo: knownFII.nome,
          tipo: knownFII.tipo,
          segmento: knownFII.segmento,
        }, { onConflict: "ticker" });

      if (insertError) {
        console.error("[discover-fii-ticker] Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          ticker: normalizedTicker,
          cnpj: knownFII.cnpj,
          nome: knownFII.nome,
          tipo: knownFII.tipo,
          segmento: knownFII.segmento,
          source: "known_list",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get info from Brapi
    console.log(`[discover-fii-ticker] Trying Brapi for ${normalizedTicker}`);
    const brapiKey = Deno.env.get("BRAPI_API_KEY");
    
    if (brapiKey) {
      try {
        const brapiUrl = `https://brapi.dev/api/quote/${normalizedTicker}?token=${brapiKey}&fundamental=true`;
        const brapiResponse = await fetch(brapiUrl);
        
        if (brapiResponse.ok) {
          const brapiData = await brapiResponse.json();
          const result = brapiData?.results?.[0];
          
          if (result) {
            // We found the ticker in Brapi, but without CNPJ
            // Create a placeholder entry
            const { error: insertError } = await supabase
              .from("fii_registry")
              .upsert({
                ticker: normalizedTicker,
                cnpj: `PENDING-${normalizedTicker}`, // Placeholder CNPJ
                nome_fundo: result.longName || result.shortName || normalizedTicker,
                tipo: null,
                segmento: null,
              }, { onConflict: "ticker" });

            if (insertError) {
              console.warn("[discover-fii-ticker] Insert error:", insertError);
            }

            return new Response(
              JSON.stringify({
                success: true,
                ticker: normalizedTicker,
                cnpj: null,
                nome: result.longName || result.shortName,
                tipo: null,
                segmento: null,
                source: "brapi",
                partial: true,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (brapiErr) {
        console.warn("[discover-fii-ticker] Brapi error:", brapiErr);
      }
    }

    // Could not find ticker
    console.log(`[discover-fii-ticker] Could not find ${normalizedTicker}`);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `FII ${normalizedTicker} não encontrado. Será sincronizado quando disponível.`,
        ticker: normalizedTicker,
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[discover-fii-ticker] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
