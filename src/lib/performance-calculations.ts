/**
 * Funções de cálculo de métricas de performance de portfólio
 * Implementação aderente ao CFA/GIPS
 */

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  total_invested: number;
  daily_return_percent: number | null;
  cumulative_return_percent: number | null;
  assets_breakdown: Record<string, any> | null;
  created_at: string;
}

export interface CashFlowEntry {
  amount: number; // Positivo = aporte, Negativo = retirada
  date: string;
}

export interface PerformanceMetrics {
  totalReturn: number; // % retorno total (variação patrimonial simples)
  twr: number; // % Time-Weighted Return (padrão GIPS)
  xirr: number; // % Money-Weighted Return (XIRR)
  annualizedReturn: number; // % retorno anualizado
  volatility: number; // % volatilidade anualizada
  sharpeRatio: number; // Índice Sharpe
  maxDrawdown: number; // % máximo drawdown
  calmarRatio: number; // Retorno anualizado / Max Drawdown
  sortino: number; // Similar ao Sharpe mas só considera volatilidade negativa
  daysAnalyzed: number;
  startDate: string;
  endDate: string;
}

/**
 * Calcula o desvio padrão de um array de números
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Calcula a volatilidade anualizada (desvio padrão dos retornos diários * sqrt(252))
 */
export function calculateAnnualizedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  
  const stdDev = calculateStandardDeviation(dailyReturns);
  // Anualiza assumindo 252 dias úteis
  return stdDev * Math.sqrt(252);
}

/**
 * Calcula o retorno acumulado (variação patrimonial simples)
 * NOTA: Este não é o método CFA/GIPS recomendado, mantido para compatibilidade
 */
export function calculateTotalReturn(snapshots: PortfolioSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  
  if (first.total_invested === 0) return 0;
  
  return ((last.total_value - first.total_invested) / first.total_invested) * 100;
}

/**
 * Calcula o Time-Weighted Return (TWR) com encadeamento geométrico
 * PADRÃO GIPS - Elimina o efeito de aportes/retiradas
 * 
 * Fórmula: TWR = [(1 + R₁) × (1 + R₂) × ... × (1 + Rₙ)] - 1
 * Onde Rᵢ = retorno do subperíodo ajustado por fluxos de caixa
 */
export function calculateTWR(
  snapshots: PortfolioSnapshot[], 
  cashFlows: CashFlowEntry[] = []
): number {
  if (snapshots.length < 2) return 0;
  
  // Ordenar snapshots por data
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  
  // Criar mapa de fluxos por data
  const flowsByDate: Record<string, number> = {};
  for (const cf of cashFlows) {
    const dateKey = cf.date;
    flowsByDate[dateKey] = (flowsByDate[dateKey] || 0) + cf.amount;
  }
  
  let twr = 1;
  
  for (let i = 1; i < sorted.length; i++) {
    const prevSnapshot = sorted[i - 1];
    const currSnapshot = sorted[i];
    
    // Buscar fluxo de caixa do dia atual
    const dailyCashFlow = flowsByDate[currSnapshot.snapshot_date] || 0;
    
    // Valor base ajustado = valor anterior + fluxos de caixa
    // O fluxo ocorre no início do dia, então ajustamos o denominador
    const adjustedPrevValue = prevSnapshot.total_value + dailyCashFlow;
    
    if (adjustedPrevValue > 0 && prevSnapshot.total_value > 0) {
      // Retorno do período = Valor Final / Valor Inicial Ajustado
      const periodReturn = currSnapshot.total_value / adjustedPrevValue;
      twr *= periodReturn;
    }
  }
  
  return (twr - 1) * 100;
}

/**
 * Calcula o XIRR (Extended Internal Rate of Return)
 * PADRÃO CFA - Considera o timing exato de cada fluxo de caixa
 * 
 * Fórmula: Σ [Fluxoᵢ / (1 + XIRR)^(Dias/365)] = 0
 * Usa o método Newton-Raphson para encontrar a taxa
 */
