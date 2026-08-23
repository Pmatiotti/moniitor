import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  PortfolioSnapshot, 
  PerformanceMetrics, 
  CashFlowEntry,
  calculateAllMetrics,
  calculateTWR,
  calculateXIRR,
  prepareXIRRCashFlows
} from '@/lib/performance-calculations';

interface BenchmarkData {
  cdi: number;
  ipca: number;
  selic: number;
}

interface CashFlow {
  id: string;
  user_id: string;
  flow_type: 'deposit' | 'withdrawal';
  amount: number;
  flow_date: string;
  description: string | null;
  asset_id: string | null;
  created_at: string;
}

interface UsePortfolioMetricsResult {
  metrics: PerformanceMetrics | null;
  snapshots: PortfolioSnapshot[];
  benchmarks: BenchmarkData | null;
  cashFlows: CashFlow[];
  loading: boolean;
  error: string | null;
  hasEnoughData: boolean;
  sinceInceptionReturn: number | null;
  twr: number | null;
  xirr: number | null;
  createSnapshot: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  reconstructHistory: () => Promise<boolean>;
}

export function usePortfolioMetrics(period: 'month' | '3m' | '6m' | '12m' | 'year' | 'all' | 'inception' = '12m'): UsePortfolioMetricsResult {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinceInceptionReturn, setSinceInceptionReturn] = useState<number | null>(null);
  const [twr, setTwr] = useState<number | null>(null);
  const [xirr, setXirr] = useState<number | null>(null);
  const { toast } = useToast();

  // Calcula a data de início baseado no período
  const getStartDate = useCallback(() => {
    const now = new Date();
    switch (period) {
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case '3m':
        return new Date(now.setMonth(now.getMonth() - 3));
      case '6m':
        return new Date(now.setMonth(now.getMonth() - 6));
      case '12m':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      case 'year':
        return new Date(now.getFullYear(), 0, 1); // Início do ano atual
      case 'inception':
      case 'all':
        return new Date(2020, 0, 1); // Data bem antiga para pegar tudo
      default:
        return new Date(now.setFullYear(now.getFullYear() - 1));
    }
  }, [period]);

  // Busca snapshots do portfólio
  const fetchSnapshots = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return [];
      }

      const startDate = getStartDate().toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('snapshot_date', startDate)
        .order('snapshot_date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching snapshots:', fetchError);
        setError('Erro ao buscar histórico');
        return [];
      }

      return (data || []) as PortfolioSnapshot[];
    } catch (err) {
      console.error('Error in fetchSnapshots:', err);
      setError('Erro ao buscar histórico');
      return [];
    }
  }, [getStartDate]);

  // Busca fluxos de caixa
  const fetchCashFlows = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = getStartDate().toISOString().split('T')[0];

      const { data, error: fetchError } = await supabase
        .from('portfolio_cash_flows')
        .select('*')
        .eq('user_id', user.id)
        .gte('flow_date', startDate)
        .order('flow_date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching cash flows:', fetchError);
        return [];
      }

      return (data || []) as CashFlow[];
    } catch (err) {
      console.error('Error in fetchCashFlows:', err);
      return [];
    }
  }, [getStartDate]);

  // Busca dados de benchmark (CDI)
  const fetchBenchmarks = useCallback(async () => {
    try {
      // Busca a média dos últimos 12 meses de cada benchmark
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error: fetchError } = await supabase
        .from('benchmark_data')
        .select('*')
        .gte('date', oneYearAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (fetchError || !data || data.length === 0) {
        // Retorna valores padrão se não houver dados
        return { cdi: 12.15, ipca: 4.5, selic: 12.25 };
      }

      // Agrupa por tipo e calcula a soma (para taxa anualizada)
      const cdiData = data.filter(d => d.benchmark_type === 'CDI');
      const ipcaData = data.filter(d => d.benchmark_type === 'IPCA');
      const selicData = data.filter(d => d.benchmark_type === 'SELIC');

      // Para CDI mensal, soma os valores para obter aproximação anual
      const cdiAnnual = cdiData.reduce((sum, d) => sum + d.value, 0);
      const ipcaAnnual = ipcaData.reduce((sum, d) => sum + d.value, 0);
      const selicAnnual = selicData.length > 0 ? selicData[0].value : 12.25;

      return {
        cdi: cdiAnnual || 12.15,
        ipca: ipcaAnnual || 4.5,
        selic: selicAnnual
      };
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
      return { cdi: 12.15, ipca: 4.5, selic: 12.25 };
    }
  }, []);

  // Cria um novo snapshot
  const createSnapshot = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-portfolio-snapshot');

      if (invokeError) {
        console.error('Error creating snapshot:', invokeError);
        toast({
          title: 'Erro ao criar snapshot',
          description: invokeError.message,
          variant: 'destructive'
        });
        return false;
      }

      if (data?.success) {
        toast({
          title: 'Snapshot criado',
          description: `Valor do portfólio: R$ ${data.snapshot.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in createSnapshot:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao criar snapshot do portfólio',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Reconstrói histórico para usuários existentes
  const reconstructHistory = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('reconstruct-portfolio-history');

      if (invokeError) {
        console.error('Error reconstructing history:', invokeError);
        toast({
          title: 'Erro ao reconstruir histórico',
          description: invokeError.message,
          variant: 'destructive'
        });
        return false;
      }

      if (data?.success) {
        toast({
          title: 'Histórico reconstruído',
          description: `${data.snapshotsCreated} snapshot(s) criado(s). Rentabilidade: ${data.returnPercent?.toFixed(2)}%`
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in reconstructHistory:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao reconstruir histórico',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Atualiza todos os dados
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [snapshotsData, cashFlowsData, benchmarksData] = await Promise.all([
        fetchSnapshots(),
        fetchCashFlows(),
        fetchBenchmarks()
      ]);

      setSnapshots(snapshotsData);
      setCashFlows(cashFlowsData);
      setBenchmarks(benchmarksData);

      if (snapshotsData.length >= 2) {
        // Converter fluxos de caixa para o formato esperado
        const cashFlowEntries: CashFlowEntry[] = cashFlowsData.map(cf => ({
          amount: cf.flow_type === 'deposit' ? cf.amount : -cf.amount,
          date: cf.flow_date
        }));

        const calculatedMetrics = calculateAllMetrics(snapshotsData, benchmarksData.cdi, cashFlowEntries);
        setMetrics(calculatedMetrics);
        setTwr(calculatedMetrics.twr);
        setXirr(calculatedMetrics.xirr);

        // Calcular retorno desde o início usando TWR
        setSinceInceptionReturn(calculatedMetrics.twr);
      } else {
        setMetrics(null);
        setSinceInceptionReturn(null);
        setTwr(null);
        setXirr(null);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshots, fetchCashFlows, fetchBenchmarks]);

  // Carrega dados iniciais
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    metrics,
    snapshots,
    benchmarks,
    cashFlows,
    loading,
    error,
    hasEnoughData: snapshots.length >= 2,
    sinceInceptionReturn,
    twr,
    xirr,
    createSnapshot,
    refreshData,
    reconstructHistory
  };
}
