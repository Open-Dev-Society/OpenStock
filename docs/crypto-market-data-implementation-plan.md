# Crypto and Markets Implementation Plan

Status: proposed plan for the `Crypto` branch. This document turns the requirements in [crypto-market-data-requirements.md](./crypto-market-data-requirements.md) into an implementation sequence. No product code is changed by this plan.

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
assetClass       equity | index | future | crypto
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

1. Compare crypto providers for REST quotes, WebSocket streaming, search/metadata, historical candles, rate limits, regional availability, and commercial terms.
2. Validate Luno as the first venue candidate using public endpoints for `XBTZAR` and `ETHZAR`, then confirm the current South Africa pair matrix.
3. Validate the exact symbol/venue representation for Luno ZAR pairs and any initial crypto/crypto pairs.
4. Decide whether v1 supports one venue per pair or a venue selector.
5. Decide whether Major Indices and Futures are presentation-only in v1 or need app-owned search, watchlists, and alerts.
6. Confirm alert notification behavior; the existing worker logs trigger intent but does not deliver a user-facing notification.
7. Revoke the exposed key from the screenshot and create a replacement only if authenticated candles or streaming are approved.

Exit criteria:

- One provider is selected for the first crypto adapter.
- The supported crypto instrument matrix is written down.
- Provider limits and licensing assumptions are accepted.

Current recommendation: keep Luno as the leading candidate for a deliberately scoped South Africa/ZAR venue slice, not as the sole provider for a broad global Crypto page. Public REST snapshots should be the first implementation; credentials should not be required until a measured latency or candle requirement justifies them. If the product promise is global crypto coverage, select a broader provider and add Luno as an optional venue adapter instead.

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

Goal: support app-owned crypto search and quotes for the selected initial instrument set.

Tasks:

1. Implement the selected provider adapter (Luno only if the release is local/ZAR-focused) with strict symbol mapping and timeout/error handling.
2. Add crypto search results with asset class, venue, pair, quote currency, and provider identity.
3. Add BTC/USD and ETH/USD detail summaries using the shared quote contract.
4. Preserve TradingView charts where the provider/pair mapping is available; a chart failure must not block quote, watchlist, or alert actions.
5. Add a visible data source and freshness state to crypto quote surfaces.
6. Add rate-limit protection, short-lived metadata caching, and request coalescing for repeated symbols.
7. If streaming is approved, run the Luno WebSocket connection server-side with reconnect/backoff, sequence validation, and one shared subscription cache rather than one connection per browser component.

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

## 8. Decisions required before Phase 3

1. Is the first Crypto experience South Africa/ZAR-focused, or does it require broad global aggregation from day one?
2. Should Major Indices and Futures be presentation-only in v1?
3. Which notification channel should crypto alerts use?
4. Is one-minute-ish alert evaluation sufficient, or is streaming required for the first release?
5. Should the detail URL remain `/stocks/[symbol]` with an asset-aware model, or should all instruments move to a new `/markets/[instrumentId]` route?
