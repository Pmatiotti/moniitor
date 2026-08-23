import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RisksTabProps {
  ticker: string;
  metrics: any;
  formatPercent: (value?: number) => string;
}

export const RisksTab = ({ ticker, metrics, formatPercent }: RisksTabProps) => {
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [volatility, setVolatility] = useState<number | null>(null);

  useEffect(() => {
    loadRiskData();
  }, [ticker]);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      // Load price history for volatility calculation
      const { data, error } = await supabase
        .from('stock_price_history')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setPriceHistory(data || []);

      // Calculate volatility (standard deviation of returns)
      if (data && data.length > 1) {
        const returns = [];
        for (let i = 0; i < data.length - 1; i++) {
          const currentPrice = data[i].close_price;
          const previousPrice = data[i + 1].close_price;
          if (currentPrice && previousPrice) {
            returns.push((currentPrice - previousPrice) / previousPrice);
          }
        }
        
        if (returns.length > 0) {
          const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
          const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
          const stdDev = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
          setVolatility(stdDev);
        }
      }
    } catch (error: any) {
      console.error('Error loading risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (value: number, thresholds: number[]) => {
    if (value <= thresholds[0]) return { level: 'Baixo', color: 'text-green-600', icon: CheckCircle };
    if (value <= thresholds[1]) return { level: 'Moderado', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'Alto', color: 'text-red-600', icon: AlertCircle };
  };

  // Risk assessments
  const debtRisk = metrics?.debt_to_equity 
    ? getRiskLevel(metrics.debt_to_equity, [0.5, 1.5])
    : null;

  const liquidityRisk = metrics?.current_ratio
    ? getRiskLevel(2 - metrics.current_ratio, [0, 0.5]) // Inverted: higher current ratio = lower risk
    : null;

  const volatilityRisk = volatility
    ? getRiskLevel(volatility, [20, 40])
    : null;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando análise de riscos...</div>;
  }

  if (!metrics || (!metrics.debt_to_equity && !metrics.current_ratio && !volatility)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="font-semibold mb-2">Análise de riscos limitada</p>
        <p className="text-sm">A API Brapi não fornece dados completos de risco para este ativo.</p>
        <p className="text-sm mt-2">Alguns indicadores podem estar indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Alavancagem Financeira
              {debtRisk && <debtRisk.icon className={`h-4 w-4 ${debtRisk.color}`} />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dívida/Patrimônio</span>
                <span className="font-semibold">{metrics?.debt_to_equity?.toFixed(2) || '-'}</span>
              </div>
              {debtRisk && (
                <Badge variant={debtRisk.level === 'Baixo' ? 'default' : debtRisk.level === 'Moderado' ? 'secondary' : 'destructive'}>
                  Risco {debtRisk.level}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {metrics?.debt_to_equity < 0.5 
                  ? 'Alavancagem saudável, baixo risco financeiro'
                  : metrics?.debt_to_equity < 1.5
                  ? 'Alavancagem moderada, atenção ao custo da dívida'
                  : 'Alta alavancagem, maior risco em cenários adversos'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Liquidez
              {liquidityRisk && <liquidityRisk.icon className={`h-4 w-4 ${liquidityRisk.color}`} />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Liquidez Corrente</span>
                <span className="font-semibold">{metrics?.current_ratio?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Liquidez Seca</span>
                <span className="font-semibold">{metrics?.quick_ratio?.toFixed(2) || '-'}</span>
              </div>
              {liquidityRisk && (
                <Badge variant={liquidityRisk.level === 'Baixo' ? 'default' : liquidityRisk.level === 'Moderado' ? 'secondary' : 'destructive'}>
                  Risco {liquidityRisk.level}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {metrics?.current_ratio > 1.5
                  ? 'Boa capacidade de honrar obrigações de curto prazo'
                  : metrics?.current_ratio > 1
                  ? 'Capacidade adequada de pagamento'
                  : 'Atenção: liquidez pode ser insuficiente'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Volatilidade
              {volatilityRisk && <volatilityRisk.icon className={`h-4 w-4 ${volatilityRisk.color}`} />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volatilidade Anualizada</span>
                <span className="font-semibold">{volatility ? `${volatility.toFixed(1)}%` : '-'}</span>
              </div>
              {volatilityRisk && (
                <>
                  <Progress value={Math.min(volatility! / 60 * 100, 100)} className="h-2" />
                  <Badge variant={volatilityRisk.level === 'Baixo' ? 'default' : volatilityRisk.level === 'Moderado' ? 'secondary' : 'destructive'}>
                    Risco {volatilityRisk.level}
                  </Badge>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {volatility && volatility < 20
                  ? 'Baixa volatilidade, menor risco de oscilações bruscas'
                  : volatility && volatility < 40
                  ? 'Volatilidade moderada, típica do mercado'
                  : 'Alta volatilidade, maior risco de variações acentuadas'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada de Riscos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Risco de Crédito</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cobertura de Juros</p>
                <p className="font-semibold">{metrics?.interest_coverage?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dívida / Ativos</p>
                <p className="font-semibold">{formatPercent(metrics?.debt_to_assets)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.interest_coverage > 5
                ? '✓ Excelente capacidade de pagamento de juros'
                : metrics?.interest_coverage > 2
                ? '⚠ Capacidade adequada, mas monitorar cuidadosamente'
                : '⚠ Atenção: baixa cobertura de juros pode indicar dificuldades'}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold">Risco Operacional</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Margem Operacional</p>
                <p className="font-semibold">{formatPercent(metrics?.operating_margin)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Margem Líquida</p>
                <p className="font-semibold">{formatPercent(metrics?.net_margin)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.operating_margin > 15
                ? '✓ Boas margens operacionais indicam eficiência'
                : metrics?.operating_margin > 5
                ? '⚠ Margens moderadas, atenção à competitividade'
                : '⚠ Margens baixas podem indicar pressão competitiva'}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold">Risco de Mercado</h4>
            <p className="text-sm text-muted-foreground">
              A volatilidade histórica de {volatility?.toFixed(1)}% indica o nível de variação dos preços. 
              Investidores com perfil conservador devem considerar este fator ao alocar recursos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};