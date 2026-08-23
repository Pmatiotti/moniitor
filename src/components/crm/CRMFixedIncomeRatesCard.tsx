import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Info } from "lucide-react";

interface RateData {
  indexador: string;
  taxaMedia: number;
  pesoTotal: number;
  numClientes: number;
}

interface CRMFixedIncomeRatesCardProps {
  clientIds: string[];
}

export const CRMFixedIncomeRatesCard = ({ clientIds }: CRMFixedIncomeRatesCardProps) => {
  const [rateData, setRateData] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (clientIds.length === 0) {
        setRateData([]);
        setLoading(false);
        return;
      }

      try {
        const { data: assets, error } = await supabase
          .from("assets")
          .select("client_id, asset_name, ticker, sub_class, rate, quantity, current_price, invested_amount")
          .in("client_id", clientIds)
          .eq("asset_class", "Renda Fixa");

        if (error) throw error;
        if (!assets || assets.length === 0) {
          setRateData([]);
          setLoading(false);
          return;
        }

        const aggregation = new Map<string, { totalPonderado: number; totalValor: number; clientes: Set<string> }>();

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

          const existing = aggregation.get(indexador) || { totalPonderado: 0, totalValor: 0, clientes: new Set() };
          existing.clientes.add(asset.client_id);
          aggregation.set(indexador, {
            totalPonderado: existing.totalPonderado + (taxaNum * valor),
            totalValor: existing.totalValor + valor,
            clientes: existing.clientes,
          });
        });

        const result: RateData[] = [];
        aggregation.forEach((value, indexador) => {
          result.push({
            indexador,
            taxaMedia: value.totalPonderado / value.totalValor,
            pesoTotal: value.totalValor,
            numClientes: value.clientes.size,
          });
        });

        // Sort by volume descending
        result.sort((a, b) => b.pesoTotal - a.pesoTotal);
        setRateData(result);
      } catch (error) {
        console.error("Error fetching consolidated fixed income rates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientIds]);

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
            Taxas Médias Consolidadas
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

  const totalVolume = rateData.reduce((sum, r) => sum + r.pesoTotal, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Taxas Médias Consolidadas
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Taxas médias ponderadas de Renda Fixa agregadas de todos os clientes
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rateData.map((item) => {
          const percentage = (item.pesoTotal / totalVolume) * 100;
          return (
            <TooltipProvider key={item.indexador}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.indexador}</span>
                        <span className="text-xs text-muted-foreground">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <span className="font-semibold text-primary">
                        {formatRate(item.taxaMedia, item.indexador)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-primary/60 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Volume: {formatCurrency(item.pesoTotal)}</p>
                    <p>{item.numClientes} cliente{item.numClientes !== 1 ? 's' : ''}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </CardContent>
    </Card>
  );
};
