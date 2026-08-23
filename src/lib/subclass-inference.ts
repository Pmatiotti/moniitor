/**
 * Valores de subclasse normalizados para o banco de dados
 * A constraint do banco usa valores abreviados: "Pós", "Pré", "Inflação"
 */
const DB_SUBCLASS = {
  POS_FIXADO: 'Pós',
  PRE_FIXADO: 'Pré', 
  INFLACAO: 'Inflação',
} as const;

/**
 * ETFs de Renda Fixa conhecidos - mapeamento ticker -> subclasse
 * Esses ETFs terminam em 11 mas NÃO são FIIs
 */
const fixedIncomeETFs: Record<string, { class: string; subClass: string }> = {
  'LFTB11': { class: 'Renda Fixa', subClass: DB_SUBCLASS.POS_FIXADO },    // Investo Tesouro Selic
  'IMAB11': { class: 'Renda Fixa', subClass: DB_SUBCLASS.INFLACAO },      // It Now IMA-B
  'IRFM11': { class: 'Renda Fixa', subClass: DB_SUBCLASS.PRE_FIXADO },    // It Now IRF-M
  'FIXA11': { class: 'Renda Fixa', subClass: DB_SUBCLASS.POS_FIXADO },    // Mirae CDI
  'B5P211': { class: 'Renda Fixa', subClass: DB_SUBCLASS.INFLACAO },      // It Now IMA-B5 P2
  'IB5M11': { class: 'Renda Fixa', subClass: DB_SUBCLASS.INFLACAO },      // It Now IMA-B5+
};

/**
 * Verifica se um ticker é um ETF de Renda Fixa conhecido
 */
export function isFixedIncomeETF(ticker: string): boolean {
  return !!fixedIncomeETFs[ticker.toUpperCase().trim()];
}

/**
 * Obtém a classificação de um ETF de Renda Fixa
 */
export function getFixedIncomeETFClassification(ticker: string): { class: string; subClass: string } | null {
  return fixedIncomeETFs[ticker.toUpperCase().trim()] || null;
}

/**
 * Infere a subclasse de Renda Fixa baseado no indexador/taxa
 * Retorna: Pós, Pré, ou Inflação (valores compatíveis com o banco)
 * 
 * IMPORTANTE: Usa o campo rate como prioridade, mas faz fallback para o nome do ativo
 * quando o rate não contém informação de indexador (ex: "6,5% a.a." sem IPCA)
 */
export function inferFixedIncomeSubClass(
  rate: string | null, 
  assetName?: string | null
): string | null {
  // Primeiro, tentar inferir pelo rate
  if (rate) {
    const r = rate.toUpperCase();
    
    // IPCA, IPC-A, IGPM ou NTN-B (Tesouro IPCA) = Inflação
    if (r.includes('IPCA') || r.includes('IPC-A') || r.includes('IGPM') || r.includes('IGP-M') || 
        r.includes('IGPPM') || r.includes('NTN-B') || r.includes('NTNB')) {
      return DB_SUBCLASS.INFLACAO;
    }
    
    // CDI, Selic ou LFT (Tesouro Selic) = Pós-fixado
    if (r.includes('CDI') || r.includes('SELIC') || r.includes('LFT')) {
      return DB_SUBCLASS.POS_FIXADO;
    }
    
    // LTN ou NTN-F = Pré-fixado (títulos prefixados do Tesouro)
    if (r.includes('LTN') || r.includes('NTN-F') || r.includes('NTNF')) {
      return DB_SUBCLASS.PRE_FIXADO;
    }
    
    // Detectar taxa composta com "+" (ex: "+ 6,5%") sem indexador explícito no rate
    // Isso geralmente indica IPCA+ ou CDI+ - verificar no nome do ativo
    if (r.match(/\+\s*\d+[,.]?\d*\s*%/)) {
      const name = (assetName || '').toUpperCase();
      if (name.includes('IPCA') || name.includes('NTN-B') || name.includes('TESOURO IPCA')) {
        return DB_SUBCLASS.INFLACAO;
      }
      if (name.includes('CDI') || name.includes('SELIC')) {
        return DB_SUBCLASS.POS_FIXADO;
      }
    }
  }
  
  // FALLBACK: Se o rate não identificou indexador, verificar o NOME do ativo
  if (assetName) {
    const name = assetName.toUpperCase();
    
    // IPCA, IPC-A ou IGPM no nome = Inflação (ex: "CDB IPCA+ 6,5%", "Tesouro IPCA+ 2029")
    if (name.includes('IPCA') || name.includes('IPC-A') || name.includes('IGPM') || name.includes('IGP-M') ||
        name.includes('NTN-B') || name.includes('TESOURO IPCA')) {
      return DB_SUBCLASS.INFLACAO;
    }
    
    // CDI ou Selic no nome = Pós-fixado
    if (name.includes('CDI') || name.includes('SELIC') || name.includes('LFT') ||
        name.includes('TESOURO SELIC')) {
      return DB_SUBCLASS.POS_FIXADO;
    }
    
    // Tesouro Prefixado, LTN ou NTN-F no nome = Pré-fixado
    if (name.includes('PREFIXADO') || name.includes('PRE FIXADO') || 
        name.includes('PRÉ FIXADO') || name.includes('LTN') || name.includes('NTN-F')) {
      return DB_SUBCLASS.PRE_FIXADO;
    }
  }
  
  // SÓ cair em Pré-fixado se tiver percentual E NÃO encontrou indexador no nome
  if (rate) {
    const r = rate.toUpperCase();
    if (r.match(/\d+[,.]?\d*\s*%/) && 
        !r.includes('CDI') && !r.includes('IPCA') && !r.includes('IPC-A') && !r.includes('IGPM') &&
        !r.includes('LFT') && !r.includes('LTN') && !r.includes('NTN')) {
      // Verificar nome novamente antes de classificar como Pré
      const name = (assetName || '').toUpperCase();
      if (!name.includes('IPCA') && !name.includes('IPC-A') && !name.includes('IGPM') && 
          !name.includes('CDI') && !name.includes('SELIC')) {
        return DB_SUBCLASS.PRE_FIXADO;
      }
    }
  }
  
  return null;
}

