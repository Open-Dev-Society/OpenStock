# Market support

The current OpenStock product is intentionally focused on **B3 (Brazil)**.

## Supported discovery surface

Ticker identity comes from brapi's B3 catalogue. Coverage depends on the provider's active catalogue and can include:

- common and preferred shares (`PETR4`, `VALE3`, `ITUB4`);
- units (`BPAC11`);
- ETFs;
- FIIs and other funds;
- BDRs.

The search result reports the provider's `assetType`/`subType`. OpenStock does not reclassify missing values by guessing.

## Quote surface

The terminal quote strip uses the quote summary attached to `GET /api/v2/tickers`. Explicit quote/profile calls use `GET /api/v2/stocks/quote` and may require `BRAPI_API_TOKEN` depending on provider policy, rate limits, or plan.

Prices can be delayed. OpenStock is not suitable for order routing, high-frequency trading, or execution decisions.

## TradingView surface

Charts and fundamentals use TradingView's `BMFBOVESPA:<TICKER>` notation. Availability is controlled by TradingView and can vary by symbol or widget.

Embedded widgets are intentionally non-interactive in this product so users cannot navigate outside OpenStock. The dashboard displays the provider surface but does not replace it with a synthetic chart when unavailable.

## News coverage

The news filter prioritizes:

- B3 and Ibovespa;
- Brazilian rates, inflation, FX, fiscal policy, and central-bank decisions;
- major listed companies and corporate actions;
- commodities relevant to Brazilian equities;
- global market events with plausible B3 impact.

Only articles from the current São Paulo calendar day are shown.

## Not currently supported

- non-B3 exchanges in search and detail routes;
- options chains;
- order execution or brokerage connectivity;
- tick-level or guaranteed real-time data;
- interactive TradingView navigation;
- cryptocurrency and forex product pages;
- authenticated cloud portfolios.

Planned expansion is tracked in:

- [#86 — pluggable data source](https://github.com/Open-Dev-Society/OpenStock/issues/86)
- [#95 — native B3 screener](https://github.com/Open-Dev-Society/OpenStock/issues/95)
- [#96 — B3 sector map and breadth](https://github.com/Open-Dev-Society/OpenStock/issues/96)
- [#97 — news filters and clustering](https://github.com/Open-Dev-Society/OpenStock/issues/97)

## Provider references

- [brapi documentation](https://brapi.dev/docs)
- [TradingView widget market coverage](https://www.tradingview.com/widget-docs/markets/mexico-south-america)

Provider terms and licensing apply independently of OpenStock's AGPL-3.0 source license.
