# Crypto and Markets Implementation Plan

Status: proposed plan for the `Crypto` branch. This document turns the requirements in [crypto-market-data-requirements.md](./crypto-market-data-requirements.md) into an implementation sequence. No product code is changed by this plan.

## Implementation progress

Slice 0 has started using TDD:

- Added the tested market-family registry in `lib/markets/market-families.ts`.
- Added the `/markets` entry point and URL-preserved `/markets/[market]` routes.
- Added the shared family switcher for Overview, Major Indices, Stocks, Futures, and Crypto.
- Added an honest Crypto presentation preview; it does not claim to power OpenStock watchlists or alerts yet.

Next slice: introduce the normalized instrument/quote contract and a provider-neutral adapter seam, then evaluate the Luno REST adapter against that contract.

## 1. Outcome

OpenStock should let a user move between these market families without losing context:

- Overview
- Major Indices
- Stocks
- Futures
- Crypto

Crypto should become a first-class OpenStock domain for discovery, normalized quotes, detail pages, watchlists, freshness indicators, and price alerts. TradingView should continue to provide rich presentation where it is the right fit, but embedded widgets must not be treated as the application’s data API.

## 2. Current implementation seams

The GitNexus graph and source review identify these existing seams:

| Concern | Current location | Planning implication |
| --- | --- | --- |
| Market overview and visual surfaces | `app/(root)/page.tsx`, `components/TradingViewWidget.tsx` | Add navigation around existing presentation surfaces first. |
| TradingView watchlist | `components/watchlist/TradingViewWatchlist.tsx`, `components/watchlist/WatchlistManager.tsx` | Keep as a visual option; do not use it as the source of persisted identity or alert data. |
| Stock quote/profile/search actions | `lib/actions/finnhub.actions.ts` | Extract an adapter boundary before adding a crypto provider. |
| Watchlist persistence | `database/models/watchlist.model.ts`, `lib/actions/watchlist.actions.ts` | Migrate from symbol-only identity to asset-aware instrument identity. |
| Alert persistence and execution | `database/models/alert.model.ts`, `lib/actions/alert.actions.ts`, `lib/inngest/functions.ts` | Route evaluation by asset/provider and support 24/7 crypto markets. |
| Watchlist UI | `components/watchlist/WatchlistTable.tsx`, `WatchlistStockChip.tsx`, `AlertsPanel.tsx`, `CreateAlertModal.tsx` | Render mixed stocks and crypto with shared quote states. |
| Search and detail | `components/SearchCommand.tsx`, `app/(root)/stocks/[symbol]/page.tsx` | Generalize symbol routes and search results around canonical instruments. |

GitNexus currently indexes 1,114 symbols, 1,768 relationships, and 56 execution flows. Its impact results are lower-bound because scope extraction is not fully verified; use the graph together with source search and tests before making broad refactors.

## 3. Design decisions to hold constant

### 3.1 Canonical instrument identity

Introduce a shared instrument model with at least:

```text
instrumentId     stable internal ID, e.g. crypto:BTC/USD:coinbase
assetClass       equity | index | future | crypto | forex
baseSymbol       BTC
quoteCurrency    USD
venue             exchange or market venue when required
provider         provider owning the app data
providerSymbol   provider-specific symbol, e.g. BTC-USD or BTCUSDT
displayName      human-readable name
precision        display precision for price and percentage fields
```

The internal ID must distinguish BTC/USD from BTC/USDT and prevent collisions between stock and crypto tickers.

### 3.2 Normalized quote contract

All application-owned quote consumers should receive a common shape:

```text
instrumentId, price, change, changePercent, currency,
asOf, receivedAt, provider, freshness, marketStatus
```

`freshness` should be explicit (`live`, `delayed`, `stale`, `unavailable`) and calculated from timestamps plus asset-specific thresholds. A `no-store` fetch only disables Next.js caching; it does not guarantee that the upstream provider is real-time.

### 3.3 Provider boundary

