// Mapeamento de palavras-chave para categorias
// O asterisco (*) indica match parcial (ex: mercad* casa com mercado, mercadinho, etc)

export const categoryKeywords: Record<string, string[]> = {
  "Alimentação": [
    "restaurante", "comida", "food", "padaria", "padoca", "mercad", 
    "supermercado", "mercado", "ifood", "uber eats", "delivery", "lanche",
    "açai", "acai", "pizza", "burger", "burg", "cafe", "cafeteria", "bar",
    "marmita", "açougue", "acougue", "quitanda"
  ],
  "Compras": [
    "loja", "shopping", "magazine", "eletro", "americanas", "mercado livre",
    "amazon", "shein", "roupas", "vestuário", "vestuario", "moda", "renner",
    "riachuelo", "sapat", "tenis", "tênis", "celular", "eletrônico", "eletronico",
    "perfume", "cosmético", "cosmetico", "beleza"
  ],
  "Contas": [
    "luz", "energia", "água", "agua", "saneamento", "gás", "gas", "telefone",
    "internet", "vivo", "claro", "tim", "oi", "netflix", "spotify", "assinatura",
    "mensalidade", "boleto", "taxa", "imposto", "iptu", "ipva", "seguro",
    "manutenção", "manutencao"
  ],
  "Educação": [
    "curso", "faculdade", "escola", "mensalidade escolar", "livro",
    "material escolar", "idiomas", "inglês", "ingles", "udemy", "hotmart",
    "treinamento", "workshop", "estudo"
  ],
  "Lazer": [
    "cinema", "show", "festa", "balada", "parque", "viagem", "hotel",
    "airbnb", "passeio", "streaming", "clube", "beer", "pub", "evento",
    "teatro", "música", "musica", "turismo"
  ],
  "Moradia": [
    "aluguel", "condominio", "condomínio", "manutenção casa", "manutencao casa",
    "construção", "construcao", "material construção", "material construcao",
    "móveis", "moveis", "marcenaria", "cama", "mesa", "banho", "reforma",
    "casa", "imóvel", "imovel", "imobiliária", "imobiliaria"
  ],
  "Saúde": [
    "farmácia", "farmacia", "remédio", "remedio", "medicamento", "hospital",
    "medico", "médico", "consulta", "dentista", "clínica", "clinica", "exame",
    "laboratório", "laboratorio", "plano de saúde", "plano de saude",
    "psicólogo", "psicologo", "terapia", "pilates", "academia"
  ],
  "Transporte": [
    "uber", "99", "combust", "gasolina", "etanol", "diesel", "posto",
    "estacionamento", "pedágio", "pedagio", "metro", "metrô", "ônibus", "onibus",
    "transporte", "carro", "manutenção carro", "manutencao carro", "pneu",
    "revisão", "revisao"
  ]
};

/**
 * Sugere uma categoria baseado no título da transação
 * @param title - Título da transação
 * @param categories - Lista de categorias disponíveis do usuário
 * @returns ID da categoria sugerida ou null
 */
export function suggestCategory(
  title: string,
  categories: Array<{ id: string; name: string }>
): string | null {
  if (!title) return null;
  
  const titleLower = title.toLowerCase().trim();
  
  // Procura por palavras-chave em cada categoria
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      // Remove acentos para comparação
      const normalizedKeyword = keyword.toLowerCase();
      const normalizedTitle = titleLower;
      
      // Verifica se a palavra-chave está contida no título
      if (normalizedTitle.includes(normalizedKeyword)) {
        // Busca a categoria do usuário que corresponde ao nome
        const matchedCategory = categories.find(
          cat => cat.name.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (matchedCategory) {
          return matchedCategory.id;
        }
      }
    }
  }
  
  return null;
}
