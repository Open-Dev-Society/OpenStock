# AGENTS.md

> Navigation map for agents and engineers working on OpenStock.
> Detail belongs in subdirectory `AGENTS.md` files or [docs/conventions/](docs/conventions/) — keep this file under ~120 lines.

## What this is

OpenStock is an open-source stock-tracking platform: real-time prices, watchlists, AI-driven daily summaries, and onboarding-personalized welcome emails. Stack: Next.js App Router (Turbopack), MongoDB, Better Auth, Inngest for background jobs.

## Tech stack at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | Tailwind 4, shadcn/ui (Radix), `lucide-react` |
| Auth | Better Auth (self-managed secret) |
| DB | MongoDB + Mongoose 8 |
| Jobs | Inngest (cron, AI dispatch) |
| Mail | Nodemailer + Gmail SMTP |
| Market data | Finnhub REST, TradingView embed widgets |
| AI | Google Gemini (default); MiniMax / Siray optional |
| Sentiment | Adanos (optional) |
| Tests | Vitest |

See [README.md](README.md) for badges and feature list; see [docs/env-vars.md](docs/env-vars.md) (Phase 3) for environment variables.

## Common commands

```bash
npm run dev          # Next dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest run
npm run test:watch   # Vitest watch
npm run test:db      # Test MongoDB connection
node scripts/check-env.mjs   # Validate .env completeness
```

## Directory map

> Subdirectory-level `AGENTS.md` files are added in Phase 3 of [plans/Harness工程化導入計劃.md](plans/Harness工程化導入計劃.md). Links below currently point to directories.

| Path | What it holds |
|---|---|
| [app/](app/) | Next.js App Router routes (groups: `(auth)`, `(root)`) |
| [app/api/](app/api/) | Route handlers (`inngest/` is the queue webhook) |
| [components/](components/) | Reusable UI (Header, Footer, watchlist, forms…) |
| [database/](database/) | Mongoose connection + models |
| [lib/actions/](lib/actions/) | Server Actions: auth, watchlist, finnhub, alert, adanos |
| [lib/inngest/](lib/inngest/) | Inngest client + scheduled functions + AI prompts |
| [lib/](lib/) | Cross-cutting helpers (`ai-provider.ts`, `nodemailer/`, `better-auth/`) |
| [__tests__/](__tests__/) | Vitest specs |
| [scripts/](scripts/) | Node scripts (env check, db test, kit migration, seeding) |
| [docs/ADR/](docs/ADR/) | Architecture Decision Records |
| [docs/conventions/](docs/conventions/) | Detailed coding / naming conventions |
| [plans/](plans/) | Long-form engineering plans (Chinese) |

## Invariants

These are enforced by `scripts/check-consistency.sh` (Phase 2+) and ESLint — they are not suggestions:

- **README ⇄ code in sync**: dependency badges, API route list, scripts list, and env vars must match the actual repo state.
- **Every key subdirectory has an `AGENTS.md`** (target state, end of Phase 3).
- **`app/**` does not import `database/models/*` directly** — go through `lib/actions/`.
- **All Mongoose schemas declare `{ timestamps: true }`**.
- **`process.env.*` reads live in `lib/`**, not in components.
- **Server actions in `lib/actions/` are named verb-first** (`get…`, `create…`, `update…`, `delete…`, `sync…`).

## Common task entry points

| I want to… | Read first |
|---|---|
| Add an API route | [docs/conventions/api-routes.md](docs/conventions/api-routes.md) (Phase 3) |
| Add a Mongoose model | [docs/conventions/mongoose-models.md](docs/conventions/mongoose-models.md) (Phase 3) |
| Add a server action | [docs/conventions/server-actions.md](docs/conventions/server-actions.md) (Phase 3) |
| Add a test | [docs/conventions/testing.md](docs/conventions/testing.md) (Phase 3) |
| Add an env var / external service | [plans/Harness工程化導入計劃.md §附錄 B.5](plans/Harness工程化導入計劃.md) |
| Make a load-bearing technical decision | Open a new ADR in [docs/ADR/](docs/ADR/) — see [docs/ADR/README.md](docs/ADR/README.md) |

## Mechanical checks

```bash
bash scripts/check-consistency.sh    # C1–C6 invariants (Phase 2+)
npm run lint
npm test
```

Enable the local pre-commit hook (Phase 2):

```bash
git config core.hooksPath .githooks
```

CI runs the same checks on every PR via `.github/workflows/consistency.yml` (Phase 2).

---

For the rollout plan that produced this file, see [plans/Harness工程化導入計劃.md](plans/Harness工程化導入計劃.md).
