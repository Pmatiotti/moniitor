import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingDown, Scale, ArrowRight, FileText, Info, CheckCircle } from "lucide-react";
import { Client } from "@/pages/CRM";
import { Progress } from "@/components/ui/progress";
import { PlanData } from "@/types/financial-plan";

interface TaxOptimizerProps {
  client: Client;
  onSaveAsPlan?: (data: PlanData) => void;
}

interface TaxAnalysis {
  totalIncome: number;
  stockTax: number;
  dividendTax: number;
  rentalTax: number;
  otherTax: number;
  irpfReduction: number;
  minimumTax: number;
  totalTax: number;
  effectiveRate: number;
  baseImpostoMinimo: number;
  suggestions: Array<{
    title: string;
    description: string;
    potentialSaving: number;
  }>;
}

export const TaxOptimizer = ({ client, onSaveAsPlan }: TaxOptimizerProps) => {
  // Rendimentos tributáveis
  const [stockGains, setStockGains] = useState("");
  const [dividends, setDividends] = useState("");
  const [rentalIncome, setRentalIncome] = useState("");
  const [otherIncome, setOtherIncome] = useState("");
  
  // Rendimentos excluídos do imposto mínimo (Art. 16-A)
  const [fiiDividends, setFiiDividends] = useState("");
  const [lciLcaIncome, setLciLcaIncome] = useState("");
  const [savingsIncome, setSavingsIncome] = useState("");
  
  const [considerNewLaw, setConsiderNewLaw] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<TaxAnalysis | null>(null);
  const [newLawAnalysis, setNewLawAnalysis] = useState<TaxAnalysis | null>(null);

  const calculateCurrentTaxes = (
    gains: number, 
    divs: number, 
    rental: number, 
    other: number,
    fiiDivs: number,
    lciLca: number,
    savings: number
  ): TaxAnalysis => {
    // IR sobre ganho de capital em ações (15% para vendas acima de 20k/mês)
    const stockTax = gains > 20000 ? gains * 0.15 : 0;

    // Dividendos são isentos no cenário atual (incluindo FIIs)
    const dividendTax = 0;

    // IR sobre aluguel (tabela progressiva simplificada - valores anuais)
    let rentalTax = 0;
    if (rental > 0) {
      if (rental <= 22847.76) rentalTax = 0;
      else if (rental <= 33919.80) rentalTax = rental * 0.075 - 1713.58;
      else if (rental <= 45012.60) rentalTax = rental * 0.15 - 4257.57;
      else if (rental <= 55976.16) rentalTax = rental * 0.225 - 7633.51;
      else rentalTax = rental * 0.275 - 10432.32;
    }

    // IR sobre outras rendas (tabela progressiva)
    let otherTax = 0;
    if (other > 0) {
      if (other <= 22847.76) otherTax = 0;
      else if (other <= 33919.80) otherTax = other * 0.075 - 1713.58;
      else if (other <= 45012.60) otherTax = other * 0.15 - 4257.57;
      else if (other <= 55976.16) otherTax = other * 0.225 - 7633.51;
      else otherTax = other * 0.275 - 10432.32;
    }

    const totalIncome = gains + divs + rental + other + fiiDivs + lciLca + savings;
    const totalTax = Math.max(0, stockTax + dividendTax + rentalTax + otherTax);
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    // Sugestões de otimização
    const suggestions = [];
    
    if (gains > 20000) {
      suggestions.push({
        title: "Fracionamento de Vendas",
        description: "Vendas até R$ 20k/mês são isentas de IR",
        potentialSaving: stockTax * 0.3,
      });
    }

    if (rental > 0 || other > 0) {
      suggestions.push({
        title: "Considerar PGBL",
        description: "Dedução de até 12% da renda bruta",
        potentialSaving: (rental + other) * 0.12 * 0.275,
      });
    }

    if (divs > 0) {
      suggestions.push({
        title: "Aproveitar Isenção de Dividendos",
        description: "Dividendos são isentos no Brasil (legislação atual)",
        potentialSaving: 0,
      });
    }

    return {
      totalIncome,
      stockTax,
      dividendTax,
      rentalTax,
      otherTax,
      irpfReduction: 0,
      minimumTax: 0,
      baseImpostoMinimo: 0,
      totalTax,
      effectiveRate,
      suggestions,
    };
  };

  const calculateNewLawTaxes = (
    gains: number, 
    divs: number, 
    rental: number, 
    other: number,
    fiiDivs: number,
    lciLca: number,
    savings: number
  ): TaxAnalysis => {
    // IR sobre ganho de capital em ações (15% para vendas acima de 20k/mês) - mantém
    const stockTax = gains > 20000 ? gains * 0.15 : 0;

    // Art. 6º-A: Dividendos > R$ 50k/mês por CNPJ = 10% sobre TOTAL
    // Para simulação anual simplificada, consideramos média mensal
    const monthlyAvgDividends = divs / 12;
    const dividendTax = monthlyAvgDividends > 50000 ? divs * 0.10 : 0;

    // IR sobre aluguel (tabela progressiva - mantém)
    let rentalTax = 0;
    if (rental > 0) {
      if (rental <= 22847.76) rentalTax = 0;
      else if (rental <= 33919.80) rentalTax = rental * 0.075 - 1713.58;
      else if (rental <= 45012.60) rentalTax = rental * 0.15 - 4257.57;
      else if (rental <= 55976.16) rentalTax = rental * 0.225 - 7633.51;
      else rentalTax = rental * 0.275 - 10432.32;
    }

    // IR sobre outras rendas
    let otherTax = 0;
    if (other > 0) {
      if (other <= 22847.76) otherTax = 0;
      else if (other <= 33919.80) otherTax = other * 0.075 - 1713.58;
      else if (other <= 45012.60) otherTax = other * 0.15 - 4257.57;
      else if (other <= 55976.16) otherTax = other * 0.225 - 7633.51;
      else otherTax = other * 0.275 - 10432.32;
    }

    // Art. 11-A: Redução do IRPF para rendas tributáveis até R$ 88.200
    const rendaTributavel = rental + other;
    const impostoBase = rentalTax + otherTax;
    let irpfReduction = 0;
    
    if (rendaTributavel <= 60000) {
      // Redução até R$ 2.694,15 de modo que imposto seja zero
      irpfReduction = Math.min(2694.15, impostoBase);
    } else if (rendaTributavel <= 88200) {
      // Redução decrescente linearmente até zerar em R$ 88.200
      irpfReduction = Math.max(0, 8429.73 - (0.095575 * rendaTributavel));
    }

    // Imposto calculado após redução Art. 11-A
    const impostoCalculadoAposReducao = Math.max(0, stockTax + dividendTax + rentalTax + otherTax - irpfReduction);

    // Art. 16-A: Base do imposto mínimo EXCLUI FIIs, LCI/LCA, poupança, ganhos de capital
    // Também exclui dividendos de FIIs com >100 cotistas negociados em bolsa
    const totalIncome = gains + divs + rental + other + fiiDivs + lciLca + savings;
    const baseImpostoMinimo = totalIncome - gains - fiiDivs - lciLca - savings;

    // Alíquota do imposto mínimo (Art. 16-A §2º)
    let aliquotaMinima = 0;
    if (baseImpostoMinimo >= 1200000) {
      aliquotaMinima = 0.10;
    } else if (baseImpostoMinimo > 600000) {
      // Fórmula: Alíquota % = (REND/60.000) - 10
      aliquotaMinima = (baseImpostoMinimo / 60000 - 10) / 100;
    }

    // Imposto mínimo bruto
    const impostoMinimoBruto = baseImpostoMinimo * aliquotaMinima;

    // Deduções do imposto mínimo (Art. 16-A §3º)
    // - IRPF devido na declaração (após redução Art. 11-A)
    // - IRRF retido sobre dividendos (Art. 6º-A)
    // - IRPF pago definitivamente sobre rendimentos
    const deducoesImpostoMinimo = impostoCalculadoAposReducao + dividendTax;
    
    // Imposto mínimo devido (§3º e §4º)
    let impostoMinimoDiferen = Math.max(0, impostoMinimoBruto - deducoesImpostoMinimo);

    // Art. 16-A §5º: Deduz IRRF já retido sobre dividendos (Art. 6º-A)
    // Isso já está incluído nas deduções acima

    const totalTax = impostoCalculadoAposReducao + impostoMinimoDiferen;
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    // Sugestões de otimização para a nova lei
    const suggestions = [];
    
    if (gains > 20000) {
      suggestions.push({
        title: "Fracionamento de Vendas",
        description: "Vendas até R$ 20k/mês continuam isentas de IR",
        potentialSaving: stockTax * 0.3,
      });
    }

    if (monthlyAvgDividends > 50000) {
      suggestions.push({
        title: "Distribuir Dividendos por Múltiplos CNPJs",
        description: "Dividendos até R$ 50k/mês por CNPJ não sofrem IRRF na fonte",
        potentialSaving: dividendTax * 0.3,
      });
    }

    if (fiiDivs > 0 || lciLca > 0) {
      suggestions.push({
        title: "Priorizar FIIs e Títulos Isentos",
        description: "FIIs, LCI, LCA, CRI, CRA e poupança são excluídos da base do imposto mínimo",
        potentialSaving: (fiiDivs + lciLca) * 0.10 * (baseImpostoMinimo > 600000 ? 1 : 0),
      });
    }

    if (baseImpostoMinimo > 600000 && baseImpostoMinimo < 1200000) {
      suggestions.push({
        title: "Gestão de Renda para Faixa Progressiva",
        description: `Sua base de R$ ${(baseImpostoMinimo/1000).toFixed(0)}k está na faixa progressiva (R$ 600k-1.2M). Considere postergar rendimentos.`,
        potentialSaving: impostoMinimoDiferen * 0.2,
      });
    }

    if (rendaTributavel <= 88200 && irpfReduction > 0) {
      suggestions.push({
        title: "Benefício Art. 11-A Aplicado",
        description: `Você tem direito à redução de ${formatCurrency(irpfReduction)} no IRPF`,
        potentialSaving: irpfReduction,
      });
    }

    if (rental > 0 || other > 0) {
      suggestions.push({
        title: "PGBL para Dedução",
        description: "Dedução de até 12% da renda bruta reduz base tributável",
        potentialSaving: (rental + other) * 0.12 * 0.275,
      });
    }

    return {
      totalIncome,
      stockTax,
      dividendTax,
      rentalTax,
      otherTax,
      irpfReduction,
      minimumTax: impostoMinimoDiferen,
      baseImpostoMinimo,
      totalTax,
      effectiveRate,
      suggestions,
    };
  };

  const calculateTaxes = () => {
    const gains = Number(stockGains) || 0;
    const divs = Number(dividends) || 0;
    const rental = Number(rentalIncome) || 0;
    const other = Number(otherIncome) || 0;
    const fiiDivs = Number(fiiDividends) || 0;
    const lciLca = Number(lciLcaIncome) || 0;
    const savings = Number(savingsIncome) || 0;

    const current = calculateCurrentTaxes(gains, divs, rental, other, fiiDivs, lciLca, savings);
    const newLaw = calculateNewLawTaxes(gains, divs, rental, other, fiiDivs, lciLca, savings);

    setCurrentAnalysis(current);
    setNewLawAnalysis(newLaw);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const activeAnalysis = considerNewLaw ? newLawAnalysis : currentAnalysis;
  const hasAnalysis = currentAnalysis !== null && newLawAnalysis !== null;

  const handleSaveAsPlan = () => {
    if (!activeAnalysis || !onSaveAsPlan) return;

    onSaveAsPlan({
      plan_type: "tax",
      title: `Otimização Fiscal ${new Date().getFullYear()} - ${client.name}`,
      description: `Análise tributária ${considerNewLaw ? "considerando Lei 14.973/2025 (vigência 01/01/2026)" : "cenário atual"}.`,
      parameters: {
        "Ganho de Capital": formatCurrency(Number(stockGains) || 0),
        "Dividendos (Ações)": formatCurrency(Number(dividends) || 0),
        "Dividendos FIIs/Fiagro": formatCurrency(Number(fiiDividends) || 0),
        "Rendimentos LCI/LCA/CRI/CRA": formatCurrency(Number(lciLcaIncome) || 0),
        "Rendimentos Poupança": formatCurrency(Number(savingsIncome) || 0),
        "Renda de Aluguel": formatCurrency(Number(rentalIncome) || 0),
        "Outras Rendas Tributáveis": formatCurrency(Number(otherIncome) || 0),
        "Renda Total": formatCurrency(activeAnalysis.totalIncome),
        "Imposto Total": formatCurrency(activeAnalysis.totalTax),
        "Alíquota Efetiva": `${activeAnalysis.effectiveRate.toFixed(2)}%`,
        "Cenário": considerNewLaw ? "Lei 14.973/2025" : "Legislação Atual",
      },
      recommendations: activeAnalysis.suggestions.map(s => ({
        title: s.title,
        description: s.description,
        priority: s.potentialSaving > 10000 ? "high" : "medium",
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Otimização Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Nova Lei */}
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="newlaw-toggle" className="font-medium cursor-pointer">
                Simular Lei 14.973/2025 (Reforma Tributária)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vigência a partir de 01/01/2026
              </p>
            </div>
          </div>
          <Switch
            id="newlaw-toggle"
            checked={considerNewLaw}
            onCheckedChange={setConsiderNewLaw}
          />
        </div>

        {considerNewLaw && (
          <Alert className="border-primary/50 bg-primary/10">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              <strong>Lei aprovada e sancionada.</strong> As regras entram em vigor em 01/01/2026. 
              Esta simulação utiliza os parâmetros definitivos da Lei 14.973/2025.
            </AlertDescription>
          </Alert>
        )}

        {/* Inputs - Rendimentos Tributáveis */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Rendimentos Tributáveis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-gains">Ganho de Capital Ações (R$/ano)</Label>
              <Input
                id="stock-gains"
                type="number"
                value={stockGains}
                onChange={(e) => setStockGains(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dividends">Dividendos de Ações (R$/ano)</Label>
              <Input
                id="dividends"
                type="number"
                value={dividends}
                onChange={(e) => setDividends(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rental">Renda de Aluguel (R$/ano)</Label>
              <Input
                id="rental"
                type="number"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other">Outras Rendas Tributáveis (R$/ano)</Label>
              <Input
                id="other"
                type="number"
                value={otherIncome}
                onChange={(e) => setOtherIncome(e.target.value)}
                placeholder="Salário, pró-labore, etc."
              />
            </div>
          </div>
        </div>

        {/* Inputs - Rendimentos Excluídos do Imposto Mínimo */}
        {considerNewLaw && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">Rendimentos Excluídos do Imposto Mínimo</h4>
              <Badge variant="outline" className="text-xs">Art. 16-A</Badge>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Estes rendimentos são isentos e não entram na base de cálculo do imposto mínimo
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fii-dividends">Dividendos FIIs/Fiagro (R$/ano)</Label>
                <Input
                  id="fii-dividends"
                  type="number"
                  value={fiiDividends}
                  onChange={(e) => setFiiDividends(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lci-lca">LCI/LCA/CRI/CRA/LCD (R$/ano)</Label>
                <Input
                  id="lci-lca"
                  type="number"
                  value={lciLcaIncome}
                  onChange={(e) => setLciLcaIncome(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savings">Rendimentos Poupança (R$/ano)</Label>
                <Input
                  id="savings"
                  type="number"
                  value={savingsIncome}
                  onChange={(e) => setSavingsIncome(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        )}

        <Button onClick={calculateTaxes} className="w-full">
          <Calculator className="mr-2 h-4 w-4" />
          Calcular Impostos
        </Button>

        {hasAnalysis && (
          <div className="space-y-6 pt-6 border-t">
            {/* Comparison Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`transition-all ${!considerNewLaw ? 'ring-2 ring-primary' : 'opacity-75'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline">Cenário Atual (2025)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Renda Total</div>
                    <div className="text-lg font-semibold">{formatCurrency(currentAnalysis!.totalIncome)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Imposto Total</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(currentAnalysis!.totalTax)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Alíquota Efetiva:</span>
                    <Badge variant="secondary">{currentAnalysis!.effectiveRate.toFixed(2)}%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className={`transition-all ${considerNewLaw ? 'ring-2 ring-primary' : 'opacity-75'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary">
                      Lei 14.973/2025 (2026+)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Renda Total</div>
                    <div className="text-lg font-semibold">{formatCurrency(newLawAnalysis!.totalIncome)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Imposto Total</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(newLawAnalysis!.totalTax)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Alíquota Efetiva:</span>
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      {newLawAnalysis!.effectiveRate.toFixed(2)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Impact Summary */}
            {newLawAnalysis!.totalTax !== currentAnalysis!.totalTax && (
              <Card className={newLawAnalysis!.totalTax > currentAnalysis!.totalTax 
                ? "bg-destructive/10 border-destructive/30" 
                : "bg-green-500/10 border-green-500/30"
              }>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ArrowRight className={`h-5 w-5 ${newLawAnalysis!.totalTax > currentAnalysis!.totalTax ? 'text-destructive' : 'text-green-600'}`} />
                    <div>
                      <div className={`font-medium ${newLawAnalysis!.totalTax > currentAnalysis!.totalTax ? 'text-destructive' : 'text-green-600'}`}>
                        Impacto da Lei 14.973: {newLawAnalysis!.totalTax > currentAnalysis!.totalTax ? '+' : ''}
                        {formatCurrency(newLawAnalysis!.totalTax - currentAnalysis!.totalTax)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentAnalysis!.totalTax > 0 ? (
                          `${newLawAnalysis!.totalTax > currentAnalysis!.totalTax ? 'Aumento' : 'Redução'} de ${Math.abs((newLawAnalysis!.totalTax - currentAnalysis!.totalTax) / currentAnalysis!.totalTax * 100).toFixed(1)}% na carga tributária`
                        ) : (
                          'Comparado ao cenário atual'
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tax Breakdown */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">
                Detalhamento ({considerNewLaw ? 'Lei 14.973/2025' : 'Atual'}):
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">IR sobre Ganho de Capital:</span>
                  <span className="font-semibold">{formatCurrency(activeAnalysis!.stockTax)}</span>
                </div>
                
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm flex items-center gap-2">
                    IR sobre Dividendos (IRRF):
                    {considerNewLaw && activeAnalysis!.dividendTax > 0 && (
                      <Badge variant="destructive" className="text-xs">Art. 6º-A</Badge>
                    )}
                  </span>
                  <span className={`font-semibold ${activeAnalysis!.dividendTax > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(activeAnalysis!.dividendTax)}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">IR sobre Aluguel:</span>
                  <span className="font-semibold">{formatCurrency(activeAnalysis!.rentalTax)}</span>
                </div>

                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">IR sobre Outras Rendas:</span>
                  <span className="font-semibold">{formatCurrency(activeAnalysis!.otherTax)}</span>
                </div>

                {considerNewLaw && activeAnalysis!.irpfReduction > 0 && (
                  <div className="flex justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <span className="text-sm flex items-center gap-2">
                      (-) Redução Art. 11-A:
                      <Badge className="text-xs bg-green-500">Benefício</Badge>
                    </span>
                    <span className="font-semibold text-green-600">
                      -{formatCurrency(activeAnalysis!.irpfReduction)}
                    </span>
                  </div>
                )}

                {considerNewLaw && activeAnalysis!.minimumTax > 0 && (
                  <div className="flex justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <span className="text-sm flex items-center gap-2">
                      (+) Imposto Mínimo (Art. 16-A):
                      <Badge variant="destructive" className="text-xs">Alta Renda</Badge>
                    </span>
                    <span className="font-semibold text-destructive">
                      +{formatCurrency(activeAnalysis!.minimumTax)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <span className="text-sm font-semibold">Total a Pagar:</span>
                  <span className="font-bold text-lg">{formatCurrency(activeAnalysis!.totalTax)}</span>
                </div>
              </div>
            </div>

            {/* Base do Imposto Mínimo */}
            {considerNewLaw && newLawAnalysis!.baseImpostoMinimo > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Base do Imposto Mínimo (Art. 16-A)</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span>Base calculada: </span>
                  <span className="font-semibold text-foreground">{formatCurrency(newLawAnalysis!.baseImpostoMinimo)}</span>
                  <span className="text-xs block mt-1">
                    (Exclui ganhos de capital, FIIs, LCI/LCA/CRI/CRA e poupança)
                  </span>
                </div>
                {newLawAnalysis!.baseImpostoMinimo <= 600000 && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                    Abaixo do limite de R$ 600k - sem imposto mínimo
                  </Badge>
                )}
              </div>
            )}

            {/* Effective Rate Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Alíquota Efetiva</span>
                <Badge variant={activeAnalysis!.effectiveRate > 20 ? "destructive" : "default"}>
                  {activeAnalysis!.effectiveRate.toFixed(2)}%
                </Badge>
              </div>
              <Progress value={Math.min(activeAnalysis!.effectiveRate, 100)} />
            </div>

            {/* Optimization Suggestions */}
            {activeAnalysis!.suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">Estratégias de Otimização</h4>
                </div>
                {activeAnalysis!.suggestions.map((suggestion, index) => (
                  <Card key={index} className="bg-green-500/10 border-green-500/20">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{suggestion.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {suggestion.description}
                          </div>
                        </div>
                        {suggestion.potentialSaving > 0 && (
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            Economia: {formatCurrency(suggestion.potentialSaving)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Lei 14.973 Rules Summary */}
            {considerNewLaw && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Regras da Lei 14.973/2025
                    <Badge className="text-xs">Vigência 01/01/2026</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span><strong>Art. 6º-A:</strong> Dividendos &gt; R$ 50k/mês por CNPJ tributados em 10% na fonte (sobre total)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span><strong>Art. 11-A:</strong> Redução de IRPF para renda até R$ 88.200/ano (isenção até R$ 60k)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span><strong>Art. 16-A:</strong> Imposto mínimo 0-10% progressivo para renda R$ 600k-1.2M</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span><strong>Art. 16-A:</strong> Imposto mínimo de 10% garantido para renda acima de R$ 1.2M</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span><strong>Exclusões:</strong> FIIs, LCI, LCA, CRI, CRA, LCD, poupança, ganhos de capital são excluídos da base do imposto mínimo</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-blue-500/10 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>⚖️ Aviso Legal:</strong> Esta é uma simulação simplificada. 
                Consulte um contador ou advogado tributarista para planejamento fiscal 
                personalizado e completo.
              </p>
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
