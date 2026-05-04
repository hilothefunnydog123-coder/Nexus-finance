# YN Finance — Claude Code Handoff

## What This Is
YN Finance is a real startup — a prop firm simulator and trading community platform. Live at **ynfinance.org** (Netlify). GitHub: `hilothefunnydog123-coder/Nexus-finance`.

The business model: charge traders $49–$299 to take simulated FTMO-style prop challenges. 70%+ fail, you keep the fees. Pass = certificate + referral to real prop firms.

## Tech Stack
- **Next.js 15** App Router · TypeScript · Tailwind CSS v4
- **Supabase** — auth, database, realtime chat
- **Stripe** — challenge payments ($49/$149/$299)
- **Resend** — transactional emails
- **Finnhub API** — real market data
- **TradingView widget** — charts (real, not fake)

## Environment Variables (in Netlify + .env.local)
```
FINNHUB_API_KEY                    — finnhub.io free tier
NEXT_PUBLIC_FINNHUB_API_KEY        — same key (client-side websocket)
NEXT_PUBLIC_SUPABASE_URL           — https://ytwgvqbhzejumicaupkj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY      — sb_publishable_... key
RESEND_API_KEY                     — resend.com
EMAIL_FROM                         — YN Finance <noreply@ynfinance.org>
STRIPE_SECRET_KEY                  — sk_test_...
STRIPE_WEBHOOK_SECRET              — whsec_...
```

## URL Structure
- `ynfinance.org` → landing page (src/app/page.tsx)
- `ynfinance.org/app` → trading terminal (src/app/app/page.tsx)
- `ynfinance.org/challenge-success` → post-Stripe payment
- `ynfinance.org/ref/[code]` → referral landing page
- `ynfinance.org/verify/[id]` → certificate verification
- `ynfinance.org/privacy` · `/terms` → legal

## Navigation Tabs in /app
1. **Dashboard** — watchlist + TradingView chart + fundamentals panel + pulse feed
2. **Scanner** (EDGE) — pre-market movers scanner + options flow + fear/greed
3. **Trade** — TradeLocker-style terminal (TradingView + order panel + positions)
4. **Journal** — trade journal with setup/emotion/grade logging + pattern analytics
5. **Community** — leaderboard, trade ideas, YN Capital prop challenges, FAQ
6. **Trade-Room** — Discord-style real-time chat (Supabase realtime, 6 channels)
7. **Pulse** — news feed + analyst sentiment + X/Twitter widget

## Key Components
```
src/components/
  scanner/PreMarketScanner.tsx     — top movers with volume ratio, catalysts
  journal/TradeJournal.tsx         — trade logging + insights + pattern analytics
  dashboard/MainChart.tsx          — TradingView widget wrapper
  dashboard/WatchlistPanel.tsx     — live watchlist with hover tooltip
  dashboard/FundamentalsPanel.tsx  — P/E, EPS, market cap from Finnhub
  dashboard/MarketHeatmap.tsx      — S&P 500 sector heatmap (real Finnhub data)
  dashboard/FearGreed.tsx          — calculated from live SPY/QQQ momentum
  dashboard/OptionsFlow.tsx        — unusual options activity feed
  dashboard/StatsBar.tsx           — real quotes for SPY/QQQ stats
  trading/TradingWorkspace.tsx     — full TradeLocker-style terminal
  trading/OrderPanel.tsx           — buy/sell with SL/TP, R:R, leverage
  trading/RiskCalculator.tsx       — position sizing calculator
  trading/PortfolioAnalytics.tsx   — Sharpe, drawdown, win rate, expectancy
  traderoom/TradeRoom.tsx          — Discord-style chat (Supabase realtime)
  pulse/PulseFeed.tsx              — news + analysts + sentiment + Twitter
  community/CommunityHub.tsx       — 7 sub-tabs including prop firm
  community/PropChallenge.tsx      — YN Capital with Stripe payment flow
  community/Leaderboard.tsx        — real Supabase data + seed traders
  community/TradeIdeas.tsx         — persistent to Supabase
  community/EconomicCalendar.tsx   — real Finnhub calendar API
  community/PropDashboard.tsx      — user account dashboard
  community/Certificate.tsx        — printable PDF certificate on pass
  community/FAQ.tsx                — 30+ questions, 6 categories
  community/Achievements.tsx       — 16 badges, 4 rarity tiers
  auth/AuthModal.tsx               — Supabase email/password auth
  ui-overlay/Onboarding.tsx        — first-visit 4-step tour
  ui-overlay/ShareCard.tsx         — share P&L on Twitter
  ui-overlay/KeyboardShortcuts.tsx — ? key shortcut reference
  ui-overlay/Glossary.tsx          — Alt+G trading terms glossary (30 terms)
  ui-overlay/MorningBriefing.tsx   — daily market brief toast
  ui-overlay/Confetti.tsx          — canvas confetti on challenge pass
  chart/TradingViewChart.tsx       — real TradingView widget (not fake)
```

## API Routes
```
/api/market          — Finnhub batch quotes (cached 15s)
/api/news            — Finnhub market news (cached 15s)
/api/quote/[symbol]  — candle data for charts
/api/heatmap         — batch quotes for heatmap (cached 30s in-memory)
/api/calendar        — Finnhub economic calendar
/api/fundamentals/[symbol] — P/E, EPS, market cap from Finnhub
/api/tradeideas      — Supabase CRUD for community trade ideas
/api/challenge       — Challenge start/update/payout (Supabase)
/api/leaderboard     — Real challenge data from Supabase
/api/referral        — Referral code generation and tracking
/api/stripe/checkout — Stripe checkout session creation
/api/stripe/webhook  — Stripe webhook (activates challenge after payment)
/api/email/send      — Resend transactional emails
```

## Supabase Tables
Run `supabase-schema.sql` to create all tables. Key ones:
- `profiles` — extends auth.users, has referral_code
- `challenges` — prop firm challenges with all metrics
- `messages` — Trade-Room chat (realtime enabled)
- `channels` — 6 channels seeded (general/stocks/forex/futures/crypto/trade-ideas)
- `trade_ideas` — community trade setups
- `referrals` — referral tracking

## Instruments Supported
- **Stocks**: AAPL, NVDA, TSLA, MSFT, GOOGL, AMZN, META, AMD, JPM, SPY, QQQ, NFLX
- **Forex**: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, EUR/GBP, EUR/JPY
- **Futures**: ES, NQ, YM, GC, CL, SI
- **Crypto**: BTC/USD, ETH/USD, SOL/USD, BNB/USD, XRP/USD, DOGE/USD

## Business Model
1. Challenge fees via Stripe: $49 (Starter $25K) / $149 (Pro $100K) / $299 (Elite $200K)
2. Referral system: `ynfinance.org/ref/[code]` — $20 off for referred users
3. Future: Rise payouts when traders pass (Q3 2026), partner prop firm referral fees
4. Viral loop: shareable P&L cards, leaderboard rankings, certificates

## Current Git State
All changes committed and pushed. Last push: v16 (Pre-Market Scanner + Trade Journal).
Deploy on Netlify triggers automatically from GitHub main branch.
