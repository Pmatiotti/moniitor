import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockHeader } from "./fundamental/StockHeader";
import { FinancialsTab } from "./fundamental/FinancialsTab";
import { QualityTab } from "./fundamental/QualityTab";
import { RisksTab } from "./fundamental/RisksTab";

interface ComprehensiveFundamentalAnalysisProps {
  ticker: string;
  onClose: () => void;
}

export const ComprehensiveFundamentalAnalysis = ({ 
  ticker, 
  onClose 
}: ComprehensiveFundamentalAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [fundamentalData, setFundamentalData] = useState<any>(null);

  useEffect(() => {
    loadStoredData();
  }, [ticker]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check rate limiting
      const lastCallKey = `last_fundamental_call_${ticker}`;
      const lastCall = localStorage.getItem(lastCallKey);
      
      if (lastCall) {
        const minutesSinceCall = (Date.now() - parseInt(lastCall)) / (1000 * 60);
        if (minutesSinceCall < 10) {
          await loadStoredData();
          toast.info('Usando dados em cache. Aguarde 10 minutos para atualizar.');
          return;
        }
      }

      // Store timestamp
      localStorage.setItem(lastCallKey, Date.now().toString());

      // Fetch from Brapi via edge function
      const { error } = await supabase.functions.invoke('fetch-fundamental-data', {
        body: { ticker }
      });

      if (error) throw error;

      await loadStoredData();
      toast.success('Dados fundamentalistas atualizados!');
    } catch (error: any) {
      console.error('Error fetching fundamental data:', error);
      toast.error(error.message || 'Erro ao buscar dados');
      await loadStoredData();
    } finally {
      setLoading(false);
    }
  };

  const loadStoredData = async () => {
    try {
      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('stock_metrics')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .maybeSingle();

      if (metricsError) throw metricsError;
      setMetrics(metricsData);

      // Load fundamental data for quick access
      const { data: fundData, error: fundError } = await supabase
        .from('fundamental_data')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .maybeSingle();

      if (fundError && fundError.code !== 'PGRST116') throw fundError;
      setFundamentalData(fundData);

    } catch (error: any) {
      console.error('Error loading stored data:', error);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value?: number) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  const formatMarketCap = (value?: number) => {
    if (!value) return '-';
    if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(2)}M`;
    return formatCurrency(value);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{ticker.toUpperCase()}</CardTitle>
            <p className="text-sm text-muted-foreground">Análise Fundamentalista Completa</p>
            {(!metrics || !fundamentalData) && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ A API Brapi pode ter cobertura limitada para este ativo
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        <StockHeader 
          metrics={metrics}
          fundamentalData={fundamentalData}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          formatMarketCap={formatMarketCap}
        />
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="financials" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="financials">Fundamentos</TabsTrigger>
            <TabsTrigger value="quality">Qualidade</TabsTrigger>
            <TabsTrigger value="risks">Riscos</TabsTrigger>
          </TabsList>

          <TabsContent value="financials" className="space-y-4">
            <FinancialsTab ticker={ticker} />
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <QualityTab 
              ticker={ticker} 
              metrics={metrics}
              formatPercent={formatPercent}
            />
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            <RisksTab 
              ticker={ticker}
              metrics={metrics}
              formatPercent={formatPercent}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};