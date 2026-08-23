import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, AlertCircle, Info, FileText } from "lucide-react";
import { Client } from "@/pages/CRM";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlanData } from "@/types/financial-plan";

interface Heir {
  id: string;
  name: string;
  relationship: string;
}

type MarriageRegime = 
  | 'comunhao_parcial'
  | 'comunhao_universal'
  | 'separacao_total'
  | 'separacao_obrigatoria'
  | 'uniao_estavel'
  | 'solteiro';

interface SuccessionConfig {
  marriageRegime: MarriageRegime;
  patrimonioParticular: number;
  itcmdRate: number;
  cartorioRate: number;
  advogadoRate: number;
}

interface SuccessionResult {
  patrimonioTotal: number;
  patrimonioComum: number;
  patrimonioParticular: number;
  meacaoConjuge: number;
  heranca: number;
  itcmd: number;
  cartorio: number;
  advogado: number;
  custoTotal: number;
  patrimonioLiquido: number;
  distribuicao: {
    heir: Heir;
    percentual: number;
    valorBruto: number;
    valorLiquido: number;
  }[];
}

interface SuccessionPlannerProps {
  client: Client;
  onSaveAsPlan?: (data: PlanData) => void;
}

const marriageRegimeLabels: Record<MarriageRegime, string> = {
  comunhao_parcial: "Comunhão Parcial de Bens",
  comunhao_universal: "Comunhão Universal de Bens",
  separacao_total: "Separação Total de Bens",
  separacao_obrigatoria: "Separação Obrigatória",
  uniao_estavel: "União Estável",
  solteiro: "Solteiro(a) / Viúvo(a) / Divorciado(a)",
};

const marriageRegimeDescriptions: Record<MarriageRegime, string> = {
  comunhao_parcial: "Cônjuge tem direito a 50% dos bens adquiridos durante o casamento (meação) + concorre na herança",
  comunhao_universal: "Cônjuge tem direito a 50% de todo o patrimônio (meação) + concorre na herança dos bens particulares",
  separacao_total: "Cônjuge não tem meação, mas concorre na herança com os descendentes",
  separacao_obrigatoria: "Cônjuge não tem meação e NÃO concorre na herança (Súmula 377 STF pode alterar)",
  uniao_estavel: "Equiparado à comunhão parcial - 50% dos bens adquiridos durante a união",
  solteiro: "Sem cônjuge/companheiro - herança dividida entre descendentes ou ascendentes",
};

const relationshipLabels: Record<string, string> = {
  spouse: "Cônjuge/Companheiro(a)",
  child: "Filho(a)",
  parent: "Pai/Mãe",
  sibling: "Irmão(ã)",
  other: "Outro",
};