export function calculateXIRR(cashFlows: CashFlowEntry[]): number {
  if (cashFlows.length < 2) return 0;
  
  // Ordenar por data
  const sorted = [...cashFlows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Verificar se tem pelo menos um fluxo positivo e um negativo
  const hasPositive = sorted.some(cf => cf.amount > 0);
  const hasNegative = sorted.some(cf => cf.amount < 0);
  
  if (!hasPositive || !hasNegative) {
    // Não é possível calcular XIRR sem fluxos opostos
    return 0;
  }
  
  const startDate = new Date(sorted[0].date);
  
  // Método Newton-Raphson para encontrar a taxa
  let rate = 0.1; // Chute inicial: 10%
  const maxIterations = 100;
  const tolerance = 0.00001;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let derivative = 0;
    
    for (const cf of sorted) {
      const days = (new Date(cf.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      
      // Evitar divisão por zero quando rate = -1
      if (rate <= -1) {
        rate = -0.99;
      }
      
      const factor = Math.pow(1 + rate, years);
      
      if (factor !== 0 && isFinite(factor)) {
        npv += cf.amount / factor;
        derivative -= (years * cf.amount) / (factor * (1 + rate));
      }
    }
    
    // Verificar convergência
    if (Math.abs(npv) < tolerance) {
      break;
    }
    
    // Evitar divisão por zero
    if (derivative === 0 || !isFinite(derivative)) {
      break;
    }
    
    // Atualizar taxa
    const newRate = rate - npv / derivative;
    
    // Limitar variação para evitar divergência
    const maxChange = 0.5;
    if (Math.abs(newRate - rate) > maxChange) {
      rate = rate + (newRate > rate ? maxChange : -maxChange);
    } else {
      rate = newRate;
    }
    
    // Limitar taxa a valores razoáveis (-90% a +1000%)
    rate = Math.max(-0.9, Math.min(10, rate));
  }
  
  return rate * 100;
}

/**
 * Prepara fluxos de caixa para cálculo de XIRR a partir de snapshots
 * Considera o primeiro investimento como saída e valor atual como entrada
 */
export function prepareXIRRCashFlows(
  snapshots: PortfolioSnapshot[],
  additionalFlows: CashFlowEntry[] = []
): CashFlowEntry[] {
  if (snapshots.length < 2) return [];
  
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  const flows: CashFlowEntry[] = [];
  
  // Investimento inicial (saída de caixa = negativo)
  flows.push({
    amount: -first.total_invested,
    date: first.snapshot_date
  });
  
  // Adicionar fluxos intermediários
  for (const cf of additionalFlows) {
    // Converter aportes para saída (negativo) e retiradas para entrada (positivo)
    flows.push({
      amount: -cf.amount, // Aporte = saída = negativo; Retirada = entrada = positivo
      date: cf.date
    });
  }
  
  // Valor final (entrada de caixa = positivo)
  flows.push({
    amount: last.total_value,
    date: last.snapshot_date
  });
  
  return flows;
}

/**
 * Calcula o retorno anualizado baseado no TWR
 */
export function calculateAnnualizedReturn(snapshots: PortfolioSnapshot[], cashFlows: CashFlowEntry[] = []): number {
  if (snapshots.length < 2) return 0;
  
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  
  const startDate = new Date(first.snapshot_date);
  const endDate = new Date(last.snapshot_date);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 1) return 0;
  
  // Usar TWR para anualização (padrão GIPS)
  const twr = calculateTWR(snapshots, cashFlows);
  const years = daysDiff / 365;
  
  // Se TWR é positivo, calcular anualizado normalmente
  // Fórmula: ((1 + TWR/100)^(1/anos) - 1) * 100
  const twrDecimal = twr / 100;
  
  if (twrDecimal <= -1) {
    // Perda total ou maior, retornar -100%
    return -100;
  }
  
  return (Math.pow(1 + twrDecimal, 1 / years) - 1) * 100;
}

/**
 * Calcula o máximo drawdown (maior queda do pico)
 */
export function calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): number {
  if (snapshots.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = snapshots[0].total_value;
  
  for (const snapshot of snapshots) {
    if (snapshot.total_value > peak) {
      peak = snapshot.total_value;
    }
    
    const drawdown = ((peak - snapshot.total_value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Calcula o Índice Sharpe
 * Sharpe = (Retorno Anualizado - Taxa Livre de Risco) / Volatilidade
 */
export function calculateSharpeRatio(
  annualizedReturn: number, 
  volatility: number, 
  riskFreeRate: number = 12.15 // CDI atual aproximado
): number {
  if (volatility === 0) return 0;
  
  return (annualizedReturn - riskFreeRate) / volatility;
}

/**
 * Calcula o Índice Sortino (usa apenas volatilidade negativa)
 */
export function calculateSortinoRatio(
  dailyReturns: number[],
  annualizedReturn: number,
  riskFreeRate: number = 12.15
): number {
  const negativeReturns = dailyReturns.filter(r => r < 0);
  
  if (negativeReturns.length < 2) return 0;
  
  const downsideDeviation = calculateStandardDeviation(negativeReturns) * Math.sqrt(252);
  
  if (downsideDeviation === 0) return 0;
  
  return (annualizedReturn - riskFreeRate) / downsideDeviation;
}

/**
 * Calcula o Calmar Ratio (Retorno Anualizado / Max Drawdown)
 */
export function calculateCalmarRatio(annualizedReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return 0;
  
  return annualizedReturn / maxDrawdown;
}

/**
 * Extrai os retornos diários dos snapshots
 */
export function extractDailyReturns(snapshots: PortfolioSnapshot[]): number[] {
  return snapshots
    .map(s => s.daily_return_percent)
    .filter((r): r is number => r !== null && !isNaN(r));
}

/**
 * Calcula todas as métricas de performance (aderente ao CFA/GIPS)
 */
export function calculateAllMetrics(
  snapshots: PortfolioSnapshot[],
  riskFreeRate: number = 12.15,
  cashFlows: CashFlowEntry[] = []
): PerformanceMetrics {
  // Ordenar por data
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );
  
  if (sortedSnapshots.length < 2) {
    return {
      totalReturn: 0,
      twr: 0,
      xirr: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      sortino: 0,
      daysAnalyzed: sortedSnapshots.length,
      startDate: sortedSnapshots[0]?.snapshot_date || '',
      endDate: sortedSnapshots[sortedSnapshots.length - 1]?.snapshot_date || ''
    };
  }
  
  const dailyReturns = extractDailyReturns(sortedSnapshots);
  
  // Métricas de retorno
  const totalReturn = calculateTotalReturn(sortedSnapshots);
  const twr = calculateTWR(sortedSnapshots, cashFlows);
  
  // Preparar fluxos para XIRR
  const xirrFlows = prepareXIRRCashFlows(sortedSnapshots, cashFlows);
  const xirr = calculateXIRR(xirrFlows);
  
  // Usar TWR para métricas anualizadas (padrão GIPS)
  const annualizedReturn = calculateAnnualizedReturn(sortedSnapshots, cashFlows);
  const volatility = calculateAnnualizedVolatility(dailyReturns);
  const maxDrawdown = calculateMaxDrawdown(sortedSnapshots);
  const sharpeRatio = calculateSharpeRatio(annualizedReturn, volatility, riskFreeRate);
  const calmarRatio = calculateCalmarRatio(annualizedReturn, maxDrawdown);
  const sortino = calculateSortinoRatio(dailyReturns, annualizedReturn, riskFreeRate);
  
  return {
    totalReturn,
    twr,
    xirr,
    annualizedReturn,
    volatility,
    sharpeRatio,
    maxDrawdown,
    calmarRatio,
    sortino,
    daysAnalyzed: sortedSnapshots.length,
    startDate: sortedSnapshots[0].snapshot_date,
    endDate: sortedSnapshots[sortedSnapshots.length - 1].snapshot_date
  };
}

/**
 * Formata porcentagem para exibição
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Avalia a qualidade do Sharpe Ratio
 */
export function evaluateSharpeRatio(sharpe: number): { rating: string; color: string } {
  if (sharpe >= 2) return { rating: 'Excelente', color: 'text-green-500' };
  if (sharpe >= 1) return { rating: 'Bom', color: 'text-blue-500' };
  if (sharpe >= 0.5) return { rating: 'Moderado', color: 'text-yellow-500' };
  if (sharpe >= 0) return { rating: 'Baixo', color: 'text-orange-500' };
  return { rating: 'Negativo', color: 'text-red-500' };
}

/**
 * Avalia o nível de volatilidade
 */
export function evaluateVolatility(volatility: number): { level: string; color: string; progress: number } {
  if (volatility <= 10) return { level: 'Baixa', color: 'text-green-500', progress: 25 };
  if (volatility <= 20) return { level: 'Moderada', color: 'text-yellow-500', progress: 50 };
  if (volatility <= 35) return { level: 'Alta', color: 'text-orange-500', progress: 75 };
  return { level: 'Muito Alta', color: 'text-red-500', progress: 100 };
}

/**
 * Avalia a severidade do drawdown
 */
export function evaluateDrawdown(drawdown: number): { severity: string; color: string } {
  if (drawdown <= 5) return { severity: 'Mínimo', color: 'text-green-500' };
  if (drawdown <= 10) return { severity: 'Leve', color: 'text-blue-500' };
  if (drawdown <= 20) return { severity: 'Moderado', color: 'text-yellow-500' };
  if (drawdown <= 30) return { severity: 'Significativo', color: 'text-orange-500' };
  return { severity: 'Severo', color: 'text-red-500' };
}
