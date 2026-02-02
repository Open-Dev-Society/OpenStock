# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenStock is an open-source stock market platform built with Next.js 15 (App Router), TypeScript, and MongoDB. It provides real-time market data, personalized watchlists, AI-powered email summaries, and TradingView chart integrations. The app uses Better Auth for authentication and Inngest for background workflows.

## Development Commands

### Core Development
```bash
# Start development server (Turbopack)
pnpm dev
# or
npm run dev

# Production build
pnpm build
# or
npm run build

# Start production server
pnpm start
# or
npm start

# Linting
pnpm lint
# or
npm run lint
```

### Database
```bash
# Test MongoDB connection
pnpm test:db
# or
npm run test:db
```

### Inngest (Background Jobs & AI)
```bash
# Start Inngest dev server (required for workflows and AI email generation)
npx inngest-cli@latest dev
```

### Docker
```bash
# Start MongoDB container only
docker compose up -d mongodb

# Start entire stack (MongoDB + OpenStock app)
docker compose up -d mongodb && docker compose up -d --build
```

## Architecture

### Authentication Flow
- Better Auth with MongoDB adapter (`lib/better-auth/auth.ts`)
- Singleton pattern for auth instance: `getAuth()` initializes once and returns cached instance
- Session validation in middleware (`middleware/index.ts`) protects all routes except `/sign-in`, `/sign-up`, assets, and Next.js internals
- Session cookies checked via `getSessionCookie()` - redirects to `/sign-in` if missing

### Database Connection
- Global singleton pattern in `database/mongoose.ts` prevents multiple connections
- Connection cached in `global.mongooseCache` with promise deduplication
- Connection persists across serverless function invocations
- Models use the `models?.ModelName || model()` pattern to prevent recompilation

### Data Models
- **Watchlist**: Per-user stock watchlist with unique index on `userId + symbol`
  - Schema: `userId`, `symbol`, `company`, `addedAt`
  - Prevents duplicate symbols per user via compound unique index

### Finnhub Integration
- Stock search, company profiles, and market news via Finnhub API
- Server actions in `lib/actions/finnhub.actions.ts`:
  - `searchStocks()`: Cached with React cache, returns popular stocks when query is empty
  - `getNews()`: Fetches company-specific or general market news
  - Uses Next.js fetch with revalidation for caching (300s for news, 3600s for profiles)
- API key: `NEXT_PUBLIC_FINNHUB_API_KEY` (exposed to browser for TradingView widgets)
- Free tier may return delayed quotes; respect rate limits

### Inngest Background Jobs
- Two main workflows in `lib/inngest/functions.ts`:
  1. **Welcome Email** (`app/user.created`):
     - Triggered on user sign-up
     - Uses Gemini AI to personalize intro based on user profile (country, investment goals, risk tolerance, preferred industry)
     - Sends via Nodemailer
  2. **Daily News Summary** (cron: `0 12 * * *`):
     - Runs daily at noon
     - Fetches each user's watchlist symbols
     - Gets news for those symbols (or general news as fallback)
     - Uses Gemini AI to summarize news
     - Sends personalized email to each user
- Inngest endpoint: `app/api/inngest/route.ts` exposes GET/POST/PUT handlers
- Local dev: Run `npx inngest-cli@latest dev` alongside Next.js dev server
- For Vercel deployment, set `INNGEST_SIGNING_KEY` from Inngest dashboard

### Email System (Nodemailer)
- Gmail transport configured in `lib/nodemailer/index.ts`
- Templates in `lib/nodemailer/templates.ts`:
  - `sendWelcomeEmail()`: AI-personalized intro
  - `sendNewsSummaryEmail()`: Daily market news digest
- Credentials: `NODEMAILER_EMAIL` and `NODEMAILER_PASSWORD` (use Gmail App Password if 2FA enabled)
- For production, prefer dedicated SMTP provider over personal Gmail

### TradingView Widgets
- Widget configurations in `lib/constants.ts`:
  - Market overview, heatmap, top stories
  - Symbol info, candlestick charts, baseline charts
  - Technical analysis, company profile, company financials
