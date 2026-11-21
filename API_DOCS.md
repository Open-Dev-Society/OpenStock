<div align="center">
  <img src="public/assets/images/logo.png" alt="OpenStock Logo" width="120" />
  <h1>OpenStock API & Architecture</h1>
  
  <p>
    <b>Modern. Open. Resilient.</b>
  </p>

  <p>
    <img src="https://img.shields.io/badge/status-active-success?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/AI-Gemini%20%2B%20MiniMax-blueviolet?style=for-the-badge" alt="AI Stack" />
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=for-the-badge" alt="License" />
  </p>
</div>

---

## 🏗️ Architecture Overview

OpenStock leverages a resilient event-driven architecture powered by **Inngest**. We prioritize uptime for our generative features by utilizing a multi-provider AI strategy.

### 🧠 Intelligent Model Routing

We don't rely on a single point of failure. Our AI infrastructure automatically routes around outages.

```mermaid
graph LR
    A[User Action / Cron] -->|Trigger| B(Inngest Function);
    B --> C{Primary Provider};
    C -->|Gemini 2.5 Flash Lite| D[Generate Content];
    C -.->|Error / Rate Limit| E{Fallback Provider};
    E -->|MiniMax-M3.1-Flash, or Siray| D;
    D --> F[Email / Notification];
    
    style C fill:#20c997,stroke:#333,stroke-width:2px,color:black
    style E fill:#3b82f6,stroke:#333,stroke-width:2px,color:white
    style D fill:#fff,stroke:#333,stroke-width:2px,color:black
```

---

## 🤝 AI Providers

Set `AI_PROVIDER` to `gemini` (the default), `minimax` or `siray`. The code is in `lib/ai-provider.ts`.

### Primary: Google Gemini
Writes the welcome emails and the weekly news summary with `gemini-2.5-flash-lite` (override with `GEMINI_MODEL`).

### Fallback: MiniMax or Siray
If the primary call fails, the same prompt is retried once on the fallback: MiniMax (`MiniMax-M3.1-Flash`, or `MINIMAX_MODEL`) when `MINIMAX_API_KEY` is set, otherwise Siray (`SIRAY_API_KEY`). If MiniMax or Siray is the primary, Gemini is the fallback. If every provider fails, the welcome email uses a standard intro and the digest a short placeholder line.

---

## ⚡ Serverless Functions (Inngest)

Our background jobs are defined in `lib/inngest/functions.ts`.

| ID | Type | Schedule/Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| `sign-up-email` | 🔔 Event | `app/user.created` | **Personalized Onboarding.** Generates a custom welcome message based on user quiz results. |
| `weekly-news-summary` | ⏱️ Cron | `0 9 * * 1` (Mon 9AM) | **Market Intelligence.** Summarizes top financial news and broadcasts to all users via Kit. |
| `check-stock-alerts` | ⏱️ Cron | `*/5 * * * *` | **Real-time Monitoring.** Checks user price targets against live market data (realtime mode only; US stocks and crypto). |
| `check-inactive-users` | ⏱️ Cron | `0 10 * * *` | **Re-engagement.** Identifies dormant users (>30 days) and sends a "We miss you" nudge. |

---

## 🔌 API Integrations

<details>
<summary><b>📈 Stock Data: Finnhub</b></summary>
<br/>

*   **Base URL:** `https://finnhub.io/api/v1`
*   **Key Features:** Quotes, search, company profiles, dividend data, market news.
*   **Auth:** `FINNHUB_API_KEY`, or several keys comma-separated in `FINNHUB_API_KEYS` (rotated; each adds 60 requests a minute). `NEXT_PUBLIC_FINNHUB_API_KEY` still works as a name. No key is sent to the browser.

</details>

<details>
<summary><b>🌍 Saudi and Polish quotes: Yahoo Finance</b></summary>
<br/>

*   **Role:** Delayed quotes for Tadawul (`.SR`) and GPW Warsaw (`.WA`) on the dashboard, stock pages and watchlist, because TradingView embeds block Tadawul and show Warsaw only end of day.
*   **Auth:** None.

</details>

<details>
<summary><b>📊 Charts and widgets: TradingView</b></summary>
<br/>

*   **Role:** Candle charts, heatmaps, financials, technicals and company profiles, as free embeds loaded in the browser.
*   **Auth:** None.

</details>

<details>
<summary><b>🧭 Optional cards: Adanos and AlphAI</b></summary>
<br/>

*   **Adanos:** the sentiment card (Reddit, X, news, Polymarket). Auth: `ADANOS_API_KEY`.
*   **AlphAI:** the scored news card. Auth: `ALPHAI_API_KEY`.

</details>

<details>
<summary><b>📧 Email & Marketing: Kit (ConvertKit)</b></summary>
<br/>

*   **Role:** High-volume user broadcasts and tag management.
*   **Key Endpoints:**
    *   `POST /v3/forms/{form_id}/subscribe` (adds a new user to the newsletter, `KIT_WELCOME_FORM_ID`)
    *   `POST /v3/broadcasts` (the weekly digest)
*   **Auth:** `KIT_API_KEY` • `KIT_API_SECRET`

</details>

<details>
<summary><b>🗄️ Database: MongoDB Atlas</b></summary>
<br/>

*   **Connection:** Standard URI. Node, Docker and Vercel share one connection; on Cloudflare Workers each request opens its own.
*   **Collections:** `user`, `session` and `account` (Better Auth), `watchlists`, `watchlistlists` (named lists), `alerts`, `rate_limits`.

</details>

---

<div align="center">
  <sub>Documentation © Open Dev Society. Built with ❤️ for the Open Source Community.</sub>
</div>
