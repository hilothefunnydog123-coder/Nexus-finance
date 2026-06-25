# YN Finance — Claude Code Handoff

## What This Is
YN Finance is a real startup — an **AI stock-forecasting platform** built around a transparent, publicly-graded track record. Live at **ynfinance.org** (Netlify). GitHub: `hilothefunnydog123-coder/Nexus-finance`.

The pitch: *"An AI that calls the market — and proves it."* The moat is **accountability** — every forecast is published and graded against real prices, un-cherry-picked. On top of the forecasting core sits a suite of analysis tools, copy-paste trading algorithms, education, and cinematic market visualizations.

## Tech Stack
- **Next.js 15** App Router · TypeScript · Tailwind CSS v4
- **Supabase** — auth, database, realtime
- **Stripe** — subscriptions (Pro tiers / daily brief paywall)
- **Resend** — transactional emails
- **Finnhub API** — real market data (quotes, candles, news, fundamentals, calendar)
- **TradingView widget** — real charts
- **BrainStock neural net** — the forecasting engine (trains on market data, logs + grades predictions)

## Environment Variables (in Netlify + .env.local)
```
FINNHUB_API_KEY                    — finnhub.io
NEXT_PUBLIC_FINNHUB_API_KEY        — same key (client-side websocket)
NEXT_PUBLIC_SUPABASE_URL           — https://ytwgvqbhzejumicaupkj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY      — sb_publishable_... key
RESEND_API_KEY                     — resend.com
EMAIL_FROM                         — YN Finance <noreply@ynfinance.org>
STRIPE_SECRET_KEY                  — sk_test_...
STRIPE_WEBHOOK_SECRET              — whsec_...
```

## Product Surface
The landing page (`src/app/page.tsx`) pitches the products as numbered "frames." Core nav lives at the top; the **full product list (incl. the Intelligence Suite) lives in the bottom "all products" bar / footer.**

### Core products
- **BrainStock** (`/brainstock`) — the forecaster. A neural net forecasts ~300 stocks every market morning, then grades each call against real prices. The moat.
- **Algorithms** (`/algorithms`) — **featured.** Copy-paste, research-grade trading algorithms (Pine Script for TradingView, MQL5 notes). Includes a ⚡ **GOD MODE** tier; the flagship is the **Adaptive Regime-Switching (VR-gated breakout)** "Holy Grail," tuned trade-by-trade on a real MNQ account. Long/short boxes, prop-firm risk rules built in.
- **AI Analyzer** (`/ai-stocks`) — multi-agent (fundamentals / technical / sentiment / risk / PM) deep-dive on any ticker; watchlist scanner + compare.
- **Trade Analyzer** (`/analyzer`) — paste ticker + direction/entry/SL/TP → AI risk read, levels, confidence.
- **War Room** (`/war-room`, `/war-room/live`) — five AI analyst personas debate a ticker; the CIO rules.
- **Fork the Brain** (`/fork`) — clone the net, tune 11 feature dials + conviction, backtest, save, leaderboard.
- **Voice / Copilot** (`/copilot`) — speak to the market; the net answers out loud with chart + news.
- **Courses** (`/courses`) — education that hands off to the algorithms.

### Trust / proof layer (the credibility engine)
- **Proof** (`/proof`) — grading methodology, live win rate, calibration, learning curve, post-mortems.
- **Performance** (`/performance`) — full graded call list + stats.
- **Methodology** (`/methodology`) — how forecasts/ratings/targets are formed; data sources.
- **Fund** (`/fund`) — live open book, realized P&L + equity curve, marked to live prices.
- **Time Machine** (`/time-machine`) — replay logged calls from any past date with any starting capital.

### Visualizations / spectacle (built to share)
- **Enter the Net** (`/brain/live`) · **Market Galaxy** (`/galaxy`) · **Conviction Storm** (`/storm`) · **The Open** (`/the-open`, daily cinematic).

### Intelligence Suite & other features (footer "all products" bar)
- **Intelligence Suite** (`/intelligence`) — module menu of signal/analysis tools.
- Plus: `/congress` (Congress trades), `/intel` (insider+options alerts), `/agents`, `/daily` (subscription brief), `/earnings` (honesty score), `/predict` (human vs AI), `/compare`, `/research`, `/judgemynt`, `/labs` (experiments hub).

## Algorithms System (most actively developed)
The God Mode strategies are **code-generated**, not hand-written. Do NOT edit the generated `.ts` files directly.
```
scripts/build-godmode.mjs   → generates src/app/algorithms/god-mode.ts   (the GOD MODE tier)
scripts/build-algos.mjs     → generates src/app/algorithms/quant-pro.ts  (robust 3-strategy tier)
scripts/montecarlo-algos.mjs→ generates src/app/algorithms/montecarlo.ts
scripts/mnq-*.mjs           → research harnesses (sim backtests of MNQ 5-min strategies)
src/app/algorithms/data.ts  → Algorithm interface + ALGORITHMS = [...originals, QUANT_STRATEGIES, GOD_MODE]
src/app/algorithms/page.tsx → Bloomberg-style terminal UI + featured "Holy Grail" hero
```
Workflow: edit a spec in `build-godmode.mjs` → `node scripts/build-godmode.mjs` → `npx tsc --noEmit` → `npm run build`.
Lesson learned (documented in the godregime notes): the synthetic simulator **flatters momentum and is unreliable for absolute win/PF** — tune from REAL chart results, not sim numbers. The VR threshold is the frequency dial.

## API Routes (selected; ~79 total under src/app/api)
```
/api/market            — Finnhub batch quotes (cached)
/api/news              — market news
/api/quote/[symbol]    — candle data for charts
/api/fundamentals/[symbol] — P/E, EPS, market cap
/api/calendar          — economic calendar
/api/stripe/checkout   — Stripe checkout session (subscription)
/api/stripe/webhook    — Stripe webhook
/api/email/send        — Resend transactional emails
```

## Monetization
1. **Subscriptions via Stripe** — Pro tiers / the daily brief (`/daily`) paywall; `/pricing` page.
2. **Courses** — paid education that funnels into the free algorithms.
3. **Free, viral top of funnel** — public forecasts, proof/track-record, shareable cinematics (The Open, War Room) drive sign-ups.

## Landing-page funnel notes
- Primary hook: the public, graded forecast track record (credibility-first).
- **Algorithms** is the featured #2 frame (real-money-proven "Holy Grail") + a floating popup card + nav link.
- Known gap to improve: tie the landing → `/pricing` → checkout path more explicitly.

## Deploy
Push to `main` → Netlify auto-deploys. Develop on the assigned feature branch, then fast-forward `main`.
