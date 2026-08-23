import { type FIIData } from "@/pages/PublicFII";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format-utils";
import { 
  DollarSign, 
  TrendingUp, 
  PiggyBank, 
  Building, 
  Users, 
  Percent,
  BarChart3 
} from "lucide-react";

interface FIIMetricsCardsProps {
  data: FIIData;
}

interface MetricCardProps {
  label: string;
  value: string | number | null;
  subValue?: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, subValue, icon }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold">
              {value ?? "—"}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div className="text-muted-foreground/50">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FIIMetricsCards({ data }: FIIMetricsCardsProps) {
  // Format values
  const liquidez = data.liquidez_media_diaria 
    ? formatCurrencyCompact(data.liquidez_media_diaria)
    : "—";
  
  const ultimoDividendo = data.ultimo_dividendo 
    ? formatCurrency(data.ultimo_dividendo)
    : "—";
  
  const dividendYield = data.dividendos_12m?.percentual 
    ? `${data.dividendos_12m.percentual.toFixed(2)}%`
    : "—";
  
  const patrimonioLiquido = data.patrimonio_liquido
    ? formatCurrencyCompact(data.patrimonio_liquido)
    : "—";
  
  const valorPatrimonial = data.valor_patrimonial_cota
    ? formatCurrency(data.valor_patrimonial_cota)
    : "—";
  
  const rentabilidadeMes = data.month_change_percent != null
    ? `${data.month_change_percent >= 0 ? "+" : ""}${data.month_change_percent.toFixed(2)}%`
    : "—";
  
  // Use calculated P/VP if available, otherwise use market P/VP
  const pVP = data.p_vp_calculado ?? data.p_vp;
  const pVPFormatted = pVP ? pVP.toFixed(2) : "—";
  
  const numCotistas = data.num_cotistas 
    ? data.num_cotistas.toLocaleString("pt-BR")
    : "—";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <MetricCard
        label="Liquidez Média Diária"
        value={liquidez}
        icon={<BarChart3 className="h-5 w-5" />}
      />
      
      <MetricCard
        label="Último Rendimento"
        value={ultimoDividendo}
        subValue={data.data_ultimo_dividendo 
          ? new Date(data.data_ultimo_dividendo).toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" })
          : undefined
        }
        icon={<DollarSign className="h-5 w-5" />}
      />
      
      <MetricCard
        label="Dividend Yield"
        value={dividendYield}
        subValue="últ. 12 meses"
        icon={<Percent className="h-5 w-5" />}
      />
      
      <MetricCard
        label="Patrimônio Líquido"
        value={patrimonioLiquido}
        icon={<PiggyBank className="h-5 w-5" />}
      />
      
      <MetricCard
        label="Valor Patrimonial"
        value={valorPatrimonial}
        subValue="por cota"
        icon={<Building className="h-5 w-5" />}
      />
      
      <MetricCard
        label="Rentab. no mês"
        value={rentabilidadeMes}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      
      <MetricCard
        label="P/VP"
        value={pVPFormatted}
        subValue={data.num_cotistas ? `${numCotistas} cotistas` : undefined}
        icon={<Users className="h-5 w-5" />}
      />
    </div>
  );
}
