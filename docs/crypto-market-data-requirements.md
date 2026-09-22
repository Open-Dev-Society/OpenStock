# Cryptocurrency market-data requirements

Status: requirements baseline / architecture discovery

Branch: `Crypto`

## 1. Executive summary

OpenStock is not currently a single-source, app-controlled real-time market-data system.

It is already using TradingView, but in the same way the screenshot demonstrates only part of what TradingView offers: OpenStock embeds selected TradingView widgets, while TradingView’s own Markets experience is a broader, navigable market-information product.

- The dashboard and detail pages primarily embed TradingView widgets. Their freshness, symbol coverage, and update cadence are controlled by TradingView and are not exposed as structured application data.
- Finnhub powers application-owned stock search, profiles, news, quote lookups, and the five-minute alert job.
- The active watchlist page currently renders a TradingView market-quotes widget rather than the app-owned quote table. A separate `WatchlistTable` component contains a five-second polling loop, but it is not referenced by the active page.
- The current alert schema stores only a symbol and price condition. The worker assumes every symbol is a Finnhub stock symbol.

This distinction matters for the proposed Markets experience:

| Capability | What OpenStock has today | What TradingView’s Markets page demonstrates |
|---|---|---|
| Market categories | Dashboard configuration is stock-centric | Major indices, stocks, futures, forex, crypto, and economy are first-class sections |
| Navigation | Dashboard is a fixed arrangement of widgets | Users can jump between market families and browse deeper lists |
| Charts/quotes | Embedded TradingView widgets | TradingView-owned live/near-live surfaces with provider-specific symbols and coverage |
| App-owned quote data | Finnhub stock functions only | Not exposed to OpenStock as a normalized data API by the embed |
| Watchlist/alerts | MongoDB + Finnhub stock assumptions | TradingView’s watchlist experience is separate from OpenStock persistence and alert execution |

Cryptocurrency support is therefore a medium-sized market-data domain change, not a small UI enhancement. The smallest credible version can reuse the existing TradingView chart experience and add a crypto provider for search, quotes, and alerts. A robust version should first establish a canonical instrument model and normalize all providers behind one interface.

## 2. What “live” means today

### 2.1 Dashboard and stock detail

The dashboard mounts TradingView `market-overview`, `stock-heatmap`, `market-quotes`, and `timeline` widgets. Stock detail mounts TradingView `symbol-info`, `advanced-chart`, `technical-analysis`, `company-profile`, and `financials` widgets.

These are externally rendered embeds. The application does not receive a structured quote stream, does not store the last update, and does not display a freshness timestamp. They should be described as provider-managed live/near-live views, subject to provider coverage, plan entitlements, market session status, browser connectivity, and widget refresh behavior.

### 2.2 Application-owned Finnhub data

`lib/actions/finnhub.actions.ts` uses `fetch(..., { cache: 'no-store' })` for `getQuote`, so the app requests an uncached Finnhub quote whenever that function runs. That removes Next.js response caching; it does not make Finnhub real-time.

Profiles are cached for 24 hours, search results for 30 minutes, popular-symbol profiles for one hour, and news for five minutes. Those lifetimes are reasonable for metadata/news but must never be reused as the freshness contract for prices.

### 2.3 Watchlist and alerts

The active watchlist page (`WatchlistManager`) renders the TradingView watchlist widget. It does not currently display the app-owned `getWatchlistData` result.

The legacy `WatchlistTable` contains a comment saying “every 15 seconds” but schedules a five-second interval. It refreshes the entire `stocks` dependency after each update, so the timer is recreated whenever state changes. It also fetches quote and profile data together, which would multiply provider calls if that component became active.

The Inngest `checkStockAlerts` function runs every five minutes and fetches each alert symbol through Finnhub `getQuote`. It does not carry an asset class or provider identity, so crypto alerts would currently be misrouted or silently fail.

### 2.4 TradingView’s role

TradingView is already the right visual reference and can remain the first presentation provider for a Markets switcher. Its live page visibly groups information into major indices, stocks, futures, forex, and crypto, and exposes crypto pairs such as `BINANCE:BTCUSDT`, `BITSTAMP:BTCUSD`, and `COINBASE:SOLUSD`.

However, a widget is not the same thing as an application data contract. OpenStock cannot safely base search, MongoDB identity, freshness badges, or background alerts on text rendered inside an iframe/embed. TradingView should therefore be treated as:

1. a presentation provider for chart, heatmap, overview, and market-quotes surfaces; and
2. a source of symbol vocabulary and visual behavior, not automatically the source for server-side alert evaluation or normalized application state.