Define a `MarketDataProvider` capability contract rather than putting provider-specific symbols in React components or Mongo models:

- `search(query, assetClass)`
- `getInstrument(instrumentId)`
- `getQuote(instrumentId)`
- optional `getQuotes(instrumentIds)`
- optional `subscribeQuotes(instrumentIds)`
- capability metadata for search, quotes, history, and streaming

Keep the initial scope to one crypto provider and a small supported set such as BTC/USD and ETH/USD until rate limits, symbol coverage, and licensing are verified.

### 3.4 TradingView role

TradingView remains the presentation provider for charts, market summaries, heatmaps, and optional watchlist views. It is not assumed to provide an embeddable server-side quote contract, alert feed, or persisted identity. Any direct TradingView API use requires a separate licensing and terms review.

## 4. Delivery sequence

### Phase 0 — Provider and product spike

Goal: remove the decisions that would otherwise force a rewrite.

Tasks:

1. Confirm the simplest non-Premium Finnhub discovery/snapshot calls available for the intended account plan.
2. Validate Finnhub crypto/forex exchange and symbol discovery, including the exact provider-native symbol representation for the initial presentation matrix.
3. Validate Luno as an optional South Africa venue using public endpoints for `XBTZAR` and `ETHZAR`, then confirm the current pair matrix.
4. Decide whether v1 is presentation-only or includes a small read-only snapshot list.
5. Keep candles, WebSocket streaming, first-party charts, watchlist migration, and alerts outside the current release.
6. Decide whether Major Indices and Futures are presentation-only in v1 or need app-owned search, watchlists, and alerts.
7. Revoke the exposed key from the screenshot; no credential is needed for the current read-only presentation slice.

Exit criteria:

- One provider is selected for the first crypto adapter.
- The supported crypto instrument matrix is written down.
- Provider limits and licensing assumptions are accepted.

Current recommendation: use TradingView for the current read-only presentation slice and keep Finnhub as the first candidate for basic discovery/snapshots. Do not add Premium candles, WebSocket infrastructure, first-party charts, watchlist migration, or alerts until explicitly requested. Keep Luno as an optional South Africa/ZAR venue adapter.

### Phase 1 — Markets navigation shell

Goal: give users the market-family switching experience without changing quote ownership.

Tasks:

1. Add a data-driven market-family configuration with slugs, labels, routes, presentation mode, and capability flags.
2. Add a persistent selector for Overview, Major Indices, Stocks, Futures, and Crypto.
3. Use URL-preserved state, preferably `/markets/[market]`, so refresh, bookmarking, and deep links retain the selected family.
4. Keep `/` as the existing Overview entry point or redirect it to `/markets/overview`.
5. Reuse existing TradingView widgets for presentation-only families.
6. Add clear “presentation-only” behavior where a family does not yet support OpenStock-owned search, watchlists, or alerts.

Likely files:

- new `app/(root)/markets/[market]/page.tsx`
- new `components/markets/MarketFamilySwitcher.tsx`
- new `lib/markets/market-families.ts`
- `app/(root)/page.tsx`
- `components/TradingViewWidget.tsx`

Exit criteria:

- A user can switch between all five families.
- The selected family survives refresh and direct navigation.
- Existing dashboard behavior remains intact.

### Phase 2 — Domain and provider foundation

Goal: create the shared contracts before crypto-specific UI spreads provider assumptions.

Tasks:

1. Add canonical market types and freshness utilities under `types/market.ts` and `lib/market/`.
2. Extract the current Finnhub quote/search/profile behavior behind an equity adapter.
3. Add an instrument registry/normalizer that maps user-facing symbols to canonical IDs.
4. Add a provider registry that resolves by asset class and capability.
5. Define error categories: unsupported instrument, provider unavailable, rate limited, invalid symbol, and stale quote.
6. Add contract tests for identity normalization and freshness thresholds.

Likely files:

