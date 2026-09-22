# Finnhub crypto and forex evaluation

Status: candidate provider decision record

## Conclusion

Finnhub should move ahead of Luno as the first broad-market provider candidate for OpenStock's application-owned crypto and forex data, subject to confirming the account plan and redistribution terms. The existing Finnhub integration reduces operational complexity and the official API surface includes crypto/forex symbol discovery, historical candles, and a WebSocket path for live trades.

That does not mean the existing stock integration can simply be reused. Finnhub documents `/quote` as a real-time quote endpoint for US stocks. Crypto and forex require asset-specific symbol discovery, candle endpoints, and streaming/message normalization. The provider boundary must remain explicit.

## What Finnhub provides

| Capability | Crypto | Forex | OpenStock implication |
|---|---|---|---|
| Exchange/venue discovery | `/crypto/exchange` | `/forex/exchange` | Build provider-backed discovery rather than hard-code every venue. |
| Symbol discovery | `/crypto/symbol` | `/forex/symbol` | Store the provider-native identifier in the instrument registry. |
| Historical candles | `/crypto/candle` | `/forex/candle` | Both are documented as Premium; treat entitlement as a release gate. |
| Live delivery | Finnhub WebSocket trade subscriptions | Finnhub WebSocket trade subscriptions | Keep the connection server-side and fan out normalized updates. |
| Existing `/quote` function | Not the documented contract | Not the documented contract | Do not overload `getQuote` with non-equity behavior. |

The candle endpoints use a provider symbol, resolution, and Unix `from`/`to` range. Candle history is not the same as a live quote feed: chart history and reconnect backfill still need a plan entitlement, while live alerts need a freshness-aware snapshot/stream path.

## Recommended architecture

1. Keep `finnhub-equity-provider` compatible with the current stock behavior.
2. Add a separate `finnhub-crypto-provider` for crypto instruments and a `finnhub-forex-provider` when forex becomes app-owned.
3. Normalize both through the shared instrument and quote contracts.
4. Use `/crypto/exchange`, `/crypto/symbol`, `/forex/exchange`, and `/forex/symbol` for discovery and mapping.
5. Use candle endpoints only after the account plan confirms Premium access.
6. Use one server-owned WebSocket subscription/cache for active symbols, with REST snapshots and bounded polling as reconnect fallbacks.
7. Keep Luno as an optional exchange-specific adapter for South African/ZAR liquidity rather than the global default.

## Risks and gates

- Confirm the Finnhub plan actually includes the crypto and forex candle endpoints before promising first-party charts or historical backfill.
- Confirm the WebSocket entitlement, connection limits, rate limits, and symbol coverage for the deployment plan.
- Confirm whether Finnhub data may be redistributed through a public OpenStock deployment; provider access is not automatically a redistribution license.
- Validate crypto and forex symbol formats against the account's supported exchanges before adding them to search or watchlists.
- Do not put the Finnhub token in client-visible variables or expose it through a browser WebSocket connection.

## Sources

- [Finnhub Crypto Candles](https://finnhub.io/docs/api/crypto-candles)
- [Finnhub Forex Candles](https://finnhub.io/docs/api/forex-candles)
- [Finnhub Crypto Exchanges](https://finnhub.io/docs/api/crypto-exchanges)
- [Finnhub Forex Exchanges](https://finnhub.io/docs/api/forex-exchanges)
- [Finnhub WebSocket trades](https://finnhub.io/docs/api/websocket-trades)
- [Finnhub API documentation](https://finnhub.io/docs/api)