The provider and licensing terms for any direct TradingView data API, charting library, or redistribution must be checked separately before using one. The first implementation should not assume that an embeddable widget grants access to the underlying data.

## 3. Product goals

### Target capabilities for the complete initiative

1. Users can search for supported cryptocurrencies using human-friendly names and canonical symbols.
2. Users can open a crypto detail page from search.
3. Users can add crypto instruments to the existing watchlist alongside stocks.
4. Mixed watchlists show a clear asset-type label and the correct quote currency.
5. Crypto quotes show `price`, `absolute change`, `percentage change`, `24h high`, `24h low`, `24h volume`, provider timestamp, and application receive timestamp where available.
6. Crypto prices are sourced through a crypto-capable provider, not inferred from a stock-only Finnhub endpoint.
7. Every displayed price exposes a freshness state: `LIVE`, `DELAYED`, `STALE`, `UNAVAILABLE`, or `MARKET_CLOSED` where applicable.
8. Crypto price alerts work for 24/7 markets and preserve the existing one-shot alert semantics.
9. Provider failures degrade to a visible stale/unavailable state and never turn into a misleading zero price.
10. Stock behavior remains backward-compatible.
11. Users can navigate between top-level market families from one Markets surface, initially covering `Overview`, `Major Indices`, `Stocks`, `Futures`, and `Crypto`, with `Forex` designed as the next app-owned extension rather than a new navigation model.

### Explicitly not in the first slice

- Trading, custody, wallets, deposits, withdrawals, or exchange execution.
- Portfolio accounting, tax lots, realized/unrealized P&L, or fiat conversion beyond quote display.
- Per-exchange order books, bid/ask depth, trades tape, or arbitrage views.
- Guaranteed exchange-grade real-time SLAs.
- Replacing every TradingView widget with a first-party chart renderer.
- Rebuilding all of TradingView’s community, news, screener, calendar, and broker surfaces inside OpenStock.
- Premium crypto/forex candle history.
- Finnhub WebSocket connections, streaming fan-out, and quote caches.
- First-party chart rendering or historical backfill.

### Simplified first implementation scope

The current release is intentionally smaller than the complete initiative:

1. Keep the Markets family navigation and dark teal/blue OpenStock presentation.
2. Provide read-only Crypto and Forex market surfaces using TradingView widgets where supported.
3. Use Finnhub only for basic symbol/exchange discovery or simple snapshots when the selected endpoint is available without Premium access.
4. Show clear source and capability labels; do not imply that a presentation widget is an OpenStock-owned quote stream.
5. Defer crypto/forex watchlist persistence, alerts, historical charts, and live streaming until a later decision explicitly asks for them.

## 4. Domain requirements

### 4.1 Canonical instrument

Introduce a provider-neutral instrument shape. At minimum:

```ts
type AssetClass = 'equity' | 'crypto' | 'forex';

type Instrument = {
  id: string;                 // stable internal ID, not a display ticker
  assetClass: AssetClass;
  symbol: string;             // canonical display symbol, e.g. AAPL or BTC
  name: string;
  venue?: string;             // exchange for equities; venue/provider for crypto
  baseAsset?: string;         // BTC
  quoteAsset?: string;        // USD or USDT
  currency: string;           // quote currency used for displayed price
  provider: string;
  providerSymbol: string;     // exact provider-native identifier
  tradingViewSymbol?: string; // e.g. BINANCE:BTCUSDT, when available
};
```

The internal ID must prevent collisions such as `BTC` spot markets quoted in USD versus USDT, and must avoid treating a stock ticker and a crypto symbol as the same watchlist item.

### 4.2 Quote snapshot

All providers should normalize into one quote contract:

```ts
type QuoteSnapshot = {
  instrumentId: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  providerTimestamp?: number;
  receivedAt: number;
  source: string;
  freshness: 'live' | 'delayed' | 'stale' | 'unavailable' | 'market_closed';
};
```

The UI must not derive “live” from whether `price` is non-zero. Freshness is a first-class field.

### 4.3 Provider boundary

Define a `MarketDataProvider` interface with separate capabilities for:

- instrument search;
- instrument metadata;
- quote snapshot;
- historical candles (deferred);
- optional live subscription;
- optional news and sentiment.

Finnhub remains the existing equity provider and is now the first broad-market candidate for crypto and forex. Asset-specific adapters must still be separate because the documented endpoints, symbols, entitlements, and payloads differ by asset class. No provider-specific symbol may leak into components, Mongo models, or alert logic.

