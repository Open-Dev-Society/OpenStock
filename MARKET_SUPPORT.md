# Market support - Saudi-only build (Tadawul)

This fork is locked to the **Saudi Exchange (Tadawul)** only.

| Market | Charts and widgets (TradingView embeds) | Our quotes, watchlist prices, alerts (Finnhub free) |
|---|---|---|
| 🇸🇦 Saudi Arabia (TADAWUL, e.g. `TADAWUL:2222`, `2222.SR`) | Candle chart blocked; financials, technicals and profile work (free plan) | No (free plan returns 403 for `.SR`) |

## What that means in the app

- **Dashboard:** single Saudi market. Hours Sun-Thu 10:00-15:00 Asia/Riyadh.
  TradingView free embeds block every TADAWUL widget (pulse, quotes, leaders), so the
  dashboard is powered by our own Yahoo layer instead (`lib/actions/yahoo.actions.ts`,
  5-minute shared cache): Pulse tiles (`SaudiPulseTile`), `SaudiMovers`, and
  `SaudiQuotesTable`. Top stories uses the TradingView timeline in Aramco-symbol mode.
- **Live prices (Twelve Data):** `TWELVEDATA_API_KEY` in `.env` enables real-time 1-minute candles
  (`lib/actions/twelvedata.actions.ts`, 15s shared cache). Free keys only cover trial
  symbols (e.g. `7203` Elm Co.); full Tadawul real-time needs a Pro plan. The chart
  shows `● live` for Twelve Data and `● delayed` for the Yahoo fallback, and
  plan-locked symbols are remembered for an hour so no quota is wasted.
- **Stock pages:** symbols like `2222.SR` map to `TADAWUL:2222` via `formatSymbolForTradingView` (`.SR` mapping in `lib/utils.ts`). Header uses TradingView quote panel.
- **Alerts:** need a Finnhub-priced quote. Not available for Tadawul on free plan. Paid Finnhub plan covering `SR` exchange would enable them.
- **Search:** Finnhub search filtered to `.SR` only (`lib/actions/finnhub.actions.ts`). Empty query returns Saudi popular list (`2222.SR`, `1120.SR`, ...).
- **Currency:** fallbacks changed USD -> SAR (`StockHeader`, `getWatchlistData`).

## Adding back other markets

Restore entries in `lib/markets.ts` and remove the `.SR` filter in `searchStocks`.
