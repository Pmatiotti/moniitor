import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, Users } from "lucide-react";

interface CompanyOverviewProps {
  companyName?: string | null;
  sector?: string | null;
  industry?: string | null;
  businessSummary?: string | null;
  website?: string | null;
  employees?: number | null;
}

export function CompanyOverview({ 
  companyName,
  sector, 
  industry, 
  businessSummary, 
  website, 
  employees 
}: CompanyOverviewProps) {
  // Se não tiver dados suficientes, não renderizar
  if (!companyName && !sector && !businessSummary) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-accent" />
          Sobre a Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome completo e badges de setor/indústria */}
        {(sector || industry) && (
          <div className="flex flex-wrap gap-2">
            {sector && <Badge variant="secondary">{sector}</Badge>}
            {industry && <Badge variant="outline">{industry}</Badge>}
          </div>
        )}
        
        {/* Descrição do negócio */}
        {businessSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {businessSummary}
          </p>
        )}
        
        {/* Info adicional em linha */}
        {(website || employees) && (
          <div className="flex flex-wrap gap-4 text-sm pt-2 border-t">
            {website && (
              <a 
                href={website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            )}
            {employees && employees > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                {employees.toLocaleString('pt-BR')} funcionários
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
