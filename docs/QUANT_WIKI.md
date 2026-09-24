# OpenStock Quantitative Knowledge Base & Asset Wiki

This document serves as the master quantitative strategy manual, asset universe reference, and algorithmic execution wiki for OpenStock.

---

## 1. Complete Quant Symbol Universe (80+ Liquid Assets)

All symbols below are natively supported for live backtesting and trade execution across 15m, 1h, 4h, and 1d timeframes.

### A. Cryptocurrency Majors (Binance Spot & Perpetual Feeds)
Direct tick-by-tick real candle ingestion from `api.binance.com`:
- `BINANCE:BTCUSDT` - Bitcoin (Digital Gold / Macro Momentum)
- `BINANCE:ETHUSDT` - Ethereum (Smart Contract Layer 1)
- `BINANCE:SOLUSDT` - Solana (High-Throughput Layer 1)
- `BINANCE:BNBUSDT` - BNB (Binance Ecosystem)
- `BINANCE:XRPUSDT` - Ripple (Cross-Border Liquidity)
- `BINANCE:DOGEUSDT` - Dogecoin (High-Beta Meme Liquidity)
- `BINANCE:ADAUSDT` - Cardano (Proof-of-Stake Protocol)
- `BINANCE:AVAXUSDT` - Avalanche (Subnet Architecture)
- `BINANCE:LINKUSDT` - Chainlink (Decentralized Oracle Network)
- `BINANCE:SUIUSDT` - Sui Network (Move-based L1)
- `BINANCE:NEARUSDT` - NEAR Protocol (Sharded Layer 1)
- `BINANCE:APTUSDT` - Aptos (Move Language L1)
- `BINANCE:PEPEUSDT` - Pepe (Meme Liquidity Factor)
- `BINANCE:SHIBUSDT` - Shiba Inu (Meme Ecosystem)
- `BINANCE:DOTUSDT` - Polkadot (Interoperability Protocol)
- `BINANCE:LTCUSDT` - Litecoin (Proof-of-Work Legacy)
- `BINANCE:BCHUSDT` - Bitcoin Cash (Payment Chain)
- `BINANCE:UNIUSDT` - Uniswap (Automated Market Maker Protocol)
- `BINANCE:ATOMUSDT` - Cosmos (Inter-Blockchain Communication)
- `BINANCE:RENDERUSDT` - Render Network (Decentralized GPU Compute)
- `BINANCE:FETUSDT` - Artificial Superintelligence Alliance (Decentralized AI)
- `BINANCE:TAOUSDT` - Bittensor (Decentralized Machine Learning)
- `BINANCE:INJUSDT` - Injective (DeFi Derivatives L1)
- `BINANCE:ARBUSDT` - Arbitrum (Ethereum Layer 2 Rollup)
- `BINANCE:OPUSDT` - Optimism (OP Stack Superchain L2)

### B. Tech Mega-Caps & Semiconductors
Real-time & historical equity feeds via Yahoo Finance Chart API:
- `NVDA` - NVIDIA Corporation (AI Infrastructure / Accelerated Compute)
- `AAPL` - Apple Inc. (Consumer Electronics & Ecosystem)
- `MSFT` - Microsoft Corporation (Cloud & Enterprise AI)
- `AMZN` - Amazon.com Inc. (E-Commerce & AWS Cloud)
- `GOOGL` - Alphabet Inc. (Search, Advertising & DeepMind)
- `META` - Meta Platforms Inc. (Social Networks & Open Llama AI)
- `TSLA` - Tesla Inc. (EV, Autonomous Driving & Robotics)
- `AVGO` - Broadcom Inc. (Custom AI ASICs & Networking)
- `AMD` - Advanced Micro Devices (CPU / GPU Computing)
- `QCOM` - Qualcomm Inc. (Mobile & Edge Computing)
- `ORCL` - Oracle Corporation (Database & Enterprise Cloud)
- `CRM` - Salesforce Inc. (CRM Cloud & Agentforce)
- `ADBE` - Adobe Inc. (Creative Software & Generative Media)
- `NFLX` - Netflix Inc. (Streaming Entertainment)
- `INTC` - Intel Corporation (Semiconductor Manufacturing)
- `ARM` - Arm Holdings plc (Energy-Efficient Architecture)
- `MU` - Micron Technology (HBM3e Memory & Storage)
- `SMCI` - Super Micro Computer (AI High-Density Server Racks)

