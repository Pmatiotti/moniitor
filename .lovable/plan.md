

# Funcionalidade: Abrir Detalhes de Atividade no Widget "Últimas Interações"

## Problema Identificado

O widget "Últimas Interações" no `ClientDetailsContent.tsx` exibe apenas uma lista simples e não permitir clicar para visualizar os detalhes completos de uma atividade. O componente `InteractionsTimeline.tsx` já possui uma versão completa com expansão de detalhes, mas esse padrão não foi implementado no dashboard/ClientDetailsContent.

## Solução Proposta

Transformar o widget "Últimas Interações" em um componente interativo que:

1. **Exibe lista compacta** das interações mais recentes (como está agora)
2. **Permite clicar** em uma interação para abrir um modal/drawer com detalhes completos
3. **Exibe detalhes da atividade** em um modal incluindo:
   - Tipo de interação (com ícone)
   - Assunto
   - Data completa (formatada em português)
   - Cliente
   - Descrição completa (sem truncamento)

## Implementação Técnica

### Componente: `InteractionDetailDialog.tsx` (Novo)

Criar um novo componente Dialog que exibe os detalhes completos de uma interação:

```tsx
interface Interaction {
  id: string;
  interaction_type: string;
  subject: string;
  description: string | null;
  interaction_date: string;
  client_id: string;
}

export const InteractionDetailDialog = ({
  interaction,
  client,
  open,
  onOpenChange
}: InteractionDetailDialogProps) => {
  // Modal com:
  // - Ícone e badge do tipo
  // - Assunto como titulo
  // - Data formatada
  // - Nome do cliente
  // - Descrição em formato pre-wrap
}
```

### Alteração: `ClientDetailsContent.tsx`

1. Importar `InteractionDetailDialog`
2. Adicionar estado para controlar qual interação está aberta:
   ```tsx
   const [selectedInteraction, setSelectedInteraction] = useState<any>(null);
   const [detailDialogOpen, setDetailDialogOpen] = useState(false);
   ```
3. Tornar itens da lista clicáveis:
   ```tsx
   <div 
     key={interaction.id} 
     className="... cursor-pointer" 
     onClick={() => {
       setSelectedInteraction(interaction);
       setDetailDialogOpen(true);
     }}
   >
   ```
4. Adicionar o Dialog ao final:
   ```tsx
   {selectedInteraction && (
     <InteractionDetailDialog
       interaction={selectedInteraction}
       client={client}
       open={detailDialogOpen}
       onOpenChange={setDetailDialogOpen}
     />
   )}
   ```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/crm/InteractionDetailDialog.tsx` | **Novo** - Dialog para exibir detalhes |
| `src/components/crm/ClientDetailsContent.tsx` | Adicionar interatividade + estado |

## UX Improvements

- Cursor `pointer` nos itens da lista
- Hover effect sutil (aumentar background, shadow)
- Modal exibe informações completas sem truncamento
- Reutiliza helpers existentes (`getInteractionIcon`, `getInteractionLabel`)

