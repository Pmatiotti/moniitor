import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Coins } from "lucide-react";
import { PeriodFilterOptions, filterDividends } from "@/lib/dividend-filter";
import { DividendsPeriodFilter } from "@/components/dividends/DividendsPeriodFilter";
import { supabase } from "@/integrations/supabase/client";
import { AddDividendDialog } from "@/components/dividends/AddDividendDialog";
import { UploadDividendsDialog } from "@/components/dividends/UploadDividendsDialog";
import { DividendsSummaryChart } from "@/components/dividends/DividendsSummaryChart";
import { DividendsYearlyTable } from "@/components/dividends/DividendsYearlyTable";
import { DividendsByPeriodChart } from "@/components/dividends/DividendsByPeriodChart";
import { DividendsByAssetChart } from "@/components/dividends/DividendsByAssetChart";
import { UpcomingDividendsCard } from "@/components/dividends/UpcomingDividendsCard";
import { DividendsCalendar } from "@/components/dividends/DividendsCalendar";
import { EmptyState } from "@/components/ui/empty-state";


export interface Dividend {
  id: string;
  ticker: string;
  dividend_type: string;
  amount: number;
  payment_date: string;
  ex_date: string;
  asset_class?: string;
  market_type?: string;
}

export interface UpcomingDividend {
  ticker: string;
  dividend_type: string;
  amount_per_share?: number;
  rate?: number;
  expected_total?: number;
  expected_amount?: number;
  payment_date: string;
  ex_date: string | null;
  quantity: number;
  source: string;
}

const Dividends = () => {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [upcomingDividends, setUpcomingDividends] = useState<UpcomingDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterOptions>({ type: 'all' });

  // Apply filter to dividends
  const filteredDividends = useMemo(() => {
    return filterDividends(dividends, periodFilter);
  }, [dividends, periodFilter]);

  useEffect(() => {
    fetchDividends();
    fetchUpcomingDividends();
  }, []);

  const fetchDividends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("dividends")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir proventos de clientes
        .order("payment_date", { ascending: false });

      if (error) throw error;

      setDividends(data || []);
    } catch (error) {
      console.error("Error fetching dividends:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingDividends = async () => {
    try {
      // First, try to get from the database table (populated by scheduled job)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbDividends, error: dbError } = await supabase
          .from('upcoming_dividends')
          .select('ticker, dividend_type, rate, expected_amount, payment_date, ex_date, quantity, source')
          .eq('user_id', user.id)
          .is('client_id', null) // Excluir proventos de clientes
          .gte('payment_date', new Date().toISOString().split('T')[0])
          .order('payment_date', { ascending: true });
        
        if (!dbError && dbDividends && dbDividends.length > 0) {
          // Map database format to expected format
          const mappedDividends = dbDividends.map(d => ({
            ...d,
            amount_per_share: d.rate,
            expected_total: d.expected_amount,
          }));
          setUpcomingDividends(mappedDividends as UpcomingDividend[]);
          return;
        }
      }
      
      // Fallback: call edge function for real-time data
      const { data, error } = await supabase.functions.invoke('fetch-upcoming-dividends');

      if (error) throw error;

      setUpcomingDividends(data.upcomingDividends || []);
    } catch (error) {
      console.error("Error fetching upcoming dividends:", error);
    }
  };


  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-foreground">Proventos</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <DividendsPeriodFilter
              dividends={dividends}
              filter={periodFilter}
              onFilterChange={setPeriodFilter}
            />
            <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Provento
            </Button>
          </div>
        </div>

        {/* Upcoming Dividends & Summary Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UpcomingDividendsCard 
            upcomingDividends={upcomingDividends} 
            onRefresh={fetchUpcomingDividends}
            loading={loading}
          />
          <DividendsSummaryChart dividends={filteredDividends} periodFilter={periodFilter} />
        </div>

        {/* Calendar */}
        <DividendsCalendar dividends={filteredDividends} upcomingDividends={upcomingDividends} />

        {dividends.length === 0 && upcomingDividends.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Nenhum provento registrado"
            description="Comece importando seu extrato de proventos ou adicione manualmente seus dividendos, JCP e outros rendimentos."
            actionLabel="Adicionar Provento"
            onAction={() => setDialogOpen(true)}
            secondaryActionLabel="Importar Excel"
            onSecondaryAction={() => setUploadDialogOpen(true)}
          />
        ) : (
          <>
            <DividendsYearlyTable dividends={filteredDividends} />
            <DividendsByPeriodChart dividends={filteredDividends} periodFilter={periodFilter} />
            <DividendsByAssetChart dividends={filteredDividends} periodFilter={periodFilter} />
          </>
        )}
        
        <AddDividendDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchDividends}
        />
        
        
        <UploadDividendsDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={fetchDividends}
        />
      </div>
    </AppLayout>
  );
};

export default Dividends;