TradingView is represented as a presentation capability rather than as a universal `MarketDataProvider` unless a separately approved direct-data integration is selected. This keeps the architecture honest: the UI can use a TradingView widget where it is strong, while server-side features use normalized provider contracts with explicit timestamps.

### 4.4 Luno candidate provider

Luno is a valuable candidate for an exchange-specific crypto adapter, especially for a South Africa-focused experience, but it should not be treated as the sole general-purpose crypto provider. Its public API exposes ticker, order book, recent trades, and market metadata endpoints, plus a WebSocket market stream for lower-latency updates. Luno documents a 300-calls-per-minute REST limit, a 50-session streaming limit, and market data that may be cached for up to one second.

Luno's South Africa market list includes locally relevant ZAR pairs such as BTC/ZAR and ETH/ZAR, in addition to crypto/crypto pairs. This is a product advantage for the initial user experience, but it is not the same as global market coverage: Luno prices and liquidity are venue-specific, and pair availability varies by country.

The first Luno adapter should use public REST snapshots and market metadata without credentials. A server-side WebSocket stream or authenticated candle access can be evaluated later if the freshness SLA requires it. Any Luno key must remain server-only, read-only, IP-restricted/expiring where possible, and must never be placed in `NEXT_PUBLIC_*` variables. Luno's terms and data-redistribution permissions must also be reviewed before exposing its data as a public OpenStock service.

Research record: [Luno API evaluation](./research/luno-api-evaluation.md).

### 4.5 Finnhub crypto and forex candidate

Finnhub's official API documentation includes crypto and forex exchange lists and symbol discovery. This makes it a stronger first candidate for a broad OpenStock Markets experience than a single exchange adapter, while preserving the current Finnhub operational footprint.

There are two important boundaries:

1. Finnhub documents the existing `/quote` endpoint for real-time US stock quotes. It must not be treated as a universal quote endpoint for crypto and forex.
2. `/crypto/candle` and `/forex/candle` are deliberately outside the current release.

For the simplified release, use Finnhub exchange/symbol discovery and only the simplest non-Premium snapshot capability that is confirmed for the account. Do not build a WebSocket subscription/cache, candle history, or first-party chart fallback. Keep credentials server-only. Finnhub's data terms, rate limits, symbol coverage, and redistribution permissions remain release gates.

Research record: [Finnhub crypto and forex evaluation](./research/finnhub-crypto-forex-evaluation.md).

## 5. Functional requirements

### Search and discovery

- Search results must identify `Stocks`, `Crypto`, or `Forex`.
- Search must return a stable instrument ID and provider-native symbol.
- Search must handle common aliases such as `BTC`, `Bitcoin`, `ETH`, and `Ethereum`.
- Search must not show a result that cannot produce a quote or detail view.
- Popular/default results may be split into tabs or grouped sections; crypto must not be hidden behind an accidental stock-only filter.

### Detail view

- The existing stock detail layout remains available for equities.
- Crypto detail pages must not render company-only widgets such as company profile or financials for a coin.
- Crypto detail must render a chart using a provider-supported symbol or a first-party chart fallback.
- The page must show the provider/source and “as of” time.
- A provider-unsupported chart must not prevent the quote summary, metadata, watchlist action, or alert action from working.

### Markets navigation and information architecture

- Add a first-class Markets surface or route rather than making the existing dashboard the only place where market families can appear.
- Provide a persistent market-family selector with at least `Overview`, `Major Indices`, `Stocks`, `Futures`, and `Crypto`.
- Preserve the selected market in the URL so refresh, sharing, and browser back/forward work. A route such as `/markets/crypto` or an equivalent query-backed contract is acceptable.
- The selector must be keyboard accessible and visually consistent with OpenStock’s existing dark header/navigation.
- Each market family must have a family-specific empty/error/loading state and a source/freshness disclosure.
- `Overview` may use the current TradingView widgets as a visual summary, but category pages must not be implemented as a collection of hard-coded stock-only constants.
- Market-specific configuration should be data-driven: each family declares its title, default symbols, widget support, provider coverage, and available detail actions.
- The first screen should feel like OpenStock with TradingView-powered market surfaces, not a pixel-for-pixel copy of the TradingView home page.
- A user should be able to move from a market-family card to a symbol detail page and from a symbol detail page to a watchlist/alert action without losing the family context.

### Initial market-family behavior

