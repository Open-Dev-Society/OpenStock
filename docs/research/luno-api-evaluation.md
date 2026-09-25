# Luno API evaluation for OpenStock

Research date: 2026-09-22

Recommendation: treat Luno as a valuable exchange-specific adapter for a South Africa-focused OpenStock experience, but do not select it as the sole general-purpose crypto provider. Promote it to the first implementation only if the first release is explicitly local/ZAR-focused; otherwise pair it with or defer to a provider with broader global coverage.

## What Luno gives us

- Public market endpoints for ticker, top/full order book, recent trades, and market metadata.
- A WebSocket market stream for lower-latency order-book and trade updates.
- Candles and exchange market metadata suitable for a detail page and instrument registry.
- A documented REST limit of 300 calls per minute and a streaming limit of 50 simultaneous sessions.
- Market data that may be cached by Luno for up to one second; the documentation recommends the stream when lower latency is needed.

Sources: [Luno API documentation](https://www.luno.com/en/developers/api), [Luno API overview](https://www.luno.com/api)

## Why it fits this product

Luno is particularly valuable for a South African user because its South Africa market list includes ZAR pairs such as BTC/ZAR, ETH/ZAR, SOL/ZAR, XRP/ZAR, USDC/ZAR, and USDT/ZAR, alongside crypto/crypto pairs. That gives OpenStock a locally relevant crypto surface instead of presenting only USD-denominated global symbols.

Source: [Luno supported trading pairs](https://guide.luno.com/hc/en-gb/articles/11035603693597-Which-trading-pairs-are-available-on-the-Luno-Exchange)

The public ticker and market metadata endpoints also work without account credentials. A public check on 2026-09-22 returned active `XBTZAR` and `ETHZAR` market metadata. This means the first snapshot-based adapter can avoid handling account credentials entirely.

## Important limitations

1. Luno is an exchange venue, not a global crypto-market aggregate. Its prices represent Luno markets and liquidity, not a consolidated BTC or ETH price.
2. Pair availability varies by country, so the instrument registry must model geography and venue rather than assume one universal symbol list.
3. The market WebSocket requires API key credentials in its connection handshake. That is useful for a server-side stream, but it means credentials must remain server-only.
4. The public API documentation says market data is generally unauthenticated but identifies candles as an exception requiring authentication. Confirm this behavior during the adapter spike before depending on authenticated candles in production.
5. The application must not assume that a Luno quote is equivalent to the TradingView quote for the same asset. The UI should label the source and venue.
6. Luno's API terms and data-redistribution permissions must be reviewed before exposing Luno data as a public OpenStock service. An exchange account and a read-only key do not automatically grant redistribution rights.

Sources: [Luno API documentation](https://www.luno.com/en/developers/api), [Luno Terms of Use](https://www.luno.com/legal/terms-of-use)

## Credential and security decision

The read-only API key shown in the user-provided screenshot must be revoked because the secret has been exposed in the conversation artifact. Read-only is safer than trading access, but Luno states that read-only access can still view account information such as balances, transaction history, orders, and receive addresses.

For any future local/server integration:

- create a replacement key after revocation;
- use read-only permissions only;
- set an expiry date and IP restriction where deployment allows it;
- store the key ID and secret in server-only environment variables;
- never use `NEXT_PUBLIC_*` for the secret;
- do not place the secret in source files, diagrams, screenshots, logs, or the research notes.

Source: [Luno API key security guidance](https://guide.luno.com/hc/en-gb/articles/24590432698013-How-do-I-create-a-Luno-API-key)

## Proposed decision

Select Luno as an optional crypto venue adapter, with the following conditional path:

- start with public REST snapshots for market discovery, ticker, and market metadata;
- support a small initial matrix such as XBT/ZAR, ETH/ZAR, BTC/USDT, and ETH/USDT only after verifying current availability;
- add a server-side stream only when the freshness requirement justifies the credential and reconnect complexity;
- retain TradingView for broad visual market presentation where appropriate;
- add a broader provider for the general Crypto page if OpenStock needs global aggregation or venue-independent prices;
- choose Luno as the first adapter only when the initial product promise is explicitly South Africa/ZAR-focused and the terms review is accepted.

This makes Luno useful now without coupling the OpenStock domain model or public data promise to a single exchange.
