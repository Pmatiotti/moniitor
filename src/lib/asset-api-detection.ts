/**
 * Identifies if an asset class can have its price fetched automatically via API (Brapi, Yahoo, etc.)
 * Variable income assets (stocks, FIIs, ETFs, BDRs) have real-time prices available.
 */
export function canFetchPriceFromAPI(assetClass: string): boolean {
  const variableIncomeClasses = [
    "ações", "acoes", "fiis", "fii", "fundos imobiliários", "fundos imobiliarios",
    "bdrs", "bdr", "etfs", "etf", "stocks", "reits", "renda variável", "renda variavel",
  ];
  return variableIncomeClasses.some(cls => assetClass.toLowerCase().includes(cls));
}
