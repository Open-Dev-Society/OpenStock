# Upstox NSE Intraday Scanner Setup

## What is implemented in this branch

- Authenticated UI page: `/scanner`, with timeframe, relative-volume and symbol controls.
- Authenticated snapshot route: `GET /api/intraday-scanner`.
- Authenticated universe route: `GET /api/intraday-scanner/universe`.
- Server-only Upstox access token handling.
- A six-hour in-memory cache of Upstox's official NSE instrument master; eligible underlyings are resolved from non-expired NSE stock futures and matched to NSE equity instruments.
- Completed-candle PDH/PDL first-cross + relative-volume evaluator.

## Environment setup

Set `UPSTOX_ACCESS_TOKEN` only in Vercel Project Settings → Environment Variables or local `.env.local`.

```env
UPSTOX_ACCESS_TOKEN=your_upstox_access_token
```

Do not commit the real token or use a `NEXT_PUBLIC_*` name for it. Upstox access tokens can expire and may need to be renewed according to your Upstox developer-app setup.

## Use

1. Sign in to the app and open `/scanner`.
2. Choose 1m, 3m or 5m; default volume threshold is 2× the preceding 20 completed candles.
3. Enter up to 20 symbols separated by commas and press Scan now.
4. Each symbol is validated against the current F&O equity-universe list. Non-F&O/invalid symbols cannot resolve.

Scanner endpoint:

```text
GET /api/intraday-scanner?timeframe=3&volumeMultiplier=2&symbols=RELIANCE,HDFCBANK
```

Universe endpoint:

```text
GET /api/intraday-scanner/universe
```

## Important limitations before trading use

- This is an **on-demand snapshot**, not a continuously running live scanner. For a true live full-universe scanner, run a persistent Node.js worker using Upstox Market Data Feed V3, maintain candles and emit signals when bars close. Keep that worker separate from Vercel serverless request handlers.
- The snapshot endpoint calls intraday and historical REST candles per symbol. It currently supports up to 20 symbols per request and may be subject to Upstox API rate limits.
- The previous session high/low are calculated from historical interval candles; verify the values against broker/chart data before relying on them.
- The initial UI does not implement persistent signal deduplication, push alerts, backtesting or order placement.
- The setup score is a transparent heuristic, not a probability of success or a recommendation.

Paper-test on multiple sessions and verify data freshness, PDH/PDL, volume baselines and time-window behaviour before trading with real money.
