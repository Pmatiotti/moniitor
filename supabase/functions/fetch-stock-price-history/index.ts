import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RangeKey = "6mo" | "1mo" | "1y" | "5y";
type IntervalKey = "1d" | "1wk";

function normalizeTicker(input: string): string {
  return input.toUpperCase().trim().replace(".SA", "");
}

function toISODate(dateLike: unknown): string | null {
  // BRAPI sometimes returns unix seconds in `date`, or string in `formattedDate`.
  if (typeof dateLike === "number" && Number.isFinite(dateLike)) {
    const ms = dateLike > 10_000_000_000 ? dateLike : dateLike * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  if (typeof dateLike === "string") {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function outputSizeForRange(range: RangeKey): number {
  // Trading days approximation for daily candles
  if (range === "1mo") return 40;
  if (range === "6mo") return 160;
  if (range === "1y") return 320;
  if (range === "5y") return 2000;
  return 200;
}

async function fetchHistoryFromTwelveData(opts: {
  ticker: string;
  range: RangeKey;
  interval: IntervalKey;
  apiKey: string;
}): Promise<Array<Record<string, unknown>>> {
  const intervalMap: Record<IntervalKey, string> = {
    "1d": "1day",
    "1wk": "1week",
  };

  // For Brazilian tickers, Twelve Data typically expects ".SA".
  const symbol = `${opts.ticker}.SA`;
  const outputsize = outputSizeForRange(opts.range);

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(
    intervalMap[opts.interval] ?? "1day"
  )}&outputsize=${outputsize}&apikey=${encodeURIComponent(opts.apiKey)}`;

  console.log(`Falling back to Twelve Data for ${symbol} (outputsize=${outputsize})`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Twelve Data error: ${res.status}`);
  }

  const json = await res.json();
  if (json?.status === "error") {
    throw new Error(`Twelve Data error: ${json?.message ?? "unknown"}`);
  }

  const values = Array.isArray(json?.values) ? json.values : [];
  // Twelve Data returns most recent first.
  const records = values
    .map((v: Record<string, unknown>) => {
      const isoDate = toISODate(v.datetime);
      if (!isoDate) return null;

      const open = Number(v.open);
      const high = Number(v.high);
      const low = Number(v.low);
      const close = Number(v.close);
      const volume = v.volume == null ? null : Number(v.volume);

      return {
        ticker: opts.ticker,
        date: isoDate,
        open_price: Number.isFinite(open) ? open : null,
        high_price: Number.isFinite(high) ? high : null,
        low_price: Number.isFinite(low) ? low : null,
        close_price: Number.isFinite(close) ? close : null,
        volume: volume != null && Number.isFinite(volume) ? Math.trunc(volume) : null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return records;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { ticker, range = "6mo", interval = "1d", saveToCache = true, force = false } = body as {
      ticker?: string;
      range?: RangeKey;
      interval?: IntervalKey;
      saveToCache?: boolean;
      force?: boolean;
    };

    if (!ticker) {
      return new Response(JSON.stringify({ error: "Ticker is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BRAPI_API_KEY = Deno.env.get("BRAPI_API_KEY");
    if (!BRAPI_API_KEY) {
      console.error("BRAPI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Backend not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const t = normalizeTicker(ticker);

    // If not forced, short-circuit when we already have recent data in cache.
    if (!force) {
      const { data: lastRow, error: lastErr } = await supabase
        .from("stock_price_history")
        .select("date")
        .eq("ticker", t)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) {
        console.warn("Could not read last cache row:", lastErr);
      } else if (lastRow?.date) {
        const lastDate = new Date(String(lastRow.date));
        const ageMs = Date.now() - lastDate.getTime();
        // If latest candle is from the last 7 days, we consider cache fresh enough.
        if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000) {
          return new Response(JSON.stringify({ ok: true, ticker: t, skipped: true, reason: "cache_fresh" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    let records: Array<Record<string, unknown>> = [];

    // 1) Try BRAPI first
    try {
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(t)}?token=${BRAPI_API_KEY}&range=${encodeURIComponent(
        range
      )}&interval=${encodeURIComponent(interval)}`;
      console.log(`Fetching history for ${t} range=${range} interval=${interval}`);

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const stock = json?.results?.[0];
        const history = stock?.historicalDataPrice;
        if (Array.isArray(history) && history.length > 0) {
          records = history
            .map((item: Record<string, unknown>) => {
              const isoDate = toISODate(item.date ?? item.formattedDate ?? item.datetime);
              if (!isoDate) return null;

              const open = Number(item.open);
              const high = Number(item.high);
              const low = Number(item.low);
              const close = Number(item.close);
              const volume = item.volume == null ? null : Number(item.volume);

              return {
                ticker: t,
                date: isoDate,
                open_price: Number.isFinite(open) ? open : null,
                high_price: Number.isFinite(high) ? high : null,
                low_price: Number.isFinite(low) ? low : null,
                close_price: Number.isFinite(close) ? close : null,
                volume: volume != null && Number.isFinite(volume) ? Math.trunc(volume) : null,
                updated_at: new Date().toISOString(),
              };
            })
            .filter(Boolean) as Array<Record<string, unknown>>;
        }
      } else {
        console.error(`BRAPI error: ${res.status}`);
      }
    } catch (e) {
      console.error("BRAPI fetch failed:", e);
    }

    // 2) Fallback to Twelve Data if BRAPI is down/empty
    if (records.length === 0) {
      const TWELVE_DATA_API_KEY = Deno.env.get("TWELVE_DATA_API_KEY");
      if (!TWELVE_DATA_API_KEY) {
        return new Response(JSON.stringify({ ok: false, error: "No historical data (providers unavailable)" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        records = await fetchHistoryFromTwelveData({
          ticker: t,
          range,
          interval,
          apiKey: TWELVE_DATA_API_KEY,
        });
      } catch (e) {
        console.error("Twelve Data fallback failed:", e);
        return new Response(JSON.stringify({ ok: false, error: "No historical data" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!saveToCache) {
      return new Response(JSON.stringify({ ok: true, ticker: t, points: records.length, saved: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await supabase
      .from("stock_price_history")
      .upsert(records, { onConflict: "ticker,date" });

    if (upsertError) {
      console.error("Error upserting stock_price_history:", upsertError);
      return new Response(JSON.stringify({ ok: false, error: "Upsert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ticker: t, points: records.length, saved: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-stock-price-history:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