- Widgets render via `TradingViewWidget.tsx` component
- External images from `i.ibb.co` allowlisted in `next.config.ts`

### App Router Structure
```
app/
  (auth)/              # Unauthenticated routes
    sign-in/page.tsx
    sign-up/page.tsx
  (root)/              # Authenticated routes
    page.tsx           # Dashboard
    stocks/[symbol]/   # Stock detail page with TradingView widgets
    help/page.tsx
    api-docs/page.tsx
    terms/page.tsx
  api/inngest/route.ts # Inngest webhook endpoint
```

### Server Actions
All server actions are in `lib/actions/`:
- `auth.actions.ts`: Sign-up with user profile, sign-in, sign-out
- `finnhub.actions.ts`: Stock search, market news
- `watchlist.actions.ts`: Add/remove from watchlist, get user watchlist
- `user.actions.ts`: Get users for daily news emails
- All use `'use server'` directive

### Component Patterns
- shadcn/ui components in `components/ui/`
- Form components in `components/forms/`:
  - `InputField`, `SelectField`, `CountrySelectField`
  - Use react-hook-form for validation
- Global components: `Header`, `Footer`, `SearchCommand`, `WatchlistButton`, `UserDropdown`
- `SearchCommand`: Cmd/Ctrl+K command palette with debounced stock search

## Environment Variables

### Required for all environments
```env
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://... or mongodb://root:example@mongodb:27017/openstock?authSource=admin

# Auth
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:3000

# Finnhub
NEXT_PUBLIC_FINNHUB_API_KEY=your_key
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# Inngest AI (Gemini)
GEMINI_API_KEY=your_gemini_key

# Email (Gmail)
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

### Vercel deployment (additional)
```env
INNGEST_SIGNING_KEY=your_inngest_signing_key  # From Inngest dashboard
```

### Docker MongoDB connection
```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```
Note: `authSource=admin` required when using root credentials in docker-compose.yml

## Key Implementation Details

### Preventing Duplicate Auth Instances
Better Auth initialization uses singleton pattern to prevent multiple database connections:
```typescript
let authInstance: ReturnType<typeof betterAuth> | null = null;
export const getAuth = async () => {
  if (authInstance) return authInstance;
  // Initialize once...
}
```

### Caching Strategies
- **Finnhub API**: Next.js fetch cache with revalidation
  - News: 300s (5 minutes)
  - Profiles: 3600s (1 hour)
- **Stock search**: React `cache()` wrapper for request deduplication
- **MongoDB**: Global singleton connection cache

### News Round-Robin Algorithm
When fetching news for multiple watchlist symbols, `getNews()` uses round-robin selection to ensure variety across symbols rather than all articles from one company.

### Middleware Pattern
Middleware only checks for session cookie presence (lightweight). Full session validation happens in route handlers and server actions as needed.

## Common Tasks

### Adding a new Inngest function
1. Define function in `lib/inngest/functions.ts`
2. Register in `app/api/inngest/route.ts` functions array
3. Test locally with `npx inngest-cli@latest dev`

### Adding a new server action
1. Create in appropriate file under `lib/actions/`
2. Add `'use server'` directive at top of file
3. Import and use in client components

### Adding a new TradingView widget
1. Define config function in `lib/constants.ts`
2. Use `TradingViewWidget` component with config
3. Add any new external domains to `next.config.ts` if needed

### Modifying watchlist schema
1. Update interface in `database/models/watchlist.model.ts`
2. Mongoose will handle migration automatically (no manual migrations needed)
3. Update corresponding TypeScript types in `types/global.d.ts`

## Known Configuration

### Build Settings
- TypeScript and ESLint errors ignored during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`)
- Turbopack enabled for dev and build
- Dev indicators disabled

### Tailwind CSS
- Using Tailwind v4 via `@tailwindcss/postcss`
- No separate `tailwind.config.js` needed
- CSS configured in `app/globals.css` and `postcss.config.mjs`

### License Requirements
AGPL-3.0 license: Any modifications, redistributions, or web deployments must:
- Release source code under same license
- Credit original authors (Open Dev Society)