| Family | First release behavior | Likely data/presentation source |
|---|---|---|
| Overview | Summary cards for indices, stocks, futures, and crypto | TradingView widgets, with source/freshness labels |
| Major Indices | Curated global index list and charts | TradingView symbols first; normalized quotes later |
| Stocks | Existing stock overview/search/detail behavior | Finnhub + TradingView |
| Futures | Curated energy/metals/major contracts, read-only | TradingView first; provider decision required for app-owned quotes |
| Crypto | Read-only market preview and discovery; app-owned watchlist/alerts deferred | TradingView presentation + minimal Finnhub discovery/snapshot candidate |
| Forex | Read-only market preview and discovery; app-owned quotes deferred | TradingView presentation + minimal Finnhub discovery/snapshot candidate |
| Economy | Navigation placeholder or future slice | Not in first implementation unless provider scope expands |

### Watchlists

- Existing stock watchlist records must migrate without user-visible loss.
- New records must include `assetClass`, `instrumentId`, `provider`, and `providerSymbol` or be resolvable from a versioned instrument registry.
- Duplicate detection must be based on `(userId, instrumentId)`, not only `(userId, symbol)`.
- Mixed rows must use the instrument’s quote currency and format crypto precision sensibly.
- The page must show each row’s freshness state and last successful update.
- Updates must be batched or streamed; one network request per symbol per UI timer is not acceptable at scale.

### Alerts

- Alert records must include an instrument identity and provider routing information.
- The evaluator must support both equity session semantics and crypto 24/7 semantics.
- An alert must only trigger on a quote whose freshness is within the configured maximum age.
- Provider errors must not mark an alert as triggered.
- Evaluation must be idempotent so retries do not send duplicate notifications.
- The notification path must be explicit; current logging-only behavior is not sufficient for a user-facing “alert fired” feature.

## 6. Freshness and liveness contract

### Recommended initial thresholds

These are product defaults to validate with the chosen provider:

| State | Meaning | Crypto default | Equity default |
|---|---|---:|---:|
| `LIVE` | Provider update is inside the live freshness window | <= 15s | <= 60s |
| `DELAYED` | Provider supplies delayed but usable data | provider-defined | provider-defined |
| `STALE` | Last update exists but exceeds the usable window | > 60s | > 5m while market is open |
| `UNAVAILABLE` | No usable quote or provider error | immediate | immediate |
| `MARKET_CLOSED` | No active equity session is expected | n/a | session-aware |

The UI must display the absolute `receivedAt` time even when it displays a friendly state. This allows users and developers to distinguish a frozen UI from a delayed provider.

### Complete-initiative delivery strategy

The following is retained as the longer-term design, not as current-release scope. The current release uses TradingView presentation widgets and does not create a stream, cache, or candle pipeline.

1. REST snapshot on initial page load.
2. Server-owned normalized quote endpoint for browser consumers.
3. Crypto WebSocket or provider stream for active symbols where the selected provider supports it.
4. Polling fallback with adaptive intervals when a stream is unavailable or disconnected.
5. Heartbeat/health state so the UI can say “reconnecting” rather than quietly showing old prices.

The browser should not hold provider credentials or open one provider connection per component. A single app-level subscription/cache should fan out updates to active viewers.

### Markets delivery strategy

1. Introduce a market-family route/selector shell and URL contract.
2. Move existing dashboard widgets into an `Overview` family configuration without changing their visual behavior.
3. Add family-specific TradingView widget configurations for `Indices`, `Stocks`, `Futures`, and `Crypto` where widgets support the required symbols.
4. Add app-owned normalized data only where OpenStock needs behavior TradingView embeds cannot provide: search, persistence, freshness, and alerts.
5. Add a fallback state for symbols or families unavailable through a TradingView widget.

## 7. Non-functional requirements

### Correctness

- Preserve provider-native decimal precision internally; round only at presentation.
- Use `null` for missing fields, not `0`.
- Normalize timestamps to milliseconds and document whether they mean exchange event time or provider response time.
- Keep provider symbol mapping in the adapter/registry layer.

### Resilience

- Set request timeouts and abort slow providers.
- Use bounded retries with jitter for transient failures.
- Apply circuit breaking/backoff when a provider is rate limited.
- Cache metadata independently of quotes.
- Avoid refreshing all symbols when only one stream message changed.

### Security and compliance

- Move provider credentials to server-only environment variables where the provider requires a secret.
- Do not expose provider tokens through `NEXT_PUBLIC_*` unless the provider explicitly requires a publishable key and the risk is accepted.
- Document data licensing, attribution, redistribution, and delayed-data rules for the selected crypto provider and for TradingView embeds.
- Keep the existing “not financial advice / not a brokerage” messaging and make data-delay disclosure visible near live values.

### Observability