### C. Benchmark Indices & Sector ETFs
Macro drivers, equity indices, and sector rotation tracking:
- `SPY` - SPDR S&P 500 ETF Trust (US Large-Cap Benchmark)
- `QQQ` - Invesco QQQ Trust (Nasdaq 100 Technology Index)
- `IWM` - iShares Russell 2000 ETF (US Small-Cap Benchmark)
- `DIA` - SPDR Dow Jones Industrial Average ETF (Industrial Blue-Chips)
- `SMH` - VanEck Semiconductor ETF (Semiconductor Sector Tracker)
- `SOXX` - iShares Semiconductor ETF (Phlx Semiconductor Index)
- `XLK` - Technology Select Sector SPDR Fund (Tech Sector Factor)
- `XLF` - Financial Select Sector SPDR Fund (Banking & Credit Factor)
- `XLE` - Energy Select Sector SPDR Fund (Oil & Gas Factor)
- `XLV` - Health Care Select Sector SPDR Fund (Pharmaceuticals & Healthcare)
- `XLI` - Industrial Select Sector SPDR Fund (Manufacturing & Defense)
- `TLT` - iShares 20+ Year Treasury Bond ETF (Fixed Income & Rate Duration)
- `GLD` - SPDR Gold Shares (Precious Metals & Monetary Hedge)
- `SLV` - iShares Silver Trust (Industrial Precious Metals)
- `USO` - United States Oil Fund (Crude Oil Energy Commodity)

### D. High-Beta & Crypto Proxies
Volatile momentum assets and publicly traded bitcoin proxies:
- `MSTR` - MicroStrategy Inc. (Leveraged Bitcoin Treasury Holding)
- `COIN` - Coinbase Global Inc. (Digital Asset Exchange)
- `MARA` - MARA Holdings (Bitcoin Proof-of-Work Mining)
- `RIOT` - Riot Platforms Inc. (Bitcoin Mining Infrastructure)
- `CLSK` - CleanSpark Inc. (Low-Cost Energy Mining)
- `HOOD` - Robinhood Markets Inc. (Retail Equities & Crypto Brokerage)
- `PLTR` - Palantir Technologies (Enterprise AI Foundry & Defense Data)
- `UBER` - Uber Technologies Inc. (Global Mobility & Delivery)
- `ABNB` - Airbnb Inc. (Global Travel & Short-Term Rentals)
- `CRWD` - CrowdStrike Holdings (Cloud-Native Cybersecurity)
- `PANW` - Palo Alto Networks (Next-Gen Network Security)
- `SHOP` - Shopify Inc. (Global Merchant Commerce Platform)
- `SNOW` - Snowflake Inc. (Cloud Data Warehouse)
- `DDOG` - Datadog Inc. (Observability & Cloud Monitoring)
- `NET` - Cloudflare Inc. (Edge CDN, Security & Workers Compute)
- `SQ` - Block Inc. (Cash App & Merchant Ecosystem)

### E. Blue-Chip & Defensive Leaders
- `JPM` - JPMorgan Chase & Co.
- `BAC` - Bank of America Corp.
- `GS` - Goldman Sachs Group Inc.
- `V` - Visa Inc.
- `MA` - Mastercard Incorporated
- `WMT` - Walmart Inc.
- `COST` - Costco Wholesale Corp.
- `LLY` - Eli Lilly and Co.
- `UNH` - UnitedHealth Group
- `XOM` - Exxon Mobil Corp.
- `CAT` - Caterpillar Inc.
- `BA` - Boeing Co.

---

## 2. Quantitative Strategy Catalog

