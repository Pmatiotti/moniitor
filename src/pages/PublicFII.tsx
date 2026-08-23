import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicStockNavbar } from "@/components/layout/PublicStockNavbar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIIHeader } from "@/components/public/FIIHeader";
import { FIIMetricsCards } from "@/components/public/FIIMetricsCards";
import { FIIDividendsSection } from "@/components/public/FIIDividendsSection";
import { FIIDividendsChart } from "@/components/public/FIIDividendsChart";
import { FIIDividendsTable } from "@/components/public/FIIDividendsTable";
import { FIIPriceChart } from "@/components/public/FIIPriceChart";
import { FIIVPHistoryChart } from "@/components/public/FIIVPHistoryChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FIIData {
  ticker: string;
  nome_fundo?: string | null;
  current_price: number;
  day_change: number | null;
  day_change_percent: number | null;
  previous_close: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  year_change_percent: number | null;
  month_change_percent: number | null;
  p_vp: number | null;
  p_vp_calculado: number | null;
  patrimonio_liquido: number | null;
  valor_patrimonial_cota: number | null;
  liquidez_media_diaria: number | null;
  num_cotistas: number | null;
  tipo_fii: string | null;
  segmento: string | null;
  gestor: string | null;
  administrador: string | null;
  data_referencia_cvm: string | null;
  ultimo_dividendo: number | null;
  data_ultimo_dividendo: string | null;
  dividendos_ultimo: { valor: number; percentual: number };
  dividendos_3m: { valor: number; percentual: number };
  dividendos_6m: { valor: number; percentual: number };
  dividendos_12m: { valor: number; percentual: number };
  dividendos_total: { valor: number; percentual: number };
  dividends: Array<{
    valor_por_cota: number;
    data_pagamento: string;
    data_base: string | null;
    tipo: string;
    cotacao_data_base?: number | null;
  }>;
  vp_history: Array<{
    data_referencia: string;
    patrimonio_liquido: number | null;
    valor_patrimonial_cota: number | null;
    num_cotistas?: number | null;
  }>;
  price_history: Array<{
    date: string;
    close: number;
    volume?: number;
  }>;
  sources: string[];
  last_update: string;
}

export default function PublicFII() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<FIIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const tickerUpper = ticker?.toUpperCase() || "";

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      setLoading(true);
      setNotFound(false);
      
      try {
        const { data: fiiData, error } = await supabase.functions.invoke(
          "fetch-public-fii",
          { body: { ticker: tickerUpper } }
        );

        if (error) {
          console.error("Erro ao buscar dados do FII:", error);
          setNotFound(true);
        } else if (fiiData?.success) {
          setData(fiiData as FIIData);
        } else {
          console.log("FII não encontrado:", fiiData?.error);
          setNotFound(true);
        }
      } catch (err) {
        console.error("Erro na chamada da edge function:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, tickerUpper]);

  // SEO meta tags
  useEffect(() => {
    if (tickerUpper) {
      const fundName = data?.nome_fundo ? ` - ${data.nome_fundo}` : "";
      document.title = `${tickerUpper}${fundName} - Análise de FII | MONIITOR`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Análise completa do FII ${tickerUpper}. Dividendos, P/VP, Patrimônio Líquido, Valor Patrimonial e histórico. Dados atualizados automaticamente.`
        );
      }
    }
    
    return () => {
      document.title = "MONIITOR - Gestão Patrimonial Inteligente";
    };
  }, [tickerUpper, data?.nome_fundo]);

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background">
      <PublicStockNavbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </PageWrapper>
    );
  }

  if (notFound || !data) {
    return (
      <PageWrapper>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">FII não encontrado</h1>
          <p className="text-muted-foreground mb-8">
            Não encontramos dados para o ticker "{tickerUpper}".
          </p>
          <Link to="/ticker">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ver lista de ativos
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Back link */}
        <Link to="/ticker" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para lista
        </Link>

        {/* Header with price and basic info */}
        <FIIHeader data={data} />

        {/* Metrics Cards */}
        <FIIMetricsCards data={data} />

        {/* Dividends Section with summary and period table */}
        <FIIDividendsSection data={data} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dividends History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Dividendos</CardTitle>
            </CardHeader>
            <CardContent>
              <FIIDividendsChart data={data} />
            </CardContent>
          </Card>

          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cotação</CardTitle>
            </CardHeader>
            <CardContent>
              <FIIPriceChart data={data} />
            </CardContent>
          </Card>
        </div>

        {/* VP History Chart */}
        {data.vp_history && data.vp_history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução do Valor Patrimonial</CardTitle>
            </CardHeader>
            <CardContent>
              <FIIVPHistoryChart data={data} />
            </CardContent>
          </Card>
        )}

        {/* Full Dividends Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Proventos</CardTitle>
          </CardHeader>
          <CardContent>
            <FIIDividendsTable data={data} />
          </CardContent>
        </Card>

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Acompanhe seus FIIs</h3>
              <p className="text-muted-foreground mb-4">
                Crie uma conta gratuita para monitorar seu portfólio de FIIs, receber alertas de dividendos e muito mais.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/auth">
                  <Button>Criar conta grátis</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline">Entrar</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
