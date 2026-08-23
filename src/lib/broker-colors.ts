// Mapeamento de cores fixas por instituição financeira (usando nomes canônicos)
const BROKER_COLORS: Record<string, string> = {
  // Instituições Brasileiras
  "BTG Pactual": "#001B44",
  "Itaú Unibanco": "#FF7200",
  "Bradesco": "#C00018",
  "Banco do Brasil": "#FFCC00",
  "Caixa Econômica Federal": "#005CA9",
  "Santander": "#EC0000",
  "Banco Safra": "#0A1A44",
  "XP Investimentos": "#000000",
  "Banco Inter": "#FF6A00",
  "Nubank": "#8226D1",
  "C6 Bank": "#222222",
  "Banco Pan": "#0056A6",
  "Banco Original": "#00A859",
  "Banco Modal": "#005249",
  "Banrisul": "#003087",
  "Banco Daycoval": "#006838",
  "Banco BMG": "#003366",
  "Banco Sofisa": "#0066CC",
  "Banco Omni": "#004080",
  
  // Instituições Internacionais
  "JPMorgan Chase": "#002D72",
  "Goldman Sachs": "#0091D5",
  "Morgan Stanley": "#4C6C8C",
  "HSBC": "#DB0011",
  "Citibank": "#003B70",
  "Bank of America": "#012169",
  "Wells Fargo": "#D71E28",
  "UBS": "#E0001B",
  "Credit Suisse": "#00335B",
};

// Cores padrão para instituições não mapeadas
const DEFAULT_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff8042",
  "#a4de6c",
  "#d0ed57",
  "#83a6ed",
  "#8dd1e1",
  "#d084d0",
  "#ffb347",
];

/**
 * Retorna a cor associada a uma instituição financeira
 * @param broker Nome da instituição (deve ser o nome canônico/normalizado)
 * @param index Índice para usar como fallback se a instituição não estiver mapeada
 */
export const getBrokerColor = (broker: string, index: number = 0): string => {
  // Buscar cor exata usando o nome normalizado
  const color = BROKER_COLORS[broker];
  
  if (color) {
    return color;
  }
  
  // Retornar cor padrão baseada no índice
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};
