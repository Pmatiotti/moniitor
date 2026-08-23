/**
 * Utilitários para detecção automática do tipo de ativo pelo ticker
 */

// ETFs conhecidos que terminam em 11 mas NÃO são FIIs
const KNOWN_ETFS = [
  'BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'QETH11', 'ETHE11',
  'DIVO11', 'FIND11', 'GOVE11', 'ISUS11', 'ECOO11', 'XFIX11',
  'BOVV11', 'BBOV11', 'BRAX11', 'SPXI11', 'NASD11', 'SPXB11',
  'GOLD11', 'BOVB11', 'BOVS11', 'MATB11', 'PIBB11', 'SMAC11',
  'TECK11', 'UTEC11', 'GURU11', 'SHOT11', 'SHOT11', 'WRLD11',
  'ACWI11', 'EMEG11', 'EURP11', 'XINA11', 'ASIA11', 'JAPA11',
  'USTK11', 'EWZS11',
];

// ETFs de Renda Fixa (terminam em 11 mas são RF)
const FIXED_INCOME_ETFS = [
  'LFTB11', 'IMAB11', 'IRFM11', 'FIXA11', 'B5P211', 'IB5M11',
  'LFTS11', 'NTNS11', 'NTCO11', 'IBOV11', 'CDII11', 'BDIF11',
];

// BDRs conhecidos que terminam em 11
const KNOWN_BDRS_11 = [
  'BPAC11', 'TAEE11', 'SANB11', 'KLBN11', 'ENBR11', 'UNIT11',
];

export type AssetType = 'stock' | 'fii' | 'fiagro' | 'fip' | 'etf';

/**
 * Detecta o tipo de ativo baseado no padrão do ticker
 */
export function detectAssetType(ticker: string): AssetType {
  const t = ticker.toUpperCase().trim();
  
  // Se termina em 11
  if (t.endsWith('11')) {
    // Verificar se é ETF de Renda Fixa
    if (FIXED_INCOME_ETFS.includes(t)) return 'etf';
    // Verificar se é ETF conhecido
    if (KNOWN_ETFS.includes(t)) return 'etf';
    // Verificar se é BDR/Unit conhecida
    if (KNOWN_BDRS_11.includes(t)) return 'stock';
    // É FII, FIAGRO ou FIP
    return 'fii';
  }
  
  // Qualquer outro ticker é ação
  return 'stock';
}

/**
 * Verifica se o ticker é de um FII (para renderização)
 */
export function isFIITicker(ticker: string): boolean {
  const type = detectAssetType(ticker);
  return type === 'fii' || type === 'fiagro' || type === 'fip';
}

/**
 * Verifica se o ticker é de uma ação/ETF (para renderização)
 */
export function isStockTicker(ticker: string): boolean {
  const type = detectAssetType(ticker);
  return type === 'stock' || type === 'etf';
}

/**
 * Retorna o label do tipo de ativo para exibição
 */
export function getAssetTypeLabel(ticker: string): string {
  const type = detectAssetType(ticker);
  switch (type) {
    case 'fii':
      return 'FII';
    case 'fiagro':
      return 'FIAGRO';
    case 'fip':
      return 'FIP';
    case 'etf':
      return 'ETF';
    case 'stock':
    default:
      return 'Ação';
  }
}

/**
 * Retorna a rota correta para análise do ticker
 */
export function getTickerRoute(ticker: string): string {
  return `/ticker/${ticker.toUpperCase()}`;
}
