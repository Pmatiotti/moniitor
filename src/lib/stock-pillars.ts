 import type { FundamentalData } from "@/pages/PublicStock";
 
 export interface PillarScore {
   score: number; // 0-100
   highlights: string[];
   pros: string[];
   cons: string[];
 }
 
 export interface StockPillarScores {
   valuation: PillarScore;
   performance: PillarScore;
   health: PillarScore;
   dividends: PillarScore;
 }
 
 const normalize = (value: number | null | undefined, min: number, max: number, invert = false): number => {
   if (value === null || value === undefined || isNaN(value)) return 50;
   const clamped = Math.max(min, Math.min(max, value));
   const normalized = ((clamped - min) / (max - min)) * 100;
   return invert ? 100 - normalized : normalized;
 };
 
 // Valuation scoring (0-100)
 const scoreValuation = (data: FundamentalData): PillarScore => {
   let total = 0;
   let count = 0;
   const pros: string[] = [];
   const cons: string[] = [];
   const highlights: string[] = [];
 
   // P/L (lower is better, range 0-50)
   if (data.p_l !== null && data.p_l !== undefined) {
     const plScore = normalize(data.p_l, 0, 50, true);
     total += plScore;
     count++;
     if (data.p_l < 10) pros.push("P/L atrativo (<10)");
     else if (data.p_l > 30) cons.push("P/L elevado (>30)");
     highlights.push(`P/L: ${data.p_l.toFixed(2)}`);
   }
 
   // P/VP (lower is better, range 0-5)
   if (data.p_vp !== null && data.p_vp !== undefined) {
     const pvpScore = normalize(data.p_vp, 0, 5, true);
     total += pvpScore;
     count++;
     if (data.p_vp < 1) pros.push("Negociando abaixo do valor patrimonial");
     else if (data.p_vp > 3) cons.push("P/VP acima de 3x");
     highlights.push(`P/VP: ${data.p_vp.toFixed(2)}`);
   }
 
   // EV/EBITDA (lower is better, range 0-30)
   if (data.ev_ebitda !== null && data.ev_ebitda !== undefined) {
     const evScore = normalize(data.ev_ebitda, 0, 30, true);
     total += evScore;
     count++;
     if (data.ev_ebitda < 8) pros.push("EV/EBITDA competitivo");
     highlights.push(`EV/EBITDA: ${data.ev_ebitda.toFixed(2)}`);
   }
 
   const score = count > 0 ? total / count : 50;
   return { score: Math.round(score), highlights, pros, cons };
 };
 
 // Performance scoring (0-100)
 const scorePerformance = (data: FundamentalData): PillarScore => {
   let total = 0;
   let count = 0;
   const pros: string[] = [];
   const cons: string[] = [];
   const highlights: string[] = [];
 
   // ROE (higher is better, range 0-40)
   if (data.roe !== null && data.roe !== undefined) {
     const roeScore = normalize(data.roe, 0, 40, false);
     total += roeScore;
     count++;
     if (data.roe > 15) pros.push("ROE acima de 15%");
     else if (data.roe < 5) cons.push("ROE abaixo de 5%");
     highlights.push(`ROE: ${data.roe.toFixed(2)}%`);
   }
 
   // Margem líquida (higher is better, range 0-30)
   if (data.m_liquida !== null && data.m_liquida !== undefined) {
     const marginScore = normalize(data.m_liquida, 0, 30, false);
     total += marginScore;
     count++;
     if (data.m_liquida > 15) pros.push("Margem líquida sólida (>15%)");
     else if (data.m_liquida < 5) cons.push("Margem líquida baixa (<5%)");
     highlights.push(`M. Líquida: ${data.m_liquida.toFixed(2)}%`);
   }
 
   // ROA (higher is better, range 0-20)
   if (data.roa !== null && data.roa !== undefined) {
     const roaScore = normalize(data.roa, 0, 20, false);
     total += roaScore;
     count++;
     if (data.roa > 10) pros.push("ROA eficiente");
     highlights.push(`ROA: ${data.roa.toFixed(2)}%`);
   }
 
   const score = count > 0 ? total / count : 50;
   return { score: Math.round(score), highlights, pros, cons };
 };
 
 // Health scoring (0-100)
 const scoreHealth = (data: FundamentalData): PillarScore => {
   let total = 0;
   let count = 0;
   const pros: string[] = [];
   const cons: string[] = [];
   const highlights: string[] = [];
 
   // Liquidez corrente (higher is better, range 0-3, optimal ~1.5)
   if (data.liq_corrente !== null && data.liq_corrente !== undefined) {
     const liqScore = data.liq_corrente < 1.5 
       ? normalize(data.liq_corrente, 0, 1.5, false)
       : normalize(data.liq_corrente, 1.5, 3, true);
     total += liqScore;
     count++;
     if (data.liq_corrente > 1.2 && data.liq_corrente < 2) pros.push("Liquidez corrente saudável");
     else if (data.liq_corrente < 1) cons.push("Liquidez corrente baixa (<1)");
     highlights.push(`Liq. Corrente: ${data.liq_corrente.toFixed(2)}`);
   }
 
   // Dívida/PL (lower is better, range 0-2)
   if (data.div_liquida_pl !== null && data.div_liquida_pl !== undefined) {
     const debtScore = normalize(data.div_liquida_pl, 0, 2, true);
     total += debtScore;
     count++;
     if (data.div_liquida_pl < 0.5) pros.push("Baixo endividamento");
     else if (data.div_liquida_pl > 1.5) cons.push("Endividamento elevado");
     highlights.push(`Dívi./PL: ${data.div_liquida_pl.toFixed(2)}`);
   }
 
   // Dívida/EBITDA (lower is better, range 0-5)
   if (data.div_liquida_ebitda !== null && data.div_liquida_ebitda !== undefined) {
     const deScore = normalize(data.div_liquida_ebitda, 0, 5, true);
     total += deScore;
     count++;
     if (data.div_liquida_ebitda < 2) pros.push("Dívida controlada");
     highlights.push(`Dívi./EBITDA: ${data.div_liquida_ebitda.toFixed(2)}`);
   }
 
   const score = count > 0 ? total / count : 50;
   return { score: Math.round(score), highlights, pros, cons };
 };
 
 // Dividends scoring (0-100)
 const scoreDividends = (data: FundamentalData): PillarScore => {
   let total = 0;
   let count = 0;
   const pros: string[] = [];
   const cons: string[] = [];
   const highlights: string[] = [];
 
   // Dividend Yield (higher is better, range 0-15)
   if (data.dividend_yield !== null && data.dividend_yield !== undefined) {
     const dyScore = normalize(data.dividend_yield, 0, 15, false);
     total += dyScore;
     count++;
     if (data.dividend_yield > 6) pros.push("Dividend Yield atrativo (>6%)");
     else if (data.dividend_yield < 2) cons.push("Dividend Yield baixo (<2%)");
     highlights.push(`DY: ${data.dividend_yield.toFixed(2)}%`);
   }
 
   // Payout (optimal range 30-70%)
  if (data.payout_ratio !== null && data.payout_ratio !== undefined) {
    const payoutScore = data.payout_ratio < 50 
      ? normalize(data.payout_ratio, 0, 50, false)
      : normalize(data.payout_ratio, 50, 100, true);
     total += payoutScore;
     count++;
    if (data.payout_ratio > 30 && data.payout_ratio < 70) pros.push("Payout equilibrado (30-70%)");
    else if (data.payout_ratio > 90) cons.push("Payout muito alto (>90%)");
    highlights.push(`Payout: ${data.payout_ratio.toFixed(2)}%`);
   }
 
   const score = count > 0 ? total / count : 50;
   return { score: Math.round(score), highlights, pros, cons };
 };
 
 export const calculateStockPillars = (data: FundamentalData): StockPillarScores => {
   return {
     valuation: scoreValuation(data),
     performance: scorePerformance(data),
     health: scoreHealth(data),
     dividends: scoreDividends(data),
   };
 };