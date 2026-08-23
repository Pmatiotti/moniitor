import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact, formatAxisTick } from "@/lib/format-utils";
 
interface AnnualData {
  year: number;
  revenue?: number;
  net_income?: number;
  gross_margin?: number;
  net_margin?: number;
  ebitda_margin?: number;
  total_debt?: number;
  net_debt?: number;
  cash_and_equivalents?: number;
  dividends_paid?: number;
  is_financial?: boolean;
  format_flags?: {
    ebitda_applicable?: boolean;
  } | null;
}

interface AnnualHistoryChartsProps {
  ticker: string;
  assetClass: string;
  isFinancial?: boolean;
}

export function AnnualHistoryCharts({ ticker, assetClass, isFinancial = false }: AnnualHistoryChartsProps) {
  const [data, setData] = useState<AnnualData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEbitda, setShowEbitda] = useState(true);

  useEffect(() => {
    const fetchAnnualData = async () => {
      setLoading(true);
      const { data: annualData, error } = await supabase
        .from("annual_fundamentals")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .eq("asset_class", assetClass)
        .gte("year", 2015)
        .order("year", { ascending: true });

      if (error) {
        console.error("Erro ao buscar histórico anual:", error);
      } else if (annualData && annualData.length > 0) {
        setData(annualData as AnnualData[]);
        // Check if any record indicates financial institution
        const anyFinancial = annualData.some((d: any) => 
          d.is_financial || d.format_flags?.ebitda_applicable === false
        );
        setShowEbitda(!isFinancial && !anyFinancial);
      }
      setLoading(false);
    };

    fetchAnnualData();
  }, [ticker, assetClass, isFinancial]);
 
   if (loading) {
     return (
       <div className="space-y-4">
         <Skeleton className="h-[300px] w-full" />
         <Skeleton className="h-[300px] w-full" />
       </div>
     );
   }
 
   if (data.length === 0) {
     return (
       <Card>
         <CardContent className="py-8 text-center text-muted-foreground">
           Histórico anual completo ainda não disponível. Será preenchido pelo robô em breve.
         </CardContent>
       </Card>
     );
   }
 
 
  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    // Database stores percentages as decimals (0.xx), multiply by 100 for display
    return `${(value * 100).toFixed(1)}%`;
  };
 
   return (
     <div className="space-y-6">
       {/* Receita vs Lucro */}
       <Card>
         <CardHeader>
            <CardTitle className="text-lg md:text-xl">Receita vs Lucro Líquido (Anual)</CardTitle>
         </CardHeader>
         <CardContent>
            <ResponsiveContainer width="100%" height={300}>
             <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={formatAxisTick} />
               <Tooltip 
                 formatter={(value) => formatCurrencyCompact(value as number)}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
               />
               <Legend />
               <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" />
               <Bar dataKey="net_income" name="Lucro Líquido" fill="hsl(var(--chart-2))" />
             </BarChart>
           </ResponsiveContainer>
         </CardContent>
       </Card>
 
      {/* Margens */}
      <Card>
        <CardHeader>
           <CardTitle className="text-lg md:text-xl">Margens (Anual)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
               <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
               <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <Tooltip 
                formatter={formatPercent}
                 contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
              />
              <Legend />
              <Line type="monotone" dataKey="gross_margin" name="M. Bruta" stroke="hsl(var(--chart-1))" strokeWidth={2} />
              {showEbitda && (
                <Line type="monotone" dataKey="ebitda_margin" name="M. EBITDA" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="net_margin" name="M. Líquida" stroke="hsl(var(--chart-3))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
 
       {/* Dívida e Caixa */}
       <Card>
         <CardHeader>
            <CardTitle className="text-lg md:text-xl">Dívida vs Caixa (Anual)</CardTitle>
         </CardHeader>
         <CardContent>
            <ResponsiveContainer width="100%" height={300}>
             <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} tickFormatter={formatAxisTick} />
               <Tooltip 
                 formatter={(value) => formatCurrencyCompact(value as number)}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 14 }}
               />
               <Legend />
               <Bar dataKey="net_debt" name="Dívida Líquida" fill="hsl(var(--destructive))" />
               <Bar dataKey="cash_and_equivalents" name="Caixa" fill="hsl(var(--chart-4))" />
             </BarChart>
           </ResponsiveContainer>
         </CardContent>
       </Card>
     </div>
   );
 }