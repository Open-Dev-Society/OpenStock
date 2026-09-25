# OpenStock Quantitative Research, Strategy Backtester & 0DTE Engine
## Complete Technical Specification, Operational Manual & Research Ledger

---

### Table of Contents
1. [Executive Summary & Architecture](#1-executive-summary--architecture)
2. [Market Data Ingestion & Timeframe Synthesis](#2-market-data-ingestion--timeframe-synthesis)
3. [Quantitative Strategy Engines](#3-quantitative-strategy-engines)
4. [Backtest Execution & Metrics Math](#4-backtest-execution--metrics-math)
5. [Interactive Dashboard & Trade Execution Ledger](#5-interactive-dashboard--trade-execution-ledger)
6. [9Router AI Gateway Integration](#6-9router-ai-gateway-integration)
7. [Inngest Automation & Nightly Grid Sweeps](#7-inngest-automation--nightly-grid-sweeps)
8. [REST API Reference](#8-rest-api-reference)
9. [LuxAlgo 0DTE Options Playbook & Empirical Edge Data](#9-luxalgo-0dte-options-playbook--empirical-edge-data)
10. [Production Docker Deployment & Topology](#10-production-docker-deployment--topology)

---

## 1. Executive Summary & Architecture

OpenStock features an automated multi-timeframe quantitative backtesting framework, real-time trade execution ledger, and AI-driven trade audit pipeline.

```
[User Browser / External Bot / Webhook]
                   │
                   ▼ HTTP (3000)
       ┌────────────────────────┐
       │   OpenStock Next.js    │ ── Guest Access (No Mandatory Login)
       │      (Web Engine)      │
       └───────────┬────────────┘
                   │
         ┌─────────┼──────────────────────┐
         │         │                      │
         ▼         ▼                      ▼
   ┌──────────┐ ┌──────────┐     ┌────────────────┐
   │ Real     │ │ Database │     │ Inngest Engine │
   │ Market   │ │ (MongoDB)│     │ (Job Worker)   │
   │ Feeds    │ └──────────┘     └───────┬────────┘
   └────┬─────┘                          │
        ├─ Binance (Crypto 15m/1h/4h/1d)  ├─ Nightly Grid Cron (0 2 * * *)
        ├─ Yahoo (Equities 15m/1h/4h/1d) └─ Event: strategy/backtest.requested
        └─ Finnhub (Live Quotes/News)
                   │
                   ▼ HTTP (20128)
       ┌────────────────────────┐
       │     9Router Gateway    │ ── Model: gemini (gemini-3.8-flash)
       │    (Local AI Engine)   │
       └────────────────────────┘
```

---

## 2. Market Data Ingestion & Timeframe Synthesis

**Module**: `lib/market/ohlcv4h.ts`

### Data Sources
1. **Cryptocurrency (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`)**:
   - **Provider**: Binance Public API (`https://api.binance.com/api/v3/klines`).
   - **Timeframes**: Native `15m`, `1h`, `4h`, `1d`.
   - **Pagination**: Implements cursor-based pagination in 1,000-candle batches while `currentStartMs < endTimeMs`. Overcomes default API caps to fetch continuous historical data from 2020 through to the present moment.
2. **Equities & ETFs (`AAPL`, `NVDA`, `MSFT`, `SPY`, `QQQ`)**:
   - **Provider**: Yahoo Finance Chart API (`https://query1.finance.yahoo.com/v8/finance/chart`).
   - **Timeframes**:
     - `15m`: Intraday resolution up to 60 days.
     - `1h`: Hourly bars up to 1-2 years.
     - `4h`: Aggregates 4 consecutive hourly bars per trading day (boundaries reset across day transitions).
     - `1d`: Daily bars spanning multi-year horizons.
3. **Finnhub Integration**:
   - Live quote polling via `/quote` for current bid/ask/close calibration.
   - Ingests `NEXT_PUBLIC_FINNHUB_API_KEY` (`daqa4o...s5r0`).

---

## 3. Quantitative Strategy Engines

**Module**: `lib/strategy/backtest4h.ts`

### 1. LuxAlgo SuperTrend (`supertrend`)
- **Type**: Volatility-based adaptive trailing stop.
- **Formula**:
  $$\text{True Range}_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$
  $$\text{ATR}_t = \text{WilderSmooth}(\text{TR}, n)$$
  $$\text{BasicUp}_t = \frac{H_t + L_t}{2} + m \cdot \text{ATR}_t, \quad \text{BasicDn}_t = \frac{H_t + L_t}{2} - m \cdot \text{ATR}_t$$
  $$\text{FinalUp}_t = \min(\text{BasicUp}_t, \text{FinalUp}_{t-1}) \quad \text{if } C_{t-1} \le \text{FinalUp}_{t-1} \text{ else } \text{BasicUp}_t$$
  $$\text{FinalDn}_t = \max(\text{BasicDn}_t, \text{FinalDn}_{t-1}) \quad \text{if } C_{t-1} \ge \text{FinalDn}_{t-1} \text{ else } \text{BasicDn}_t$$
- **Parameters**: `atrPeriod` (10), `multiplier` (3.0).

### 2. LuxAlgo Smart Money Concepts: Fair Value Gap (`fair_value_gap`)
- **Type**: Institutional 3-bar imbalance mitigation.
- **Rules**:
  - **Bullish FVG**: `Low[i] > High[i-2]`. Unfilled void between `High[i-2]` and `Low[i]`.
  - **Consequent Encroachment (CE)**: Midpoint $\frac{\text{Low}_i + \text{High}_{i-2}}{2}$.
  - **Entry**: Price retraces into the gap, tests CE, and closes above gap bottom.
  - **Parameters**: `minGapPct` (default `0.3%`), `holdBars` (default `8`).

### 3. LuxAlgo SMC Order Block Retest (`order_block`)
- **Type**: Market structure break with origin block mitigation.
- **Rules**:
  - Detects swing break above/below $N$-period trailing high/low.
  - Identifies the last opposing candle prior to the displacement expansion.
  - Enters on pullback retest of the order block candle body.
  - **Parameters**: `lookback` (default `20`), `holdBars` (default `8`).

### 4. Bitcoin Liquidity Sweep & Reclaim (`liquidity_sweep`)
- **Type**: False-breakout sweep and absorption reversal.
- **Rules**:
  - **Bullish Sweep**: Bar wicks below 20-period range low, then closes back *above* the level.
  - **Volume Filter**: Volume $\ge 1.2\times$ 20-period Volume SMA (confirms absorption).
  - **Take Profit**: 20-period channel midpoint $\frac{H + L}{2}$ or 6 bars time-stop.
  - **Parameters**: `lookback` (default `20`), `volMultiplier` (default `1.2`).

### 5. Dual EMA Crossover (`ema_crossover`)
- **Type**: Trend following.
- **Logic**: Long when `fastEma > slowEma`; Short when `fastEma < slowEma`.
- **Parameters**: `fastPeriod` (12), `slowPeriod` (26).

### 6. RSI Mean Reversion (`rsi_oversold`)
- **Type**: Oscillator mean reversion.
- **Logic**: Long when 14-period RSI $< 30$; Short when RSI $> 70$; Neutralize at midline (45–55).
- **Parameters**: `period` (14), `oversold` (30), `overbought` (70).

### 7. Donchian Channel Breakout (`breakout`)
- **Type**: Range expansion momentum.
- **Logic**: Long on close $> \max(\text{High}_{i-N \dots i-1})$; Short on close $< \min(\text{Low}_{i-N \dots i-1})$.
- **Parameters**: `lookback` (20).

### 8. TensorTrade Deep RL Adaptive Q-Policy (`tensortrade_rl`)
- **Type**: Multi-factor Reinforcement Learning Q-Policy with Sortino/Sharpe risk-adjusted reward optimization.
- **State Vector**:
  - Normalized Trend Spread: $\frac{\text{EMA}_9 - \text{EMA}_{21}}{\text{ATR}_{14}}$
  - Normalized Momentum: $\frac{\text{RSI}_{14} - 50}{25}$
  - Mean-Reversion Z-Score: $\frac{\text{Close} - \text{SMA}_N}{\sigma_N}$
  - Multi-Factor Policy Score: $\pi(s) = 0.5 \times \text{Trend} + 0.3 \times \text{Mom} - 0.4 \times Z$
- **Execution Rules**:
  - Long Entry: $\pi(s) > 0.4$
  - Short Entry: $\pi(s) < -0.4$ (when `allowShort = true`)
  - Exit & De-risk: $\pi(s)$ crosses adverse threshold or drawdown reaches `-riskTolerance%`
- **Parameters**: `lookback` (20), `riskTolerance` (2.0%), `allowShort` (`true`/`false`).
- **Ticker Coverage**: Fully enabled across all 87 tickers in `QUANT_SYMBOL_UNIVERSE` (Crypto majors, Tech mega-caps, Sector ETFs, Growth equities, Bluechips).

### 9. Vibe Trader Studio & Multi-Agent Committee (`HKUDS/Vibe-Trading`)
- **Origin & Architecture**: Inspired by `HKUDS/Vibe-Trading` (34,000+ GitHub stars) — natural language prompt-driven quantitative strategy discovery.
- **Workflow**:
  1. **Prompt Ingestion**: Parses natural language trader goals, asset classes, and risk tolerances.
  2. **Rule Synthesis**: Heuristically resolves strategy type, parameters (lookbacks, stops, thresholds), and execution rules.
  3. **The Vibe Committee (4 Autonomous Roles)**:
     - 🚀 **Alpha Seeker (Bull)**: Analyzes order flow, displacement, momentum, and upside convexity.
     - 🛡️ **Risk Auditor (Bear)**: Audits tail risk, maximum expected drawdown, and hard stop adherence.
     - 🧠 **TensorTrade RL Specialist**: Tunes multi-factor state representations and Sortino reward optimization.
     - ⚖️ **Chief Investment Officer (CIO)**: Delivers consensus verdict, confidence score, and deployment mandate.
  4. **1-Click Execution**: Instantly deploys synthesized parameters to the OpenStock backtester or exports to TradingView, Python, NautilusTrader, Qlib, or TensorTrade.

---

## 4. Backtest Execution & Metrics Math

### Performance Calculations
1. **Shifted Execution**:
   Signals calculated at bar close $i-1$ execute at bar close $i$, eliminating lookahead bias.
2. **Cumulative Compounded Balance**:
   $$\text{Balance}_t = \text{Balance}_{t-1} \times (1 + r_t)$$
3. **Dynamic Annualization**:
   Annualization factors are derived dynamically from the exact timestamp span of the dataset, scaling accurately across 15m, 1h, 4h, and 1d intervals:
   $$\text{years} = \frac{t_{\text{end}} - t_{\text{start}}}{365.25 \times 86400 \times 1000}, \quad \text{barsPerYear} = \frac{N}{\text{years}}$$
   $$\text{Sharpe} = \frac{\mu_r}{\sigma_r} \sqrt{\text{barsPerYear}}$$
   $$\text{Max Drawdown} = \max_t \left(\frac{\text{Peak}_t - \text{Equity}_t}{\text{Peak}_t}\right)$$

---

## 5. Interactive Dashboard & Trade Execution Ledger

- **URL**: `http://192.168.0.2:3000/backtest`
- **Navigation**: "Quant Backtest" in top navigation bar.

### User Interface Features:
1. **Interactive Controls**:
   - Algorithm selection (7 strategies).
   - Ticker input (Crypto or US stocks).
   - Timeframe selector (`15m`, `1h`, `4h`, `1d`).
   - Lookback horizon selector (30d, 90d, 180d, 1y, 2y).
   - Dynamic parameter inputs matching selected algorithm.
2. **Key Metric Summary**:
   - Initial Capital ($10,000 baseline).
   - Final Portfolio Balance & Net Return ($ and %).
   - Annualized Sharpe Ratio.
   - Maximum Drawdown (%).
   - Win Rate (%) & Total Closed Trades.
3. **Executed Trade Ledger Table**:
   - Chronological list of every completed round-trip trade:
     - Trade ID (`#1`, `#2`, ...)
     - Symbol & Direction (`LONG` / `SHORT`)
     - Entry Timestamp & Entry Price ($)
     - Exit Timestamp & Exit Price ($)
     - Duration in bars and hours
     - Trade Return (%)
     - Trade Net PnL ($)
     - Running Account Balance ($)
4. **AI Strategy Audit**:
   - One-click trigger querying local 9Router (`gemini`).
   - Produces institutional-grade critique of drawdown risk, parameter sensitivity, and execution directives.

---

## 6. 9Router AI Gateway Integration

**Module**: `lib/ai-provider.ts` & `app/api/strategy/analyze/route.ts`

- **Endpoint**: `http://localhost:20128/v1` (local) / `http://192.168.0.10:20128/v1` (remote container).
- **Default Model**: `gemini` (routes to `gemini-3.8-flash`).
- **Authentication**: `Bearer sk-0881d6aee36a48c7-21gy8f-af3d3174`.
- **Environment Variables**:
  ```env
  AI_PROVIDER=9router
  NINEROUTER_URL=http://192.168.0.10:20128/v1
  NINEROUTER_KEY=sk-0881d6aee36a48c7-21gy8f-af3d3174
  NINEROUTER_MODEL=gemini
  ```

---

## 7. Inngest Automation & Nightly Grid Sweeps

**Module**: `lib/inngest/functions.ts`

1. **`run-4h-backtest`**:
   - Trigger: `strategy/backtest.requested`.
   - Executes multi-timeframe backtest in background worker.
   - Persists trade ledger and metrics to MongoDB.
2. **`nightly-4h-research`**:
   - Trigger: Cron `0 2 * * *` (02:00 UTC daily).
   - Parameter sweep across benchmark universe (`AAPL`, `MSFT`, `NVDA`, `SPY`, `QQQ`):
     - EMA: 9 combinations
     - RSI: 6 combinations
     - Breakout: 3 combinations
     - Liquidity Sweep: 6 combinations
     - SuperTrend: 4 combinations
     - Fair Value Gap: 4 combinations
     - Order Block: 4 combinations
   - Selects highest Sharpe configuration and updates `Best4hStrategy` leaderboard snapshot.

---

## 8. REST API Reference

### 1. Trigger / Run Backtest
- **Endpoint**: `POST /api/strategy/backtest`
- **Payload**:
  ```json
  {
    "type": "supertrend",
    "params": { "atrPeriod": 10, "multiplier": 3 },
    "symbols": ["BINANCE:BTCUSDT"],
    "timeframe": "1h",
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2026-01-01T00:00:00.000Z",
    "runDirect": true
  }
  ```
- **Response** (`200 OK` or `202 Accepted`):
  ```json
  {
    "ok": true,
    "backtestId": "6ab4d82adcc7fcd3ecd8eee2",
    "data": { ... }
  }
  ```

### 2. List Historical Backtests
- **Endpoint**: `GET /api/strategy/backtest`
- **Response**: Array of recent 30 backtests with status, metrics, and trades count.

### 3. Query Backtest by ID
- **Endpoint**: `GET /api/strategy/backtest/:id`
- **Response**: Full backtest document including trade ledger.

### 4. Query Best Strategy Leaderboard
- **Endpoint**: `GET /api/strategy/best-4h`
- **Response**: Snapshot of winning strategy configuration by Sharpe ratio.

### 5. AI Strategy Analysis
- **Endpoint**: `POST /api/strategy/analyze`
- **Payload**:
  ```json
  {
    "backtestId": "6ab4d82adcc7fcd3ecd8eee2",
    "prompt": "Evaluate this setup and recommend stop loss adjustments."
  }
  ```
- **Response**: AI analysis text generated via 9Router.

---

## 9. LuxAlgo 0DTE Options Playbook & Empirical Edge Data

Empirical data extracted from LuxAlgo Edge Stats Store (over 2,450 sessions):

### Statistical Edge Metrics
1. **Initial Balance (IB) One-Sided Break**:
   - When the 09:30–10:30 ET IB breaks only to the upside: **98.65%** of sessions close green ($N = 370$).
   - When the IB breaks only to the downside: **98.33%** of sessions close red ($N = 359$).
2. **1.0x Initial Balance Range Extension**:
   - Upon confirmed IB break, price reaches at least $1.0\times$ the IB range in **91.52%** of sessions ($N = 2,452$).
3. **Dealer Gamma Exposure (GEX)**:
   - **Positive GEX**: Dampens realized volatility; price gravitates toward high-GEX call/put walls.
   - **Negative GEX**: Accelerates directional breaks; hedging fuels gamma squeezes.

### Top 3 0DTE Strategies (SPY / QQQ / SPX)
1. **IB 1.0x Expansion Runner**:
   - Buy 0.40 Delta ATM call/put on 5m candle close outside IB range; exit at 1.0x extension target.
2. **Opposite-Side Credit Harvest**:
   - When IBH breaks, sell OTM Put Credit Spreads below IBL (98.6% hold rate). Invalidate on 50% IB retest.
3. **Terminal 1.0x GEX Wall Fade**:
   - Between 13:30–15:00 ET, fade moves reaching the 1.0x extension target if aligned with dominant Positive Gamma Call/Put Wall.

---

## 10. Production Docker Deployment & Topology

- **Host**: `dockersrv` (`192.168.0.2`)
- **Architecture**: AMD Phenom II X6 1055T (Non-AVX)
- **Directory**: `/opt/openstock`
- **Git Branch**: `feat/4h-strategy-backtester` (PR #103)

### Running Containers
```text
CONTAINER NAME       IMAGE                         PORTS
openstock-web        openstock-openstock:latest   0.0.0.0:3000->3000/tcp
openstock-inngest    inngest/inngest:latest       0.0.0.0:8288->8288/tcp
openstock-mongodb    mongo:4.4                    0.0.0.0:27017->27017/tcp
```

### Verification Commands
```bash
# Verify unit & strategy math
node scripts/test-backtest.mjs

# Verify live Finnhub API connection
node scripts/test-live-finnhub.mjs

# Verify 9Router local AI gateway
node scripts/test-9router.mjs
```
