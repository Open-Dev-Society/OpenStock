# OpenStock B3 — handoff

**Date:** 2026-09-21
**Target:** `Open-Dev-Society/OpenStock`
**Branch:** `feat/b3-finviz-terminal`
**Product mode:** local-first, public, no authentication

## Delivered outcome

This handoff turns the original multi-market authenticated starter into a B3-focused market terminal with a Finviz-inspired information hierarchy.

### Product surface

- compact two-row terminal header and tab navigation;
- real B3 quote strip from brapi's public ticker catalogue;
- B3-only TradingView overview, hot lists, quote groups, charts, technicals, company profile, and financials;
- native same-day market-pulse panel derived from the filtered news feed;
- terminal-style stock details at `/stocks/<TICKER>`;
- same-day market-news table with time, source, category, headline, and impact;
- no login, signup, middleware gate, donation popup, or user dropdown;
- no external navigation in the web UI;
- inert TradingView embeds to prevent cross-origin navigation;
- terminal styling applied to About, Help, API/Data, Terms, and footer surfaces.

## Non-negotiable behavior

1. **No fabricated data.** Missing provider fields remain unavailable.
2. **B3 first.** TradingView symbols use `BMFBOVESPA:<TICKER>`.
3. **News means today.** Publication date must equal the current `America/Sao_Paulo` calendar day.
4. **No outbound UI links.** Internal routes are allowed; external anchors are not.
5. **No login.** The dashboard and stock pages are public/local.
6. **Provider limits are explicit.** brapi requests share one process-wide queue because the public plan permits one concurrent request.

## Runtime architecture

### Search and quote strip

`lib/actions/finnhub.actions.ts` retains its historical filename but now calls brapi. `searchStocks()` uses `/api/v2/tickers`, which supplies identity plus quote summaries and does not require a token under the currently observed provider contract. React request caching deduplicates the header and dashboard calls.

The explicit `/api/v2/stocks/quote` path remains available for callers with provider access. It must fail honestly when brapi requires a token; the dashboard does not synthesize fallback prices.

### News

`lib/actions/market-news.actions.ts` fetches six curated sources in parallel. `lib/market-news.ts` parses RSS/Atom and enforces:

- valid HTTP(S) URL;
- valid feed timestamp;
- same São Paulo calendar day;
- one-hour future timestamp tolerance;
- deterministic market-topic classification;
- deterministic impact threshold;
- duplicate URL/title removal;
- newest-first order;
- publisher concentration cap.

Sources currently configured:

- Bloomberg and Reuters via publisher-scoped Google News RSS;
- Valor Econômico via publisher-scoped Google News RSS;
- InfoMoney native RSS;
- Banco Central Atom;
- Agência Brasil Economia RSS.

Cache revalidation is five minutes.

### Charts

TradingView remains an external data surface, but the surrounding container is `inert` and has `pointer-events: none`. This intentionally trades chart interaction for the product requirement that nothing clickable leaves OpenStock.

## Configuration

The active dashboard needs no credentials. Optional values are documented in `.env.example`:

- `BRAPI_BASE_URL`
- `BRAPI_API_TOKEN`
- `ADANOS_API_KEY`
- `ADANOS_API_BASE_URL`

Legacy workflow variables are listed separately and are not dashboard requirements.

## Verification performed

```text
npm test
  81 passed
  4 credential-gated tests skipped

focused ESLint (changed product surface)
  0 errors

npm run build
  success

git diff --check
  success (Git only reports the existing LF/CRLF advisory for watchlist/page.tsx)
```

Browser verification at `http://localhost:3000` confirmed:

- compact 83 px terminal header;
- five real B3 quote cards;
- two-column market panel grid;
- same-day São Paulo news;
- no external anchors;
- no dialogs/popups;
- inert TradingView widgets;
- PETR4 detail page with six terminal panels;
- terminal treatment on auxiliary pages.

## Known legacy debt

The active dashboard builds and runs, but dormant modules inherited from the upstream project still keep MongoDB, Mongoose, Inngest, Nodemailer, Kit, watchlist, and alert code in the tree.

At handoff time:

- repository-wide ESLint reports **19 errors and 27 warnings**, concentrated in dormant watchlist/alert code, Inngest, Kit, and old scripts;
- `npx tsc --noEmit` reports **6 legacy Inngest typing errors** after the changed B3 surface is clean;
- `/watchlist` redirects to `/` because there is no user identity or selected local-persistence design.

Do not silently revive account-based behavior. Resolve the architecture explicitly through issue #98.

## Roadmap issues

- [#95 — Native B3 screener inspired by Finviz](https://github.com/Open-Dev-Society/OpenStock/issues/95)
- [#96 — B3 sector map and market breadth](https://github.com/Open-Dev-Society/OpenStock/issues/96)
- [#97 — Finviz-style news filters and clustering](https://github.com/Open-Dev-Society/OpenStock/issues/97)
- [#98 — Resolve dormant auth, MongoDB, watchlist, and Inngest architecture](https://github.com/Open-Dev-Society/OpenStock/issues/98)
- [#86 — Pluggable data-source boundary](https://github.com/Open-Dev-Society/OpenStock/issues/86)
- [#77 — User-configurable dashboard lists](https://github.com/Open-Dev-Society/OpenStock/issues/77)

## Recommended next sequence

1. Resolve #98 so one persistence model owns the product.
2. Introduce the pluggable provider contract from #86.
3. Build the native B3 screener in #95.
4. Add breadth/sector aggregation in #96.
5. Add local news controls and clustering in #97.
6. Update screenshots after the terminal UI lands upstream.

## Provider and licensing notes

- OpenStock is AGPL-3.0.
- The feed-curation approach credits the AGPL-3.0 WorldMonitor project.
- brapi and TradingView data remain governed by provider terms.
- Google News RSS responses state personal feed-reader restrictions; review deployment/commercial use before exposing this aggregation publicly.
