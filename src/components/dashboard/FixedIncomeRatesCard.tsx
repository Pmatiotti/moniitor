import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Percent, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RateData {
  indexador: string;
  tributacao: string;
  taxaMedia: number;
  pesoTotal: number;
}

// Função para identificar se é ativo isento
const isIsentoAsset = (subClass: string, ticker: string, assetName: string): boolean => {
  const text = `${subClass} ${ticker} ${assetName}`.toUpperCase();
  
  // Debêntures (todas consideradas isentas)
  const debenturePatterns = [
    /\bDEB\b/i,
    /DEBEN[TÇC][ÊU]RE/i,
    /DEBENTURE/i,
  ];
  
  // LCI patterns
  const lciPatterns = [
    /\bLCI\b/i,
    /L\.?\s*C\.?\s*I\.?/i,
    /LETRA.*CR[EÉ]DITO.*IMOB/i,
  ];
  
  // LCA patterns
  const lcaPatterns = [
    /\bLCA\b/i,
    /L\.?\s*C\.?\s*A\.?/i,
    /LETRA.*CR[EÉ]DITO.*AGRO/i,
  ];
  
  // LH patterns
  const lhPatterns = [
    /\bLH\b/i,
    /LETRA\s+HIPOTEC/i,
  ];
  
  // CRI patterns
  const criPatterns = [
    /\bCRI\b/i,
    /C\.?\s*R\.?\s*I\.?/i,
    /CERTIFICADO.*RECEB.*IMOB/i,
  ];
  
  // CRA patterns
  const craPatterns = [
    /\bCRA\b/i,
    /C\.?\s*R\.?\s*A\.?/i,
    /CERTIFICADO.*RECEB.*AGRO/i,
  ];
  
  const allIsentoPatterns = [
    ...debenturePatterns,
    ...lciPatterns,
    ...lcaPatterns,
    ...lhPatterns,
    ...criPatterns,
    ...craPatterns,
  ];
  
  return allIsentoPatterns.some(pattern => pattern.test(text));
};

// Função para identificar se é ativo tributado
const isTributadoAsset = (subClass: string, ticker: string, assetName: string): boolean => {
  const text = `${subClass} ${ticker} ${assetName}`.toUpperCase();
  
  // Se já identificou como isento, não é tributado
  if (isIsentoAsset(subClass, ticker, assetName)) {
    return false;
  }
  
  const tributadoPatterns = [
    // CDB
    /\bCDB\b/i,
    /C\.?\s*D\.?\s*B\.?/i,
    /CERTIFICADO.*DEP[OÓ]SITO/i,
    // RDB
    /\bRDB\b/i,
    /R\.?\s*D\.?\s*B\.?/i,
    /RECIBO.*DEP[OÓ]SITO/i,
    // LF/LFS
    /\bLF\b(?!T)/i, // LF mas não LFT
    /\bLFS\b/i,
    /LETRA\s+FINANCEIRA/i,
    // Debêntures comuns (não incentivadas)
    /DEBEN[TÇC][ÊU]RE(?!.*INCENTIV)(?!.*INFRA)(?!.*ISENT)/i,
    // Notas Comerciais
    /NOTA\s+COMERCIAL/i,
    /\bNCE?\b/i,
    /\bNCI\b/i,
    /COMMERCIAL\s+PAPER/i,
    // Tesouro Direto
    /TESOURO/i,
    /\bLFT\b/i,
    /\bLTN\b/i,
    /NTN-?[BF]/i,
    // Outros
    /\bCOE\b/i,
    /COMPROMISSADA/i,
    /\bCCB\b/i,
    /\bNP\b/i,
    /BOND.*CORPORATIVO/i,
    /BOND.*LOCAL/i,
  ];
  
  return tributadoPatterns.some(pattern => pattern.test(text));
};