export const SuccessionPlanner = ({ client, onSaveAsPlan }: SuccessionPlannerProps) => {
  const [heirs, setHeirs] = useState<Heir[]>([
    { id: "1", name: "", relationship: "spouse" },
    { id: "2", name: "", relationship: "child" },
  ]);
  
  const [config, setConfig] = useState<SuccessionConfig>({
    marriageRegime: 'comunhao_parcial',
    patrimonioParticular: 0,
    itcmdRate: 4,
    cartorioRate: 1.5,
    advogadoRate: 4,
  });

  const [calculation, setCalculation] = useState<SuccessionResult | null>(null);

  const patrimonioTotal = Number(client.portfolio_value) || 0;
  
  const patrimonioComum = useMemo(() => {
    return Math.max(0, patrimonioTotal - config.patrimonioParticular);
  }, [patrimonioTotal, config.patrimonioParticular]);

  const hasSpouse = heirs.some(h => h.relationship === 'spouse');
  const children = heirs.filter(h => h.relationship === 'child');
  const hasChildren = children.length > 0;

  const addHeir = () => {
    setHeirs([
      ...heirs,
      { id: Date.now().toString(), name: "", relationship: "child" },
    ]);
  };

  const removeHeir = (id: string) => {
    setHeirs(heirs.filter((h) => h.id !== id));
  };

  const updateHeir = (id: string, field: keyof Heir, value: string) => {
    setHeirs(heirs.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const updateConfig = (field: keyof SuccessionConfig, value: number | MarriageRegime) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const calcularMeacao = (): number => {
    if (!hasSpouse || config.marriageRegime === 'solteiro') return 0;

    switch (config.marriageRegime) {
      case 'comunhao_universal':
        // 50% de TODO o patrimônio
        return patrimonioTotal * 0.5;
      case 'comunhao_parcial':
      case 'uniao_estavel':
        // 50% apenas do patrimônio COMUM
        return patrimonioComum * 0.5;
      case 'separacao_total':
      case 'separacao_obrigatoria':
        // Sem meação
        return 0;
      default:
        return 0;
    }
  };

  const calcularParticipacaoConjugeHeranca = (heranca: number): { conjugeHerda: number; filhosHerdam: number } => {
    if (!hasSpouse || config.marriageRegime === 'solteiro') {
      return { conjugeHerda: 0, filhosHerdam: heranca };
    }

    // Separação obrigatória: cônjuge NÃO concorre na herança
    if (config.marriageRegime === 'separacao_obrigatoria') {
      return { conjugeHerda: 0, filhosHerdam: heranca };
    }

    if (!hasChildren) {
      // Sem filhos: cônjuge herda tudo (ou divide com ascendentes, simplificado aqui)
      return { conjugeHerda: heranca, filhosHerdam: 0 };
    }

    // Com filhos: cônjuge concorre em partes iguais
    const numFilhos = children.length;
    const totalHerdeiros = numFilhos + 1; // filhos + cônjuge
    
    // Regra: cônjuge tem direito a no MÍNIMO 25% se houver 4+ filhos
    let parteConjuge = heranca / totalHerdeiros;
    if (numFilhos >= 4) {
      parteConjuge = Math.max(parteConjuge, heranca * 0.25);
    }
    
    const parteFilhos = heranca - parteConjuge;
    
    return { conjugeHerda: parteConjuge, filhosHerdam: parteFilhos };
  };

  const calculateSuccession = () => {
    const meacao = calcularMeacao();
    const heranca = patrimonioTotal - meacao;
    
    // ITCMD incide apenas sobre a HERANÇA (não sobre meação)
    const itcmd = (heranca * config.itcmdRate) / 100;
    
    // Cartório e advogado incidem sobre patrimônio total
    const cartorio = (patrimonioTotal * config.cartorioRate) / 100;
    const advogado = (patrimonioTotal * config.advogadoRate) / 100;
    
    const custoTotal = itcmd + cartorio + advogado;
    const patrimonioLiquido = patrimonioTotal - custoTotal;

    // Calcular distribuição
    const { conjugeHerda, filhosHerdam } = calcularParticipacaoConjugeHeranca(heranca);
    
    const distribuicao: SuccessionResult['distribuicao'] = [];
    
    // Cônjuge: meação + parte da herança
    const spouse = heirs.find(h => h.relationship === 'spouse');
    if (spouse && hasSpouse && config.marriageRegime !== 'solteiro') {
      const valorBrutoConjuge = meacao + conjugeHerda;
      // ITCMD só sobre a parte da herança, não sobre meação
      const itcmdConjuge = (conjugeHerda * config.itcmdRate) / 100;
      const custoProporcoinal = ((valorBrutoConjuge / patrimonioTotal) * (cartorio + advogado));
      
      distribuicao.push({
        heir: spouse,
        percentual: (valorBrutoConjuge / patrimonioTotal) * 100,
        valorBruto: valorBrutoConjuge,
        valorLiquido: valorBrutoConjuge - itcmdConjuge - custoProporcoinal,
      });
    }
    
    // Filhos: dividem a parte restante igualmente
    if (hasChildren && filhosHerdam > 0) {
      const partePorFilho = filhosHerdam / children.length;
      const itcmdPorFilho = (partePorFilho * config.itcmdRate) / 100;
      
      children.forEach(child => {
        const custoProporcoinal = ((partePorFilho / patrimonioTotal) * (cartorio + advogado));
        distribuicao.push({
          heir: child,
          percentual: (partePorFilho / patrimonioTotal) * 100,
          valorBruto: partePorFilho,
          valorLiquido: partePorFilho - itcmdPorFilho - custoProporcoinal,
        });
      });
    }

    // Outros herdeiros (quando não há cônjuge nem filhos)
    const otherHeirs = heirs.filter(h => h.relationship !== 'spouse' && h.relationship !== 'child');
    if (!hasSpouse && !hasChildren && otherHeirs.length > 0) {
      const partePorHerdeiro = heranca / otherHeirs.length;
      const itcmdPorHerdeiro = (partePorHerdeiro * config.itcmdRate) / 100;
      
      otherHeirs.forEach(heir => {
        const custoProporcoinal = ((partePorHerdeiro / patrimonioTotal) * (cartorio + advogado));
        distribuicao.push({
          heir,
          percentual: (partePorHerdeiro / patrimonioTotal) * 100,
          valorBruto: partePorHerdeiro,
          valorLiquido: partePorHerdeiro - itcmdPorHerdeiro - custoProporcoinal,
        });
      });
    }

    setCalculation({
      patrimonioTotal,
      patrimonioComum,
      patrimonioParticular: config.patrimonioParticular,
      meacaoConjuge: meacao,
      heranca,
      itcmd,
      cartorio,
      advogado,
      custoTotal,
      patrimonioLiquido,
      distribuicao,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleSaveAsPlan = () => {
    if (!calculation || !onSaveAsPlan) return;

    const recommendations: PlanData["recommendations"] = [
      {
        title: "Doação em Vida com Reserva de Usufruto",
        description: "Antecipa ITCMD com alíquota atual e evita custos de inventário.",
        priority: "medium",
      },
      {
        title: "Avaliar Previdência Privada (VGBL)",
        description: "Não entra no inventário em alguns estados.",
        priority: "medium",
      },
    ];

    if (calculation.custoTotal > 100000) {
      recommendations.unshift({
        title: "Holding Familiar",
        description: `Custos de ${formatCurrency(calculation.custoTotal)} justificam avaliação de holding para otimização.`,
        priority: "high",
      });
    }

    onSaveAsPlan({
      plan_type: "succession",
      title: `Planejamento Sucessório - ${client.name}`,
      description: `Simulação de distribuição patrimonial considerando regime ${marriageRegimeLabels[config.marriageRegime]}.`,
      parameters: {
        "Patrimônio Total": formatCurrency(calculation.patrimonioTotal),
        "Regime de Bens": marriageRegimeLabels[config.marriageRegime],
        "Patrimônio Particular": formatCurrency(calculation.patrimonioParticular),
        "Meação do Cônjuge": formatCurrency(calculation.meacaoConjuge),
        "Base para Herança": formatCurrency(calculation.heranca),
        "ITCMD Estimado": formatCurrency(calculation.itcmd),
        "Custos Totais": formatCurrency(calculation.custoTotal),
        "Patrimônio Líquido": formatCurrency(calculation.patrimonioLiquido),
        "Herdeiros": heirs.filter(h => h.name).map(h => h.name).join(", ") || "Não informados",
      },
      recommendations,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Planejamento Sucessório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuração do Regime */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Regime de Bens</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>O regime de bens define como o patrimônio é dividido entre cônjuges e afeta a meação (parte que pertence ao cônjuge sobrevivente) e a herança.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Regime de Casamento</Label>
              <Select
                value={config.marriageRegime}
                onValueChange={(value) => updateConfig('marriageRegime', value as MarriageRegime)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(marriageRegimeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {marriageRegimeDescriptions[config.marriageRegime]}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Patrimônio Particular (R$)</Label>
              <Input
                type="number"
                value={config.patrimonioParticular}
                onChange={(e) => updateConfig('patrimonioParticular', Number(e.target.value))}
                placeholder="Bens anteriores ao casamento"
              />
              <p className="text-xs text-muted-foreground">
                Bens adquiridos antes do casamento ou por herança/doação
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">Patrimônio Total:</span>
              <p className="font-semibold">{formatCurrency(patrimonioTotal)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Patrimônio Comum:</span>
              <p className="font-semibold">{formatCurrency(patrimonioComum)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Alíquotas de Custos */}
        <div className="space-y-4">
          <h3 className="font-semibold">Alíquotas de Custos</h3>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                ITCMD (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Imposto estadual sobre herança. Varia de 1% a 8% conforme o estado.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={config.itcmdRate}
                onChange={(e) => updateConfig('itcmdRate', Math.min(8, Math.max(0, Number(e.target.value))))}
                min={0}
                max={8}
                step={0.5}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Cartório (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Custas de cartório para inventário e escrituras.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={config.cartorioRate}
                onChange={(e) => updateConfig('cartorioRate', Math.max(0, Number(e.target.value)))}
                min={0}
                step={0.5}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Advogado (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Honorários advocatícios. Tabela OAB sugere 4% a 8%.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                value={config.advogadoRate}
                onChange={(e) => updateConfig('advogadoRate', Math.max(0, Number(e.target.value)))}
                min={0}
                step={0.5}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Herdeiros */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Herdeiros e Beneficiários</h3>
            <Button onClick={addHeir} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {heirs.map((heir) => (
            <div key={heir.id} className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Nome</Label>
                <Input
                  value={heir.name}
                  onChange={(e) => updateHeir(heir.id, "name", e.target.value)}
                  placeholder="Nome do herdeiro"
                />
              </div>
              <div className="w-52 space-y-2">
                <Label>Relação</Label>
                <Select
                  value={heir.relationship}
                  onValueChange={(value) => updateHeir(heir.id, "relationship", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(relationshipLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeHeir(heir.id)}
                disabled={heirs.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {!hasSpouse && config.marriageRegime !== 'solteiro' && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Nenhum cônjuge adicionado. Ajuste o regime para "Solteiro" ou adicione um cônjuge.
              </span>
            </div>
          )}
        </div>

        <Button onClick={calculateSuccession} className="w-full">
          Calcular Distribuição Sucessória
        </Button>

        {/* Resultados */}
        {calculation && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Resultado da Simulação</h3>
            
            {/* Meação */}
            {calculation.meacaoConjuge > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Meação do Cônjuge</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Parte que já pertence ao cônjuge (não é herança, não paga ITCMD)
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(calculation.meacaoConjuge)}
                  </span>
                </div>
              </div>
            )}

            {/* Herança e Custos */}
            <div className="grid gap-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm">Herança (base para ITCMD):</span>
                <span className="font-semibold">{formatCurrency(calculation.heranca)}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground block">ITCMD ({config.itcmdRate}%)</span>
                  <span className="font-semibold text-destructive">{formatCurrency(calculation.itcmd)}</span>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground block">Cartório ({config.cartorioRate}%)</span>
                  <span className="font-semibold text-destructive">{formatCurrency(calculation.cartorio)}</span>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg text-center">
                  <span className="text-xs text-muted-foreground block">Advogado ({config.advogadoRate}%)</span>
                  <span className="font-semibold text-destructive">{formatCurrency(calculation.advogado)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-destructive/20 rounded-lg">
                <span className="font-medium">Custo Total da Sucessão:</span>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(calculation.custoTotal)}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                <span className="font-medium">Patrimônio Líquido aos Herdeiros:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(calculation.patrimonioLiquido)}
                </span>
              </div>
            </div>

            {/* Distribuição por Herdeiro */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Distribuição por Herdeiro:</h4>
              {calculation.distribuicao.map((dist, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{dist.heir.name || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">
                          {relationshipLabels[dist.heir.relationship]} • {formatPercent(dist.percentual)} do patrimônio
                        </div>
                        {dist.heir.relationship === 'spouse' && calculation.meacaoConjuge > 0 && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Inclui meação de {formatCurrency(calculation.meacaoConjuge)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {formatCurrency(dist.valorLiquido)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Valor líquido
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between pt-2 border-t">
                      <span>Valor bruto: {formatCurrency(dist.valorBruto)}</span>
                      <span>Descontos: {formatCurrency(dist.valorBruto - dist.valorLiquido)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Dicas */}
            <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <strong>💡 Estratégias de Otimização:</strong>
              </p>
              <ul className="text-sm text-emerald-700 dark:text-emerald-300 mt-2 space-y-1 list-disc list-inside">
                <li>Doação em vida com reserva de usufruto (antecipa ITCMD com alíquota atual)</li>
                <li>Previdência Privada (VGBL) não entra no inventário em alguns estados</li>
                <li>Holding familiar pode facilitar a gestão e reduzir custos</li>
                <li>Seguro de vida é isento de ITCMD e não entra no inventário</li>
              </ul>
            </div>

            {onSaveAsPlan && (
              <Button onClick={handleSaveAsPlan} variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Salvar como Plano
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
