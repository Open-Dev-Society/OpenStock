# Upstox NSE Intraday Scanner Setup

## Current implementation boundary

- `/scanner` is the authenticated scanner setup page.
- `GET /api/intraday-scanner` evaluates completed 1m, 3m or 5m candles for a requested list of symbols.
- `UPSTOX_ACCESS_TOKEN` must be configured only in a server environment variable.
- `UPSTOX_SYMBOL_MAP_JSON` maps symbol names to official Upstox instrument keys.
- The endpoint is on-demand and is **not** a persistent WebSocket worker. Do not deploy a long-running scanner by keeping a serverless HTTP request open.

## Environment variables

Set only on the server (Vercel Project Settings → Environment Variables or local `.env.local`):

```env
UPSTOX_ACCESS_TOKEN=your_upstox_access_token
UPSTOX_SYMBOL_MAP_JSON={"RELIANCE":"NSE_EQ|INE002A01018","HDFCBANK":"NSE_EQ|INE040A01034"}
```

These instrument keys are examples for illustrating the format, not a complete/current F&O universe. Confirm them against the current Upstox instrument master before using. Never commit a real token or expose it via a `NEXT_PUBLIC_*` variable.

## Endpoint

```text
GET /api/intraday-scanner?timeframe=3&volumeMultiplier=2&symbols=RELIANCE,HDFCBANK
```

Supported timeframes: 1, 3, and 5 minutes. Multiplier: 1–10. Requests are limited to 20 symbols. Only completed candles are considered; signal generation is restricted to 09:15–10:00 Asia/Kolkata time.

## Known next steps before trading use

1. Replace the manual symbol map with a daily-fetched official Upstox instrument master filtered to eligible NSE equity F&O contracts.
2. Persist and aggregate V3 market-feed ticks in a long-running worker, emitting signals as candles close.
3. Add a dedupe store keyed by trading date + symbol + timeframe + direction + PDH/PDL level.
4. Add tests against market holidays, session-day boundaries, incomplete candles, stale feeds and duplicate events.
5. Paper trade and compare with broker charts before relying on any signal.

This is a screening tool, not a recommendation to enter any specific trade.
