import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known FII CNPJ to Ticker mappings
// This is a curated list of the most popular FIIs
const FII_REGISTRY: Record<string, { ticker: string; nome: string; tipo: string; segmento: string }> = {
  "11.026.627/0001-38": { ticker: "HGLG11", nome: "CSHG LOGÍSTICA FII", tipo: "Tijolo", segmento: "Logística" },
  "11.664.201/0001-00": { ticker: "XPLG11", nome: "XP LOG FII", tipo: "Tijolo", segmento: "Logística" },
  "17.144.039/0001-85": { ticker: "BTLG11", nome: "BTG PACTUAL LOGÍSTICA FII", tipo: "Tijolo", segmento: "Logística" },
  "08.924.783/0001-01": { ticker: "KNRI11", nome: "KINEA RENDA IMOBILIÁRIA FII", tipo: "Tijolo", segmento: "Híbrido" },
  "14.376.247/0001-13": { ticker: "HGRE11", nome: "CSHG REAL ESTATE FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "17.554.274/0001-25": { ticker: "VILG11", nome: "VINCI LOGÍSTICA FII", tipo: "Tijolo", segmento: "Logística" },
  "14.410.722/0001-29": { ticker: "XPML11", nome: "XP MALLS FII", tipo: "Tijolo", segmento: "Shopping" },
  "11.179.118/0001-45": { ticker: "VISC11", nome: "VINCI SHOPPING CENTERS FII", tipo: "Tijolo", segmento: "Shopping" },
  "17.365.105/0001-47": { ticker: "MALL11", nome: "MALLS BRASIL PLURAL FII", tipo: "Tijolo", segmento: "Shopping" },
  "13.842.683/0001-76": { ticker: "HGBS11", nome: "HEDGE BRASIL SHOPPING FII", tipo: "Tijolo", segmento: "Shopping" },
  "28.830.325/0001-10": { ticker: "KNCR11", nome: "KINEA RENDIMENTOS IMOBILIÁRIOS FII", tipo: "Papel", segmento: "CRI" },
  "23.065.917/0001-27": { ticker: "KNIP11", nome: "KINEA ÍNDICES DE PREÇOS FII", tipo: "Papel", segmento: "CRI" },
  "24.960.430/0001-13": { ticker: "CPTS11", nome: "CAPITÂNIA SECURITIES II FII", tipo: "Papel", segmento: "CRI" },
  "32.274.163/0001-59": { ticker: "MXRF11", nome: "MAXI RENDA FII", tipo: "Papel", segmento: "CRI" },
  "24.690.186/0001-23": { ticker: "HGCR11", nome: "CSHG RECEBÍVEIS IMOBILIÁRIOS FII", tipo: "Papel", segmento: "CRI" },
  "13.248.676/0001-19": { ticker: "VRTA11", nome: "FATOR VERITÁ FII", tipo: "Papel", segmento: "CRI" },
  "15.333.306/0001-37": { ticker: "IRDM11", nome: "IRIDIUM RECEBÍVEIS IMOBILIÁRIOS FII", tipo: "Papel", segmento: "CRI" },
  "22.006.946/0001-88": { ticker: "RECR11", nome: "REC RECEBÍVEIS IMOBILIÁRIOS FII", tipo: "Papel", segmento: "CRI" },
  "17.119.655/0001-60": { ticker: "BCFF11", nome: "BTG PACTUAL FUNDO DE FUNDOS FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "28.516.650/0001-86": { ticker: "HFOF11", nome: "HEDGE TOP FOFII 3 FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "17.324.357/0001-28": { ticker: "RBRF11", nome: "RBR ALPHA FUNDO DE FUNDOS FII", tipo: "FOF", segmento: "Fundo de Fundos" },
  "30.982.655/0001-51": { ticker: "VGHF11", nome: "VALORA HEDGE FUND FII", tipo: "Híbrido", segmento: "Hedge Fund" },
  "32.841.045/0001-08": { ticker: "PVBI11", nome: "VBI PRIME PROPERTIES FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "35.652.102/0001-76": { ticker: "TRXF11", nome: "TRX REAL ESTATE FII", tipo: "Tijolo", segmento: "Varejo" },
  "33.850.822/0001-69": { ticker: "RBRR11", nome: "RBR RENDIMENTO HIGH GRADE FII", tipo: "Papel", segmento: "CRI" },
  "17.374.418/0001-19": { ticker: "BRCR11", nome: "BTG PACTUAL CORPORATE OFFICE FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "11.517.910/0001-51": { ticker: "JSRE11", nome: "JS REAL ESTATE MULTIGESTÃO FII", tipo: "Híbrido", segmento: "Híbrido" },
  "08.431.747/0001-06": { ticker: "HGPO11", nome: "CSHG PRIME OFFICES FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "16.841.067/0001-53": { ticker: "GGRC11", nome: "GGR COVEPI RENDA FII", tipo: "Tijolo", segmento: "Logística" },
  "26.091.656/0001-50": { ticker: "XPCI11", nome: "XP CRÉDITO IMOBILIÁRIO FII", tipo: "Papel", segmento: "CRI" },
  "28.152.014/0001-26": { ticker: "RBRP11", nome: "RBR PROPERTIES FII", tipo: "Tijolo", segmento: "Híbrido" },
  "09.072.017/0001-29": { ticker: "FIIB11", nome: "INDUSTRIAL DO BRASIL FII", tipo: "Tijolo", segmento: "Industrial" },
  "14.082.024/0001-20": { ticker: "SARE11", nome: "SANTANDER RENDA DE ALUGUÉIS FII", tipo: "Tijolo", segmento: "Híbrido" },
  "17.135.458/0001-62": { ticker: "BRCO11", nome: "BRESCO LOGÍSTICA FII", tipo: "Tijolo", segmento: "Logística" },
  "27.568.083/0001-93": { ticker: "LVBI11", nome: "VBI LOGÍSTICO FII", tipo: "Tijolo", segmento: "Logística" },
  "00.332.266/0001-04": { ticker: "SHPH11", nome: "SHOPPING PÁTIO HIGIENÓPOLIS FII", tipo: "Tijolo", segmento: "Shopping" },
  "09.552.812/0001-14": { ticker: "ABCP11", nome: "GRAND PLAZA SHOPPING FII", tipo: "Tijolo", segmento: "Shopping" },
  "27.769.083/0001-70": { ticker: "RECT11", nome: "REC RENDA IMOBILIÁRIA FII", tipo: "Tijolo", segmento: "Lajes Corporativas" },
  "29.641.226/0001-67": { ticker: "GALG11", nome: "GUARDIAN LOGÍSTICA FII", tipo: "Tijolo", segmento: "Logística" },
  "30.578.417/0001-05": { ticker: "DEVA11", nome: "DEVANT RECEBÍVEIS IMOBILIÁRIOS FII", tipo: "Papel", segmento: "CRI" },
  "33.254.796/0001-79": { ticker: "VGIR11", nome: "VALORA RE III FII", tipo: "Papel", segmento: "CRI" },
  "31.024.200/0001-77": { ticker: "HABT11", nome: "HABITAT II FII", tipo: "Papel", segmento: "CRI" },
  "24.809.255/0001-53": { ticker: "RZTR11", nome: "RIZA TERRAX FII", tipo: "Agro", segmento: "Agronegócio" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Populating FII registry...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const registryEntries = Object.entries(FII_REGISTRY).map(([cnpj, data]) => ({
      cnpj,
      ticker: data.ticker,
      nome_fundo: data.nome,
      tipo: data.tipo,
      segmento: data.segmento,
    }));

    console.log(`Inserting ${registryEntries.length} FII registry entries...`);

    const { data, error } = await supabase
      .from("fii_registry")
      .upsert(registryEntries, { 
        onConflict: "cnpj",
        ignoreDuplicates: false 
      });

    if (error) {
      throw error;
    }

    console.log("FII registry populated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        count: registryEntries.length,
        tickers: registryEntries.map(e => e.ticker),
        message: `Populated registry with ${registryEntries.length} FIIs`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error populating registry:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
