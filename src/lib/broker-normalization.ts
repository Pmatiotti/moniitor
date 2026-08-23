// Broker name normalization for consistent data aggregation
export const BROKER_MAPPINGS: Record<string, string[]> = {
  "BTG Pactual": [
    "BTG Pactual",
    "BTG",
    "btg",
    "Banco BTG Pactual",
    "BTG Digital",
    "BTG Pactual Digital",
    "BTG Investimentos",
    "BTGP",
    "btgp",
    "Pactual",
    "btg pactual",
    "btg bank"
  ],
  "XP Investimentos": [
    "XP",
    "xp",
    "XP Investimentos",
    "XP Invest",
    "XP Inc",
    "XP Inc.",
    "XP Brasil",
    "xpi",
    "xp investimentos",
    "xp corretora"
  ],
  "Itaú Unibanco": [
    "Itaú",
    "Itau",
    "Itaú Unibanco",
    "Itau Unibanco",
    "Itaú Bank",
    "Banco Itaú",
    "Banco Itau",
    "Itaú BBA",
    "itaubank",
    "itaubba",
    "itub"
  ],
  "Bradesco": [
    "Bradesco",
    "Banco Bradesco",
    "Bradesco S.A.",
    "banco bradesco",
    "bbdc",
    "bbdc4",
    "brad",
    "brad banco"
  ],
  "Banco do Brasil": [
    "Banco do Brasil",
    "Banco do Brasil S.A.",
    "BB",
    "bb",
    "banco brasil",
    "bco brasil",
    "bdb"
  ],
  "Santander": [
    "Santander",
    "Banco Santander",
    "Santander Brasil",
    "Santander S.A.",
    "banco santander brasil",
    "BSAN",
    "santander br",
    "santander brl"
  ],
  "Caixa Econômica Federal": [
    "Caixa",
    "Caixa Econômica",
    "Caixa Econômica Federal",
    "CEF",
    "caixa econ",
    "caixa federal",
    "caixa e.",
    "caixa brasil"
  ],
  "Nubank": [
    "Nubank",
    "NuBank",
    "Nu",
    "Nu Invest",
    "Nuinvest",
    "Nu Holdings",
    "nubk",
    "nu bank",
    "nucash"
  ],
  "Banco Inter": [
    "Inter",
    "Banco Inter",
    "Inter Invest",
    "Intermedium",
    "banco inter s.a.",
    "inter bank",
    "inter digital",
    "binter"
  ],
  "Banco Original": [
    "Original",
    "Banco Original",
    "Original S.A.",
    "bco original",
    "original bank",
    "banco original digital"
  ],
  "C6 Bank": [
    "C6",
    "C6 Bank",
    "c6bank",
    "C6 Carbon",
    "C6 Invest",
    "C6 Investimentos",
    "banco c6"
  ],
  "Banco Safra": [
    "Safra",
    "Banco Safra",
    "Safra S.A.",
    "bco safra",
    "safra bank",
    "banco safra brasil"
  ],
  "Banrisul": [
    "Banrisul",
    "Banco Banrisul",
    "Banrisul S.A.",
    "banri",
    "bbanrisul",
    "banrisul br"
  ],
  "Banco Daycoval": [
    "Daycoval",
    "Banco Daycoval",
    "Daycoval S.A.",
    "bdaycoval",
    "daycoval bank"
  ],
  "Banco BMG": [
    "BMG",
    "Banco BMG",
    "bmg s.a.",
    "banco bmg digital",
    "bmg bank"
  ],
  "Banco Pan": [
    "Pan",
    "Banco Pan",
    "pan s.a.",
    "banco pan brasil",
    "pan bank"
  ],
  "Banco Sofisa": [
    "Sofisa",
    "Banco Sofisa",
    "Sofisa Direto",
    "Sofisa Bank",
    "bsofisa",
    "sofisa digital"
  ],
  "Banco Omni": [
    "Omni",
    "Banco Omni",
    "omni bank",
    "omni financeiro"
  ]
};

// Create a reverse lookup map for faster normalization
const BROKER_LOOKUP: Map<string, string> = new Map();

// Initialize the lookup map
Object.entries(BROKER_MAPPINGS).forEach(([canonical, variations]) => {
  variations.forEach(variation => {
    BROKER_LOOKUP.set(variation.toLowerCase(), canonical);
  });
});

/**
 * Normalizes a broker name to its canonical form
 * @param brokerName - The broker name to normalize (case-insensitive)
 * @returns The canonical broker name, or the original if no match found
 */
export function normalizeBrokerName(brokerName: string | null | undefined): string {
  if (!brokerName) {
    return "Outros";
  }

  const normalized = BROKER_LOOKUP.get(brokerName.toLowerCase());
  return normalized || brokerName;
}