- new `types/market.ts`
- new `lib/market/instrument-registry.ts`
- new `lib/market/market-data-provider.ts`
- new `lib/market/quote-gateway.ts`
- new `lib/market/providers/finnhub-equity-provider.ts`
- existing `lib/actions/finnhub.actions.ts` reduced to compatibility wrappers or migrated callers

Exit criteria:

- Existing stock callers can obtain the same user-visible data through the normalized contract.
- No new component imports provider-specific quote types.
- Freshness is testable without network calls.

### Phase 3 — Crypto adapter and discovery

Goal: support a small read-only crypto surface without premium history or streaming infrastructure.

Tasks:

1. Implement only a minimal Finnhub crypto discovery/snapshot adapter if a non-Premium endpoint is confirmed, with strict symbol mapping and timeout/error handling.
2. Add read-only crypto discovery with asset class, venue, pair, quote currency, and provider identity.
3. Keep BTC/USD and ETH/USD as presentation examples rather than promising a broad instrument universe.
4. Preserve TradingView widgets for visual market data.
5. Add a visible source/capability label; do not add streaming, candle history, chart fallback, watchlist migration, or alerts.

Likely files:

- new `lib/market/providers/<selected-crypto-provider>.ts`
- `components/SearchCommand.tsx`
- new generalized symbol/detail components under `components/markets/`
- `app/(root)/stocks/[symbol]/page.tsx` or a new asset-aware detail route
- `components/TradingViewWidget.tsx`

Exit criteria:

- A user can search for BTC/USD and ETH/USD, open detail, and see a normalized quote.
- Provider outages show an explicit unavailable/stale state rather than zero-valued data.
- Stock search/detail behavior remains unchanged.

### Phase 3b — Forex presentation and discovery

Goal: add a simple read-only forex surface without inventing a second navigation model.

Tasks:

1. Confirm Finnhub forex symbol/exchange coverage and any simple non-Premium snapshot capability.
2. Add read-only discovery only if the provider contract is straightforward and available to the account.
3. Keep TradingView as the presentation layer; do not add candle history, streaming, watchlists, or alerts.

Exit criteria:

- A supported currency pair has a stable identity and source label.
- Forex availability is visible rather than inferred from a zero quote.

### Phase 4 — Mixed watchlists and migration

Goal: let stocks and crypto coexist without identity collisions or loss of existing records.

Tasks:

1. Extend watchlist records with canonical `instrumentId`, `assetClass`, `provider`, `providerSymbol`, `venue`, and quote currency while preserving legacy fields during migration.
2. Backfill existing stock rows deterministically from their current symbols.
3. Update uniqueness constraints to use `{ userId, instrumentId }`.
4. Update watchlist actions to accept canonical instruments, with a compatibility path for legacy stock symbols.
5. Make the active watchlist UI use normalized OpenStock quote rows; retain the TradingView widget as an optional presentation view if desired.
6. Render asset type, venue, precision, currency, and freshness in every mixed row.

Likely files:

- `database/models/watchlist.model.ts`
- `lib/actions/watchlist.actions.ts`
- `components/watchlist/WatchlistManager.tsx`
- `components/watchlist/WatchlistTable.tsx`
- `components/watchlist/WatchlistStockChip.tsx`
- `components/watchlist/TradingViewWatchlist.tsx`

Exit criteria:

- Existing users see all existing stocks after migration.
- BTC/USD and a stock ticker can be watched simultaneously without collision.
- A provider or quote failure affects only the relevant row.

### Phase 5 — Asset-aware alerts and live delivery

Goal: make crypto alerts correct for a 24/7 market and preserve stock alert semantics.

Tasks:

