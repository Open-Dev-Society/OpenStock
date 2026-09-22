# Finnhub crypto and forex evaluation

Status: candidate provider decision record; simplified v1 scope

## Conclusion

Finnhub should move ahead of Luno as the first broad-market provider candidate for OpenStock's basic crypto and forex discovery, subject to confirming the account plan and redistribution terms. The existing Finnhub integration reduces operational complexity.

That does not mean the existing stock integration can simply be reused. Finnhub documents `/quote` as a real-time quote endpoint for US stocks. Crypto and forex require asset-specific symbol discovery and careful provider validation. The provider boundary must remain explicit.

For the current implementation, keep the scope intentionally small: no Premium candle history, no WebSocket infrastructure, no first-party charting, and no provider stream/cache layer. Use TradingView widgets for visual market presentation and only add simple Finnhub discovery or snapshots after their non-Premium availability is confirmed.

## What Finnhub provides

| Capability | Crypto | Forex | OpenStock implication |
|---|---|---|---|
| Exchange/venue discovery | `/crypto/exchange` | `/forex/exchange` | Build provider-backed discovery rather than hard-code every venue. |
| Symbol discovery | `/crypto/symbol` | `/forex/symbol` | Store the provider-native identifier in the instrument registry. |
| Historical candles | Deferred | Deferred | Explicitly excluded from the current release. |
| Live delivery | Deferred | Deferred | No WebSocket or stream/cache infrastructure in the current release. |
| Existing `/quote` function | Not the documented contract | Not the documented contract | Do not overload `getQuote` with non-equity behavior. |

The candle endpoints exist, but they are outside the current release. We will not build around them or make Premium access a prerequisite for the basic Markets navigation work.

## Recommended architecture

1. Keep `finnhub-equity-provider` compatible with the current stock behavior.
2. Add only the minimum crypto/forex discovery or snapshot adapter that can be supported without Premium history or streaming infrastructure.
3. Normalize both through the shared instrument and quote contracts.
4. Use `/crypto/exchange`, `/crypto/symbol`, `/forex/exchange`, and `/forex/symbol` for discovery and mapping.
5. Keep TradingView as the visual presentation layer for charts and market lists.
6. Keep Luno as an optional exchange-specific adapter for South African/ZAR liquidity rather than the global default.

## Risks and gates

- Confirm that any simple Finnhub discovery/snapshot calls selected for v1 are available under the intended plan.
- Confirm whether Finnhub data may be redistributed through a public OpenStock deployment; provider access is not automatically a redistribution license.
- Validate crypto and forex symbol formats against the account's supported exchanges before adding them to search or watchlists.
- Do not put the Finnhub token in client-visible variables.

## Sources

- [Finnhub Crypto Candles](https://finnhub.io/docs/api/crypto-candles)
- [Finnhub Forex Candles](https://finnhub.io/docs/api/forex-candles)
- [Finnhub Crypto Exchanges](https://finnhub.io/docs/api/crypto-exchanges)
- [Finnhub Forex Exchanges](https://finnhub.io/docs/api/forex-exchanges)
- [Finnhub WebSocket trades](https://finnhub.io/docs/api/websocket-trades)
- [Finnhub API documentation](https://finnhub.io/docs/api)
