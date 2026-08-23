import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Database,
  Building,
  DollarSign,
  Calendar,
  Loader2,
  Play
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SyncLog {
  id: string;
  function_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number;
  error_message: string | null;
  details: Record<string, unknown>;
}

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
}

const SYNC_FUNCTIONS = [
  { name: "sync-economic-indicators", label: "Indicadores Econômicos", icon: TrendingUp },
  { name: "sync-benchmark-indices", label: "Benchmarks (CDI, IBOV, etc.)", icon: TrendingUp },
  { name: "update-fixed-income-values", label: "Renda Fixa", icon: DollarSign },
  { name: "sync-cvm-fund-quotes", label: "Cotas CVM", icon: Building },
  { name: "update-fund-values", label: "Fundos de Investimento", icon: Database },
  { name: "update-portfolio-prices", label: "Preços de Mercado", icon: RefreshCw },
  { name: "daily-portfolio-update", label: "Atualização Diária", icon: Calendar },
];

export const SyncStatusPanel = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningFunctions, setRunningFunctions] = useState<Set<string>>(new Set());

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("sync_execution_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as SyncLog[]);
    }
  };

  const fetchCronJobs = async () => {
    const { data, error } = await supabase.rpc("get_cron_jobs" as never);
    if (!error && data) {
      setCronJobs(data as CronJob[]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchCronJobs()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const runFunction = async (functionName: string) => {
    setRunningFunctions(prev => new Set(prev).add(functionName));
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: functionName === "sync-economic-indicators" ? { initialLoad: false } : {},
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída",
        description: `${functionName} executado com sucesso`,
      });

      await fetchLogs();
    } catch (error: unknown) {
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRunningFunctions(prev => {
        const newSet = new Set(prev);
        newSet.delete(functionName);
        return newSet;
      });
    }
  };

  const getLatestLogForFunction = (functionName: string): SyncLog | undefined => {
    return logs.find(log => log.function_name === functionName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Sucesso</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Parcial</Badge>;
      case "running":
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Executando</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SYNC_FUNCTIONS.map(({ name, label, icon: Icon }) => {
          const latestLog = getLatestLogForFunction(name);
          const isRunning = runningFunctions.has(name);

          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {latestLog ? (
                    <>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(latestLog.status)}
                        <span className="text-xs text-muted-foreground">
                          {latestLog.records_processed} registros
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Última: {formatDistanceToNow(new Date(latestLog.started_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma execução registrada</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => runFunction(name)}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isRunning ? "Executando..." : "Executar Agora"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cron Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cron Jobs Configurados
          </CardTitle>
          <CardDescription>
            Jobs agendados para execução automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cronJobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronJobs.map((job) => (
                  <TableRow key={job.jobid}>
                    <TableCell className="font-medium">{job.jobname}</TableCell>
                    <TableCell className="font-mono text-sm">{job.schedule}</TableCell>
                    <TableCell>
                      {job.active ? (
                        <Badge className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cron job encontrado ou permissão negada para visualizar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Execution Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Timeline de Execuções
              </CardTitle>
              <CardDescription>
                Últimas 50 execuções das funções de sincronização
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const duration = log.completed_at
                    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                    : null;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.started_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.function_name}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.records_processed}</TableCell>
                      <TableCell>
                        {duration !== null ? `${duration}s` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma execução registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