1. Extend alert records with `instrumentId`, `assetClass`, `provider`, and a quote freshness policy.
2. Migrate existing stock alerts to canonical instruments.
3. Refactor `checkStockAlerts` into an asset-aware evaluator, retaining compatibility for migrated stock alerts.
4. Route each alert to the correct provider adapter.
5. Evaluate crypto alerts continuously enough for the agreed SLA; do not inherit equity market-hours assumptions.
6. Reject or defer stale quotes rather than triggering from old data.
7. Make trigger handling idempotent and implement the agreed user notification channel.
8. Add metrics for quote age, skipped evaluations, provider failures, trigger decisions, and duplicate suppression.

Likely files:

- `database/models/alert.model.ts`
- `lib/actions/alert.actions.ts`
- `lib/inngest/functions.ts`
- `components/watchlist/CreateAlertModal.tsx`
- `components/watchlist/AlertsPanel.tsx`
- new provider-routing and alert-evaluator modules under `lib/market/`

Exit criteria:

- Crypto alerts evaluate outside equity market hours.
- A stale/provider-error quote never marks an alert as triggered.
- Each alert triggers at most once and produces a user-visible outcome.
- Existing stock alerts continue to work.

### Phase 6 — Hardening and rollout

Goal: release incrementally with clear failure behavior.

Tasks:

1. Add unit tests for provider adapters, symbol normalization, freshness, and alert predicates.
2. Add integration tests for watchlist/alert migrations and idempotency.
3. Add browser smoke coverage for market switching, crypto search, detail, watchlist, and alert creation.
4. Test provider rate limits, timeouts, malformed payloads, missing keys, and partial outages.
5. Verify mobile layout and accessibility for the market-family selector and freshness badges.
6. Release the Markets shell first, then crypto discovery, then mixed watchlists, then alerts behind a feature flag if needed.
7. Document provider attribution, delayed-data behavior, and the distinction between TradingView presentation and OpenStock-owned data.

## 5. Testing matrix

| Area | Minimum coverage |
| --- | --- |
| Identity | BTC/USD and BTC/USDT do not collide; stock `BTC` cannot collide with crypto BTC. |
| Freshness | Live, delayed, stale, unavailable, and clock-skew cases. |
| Provider routing | Equity routes to Finnhub adapter; crypto routes to selected crypto adapter. |
| Search | Asset class and venue are preserved from search result to detail/watchlist. |
| Watchlist | Legacy stock migration, mixed rows, duplicate prevention, provider failure isolation. |
| Alerts | Above/below predicates, 24/7 evaluation, stale quote rejection, one-shot idempotency. |
| Navigation | All five families, refresh/deep-link behavior, unsupported-capability messaging. |
| Regression | Existing stock detail, news, watchlist, and alert flows. |

## 6. GitNexus operating rules for implementation

Before changing an existing symbol, run GitNexus impact analysis upstream and review its callers/processes. The highest-impact seams are expected to be `getQuote`, `getWatchlistData`, the watchlist actions/models, and `checkStockAlerts`; do not refactor them by text search alone.

After each implementation slice:

1. Run `npx gitnexus analyze` if source structure changed materially.
2. Run the relevant tests and lint.
3. Run GitNexus `detect_changes` before committing.
4. Inspect any unexpected affected flow before moving to the next slice.

## 7. Definition of done

The initiative is complete when:

- The market-family selector is stable, URL-addressable, and accessible.
- Crypto search, detail, watchlist, and alerts work on the agreed instrument matrix.
- Quotes have explicit provider and freshness metadata.
- Existing stock behavior and persisted data survive migration.
- TradingView is used deliberately as a presentation surface, not as an undocumented application data dependency.
- Provider failures, stale data, and unsupported capabilities are visible and recoverable.
- The implementation, migration, test coverage, and provider attribution are documented.

## 8. Decisions required before the fuller app-owned data phase

1. When we expand beyond read-only presentation, should Finnhub remain the broad provider with Luno as an optional ZAR venue?
2. Should Major Indices and Futures remain presentation-only in the fuller product?
3. Which notification channel should crypto alerts use later?
4. Should the detail URL remain `/stocks/[symbol]` with an asset-aware model, or should all instruments move to a new `/markets/[instrumentId]` route?