export const FixedIncomeRatesCard = () => {
  const [ratesByIndexer, setRatesByIndexer] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFixedIncomeRates();
  }, []);

  const fetchFixedIncomeRates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir ativos de clientes
        .eq("asset_class", "Renda Fixa");

      if (assets && assets.length > 0) {
        // Mapear por indexador E tributação
        type MapKey = string; // formato: "indexador|tributacao"
        const ratesMap = new Map<MapKey, { totalPonderado: number; totalValor: number }>();

        assets.forEach((asset) => {
          // Só processar ativos COM taxa definida
          if (!asset.rate) return;

          // Para renda fixa, usar sempre current_price * quantity (valor atual real da posição)
          const valorAtivo = Number(asset.current_price || 0) * Number(asset.quantity || 0);

          // Log dos valores usados no cálculo
          console.log("💰 CÁLCULO VALOR ATIVO:", {
            ticker: asset.ticker,
            assetName: asset.asset_name,
            current_price: asset.current_price,
            quantity: asset.quantity,
            valorAtivo: valorAtivo,
            rate: asset.rate
          });

          if (valorAtivo <= 0) return;

          const subClass = asset.sub_class || "";
          const ticker = asset.ticker || "";
          const assetName = asset.asset_name || "";
          
          // Determinar tributação
          const tributacao = isIsentoAsset(subClass, ticker, assetName) 
            ? "Isentos" 
            : "Tributados";

          // Extrair taxa e indexador
          let taxa = 0;
          let indexador = "";
          
          const rateStr = String(asset.rate).trim().toUpperCase();
          const tickerUpper = ticker.toUpperCase();
          const assetNameUpper = assetName.toUpperCase();
          
          // Ignorar Tesouro Selic/LFT (100% Selic, sem informação adicional)
          if (tickerUpper.includes("TESOURO SELIC") || tickerUpper.includes("LFT") || 
              assetNameUpper.includes("TESOURO SELIC") || assetNameUpper.includes("LFT")) {
            return;
          }
          
          // 1. Verificar CDI/DI/SELIC
          if (rateStr.includes("CDI") || rateStr.includes("DI") || rateStr.includes("SELIC")) {
            // CDI+ ou Selic+ (spread)
            const spreadMatch = rateStr.match(/(?:CDI|DI|SELIC)\s*\+\s*([\d.,]+)/i);
            // % CDI/DI (percentual)
            const percentMatch = rateStr.match(/([\d.,]+)\s*%?\s*(?:do\s*)?(?:CDI|DI|SELIC)/i);
            
            if (spreadMatch) {
              // CDI + X% (considerar apenas o spread)
              indexador = "CDI+";
              taxa = parseFloat(spreadMatch[1].replace(',', '.'));
            } else if (percentMatch) {
              // X% do CDI (considerar o percentual total)
              indexador = "% CDI";
              taxa = parseFloat(percentMatch[1].replace(',', '.'));
            } else {
              // CDI/DI/Selic puro = 100% CDI (não informar no card, valor implícito)
              indexador = "% CDI";
              taxa = 100;
            }
          } 
          // 2. Verificar IPCA+ ou IPC-A+ (inflação)
          else if (rateStr.includes("IPCA") || rateStr.includes("IPC-A") || rateStr.includes("IGPM") || rateStr.includes("IGP-M")) {
            indexador = "IPCA+";
            const match = rateStr.match(/(?:IPCA|IPC-A|IGPM|IGP-M)\s*\+\s*([\d.,]+)/i);
            taxa = match ? parseFloat(match[1].replace(',', '.')) : 0;
            // Ignorar IPCA com taxa zero
            if (taxa === 0) return;
          }
          // 3. Prefixado
          else {
            indexador = "Prefixado";
            const prefixMatch = rateStr.match(/([\d.,]+)\s*%?\s*(?:a\.a\.)?/i);
            if (!prefixMatch) return;
            taxa = parseFloat(prefixMatch[1].replace(',', '.'));
            
            // Log detalhado para prefixados
            console.log("🔍 PREFIXADO:", {
              ticker: ticker,
              assetName: assetName,
              subClass: subClass,
              tributacao: tributacao,
              rateStr: rateStr,
              taxaExtraida: taxa,
              valorAtivo: valorAtivo,
              ponderacao: taxa * valorAtivo
            });
          }

          // Criar chave única: indexador|tributacao
          const key = `${indexador}|${tributacao}`;
          const data = ratesMap.get(key) || { totalPonderado: 0, totalValor: 0 };
          data.totalPonderado += taxa * valorAtivo;
          data.totalValor += valorAtivo;
          ratesMap.set(key, data);
        });

        // Calcular taxas médias ponderadas
        const ratesData: RateData[] = Array.from(ratesMap.entries())
          .map(([key, data]) => {
            const [indexador, tributacao] = key.split('|');
            const taxaMedia = data.totalValor > 0 ? data.totalPonderado / data.totalValor : 0;
            
            // Log do resultado final por grupo
            if (indexador === "Prefixado") {
              console.log(`📊 RESULTADO PREFIXADO - ${tributacao}:`, {
                totalPonderado: data.totalPonderado,
                totalValor: data.totalValor,
                taxaMedia: taxaMedia,
                calculo: `${data.totalPonderado} / ${data.totalValor} = ${taxaMedia.toFixed(2)}%`
              });
            }
            
            return {
              indexador,
              tributacao,
              taxaMedia,
              pesoTotal: data.totalValor,
            };
          })
          .sort((a, b) => {
            // Ordenar por indexador primeiro, depois por volume
            if (a.indexador !== b.indexador) {
              const order = ["% CDI", "CDI+", "IPCA+", "Prefixado"];
              return order.indexOf(a.indexador) - order.indexOf(b.indexador);
            }
            return b.pesoTotal - a.pesoTotal;
          });

        setRatesByIndexer(ratesData);
      }
    } catch (error) {
      console.error("Error fetching fixed income rates:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Percent className="h-3.5 w-3.5 text-primary" />
            </div>
            Taxas Médias - Renda Fixa
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ratesByIndexer.length === 0) {
    return null;
  }

  return (
      <Card className="overflow-hidden hover-lift">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Percent className="h-3.5 w-3.5 text-primary" />
              </div>
              Taxas Médias - Renda Fixa
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Médias ponderadas pelo valor investido.<br/>
                    Hover em cada linha para ver o valor.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {["% CDI", "CDI+", "IPCA+", "Prefixado"].map(indexador => {
              const items = ratesByIndexer.filter(item => item.indexador === indexador);
              if (items.length === 0) return null;
              
              return (
                <div key={indexador}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    {indexador}
                  </div>
                  {items.map((item, idx) => (
                    <TooltipProvider key={`${item.indexador}-${item.tributacao}-${idx}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-between items-center py-1 px-2 hover:bg-muted/50 rounded transition-colors cursor-default">
                            <span className="text-xs">{item.tributacao}</span>
                            <span className="text-xs font-semibold text-primary">
                              {item.indexador === "Prefixado" 
                                ? `${item.taxaMedia.toFixed(2)}% a.a.`
                                : item.indexador === "CDI+"
                                  ? `CDI + ${item.taxaMedia.toFixed(2)}%`
                                  : item.indexador === "% CDI"
                                    ? `${item.taxaMedia.toFixed(2)}% CDI`
                                    : `IPCA + ${item.taxaMedia.toFixed(2)}%`
                              }
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{formatCurrency(item.pesoTotal)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
  );
};
