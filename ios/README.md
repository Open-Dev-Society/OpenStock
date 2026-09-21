# Markets iOS (native)

Full native SwiftUI port of the Markets web app — **Dashboard** and **Watchlist** are separate tabs with the same section coverage as the web UI.

## Tabs

### Dashboard
- Market Overview (Financial / Technology / Services) with sparklines
- Stock Heatmap mosaic (large-cap movers)
- Market Quotes (same sector groups)
- Top Stories (Finnhub general news)

### Watchlist
- Toolbar: search, add tickers, remove selected, reorder
- Market Overview: selected mini chart + reorderable list + company news
- Symbol panels: info bar, candle chart, baseline chart, sentiment (Adanos if keyed), financials
- Market News (Finnhub round-robin across watchlist)

## Build

```bash
cd ios
# uses ../.env NEXT_PUBLIC_FINNHUB_API_KEY or FINNHUB_API_KEY
./build-ipa.sh
```

Optional: set `ADANOS_API_KEY` / `AdanosAPIKey` in Info.plist for sentiment.

## GitHub Actions

`.github/workflows/ios-ipa.yml` builds an unsigned IPA artifact.
