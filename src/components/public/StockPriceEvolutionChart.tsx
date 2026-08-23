import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PeriodFilter = "5d" | "1m" | "6m" | "12m";

type PriceRow = {
  date: string;
  close_price: number | null;
};

const MIN_POINTS = 20;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  "5d": "5 dias",
  "1m": "1 mês",
  "6m": "6 meses",
  "12m": "12 meses",
};

export function StockPriceEvolutionChart({
  ticker,
  variant = "default",
}: {
  ticker: string;
  variant?: "default" | "compact" | "hero";
}) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("6m");

  // Always fetch 12 months to have all periods available
  const fromDate = useMemo(() => subMonths(new Date(), 12), []);
  const fromDateISO = useMemo(() => fromDate.toISOString().slice(0, 10), [fromDate]);
  const ttlKey = useMemo(() => (ticker ? `public_stock_price_history_last_fetch_${ticker}` : null), [ticker]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const fetchFromDb = useCallback(async () => {
    const { data, error } = await supabase
      .from("stock_price_history")
      .select("date, close_price")
      .eq("ticker", ticker.toUpperCase())
      .gte("date", fromDateISO)
      .order("date", { ascending: true });

    if (error) throw error;
    return (data ?? []) as PriceRow[];
  }, [fromDateISO, ticker]);

  const shouldRefetch = useCallback(() => {
    if (!ttlKey) return true;
    try {
      const last = Number(localStorage.getItem(ttlKey));
      if (!Number.isFinite(last) || last <= 0) return true;
      return Date.now() - last > TTL_MS;
    } catch {
      return true;
    }
  }, [ttlKey]);

  const refreshHistory = useCallback(
    async ({ force }: { force: boolean }) => {
      if (!ticker) return;
      setRefreshing(true);
      setError(null);
      try {
        const { error: invokeError } = await supabase.functions.invoke("fetch-stock-price-history", {
          body: {
            ticker: ticker.toUpperCase(),
            range: "1y", // Always fetch 12 months
            interval: "1d",
            saveToCache: true,
            force,
          },
        });

        if (invokeError) throw invokeError;

        try {
          if (ttlKey) localStorage.setItem(ttlKey, String(Date.now()));
        } catch {
          // ignore
        }

        const fresh = await fetchFromDb();
        setRows(fresh);
      } catch (e) {
        console.error("Erro ao atualizar histórico de preços:", e);
        setError("Não foi possível carregar o histórico de preços agora.");
      } finally {
        setRefreshing(false);
      }
    },
    [fetchFromDb, ticker, ttlKey]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!ticker) return;
      setLoading(true);
      setError(null);

      try {
        const initial = await fetchFromDb();
        if (cancelled) return;
        setRows(initial);

        const needMoreData = initial.length < MIN_POINTS;
        const canRefetch = shouldRefetch();

        if ((needMoreData || canRefetch) && !cancelled) {
          await refreshHistory({ force: needMoreData });
        }
      } catch (e) {
        console.error("Erro ao buscar histórico de preços no banco:", e);
        if (!cancelled) setError("Não foi possível carregar o histórico de preços.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [fetchFromDb, refreshHistory, shouldRefetch, ticker]);

  // Filter data based on selected period
  const chartData = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case "5d":
        cutoffDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case "1m":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "6m":
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
      default:
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    return rows
      .filter((r) => new Date(r.date) >= cutoffDate && r.close_price !== null && r.close_price !== undefined)
      .map((r) => {
        const dt = new Date(r.date);
        return {
          date: format(dt, "dd/MM", { locale: ptBR }),
          fullDate: format(dt, "dd/MM/yyyy", { locale: ptBR }),
          value: Number(r.close_price),
        };
      });
  }, [rows, period]);

  // Calculate Y-axis domain based on filtered data
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.1; // 10% padding above and below
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const chartHeightClass =
    variant === "hero" ? "h-64" : variant === "compact" ? "h-64" : "h-64";

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4">
          <CardTitle className="text-base font-medium">Cotação</CardTitle>
          <Skeleton className="h-7 w-20" />
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-4">
          <div className="flex gap-2 mb-4">
            {(["5d", "1m", "6m", "12m"] as PeriodFilter[]).map((p) => (
              <Skeleton key={p} className="h-8 w-16" />
            ))}
          </div>
          <Skeleton className={`${chartHeightClass} w-full`} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4">
          <CardTitle className="text-base font-medium">Cotação</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refreshHistory({ force: true })} disabled={refreshing} className="h-7 text-xs">
            {refreshing ? "Atualizando..." : "Tentar de novo"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-4 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4">
          <CardTitle className="text-base font-medium">Cotação</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refreshHistory({ force: true })} disabled={refreshing} className="h-7 text-xs">
            {refreshing ? "Carregando..." : "Carregar"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-4 text-sm text-muted-foreground">
          Ainda não há histórico de preços disponível para este ativo.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/50">
      <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4">
        <CardTitle className="text-base font-medium">Cotação</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshHistory({ force: true })}
          disabled={refreshing}
          className="h-7 text-xs"
        >
          {refreshing ? "Atualizando..." : "Atualizar"}
        </Button>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        {/* Period filter buttons */}
        <div className="flex gap-2 mb-4">
          {(["5d", "1m", "6m", "12m"] as PeriodFilter[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-8"
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>

        <div className={`${chartHeightClass} w-full`}>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                <XAxis
                  dataKey="date"
                  className="text-xs fill-foreground/60"
                  tick={{ fontSize: 10 }}
                  minTickGap={24}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs fill-foreground/60"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  width={70}
                  domain={yAxisDomain}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label, payload) => {
                    const full = payload?.[0]?.payload?.fullDate as string | undefined;
                    return full ? full : String(label);
                  }}
                  formatter={(value: number) => [formatCurrency(Number(value)), "Preço"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  fill="url(#priceArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
