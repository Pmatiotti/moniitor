import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Info } from "lucide-react";

interface RateData {
  indexador: string;
  tributacao: string;
  taxaMedia: number;
  pesoTotal: number;
}

interface ClientFixedIncomeRatesCardProps {
  clientId: string;
}

// Helpers para identificar ativos isentos/tributados
const isIsentoAsset = (subClass: string, ticker: string, assetName: string): boolean => {
  const isentoPatterns = [
    /\bDEB[ÊE]NTURE/i, /\bDEB\b/i,
    /\bLCI\b/i, /\bLCA\b/i, /\bLH\b/i,
    /\bCRI\b/i, /\bCRA\b/i,
    /\bLIG\b/i,
  ];
  const combined = `${subClass || ''} ${ticker || ''} ${assetName || ''}`;
  return isentoPatterns.some(pattern => pattern.test(combined));
};

const isTributadoAsset = (subClass: string, ticker: string, assetName: string): boolean => {
  if (isIsentoAsset(subClass, ticker, assetName)) return false;
  const tributadoPatterns = [
    /\bCDB\b/i, /\bRDB\b/i,
    /\bLF\b/i, /\bLFS\b/i, /\bLFSC\b/i,
    /\bLC\b/i,
    /\bDPGE\b/i,
  ];
  const combined = `${subClass || ''} ${ticker || ''} ${assetName || ''}`;
  return tributadoPatterns.some(pattern => pattern.test(combined));
};

export const ClientFixedIncomeRatesCard = ({ clientId }: ClientFixedIncomeRatesCardProps) => {
  const [rateData, setRateData] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Primeiro tenta buscar por client_id (clientes manuais)
        let { data: assets, error } = await supabase
          .from("assets")
          .select("asset_name, ticker, sub_class, rate, quantity, current_price, invested_amount")
          .eq("client_id", clientId)
          .eq("asset_class", "Renda Fixa");

        if (error) throw error;

        // Fallback: buscar por user_id (clientes vinculados)
        if (!assets || assets.length === 0) {
          const fallback = await supabase
            .from("assets")
            .select("asset_name, ticker, sub_class, rate, quantity, current_price, invested_amount")
            .eq("user_id", clientId)
            .is("client_id", null)
            .eq("asset_class", "Renda Fixa");

          if (fallback.error) throw fallback.error;
          assets = fallback.data;
        }

        if (!assets || assets.length === 0) {
          setRateData([]);
          setLoading(false);
          return;
        }

        const aggregation = new Map<string, { totalPonderado: number; totalValor: number }>();

        assets.forEach((asset) => {
          const rate = asset.rate;
          if (!rate) return;

          // Skip Tesouro Selic/LFT
          if (/tesouro\s*selic|lft/i.test(asset.asset_name || '')) return;

          const valor = asset.invested_amount || (asset.quantity * (asset.current_price || 0));
          if (valor <= 0) return;

          // Identify indexer
          let indexador = '';
          const rateUpper = rate.toUpperCase();
          
          if (rateUpper.includes('IPCA') || rateUpper.includes('IPC-A')) {
            indexador = 'IPCA+';
          } else if (rateUpper.includes('IGPM') || rateUpper.includes('IGP-M')) {
            indexador = 'IPCA+'; // Agrupar IGPM como inflação
          } else if (rateUpper.includes('CDI')) {
            // Check if it's CDI% or CDI+
            if (rateUpper.includes('+') || rateUpper.match(/CDI\s*\+/)) {
              indexador = 'CDI+';
            } else {
              indexador = '% CDI';
            }
          } else if (rateUpper.match(/\d+[,.]?\d*\s*%/)) {
            indexador = 'Prefixado';
          }

          if (!indexador) return;

          // Get rate value
          const rateMatch = rate.match(/(\d+[,.]?\d*)\s*%/);
          const taxaNum = rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : 0;
          if (taxaNum <= 0) return;

          // Determine tax status
          const tributacao = isIsentoAsset(asset.sub_class || '', asset.ticker, asset.asset_name)
            ? 'Isentos'
            : isTributadoAsset(asset.sub_class || '', asset.ticker, asset.asset_name)
            ? 'Tributados'
            : 'Outros';

          const key = `${indexador}|${tributacao}`;
          const existing = aggregation.get(key) || { totalPonderado: 0, totalValor: 0 };
          aggregation.set(key, {
            totalPonderado: existing.totalPonderado + (taxaNum * valor),
            totalValor: existing.totalValor + valor,
          });
        });

        const result: RateData[] = [];
        aggregation.forEach((value, key) => {
          const [indexador, tributacao] = key.split('|');
          result.push({
            indexador,
            tributacao,
            taxaMedia: value.totalPonderado / value.totalValor,
            pesoTotal: value.totalValor,
          });
        });

        // Sort by indexador
        result.sort((a, b) => a.indexador.localeCompare(b.indexador));
        setRateData(result);
      } catch (error) {
        console.error("Error fetching fixed income rates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatRate = (value: number, indexador: string) => {
    if (indexador === '% CDI') {
      return `${value.toFixed(0)}% CDI`;
    }
    return `${indexador} ${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Taxas Médias Renda Fixa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (rateData.length === 0) {
    return null;
  }

  // Group by indexador
  const grouped = rateData.reduce((acc, item) => {
    if (!acc[item.indexador]) {
      acc[item.indexador] = [];
    }
    acc[item.indexador].push(item);
    return acc;
  }, {} as Record<string, RateData[]>);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Taxas Médias Renda Fixa
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Taxas médias ponderadas pelo valor investido em cada categoria
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(grouped).map(([indexador, items]) => (
          <div key={indexador} className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">{indexador}</div>
            <div className="space-y-1">
              {items.map((item, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex justify-between items-center text-sm cursor-help">
                        <span className="text-muted-foreground">{item.tributacao}</span>
                        <span className="font-medium text-primary">
                          {formatRate(item.taxaMedia, indexador)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Volume: {formatCurrency(item.pesoTotal)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