Capture, at minimum:

- provider request count, latency, error, rate-limit, and reconnect metrics;
- last successful quote time by provider and asset class;
- count of stale/unavailable instruments;
- alert evaluation age, skipped evaluations, and trigger outcomes;
- source/provider labels on user-visible errors.

## 8. Provider selection criteria

Choose a provider for each app-owned asset class only after checking current commercial terms and the target deployment geography. Score candidates against:

1. WebSocket or streaming support for public market data.
2. REST snapshots and historical candles for reconnects and charts.
3. Coverage of the required venues and quote currencies.
4. Stable symbol/product identifiers and metadata quality.
5. Rate limits suitable for the expected watchlist fan-out.
6. Server-side use from the likely deployment environment.
7. Licensing, attribution, redistribution, and delayed-data terms.
8. Operational reliability, status page, and documented outage behavior.
9. Cost ceiling for a free/open-source deployment.
10. Plan entitlements for the exact crypto/forex endpoints and WebSocket access, not merely token validity.

The implementation should make the provider replaceable. This avoids coupling the product model to a single exchange or to a free-tier assumption that may change.

## 9. Recommended delivery slices

### Slice 0 — Markets navigation shell

- Add the Markets route and persistent family selector.
- Create a data-driven market-family configuration.
- Refactor the existing dashboard widget arrangement into the `Overview` family.
- Add read-only `Crypto` and `Futures` preview cards backed by TradingView widgets where supported.
- Do not claim that these previews provide app-owned quote data or alerts.

### Slice A — data contract and stock-safe refactor

- Add asset-class/instrument/quote types.
- Add provider interface and Finnhub equity adapter.
- Add freshness metadata and explicit null handling.
- Move quote access behind a server-owned route/service.
- Add tests around symbol normalization and provider failures.

### Slice B — crypto discovery and snapshots

- Add one selected crypto adapter.
- Add crypto search and instrument registry behavior.
- Extend watchlist persistence with a backwards-compatible migration.
- Add mixed watchlist rows and crypto detail summary.
- Add TradingView symbol mapping only where a supported chart exists.

### Slice C — live delivery and alert correctness

- Add one normalized live quote subscription/cache.
- Add reconnection and polling fallback.
- Extend Inngest alert evaluation to route by asset class/provider.
- Add idempotent user notifications and observability.

### Slice D — chart and market-quality polish

- Add a first-party candle chart fallback for unsupported TradingView symbols.
- Add data-source/freshness disclosure and provider health state.
- Add historical/stream consistency checks and performance tuning.

## 10. Acceptance criteria for “properly implemented”

The feature is ready for a first release when:

- A user can search, view, watchlist, and alert on BTC/USD and ETH/USD without any stock-specific code path being invoked.
- A mixed watchlist renders stock and crypto rows with correct identity, currency, precision, and freshness state.
- Closing or removing a page does not leave a live subscription running.
- A provider outage shows `STALE`/`UNAVAILABLE` with the last update time and never displays zero as a valid price.
- A crypto alert evaluates outside equity market hours and triggers once, idempotently.
- Existing stock search, detail, watchlist, news, and alert flows continue to pass their current tests.
- Provider keys are not shipped to the browser unless explicitly required and documented.
- Data freshness, provider attribution, and delay limitations are visible to users.

## 11. Open decisions before the fuller app-owned data phase

1. When we expand beyond read-only presentation, should Finnhub remain the broad provider with Luno as an optional South Africa/ZAR venue adapter?
2. Is the later instrument universe limited to BTC/USD and ETH/USD, or does it support a larger set?
3. Which notification channel should alerts use in the later app-owned phase?
4. Is the GitHub fork expected to be a new remote repository under the user’s account/org, or is the isolated local branch sufficient for this working session?
5. Should `Economy` remain a future tab while Crypto and Forex are read-only market surfaces?
6. Are `Futures` and `Major Indices` presentation-only in the fuller product, or must they also support OpenStock-owned search, watchlists, and alerts?

## 12. Current risk assessment

The highest-risk changes are the watchlist identity migration, the shared quote contract, and alert routing. The active UI is more loosely coupled than the data layer suggests because TradingView currently hides quote delivery inside an embed. The implementation should therefore land in small slices with contract tests around provider adapters and explicit migration coverage before changing the page composition.

The new Markets shell is lower risk if it starts as a presentation/navigation layer. The risk increases sharply when a category is promoted from a TradingView widget into an OpenStock-owned market-data domain; that promotion should require a provider, freshness, licensing, and alert-evaluation decision rather than being inferred from widget availability.
