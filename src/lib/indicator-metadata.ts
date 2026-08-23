export type BetterWhen = "higher" | "lower" | "range" | "contextual";

export interface IndicatorReferenceRange {
  /** Inclusive min; undefined means open */
  min?: number;
  /** Inclusive max; undefined means open */
  max?: number;
}

export interface IndicatorMeta {
  /** Must match the label used in UI (ex: "P/L") */
  label: string;
  description: string;
  /** Human-readable heuristic reference */
  reference: string;
  betterWhen: BetterWhen;
  /** Optional range used to compare winners when betterWhen === "range" */
  goodRange?: IndicatorReferenceRange;
}

// Observação: são referências globais/heurísticas (não por setor).
// Valores em percentuais devem seguir o mesmo padrão exibido na UI (ex: ROE é %).
const INDICATOR_META: Record<string, IndicatorMeta> = {
  "P/L": {
    label: "P/L",
    description: "Preço sobre lucro. Indica quantos anos de lucro a empresa 'vale' ao preço atual.",
    reference: "Regra de bolso: 5–15 costuma ser saudável; > 25 pode indicar prêmio/expectativa; < 0 significa lucro negativo.",
    betterWhen: "range",
    goodRange: { min: 5, max: 15 },
  },
  "P/VP": {
    label: "P/VP",
    description: "Preço sobre valor patrimonial. Compara o preço da ação com o patrimônio por ação.",
    reference: "Regra de bolso: < 1 pode indicar desconto (ou problema); 1–2 comum; > 2 pode indicar prêmio (varia por setor).",
    betterWhen: "contextual",
  },
  "EV/EBITDA": {
    label: "EV/EBITDA",
    description: "Valor da firma (EV) sobre EBITDA. Métrica de valuation mais comparável entre empresas.",
    reference: "Regra de bolso: 6–12 costuma ser razoável; > 15 pode indicar caro (depende do setor).",
    betterWhen: "lower",
  },
  "Dividend Yield": {
    label: "Dividend Yield",
    description: "Rendimento anual de dividendos em relação ao preço.",
    reference: "Regra de bolso: > 4% é atrativo, mas precisa olhar consistência e payout.",
    betterWhen: "higher",
  },
  Payout: {
    label: "Payout",
    description: "Percentual do lucro distribuído como dividendos.",
    reference: "Regra de bolso: 30–70% tende a ser saudável; muito alto pode ser insustentável; < 0 pode ocorrer com lucro negativo.",
    betterWhen: "range",
    goodRange: { min: 30, max: 70 },
  },
  ROE: {
    label: "ROE",
    description: "Retorno sobre patrimônio líquido. Mede eficiência em gerar lucro com o capital dos acionistas.",
    reference: "Regra de bolso: > 10% bom; > 15% excelente; < 5% fraco.",
    betterWhen: "higher",
  },
  ROA: {
    label: "ROA",
    description: "Retorno sobre ativos. Mede a eficiência em gerar lucro com os ativos totais.",
    reference: "Regra de bolso: quanto maior melhor; > 5% costuma ser bom (varia por setor).",
    betterWhen: "higher",
  },
  ROIC: {
    label: "ROIC",
    description: "Retorno sobre capital investido. Ajuda a avaliar criação de valor.",
    reference: "Regra de bolso: acima do custo de capital; heurística: > 10% costuma ser bom.",
    betterWhen: "higher",
  },
  "Margem Bruta": {
    label: "Margem Bruta",
    description: "Lucro bruto / receita. Mostra poder de precificação e estrutura de custos diretos.",
    reference: "Regra de bolso: quanto maior melhor; comparar com concorrentes do mesmo setor.",
    betterWhen: "higher",
  },
  "Margem EBITDA": {
    label: "Margem EBITDA",
    description: "EBITDA / receita. Aproxima a geração operacional antes de D&A, juros e impostos.",
    reference: "Regra de bolso: quanto maior melhor; 15–25% costuma ser forte em muitos setores.",
    betterWhen: "higher",
  },
  "Margem Líquida": {
    label: "Margem Líquida",
    description: "Lucro líquido / receita. Mede a 'sobra' final após todas as despesas.",
    reference: "Regra de bolso: > 10% geralmente é forte; negativo indica prejuízo.",
    betterWhen: "higher",
  },
  "Dív. Líq./EBITDA": {
    label: "Dív. Líq./EBITDA",
    description: "Dívida líquida dividida pelo EBITDA. Mede alavancagem.",
    reference: "Regra de bolso: < 2 bom; 2–3 atenção; > 3 risco (depende do setor).",
    betterWhen: "lower",
  },
  "Dív. Líq./PL": {
    label: "Dív. Líq./PL",
    description: "Dívida líquida / patrimônio líquido. Mede quanto da estrutura é financiada por dívida.",
    reference: "Regra de bolso: quanto menor melhor; muito alto pode indicar fragilidade.",
    betterWhen: "lower",
  },
  "Liquidez Corrente": {
    label: "Liquidez Corrente",
    description: "Ativo circulante / passivo circulante. Capacidade de pagar obrigações de curto prazo.",
    reference: "Regra de bolso: > 1 é ok; < 1 indica aperto no curto prazo.",
    betterWhen: "higher",
  },
  "CAGR Receita (5a)": {
    label: "CAGR Receita (5a)",
    description: "Crescimento anual composto da receita nos últimos 5 anos.",
    reference: "Regra de bolso: quanto maior e mais estável melhor; negativo indica contração.",
    betterWhen: "higher",
  },
  "CAGR Lucro (5a)": {
    label: "CAGR Lucro (5a)",
    description: "Crescimento anual composto do lucro nos últimos 5 anos.",
    reference: "Regra de bolso: quanto maior e mais estável melhor; muito volátil exige cautela.",
    betterWhen: "higher",
  },
  "Giro do Ativo": {
    label: "Giro do Ativo",
    description: "Receita / ativo total. Eficiência em usar ativos para gerar vendas.",
    reference: "Regra de bolso: quanto maior melhor; varia por setor (varejo tende a ser maior).",
    betterWhen: "higher",
  },
};

export function getIndicatorMeta(label: string): IndicatorMeta | null {
  return INDICATOR_META[label] ?? null;
}

type CompareWinner = "a" | "b" | "tie" | "unknown";

const inRange = (v: number, r: IndicatorReferenceRange) => {
  if (r.min !== undefined && v < r.min) return false;
  if (r.max !== undefined && v > r.max) return false;
  return true;
};

const distanceToRange = (v: number, r: IndicatorReferenceRange) => {
  if (inRange(v, r)) return 0;
  if (r.min !== undefined && v < r.min) return r.min - v;
  if (r.max !== undefined && v > r.max) return v - r.max;
  return 0;
};

export function compareIndicatorValues(label: string, a: number | null | undefined, b: number | null | undefined): CompareWinner {
  if (a === null || a === undefined) return b === null || b === undefined ? "unknown" : "b";
  if (b === null || b === undefined) return "a";

  const meta = getIndicatorMeta(label);
  if (!meta) return "unknown";

  if (meta.betterWhen === "contextual") return "unknown";
  if (meta.betterWhen === "higher") {
    if (a === b) return "tie";
    return a > b ? "a" : "b";
  }
  if (meta.betterWhen === "lower") {
    if (a === b) return "tie";
    return a < b ? "a" : "b";
  }
  if (meta.betterWhen === "range" && meta.goodRange) {
    const da = distanceToRange(a, meta.goodRange);
    const db = distanceToRange(b, meta.goodRange);
    if (da === db) return "tie";
    return da < db ? "a" : "b";
  }

  return "unknown";
}
