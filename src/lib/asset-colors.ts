// Mapeamento de cores consistente para classes e subclasses de ativos
// Cores pastel com saturação reduzida para conforto visual
export const ASSET_CLASS_COLORS: Record<string, string> = {
  // Renda Variável - Tons de verde pastel
  'Renda Variável': 'hsl(142, 55%, 55%)',
  'Ações': 'hsl(142, 50%, 58%)',
  'Fundos Imobiliário': 'hsl(142, 45%, 65%)',
  'Derivativos': 'hsl(142, 40%, 70%)',
  
  // Renda Fixa - Tons de azul pastel
  'Renda Fixa': 'hsl(210, 70%, 60%)',
  'Pós': 'hsl(210, 55%, 70%)',
  'Pré': 'hsl(210, 60%, 65%)',
  'Inflação': 'hsl(210, 65%, 58%)',
  
  // Fundos de Investimento - Tons de roxo pastel
  'Fundos de Investimento': 'hsl(270, 50%, 65%)',
  'Multimercado': 'hsl(270, 45%, 62%)',
  'FIDIC': 'hsl(270, 48%, 68%)',
  'Alternativos': 'hsl(270, 42%, 72%)',
  
  // Previdência - Tons de laranja pastel
  'Previdência': 'hsl(30, 65%, 60%)',
  
  // Moedas (para gráfico de distribuição por região)
  'Brasil (BRL)': 'hsl(142, 55%, 55%)',
  'Exterior (USD)': 'hsl(210, 70%, 60%)',
};

// Função para obter a cor de uma classe/subclasse
export const getAssetColor = (name: string): string => {
  return ASSET_CLASS_COLORS[name] || 'hsl(var(--chart-1))';
};

// Função para gerar array de cores baseado nos dados
export const getColorsForData = (data: Array<{ name: string }>): string[] => {
  return data.map(item => getAssetColor(item.name));
};

// Cores alternativas para casos não mapeados (fallback)
export const FALLBACK_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