/**
 * Infere a subclasse de Renda Variável baseado no ticker
 * Retorna: Ações, FIIs, BDR, FIAs, ou Derivativos
 */
export function inferEquitySubClass(ticker: string): string | null {
  const t = ticker.toUpperCase();
  
  // ETFs conhecidos (ainda são classificados, mas podemos adicionar como subclasse se necessário)
  const knownETFs = ['BOVA11', 'IVVB11', 'SMAL11', 'DIVO11', 'HASH11', 'QBTC11', 'GOLD11', 'XFIX11'];
  if (knownETFs.includes(t)) {
    return 'Ações'; // ETFs vão para Ações por enquanto
  }
  
  // BDRs (terminam em 34, 35, 31, 32, 33)
  if (/\d{2}(34|35|31|32|33)$/.test(t)) {
    return 'BDR';
  }
  
  // FIIs (terminam em 11, mas não são ETFs conhecidos)
  if (t.endsWith('11') && !knownETFs.includes(t)) {
    return 'FIIs';
  }
  
  // Ações normais (terminam em 3, 4, 5, 6)
  if (/\d$/.test(t) && ['3', '4', '5', '6'].includes(t.slice(-1))) {
    return 'Ações';
  }
  
  return 'Ações';
}

/**
 * Infere a subclasse de um fundo de investimento/multimercado baseado no nome
 * Usado para classificar fundos que entraram como "Fundos de Investimento" 
 * (classe legada que não será mais usada)
 */
export function inferFundSubClass(assetName: string): string | null {
  const name = assetName.toUpperCase();
  
  // FIAs = Fundo de Ações -> vai para Renda Variável
  if (name.includes(' FIA ') || name.includes(' FIA-') || name.endsWith(' FIA') || name.includes('FUNDO DE AÇÕES')) {
    return 'FIAs';
  }
  
  // Multimercado
  if (name.includes(' FIM ') || name.includes(' FIM-') || name.endsWith(' FIM') || name.includes('MULTIMERCADO')) {
    return 'Multimercado';
  }
  
  // Fundos de Renda Fixa -> inferir pelo indexador seria ideal, mas sem rate retorna null
  if (name.includes(' FIRF ') || name.includes(' FIRF-') || name.endsWith(' FIRF') || name.includes('RENDA FIXA')) {
    return 'Pós-fixado'; // Default para fundos RF
  }
  
  if (name.includes('FIAGRO')) {
    return 'Recebíveis'; // FIAGRO vai para Recebíveis
  }
  
  if (name.includes(' FIP ') || name.includes(' FIP-') || name.endsWith(' FIP')) {
    return 'Multimercado'; // FIP vai para Multimercado
  }
  
  if (name.includes('FIDC')) {
    return 'Recebíveis'; // FIDC = crédito estruturado -> Recebíveis
  }
  
  if (name.includes('CAMBIAL') || name.includes('DÓLAR') || name.includes('HEDGE CAMBIAL')) {
    return 'Moedas';
  }
  
  return 'Multimercado'; // Default para fundos não identificados
}

/**
 * Infere a subclasse baseado na classe, nome do ativo e taxa
 * 
 * IMPORTANTE: Para Renda Fixa, SEMPRE usa o indexador (rate) como critério
 */
export function inferSubClass(
  assetClass: string, 
  assetName: string, 
  ticker: string,
  rate?: string | null
): string | null {
  // PRIORIDADE 0: Verificar se é ETF de Renda Fixa conhecido
  // Esses ETFs terminam em 11 mas NÃO são FIIs
  if (ticker) {
    const etfClassification = getFixedIncomeETFClassification(ticker);
    if (etfClassification) {
      return etfClassification.subClass;
    }
  }
  
  // PRIORIDADE 1: Ticker terminado em 11 = FII (exceto ETFs conhecidos)
  // Isso corrige casos onde o ativo foi classificado erroneamente como Fundo
  if (ticker) {
    const t = ticker.toUpperCase().trim();
    const knownETFs = ['BOVA11', 'IVVB11', 'SMAL11', 'DIVO11', 'HASH11', 'QBTC11', 'GOLD11', 'XFIX11'];
    if (t.endsWith('11') && !knownETFs.includes(t) && !isFixedIncomeETF(t)) {
      return 'FIIs';
    }
  }
  
  // Renda Fixa: SEMPRE usar indexador, com fallback para nome
  if (assetClass === 'Renda Fixa') {
    return inferFixedIncomeSubClass(rate ?? null, assetName);
  }
  
  // Renda Variável: usar ticker
  if (assetClass === 'Renda Variável') {
    return inferEquitySubClass(ticker);
  }
  
  // Fundos de Investimento (classe legada): reclassificar
  if (assetClass === 'Fundos de Investimento') {
    return inferFundSubClass(assetName);
  }
  
  // Previdência: manter como Previdência
  if (assetClass === 'Previdência') {
    return 'Previdência';
  }
  
  // Multimercado: manter como Multimercado
  if (assetClass === 'Multimercado') {
    return 'Multimercado';
  }
  
  // Commodities, Moedas, Recebíveis: retornar a própria classe
  if (['Commodities', 'Moedas', 'Recebíveis'].includes(assetClass)) {
    return assetClass;
  }
  
  return null;
}
