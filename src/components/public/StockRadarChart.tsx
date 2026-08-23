import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, TrendingUp, Heart, DollarSign, BarChart3 } from "lucide-react";
import type { StockPillarScores } from "@/lib/stock-pillars";

export function StockRadarChart({ scores }: { scores: StockPillarScores }) {
  const data = [
    { subject: "Valuation", A: scores.valuation.score, fullMark: 100 },
    { subject: "Performance", A: scores.performance.score, fullMark: 100 },
    { subject: "Saúde", A: scores.health.score, fullMark: 100 },
    { subject: "Dividendos", A: scores.dividends.score, fullMark: 100 },
  ];

  const avgScore = Math.round(
    (scores.valuation.score + scores.performance.score + scores.health.score + scores.dividends.score) / 4
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Resumo Visual</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  Metodologia de Pontuação
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  O score de cada pilar varia de 0 a 100, calculado com base em indicadores fundamentalistas e benchmarks de referência global.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <DollarSign className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium">Valuation</h4>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Avalia múltiplos como P/L, P/VP e EV/EBITDA. Scores maiores indicam valuations mais atrativos (múltiplos menores).
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <TrendingUp className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium">Performance</h4>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Mede rentabilidade através de ROE, ROA e Margem Líquida. Scores maiores indicam empresas mais lucrativas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Heart className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium">Saúde Financeira</h4>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Analisa Liquidez Corrente, Dív. Líquida/PL e Dív. Líquida/EBITDA. Scores maiores indicam menor risco de solvência.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <BarChart3 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium">Dividendos</h4>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Considera Dividend Yield e Payout. Equilibra rendimento atual com sustentabilidade dos proventos.
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground border-t pt-3">
                  ⚠️ Esta análise é meramente informativa e não constitui recomendação de investimento. Faça sua própria análise antes de investir.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="relative pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.5}
              gridType="circle"
            />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ 
                fill: "hsl(var(--muted-foreground))", 
                fontSize: 12,
                fontWeight: 500 
              }}
              tickLine={false}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar 
              name="Score" 
              dataKey="A" 
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="hsl(var(--accent))"
              fillOpacity={0.45}
              dot={{ r: 4, fill: "hsl(var(--accent))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))", 
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
          </RadarChart>
        </ResponsiveContainer>
        
        {/* Score central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-3xl font-bold text-accent">{avgScore}</span>
            <span className="text-xs text-muted-foreground block mt-0.5">Score</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