### 1. `liquidity_sweep` — Bitcoin Liquidity Sweep & Reclaim
- **Mechanism**: Exploits the high failure rate of breakouts (52.26% false break rate in BTCUSDT edge store data). When price pierces the rolling 20-bar extreme and closes back inside with volume expansion ($\ge 1.2\times$ SMA), it triggers a counter-trend mean reversion trade to range midpoint $(H + L)/2$.
- **Best Assets**: `BINANCE:BTCUSDT`, `BINANCE:ETHUSDT`, `QQQ`.

### 2. `supertrend` — LuxAlgo SuperTrend (ATR Trailing Stop)
- **Mechanism**: Multiplier $\times$ Wilder ATR bands around bar midpoint with monotonic ratcheting. Flips side and reverses position only on confirmed bar close through the band.
- **Parameters**: `atrPeriod` (10), `multiplier` (3.0).
- **Best Assets**: Trending regimes (`BTCUSDT` on 1h/4h, `NVDA`, `PLTR`).

### 3. `fair_value_gap` — LuxAlgo Smart Money Concepts: FVG
- **Mechanism**: Scans for 3-candle displacement voids where `Low[i] > High[i-2]` (bullish) or `High[i] < Low[i-2]` (bearish). Executes entries when price returns to mitigate the Consequent Encroachment (midpoint).
- **Parameters**: `minGapPct` (0.3% - 0.5%), `holdBars` (8).
- **Best Assets**: Volatile momentum assets (`BTCUSDT`, `SOLUSDT`, `MSTR`).

### 4. `order_block` — LuxAlgo SMC Order Block Retest
- **Mechanism**: Identifies origin candles prior to structural market breaks (BoS). Enters upon institutional retest of the order block footprint.
- **Parameters**: `lookback` (20), `holdBars` (8).
- **Best Assets**: Trend continuation setups (`BTCUSDT`, `SPY`, `ETHUSDT`).

### 5. `ema_crossover` — Dual Exponential Moving Average
- **Mechanism**: Classic trend momentum crossover. Fast EMA crosses above Slow EMA for Long; below for Short.
- **Parameters**: `fastPeriod` (12 or 20), `slowPeriod` (26 or 50).
- **Best Assets**: Sustained macro trends (`SPY`, `AAPL` on 1d).

### 6. `rsi_oversold` — RSI Mean Reversion
- **Mechanism**: 14-period Wilder smoothed RSI. Enters Long when RSI $< 30$; Short when RSI $> 70$; exits when reverting to midline (45–55).
- **Parameters**: `period` (14), `oversold` (30), `overbought` (70).
- **Best Assets**: Mean-reverting range environments (`SPY`, `IWM`).

### 7. `breakout` — Donchian Channel Expansion
- **Mechanism**: Continuous channel breakout. Buys on close above $N$-bar high; sells on close below $N$-bar low.
- **Parameters**: `lookback` (20 to 60).
- **Best Assets**: High-beta momentum leaders (`NVDA`, `MSTR`, `TSLA`).

---

## 3. Supported Multi-Timeframes

- **`15m`**: High-frequency intraday momentum and scalping.
- **`1h`**: Intraday swing, London/NY session crossovers.
- **`4h`**: Multi-day algorithmic swing (default benchmark).
- **`1d`**: Macro regime and multi-month portfolio positioning.

---

## 4. API Endpoints

- **`GET /api/strategy/symbols`**: Retrieve all 80+ supported symbols grouped by category.
- **`POST /api/strategy/backtest`**: Trigger backtest (supports `runDirect: true` for instant ledger response).
- **`GET /api/strategy/backtest`**: List recent backtest runs.
- **`GET /api/strategy/backtest/:id`**: Query full backtest document including trade ledger.
- **`GET /api/strategy/best-4h`**: Query highest-performing strategy from nightly Inngest grid sweeps.
- **`POST /api/strategy/analyze`**: Request institutional AI strategy audit via local 9Router (`gemini`).
