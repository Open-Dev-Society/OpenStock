export interface Candle4h {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinnhubCandleResponse {
  s: string;
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  t?: number[];
  v?: number[];
}

export async function getOhlcv4h(
  symbol: string,
  from: number,
  to: number
): Promise<Candle4h[]> {
  const baseUrl = process.env.FINNHUB_BASE_URL || "https://finnhub.io/api/v1";
  const apiKey =
    process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "";

  if (!apiKey) {
    throw new Error("getOhlcv4h: missing Finnhub API key in environment");
  }

  // Request resolution 60 (1-hour) and aggregate into 4-hour bars within each trading day
  const url = `${baseUrl}/stock/candle?symbol=${encodeURIComponent(
    symbol.toUpperCase()
  )}&resolution=60&from=${Math.floor(from)}&to=${Math.floor(to)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Finnhub-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `getOhlcv4h: Finnhub HTTP ${res.status} for ${symbol} (${res.statusText})`
    );
  }

  const data: FinnhubCandleResponse = await res.json();

  if (data.s !== "ok" || !data.t || !data.c || data.t.length === 0) {
    throw new Error(`getOhlcv4h: no candle data returned for ${symbol} (status: ${data.s})`);
  }

  // Parse raw 1h candles
  const hourlyCandles = data.t.map((timestamp, i) => ({
    time: new Date(timestamp * 1000),
    open: data.o ? data.o[i] : data.c![i],
    high: data.h ? data.h[i] : data.c![i],
    low: data.l ? data.l[i] : data.c![i],
    close: data.c![i],
    volume: data.v ? data.v[i] : 0,
  }));

  // Aggregate hourly bars into 4-hour sessions within same trading day
  const candles4h: Candle4h[] = [];
  let currentGroup: typeof hourlyCandles = [];

  for (const bar of hourlyCandles) {
    const isNewDay =
      currentGroup.length > 0 &&
      currentGroup[0].time.getUTCDate() !== bar.time.getUTCDate();

    if (currentGroup.length === 4 || isNewDay) {
      if (currentGroup.length > 0) {
        candles4h.push({
          time: currentGroup[0].time,
          open: currentGroup[0].open,
          high: Math.max(...currentGroup.map((c) => c.high)),
          low: Math.min(...currentGroup.map((c) => c.low)),
          close: currentGroup[currentGroup.length - 1].close,
          volume: currentGroup.reduce((sum, c) => sum + c.volume, 0),
        });
      }
      currentGroup = [bar];
    } else {
      currentGroup.push(bar);
    }
  }

  if (currentGroup.length > 0) {
    candles4h.push({
      time: currentGroup[0].time,
      open: currentGroup[0].open,
      high: Math.max(...currentGroup.map((c) => c.high)),
      low: Math.min(...currentGroup.map((c) => c.low)),
      close: currentGroup[currentGroup.length - 1].close,
      volume: currentGroup.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return candles4h;
}
