 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { CheckCircle2, AlertTriangle } from "lucide-react";
 import type { StockPillarScores } from "@/lib/stock-pillars";
 
 export function StockChecklist({ scores }: { scores: StockPillarScores }) {
   const allPros: string[] = [];
   const allCons: string[] = [];
 
   for (const pillar of Object.values(scores)) {
     allPros.push(...pillar.pros);
     allCons.push(...pillar.cons);
   }
 
   return (
     <div className="grid md:grid-cols-2 gap-4">
       <Card className="border-l-4 border-l-green-500">
         <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
             <CheckCircle2 className="h-5 w-5 text-green-600" />
             Pontos Positivos
           </CardTitle>
         </CardHeader>
         <CardContent>
           {allPros.length > 0 ? (
             <ul className="space-y-2">
               {allPros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm md:text-base">
                   <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                   <span className="text-foreground">{pro}</span>
                 </li>
               ))}
             </ul>
           ) : (
             <p className="text-sm text-muted-foreground">Nenhum ponto positivo identificado com os dados disponíveis.</p>
           )}
         </CardContent>
       </Card>
 
       <Card className="border-l-4 border-l-orange-500">
         <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-orange-600" />
             Pontos de Atenção
           </CardTitle>
         </CardHeader>
         <CardContent>
           {allCons.length > 0 ? (
             <ul className="space-y-2">
               {allCons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm md:text-base">
                   <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                   <span className="text-foreground">{con}</span>
                 </li>
               ))}
             </ul>
           ) : (
             <p className="text-sm text-muted-foreground">Nenhum ponto de atenção crítico identificado.</p>
           )}
         </CardContent>
       </Card>
     </div>
   );
 }