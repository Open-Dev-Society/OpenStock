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
    process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || "";

  if (!apiKey) {
    console.error("getOhlcv4h: missing Finnhub API key in environment");
    return [];
  }

  // Finnhub resolution 240 = 4-hour candles
  const url = `${baseUrl}/stock/candle?symbol=${encodeURIComponent(
    symbol.toUpperCase()
  )}&resolution=240&from=${Math.floor(from)}&to=${Math.floor(to)}&token=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        `getOhlcv4h: Finnhub HTTP ${res.status} for ${symbol} (${res.statusText})`
      );
      return [];
    }

    const data: FinnhubCandleResponse = await res.json();

    if (data.s !== "ok" || !data.t || !data.c || data.t.length === 0) {
      return [];
    }

    // ponytail: assuming synchronous bar arrays match length, upgrade with validation loop if broker feeds misalign
    const candles: Candle4h[] = data.t.map((timestamp, i) => ({
      time: new Date(timestamp * 1000),
      open: data.o ? data.o[i] : data.c![i],
      high: data.h ? data.h[i] : data.c![i],
      low: data.l ? data.l[i] : data.c![i],
      close: data.c![i],
      volume: data.v ? data.v[i] : 0,
    }));

    return candles;
  } catch (error) {
    console.error(`getOhlcv4h: request failed for ${symbol}:`, error);
    return [];
  }
}
