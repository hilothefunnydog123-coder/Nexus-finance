import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

// Real public educators — content based on their publicly available free YouTube teachings.
// These are collaboration targets. Reach out via courses@ynfinance.org to bring them on officially.
export const SEED_COURSES = [
  {
    id: 'c1',
    slug: 'ross-cameron-gap-and-go',
    title: 'Gap & Go: Small Cap Momentum Day Trading',
    description: 'The exact strategy that turned $583 into $10M+ — independently verified. Learn to find gapping small-cap stocks pre-market, time your entries in the first 30 minutes, and manage risk like a professional.',
    trader_name: 'Ross Cameron',
    trader_handle: '@WarriorTrading',
    trader_avatar_color: '#ff4757',
    trader_bio: 'Founder of Warrior Trading. Turned $583 → $10M+ verified P&L. Most documented retail day trader in history. 1.98M YouTube subscribers. Based in Vermont.',
    strategy_type: 'Day Trading',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#ff4757',
    rating: 4.9,
    enrollment_count: 24800,
    tags: ['gap-and-go', 'small-cap', 'momentum', 'day-trading', 'pre-market'],
    sections: [
      { order_index: 0, title: 'What is Gap & Go?', type: 'text', is_free_preview: true, duration_mins: 6,
        content: { text: `# The Gap & Go Strategy\n\nGap & Go is the most beginner-friendly day trading strategy that still produces professional-level results when executed correctly.\n\n## The Basic Concept\nEvery morning, some stocks gap up (open higher than yesterday's close) due to news, earnings, or catalysts. The Gap & Go strategy trades the continuation of that momentum in the first 30–60 minutes of market open.\n\n## Why It Works\n- News creates genuine buying interest, not just technical noise\n- Small-cap stocks have higher volatility = bigger moves\n- First hour is highest volume = best liquidity for entries and exits\n- Clear risk levels (pre-market highs/lows) make stop placement obvious\n\n## The 3 Requirements Ross Uses\n1. **Catalyst**: Earnings, FDA approval, contract win, etc.\n2. **Volume**: At least 3x average pre-market volume\n3. **Float**: Under 20 million shares (less supply = more volatile)` } },
      { order_index: 1, title: 'The Pre-Market Scan (7:00–9:30 AM)', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# Pre-Market Scanning Routine\n\nRoss is at his desk by 7 AM every trading day. Here's what he does:\n\n## Step 1: Run the Gapper Scan\nFilter for stocks gapping +10% or more with news. The higher the gap percentage, the better the potential momentum.\n\n## Step 2: Check the Float\nSmall float (under 20M shares) = limited supply = price moves fast. This is what creates the 50-100% moves you see on big days.\n\n## Step 3: Read the News\nIs the catalyst real? FDA approval > press release. Earnings beat > rumor. Real catalysts hold momentum longer.\n\n## Step 4: Mark Pre-Market Levels\n- Pre-market high (resistance to watch)\n- Pre-market low (support / stop level)\n- Previous day's close (gap fill target if momentum fails)\n\n## Step 5: Set Up the Level 2\nWatch the order book on your top 2-3 names. You'll see buyers stacking vs sellers — this tells you strength of demand before the open.` } },
      { order_index: 2, title: 'The Entry: Opening Bell to 10 AM', type: 'video', is_free_preview: false, duration_mins: 18,
        content: { youtube_id: 'GKkgqe2UfFg', description: 'Ross walks through his exact entry criteria — the "first pullback" entry on 1-min chart, how to read the tape, and why he waits instead of chasing the open.' } },
      { order_index: 3, title: 'Stop Loss and Position Sizing', type: 'text', is_free_preview: false, duration_mins: 10,
        content: { text: `# Position Sizing: Ross's $50 Rule\n\nRoss risks a fixed dollar amount per trade — not a percentage. Here's the framework:\n\n## Calculate Your Stop First\nEntry: $5.20\nStop: $4.90 (below pre-market support)\nRisk per share: $0.30\n\n## Calculate Max Shares\nIf you risk $150 max per trade:\n$150 ÷ $0.30 = 500 shares max\n\n## The Key Rule\nNEVER hold through your stop. If price hits your stop, you're wrong. Get out. The next setup is more important than hoping this one comes back.\n\n## Scaling Up\nRoss started with 100 shares. As he proved his edge worked, he scaled to 1,000, then 5,000, then 10,000 shares per trade. The strategy didn't change — only the size.` } },
      { order_index: 4, title: 'Practice: Gap & Go on the Simulator', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Open the Scanner tab. Find the biggest % gainer on the list with high volume (Vol ratio 2x+). Open that stock in the Trade tab on the 1-min chart. Identify the first pullback after the open. Enter long with a stop below the pullback low. Target: the pre-market high. Journal your reasoning.', symbol: 'NVDA', tab: 'scanner' } },
    ],
  },

  {
    id: 'c2',
    slug: 'ict-smart-money-concepts',
    title: 'Smart Money Concepts: How Institutions Move Markets',
    description: 'The free public framework that flipped retail trading upside down. Learn Order Blocks, Fair Value Gaps, Liquidity Sweeps, and Market Structure the way institutional traders think — not how retail textbooks explain it.',
    trader_name: 'ICT (Inner Circle Trader)',
    trader_handle: '@ICTMentorship',
    trader_avatar_color: '#1e90ff',
    trader_bio: 'Michael J. Huddleston. 1.8M YouTube subscribers. Created the Smart Money Concepts (SMC) framework used by millions of traders worldwide. Gives everything free on YouTube.',
    strategy_type: 'Smart Money Concepts',
    difficulty: 'Intermediate',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#1e90ff',
    rating: 4.9,
    enrollment_count: 41200,
    tags: ['SMC', 'order-blocks', 'fair-value-gap', 'institutional', 'forex', 'futures'],
    sections: [
      { order_index: 0, title: 'Why Retail Technical Analysis Gets It Wrong', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# The Institutional Perspective\n\nRetail traders learn support/resistance, trendlines, and indicators. Institutional traders look at completely different things.\n\n## The Core Insight\nInstitutions need LIQUIDITY to fill their massive orders. They can't just "buy the dip" — a fund buying $500 million of EUR/USD needs millions of retail sell orders on the other side.\n\nSo what do they do? They engineer price to sweep areas where retail stops are clustered, fill their orders at those prices, then drive the market in their intended direction.\n\n## What This Means for You\nInstead of trading support/resistance, you learn to identify WHERE retail stops are clustered and ANTICIPATE the institutional sweep, then ride the real move.\n\n## The Key Concepts\n- **Order Blocks**: The last candle before a significant move — where institutions placed their orders\n- **Fair Value Gaps (FVG)**: Imbalances in price delivery that get filled\n- **Liquidity**: Stops and pending orders that institutions need to fill their trades\n- **Market Structure**: The real trend based on institutional footprints` } },
      { order_index: 1, title: 'Order Blocks: Finding Institutional Footprints', type: 'video', is_free_preview: true, duration_mins: 22,
        content: { youtube_id: 'xFn9kxcfMUc', description: 'ICT explains the Order Block concept — the most important SMC tool. How to identify them, why they work, and how to trade them on forex and futures.' } },
      { order_index: 2, title: 'Fair Value Gaps (FVG) Explained', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# Fair Value Gaps\n\nA Fair Value Gap (FVG) occurs when price moves so aggressively in one direction that it skips over a price range — leaving an "imbalance."\n\n## How to Identify One\nOn a candlestick chart, look for 3 consecutive candles where:\n- The HIGH of candle 1 is BELOW the LOW of candle 3 (bullish FVG)\n- OR the LOW of candle 1 is ABOVE the HIGH of candle 3 (bearish FVG)\nThe gap between candle 1 and candle 3 is the Fair Value Gap.\n\n## Why Price Returns to Fill Them\nMarkets are efficient — they don't like imbalances. Price tends to retrace back into the FVG to "fill" it before continuing the original direction.\n\n## Trading the FVG\n1. Identify a bullish FVG during a downward move\n2. Wait for price to retrace INTO the gap\n3. Enter long when price touches the top of the gap\n4. Stop below the bottom of the gap\n5. Target: the original high before the gap formed` } },
      { order_index: 3, title: 'Liquidity Sweeps: The Trap Before the Move', type: 'video', is_free_preview: false, duration_mins: 19,
        content: { youtube_id: 'vLvHXhz8xBs', description: 'Why price always seems to take out your stop before going the direction you predicted. ICT explains liquidity engineering and how to use it to your advantage.' } },
      { order_index: 4, title: 'Practice: Identify SMC Concepts on a Chart', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Open the Trade tab. Select EUR/USD on the 1H chart. Identify: (1) The most recent Order Block, (2) Any visible Fair Value Gaps, (3) Where retail stops are likely clustered (above recent highs or below recent lows). Mark these on the chart. Do NOT enter a trade yet — just observe. Journal what you see.', symbol: 'EUR/USD', tab: 'trade' } },
    ],
  },

  {
    id: 'c3',
    slug: 'rayner-teo-trend-following',
    title: 'The Complete Trend Following System',
    description: 'The simplest, most backtested approach to trading: follow the trend. Rayner Teo breaks down exactly how to identify strong trends, enter with minimal risk, and ride them for maximum profit without overcomplicating it.',
    trader_name: 'Rayner Teo',
    trader_handle: '@RaynerTeo',
    trader_avatar_color: '#00d4aa',
    trader_bio: 'TradingwithRayner. 2.1M YouTube subscribers. Singapore-based trader and educator. Known for simplifying technical analysis. Free content model — over 500 free videos.',
    strategy_type: 'Swing Trading',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#00d4aa',
    rating: 4.8,
    enrollment_count: 31500,
    tags: ['trend-following', 'swing-trading', 'moving-average', 'technical-analysis'],
    sections: [
      { order_index: 0, title: 'Why Trend Following Works (And Why Most Traders Ignore It)', type: 'text', is_free_preview: true, duration_mins: 7,
        content: { text: `# The Case for Trend Following\n\nTrend following is the most boring-sounding and highest-performing systematic approach to trading over the long run.\n\n## The Data\nThe top performing hedge funds of the last 40 years (Man Group AHL, Renaissance, Winton) all use systematic trend following strategies.\n\n## Why Retail Traders Avoid It\n- It requires patience (entries don't come every day)\n- You miss the absolute top and bottom (scary for beginners)\n- There are long drawdown periods that test your conviction\n- It's not exciting enough for social media content\n\n## Why It Works Anyway\nMarkets trend because human behavior is predictable. Fear and greed cause price to overshoot fair value in both directions. Trend followers ride these overshoots.\n\n## Rayner's Core Rules\n1. Trade in the direction of the long-term trend (200 EMA)\n2. Enter on pullbacks to the moving average\n3. Exit when price reverses the trend structure\n4. Risk no more than 1% per trade` } },
      { order_index: 1, title: 'The 200 EMA: Your Market Compass', type: 'video', is_free_preview: true, duration_mins: 14,
        content: { youtube_id: 'fEPLo_5bEhA', description: 'Rayner explains the 200 EMA in depth — how to use it as a trend filter, when to trade above it vs below it, and common mistakes.' } },
      { order_index: 2, title: 'Pullback Entries: Getting In at the Right Price', type: 'text', is_free_preview: false, duration_mins: 11,
        content: { text: `# The Pullback Entry\n\nNever chase price. Wait for it to come to you.\n\n## The Setup\n1. Identify an uptrend (price above 200 EMA, higher highs, higher lows)\n2. Wait for a pullback toward the 20 or 50 EMA\n3. Watch for a bullish candlestick pattern at the moving average (hammer, engulfing, pin bar)\n4. Enter on the next candle open after the signal\n\n## Why This Works\nYou're buying when a portion of the market is selling (scared weak hands exiting). You're entering AFTER the pullback — not during it. Your stop is clear (below the signal candle low).\n\n## The 3 Types of Pullbacks\n- **Shallow** (30-40% of the prior swing): Strongest trend, entry at 20 EMA\n- **Medium** (50% retrace): Average trend, entry at 50 EMA\n- **Deep** (60-70% retrace): Weakening trend — be careful, size down` } },
      { order_index: 3, title: 'Risk Management: The 1% Rule in Practice', type: 'video', is_free_preview: false, duration_mins: 16,
        content: { youtube_id: '0d8d_VWMlW8', description: 'Rayner explains position sizing from scratch — how to calculate exact share size so you never risk more than 1% regardless of the trade.' } },
      { order_index: 4, title: 'Practice: Find a Trending Stock', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Open the Trade tab. Select any stock on the 1D chart. Turn on the EMA 200 indicator (already available). Is price above or below? If above — look for a pullback to the 50 EMA as an entry. Set a limit order at the EMA with stop below the recent low. Target: 2x the risk. Journal your analysis.', symbol: 'AAPL', tab: 'trade' } },
    ],
  },

  {
    id: 'c4',
    slug: 'humbled-trader-small-cap',
    title: 'Real Day Trading: The Unfiltered Truth',
    description: 'No fake screenshots. No guaranteed profits. Just the honest framework for day trading small-cap momentum stocks — including the losses, the psychology, and what actually separates profitable traders from the majority who fail.',
    trader_name: 'Humbled Trader',
    trader_handle: '@HumbledTrader',
    trader_avatar_color: '#ffa502',
    trader_bio: 'Shay. 1M+ YouTube subscribers. Known for transparency about losses and realistic approach to trading. Day trades small-cap momentum stocks. One of the most trusted voices in retail trading.',
    strategy_type: 'Day Trading',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#ffa502',
    rating: 4.8,
    enrollment_count: 19200,
    tags: ['small-cap', 'momentum', 'day-trading', 'psychology', 'risk-management'],
    sections: [
      { order_index: 0, title: 'The Harsh Reality of Day Trading', type: 'text', is_free_preview: true, duration_mins: 9,
        content: { text: `# What Nobody Tells You About Day Trading\n\n## The Real Statistics\n- 90% of day traders lose money long-term\n- Of the 10% who profit, most make less than a part-time job\n- The top 1% make the majority of all day trading profits\n\nThis isn't to discourage you. It's to make sure you enter with realistic expectations.\n\n## Why Most Fail (And How to Be Different)\n\n**Mistake 1: Overtrading**\nBoring days feel like wasted days. So traders force setups that aren't there. Pros know that "no trade is a trade."\n\n**Mistake 2: Revenge Trading**\nYou lose $200. You immediately take another trade to make it back. You lose $400. This is the #1 account killer.\n\n**Mistake 3: No Edge**\nMost traders have never backtested their strategy. They trade vibes. That's not a business, it's gambling.\n\n## The Humbled Trader Rule\nIf you lose more than 2% of your account in a day, STOP. Log off. The market will be there tomorrow.` } },
      { order_index: 1, title: 'Sympathy Plays: Trading the Runner\'s Neighbors', type: 'video', is_free_preview: true, duration_mins: 17,
        content: { youtube_id: 'WV8P4dJGsrE', description: 'Shay\'s favorite setup: when one stock in a sector runs 50%, similar stocks often follow. How to identify and trade sympathy plays safely.' } },
      { order_index: 2, title: 'Trading Psychology: Why You Sabotage Yourself', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# The Psychology Trap\n\n## Fear of Missing Out (FOMO)\nYou watch a stock go from $5 to $8. You think "it's going to $10" and buy at $8. It reverses to $6. You held too long. This is FOMO.\n\n**The fix**: Create a rule — if I missed the first 30% of a move, I don't enter. The setup is compromised.\n\n## Revenge Trading\nAfter a loss, your brain wants to "make it back." This emotional state causes you to take bad setups with too much size.\n\n**The fix**: Mandatory 15-minute break after any loss over 1%. Walk away from the screen.\n\n## Overconfidence After a Win\nYou make $500 in the morning. You feel invincible. You size up for the afternoon. You give it all back plus more.\n\n**The fix**: Set a daily profit target ($X). When hit, stop trading. Lock it in.\n\n## The Journal Solution\nEvery trade, write down: What was your emotional state? Were you calm or reactive? Over time you'll see your worst trades cluster around specific emotions.` } },
      { order_index: 3, title: 'Building a Watchlist That Pays', type: 'video', is_free_preview: false, duration_mins: 14,
        content: { youtube_id: 'gd4IFPFDhOQ', description: 'How Shay builds her pre-market watchlist every morning — the exact criteria she uses to select 3-5 stocks from hundreds of candidates.' } },
      { order_index: 4, title: 'Practice: Trade With a Rule Set', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Before opening the Trade tab, write down these 3 rules in your Journal: (1) Max loss today: $200, (2) Max 3 trades, (3) No entries after 11:30 AM ET. Now trade. Did you follow all 3 rules? Journal whether you broke any and why.', symbol: 'NVDA', tab: 'journal' } },
    ],
  },

  {
    id: 'c5',
    slug: 'anton-kreil-institutional-trading',
    title: 'How Professional Traders Actually Think',
    description: 'Anton Kreil traded at Goldman Sachs and JPMorgan before becoming an educator. This course distills the institutional mindset — portfolio thinking, macro catalysts, and risk management at the professional level — not what retail books teach.',
    trader_name: 'Anton Kreil',
    trader_handle: '@AntonKreil',
    trader_avatar_color: '#a855f7',
    trader_bio: 'Former trader at Goldman Sachs and JPMorgan. Founded the Institute of Trading & Portfolio Management (ITPM). Teaches serious traders the institutional approach. Known for exposing retail trading industry.',
    strategy_type: 'Institutional Trading',
    difficulty: 'Advanced',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#a855f7',
    rating: 4.9,
    enrollment_count: 8400,
    tags: ['institutional', 'macro', 'portfolio-management', 'goldman-sachs', 'professional'],
    sections: [
      { order_index: 0, title: 'How Goldman Sachs Traders Think About Risk', type: 'text', is_free_preview: true, duration_mins: 10,
        content: { text: `# The Institutional Mindset\n\nRetail traders think about individual trades. Institutional traders think about portfolios and risk-adjusted returns.\n\n## The Biggest Difference\nAt Goldman, every position was evaluated in terms of:\n- Expected return vs. expected risk\n- Correlation to other positions in the book\n- Maximum drawdown if the thesis was wrong\n- Time horizon for the thesis to play out\n\nNobody at a trading desk said "I think AAPL is going up." They said: "Given current macro environment, AAPL has 15% upside over 3 months with a max loss of 8% — and it's uncorrelated to our current energy exposure."\n\n## What This Means for You\nStop thinking about each trade in isolation. Start thinking about your entire portfolio of positions and how they interact.\n\n## Anton's Core Principle\n"The primary job of a trader is capital preservation. Returns follow naturally when you protect your capital first."` } },
      { order_index: 1, title: 'The Industry Wants You to Fail — Here\'s Why', type: 'video', is_free_preview: true, duration_mins: 24,
        content: { youtube_id: '3G-p-F9TMJQ', description: 'Anton\'s famous breakdown of why retail brokers, trading educators, and financial media benefit from retail traders losing money — and what to do instead.' } },
      { order_index: 2, title: 'Macro Catalysts: Trading the Big Picture', type: 'text', is_free_preview: false, duration_mins: 14,
        content: { text: `# Trading the Macro Picture\n\n## The 4 Macro Drivers\nAll price movement in financial markets traces back to one of four things:\n\n1. **Interest Rates**: Central bank policy drives everything. When rates rise, borrowing costs increase, growth slows, stocks fall (generally). Vice versa.\n\n2. **Economic Growth**: GDP, jobs, PMI data signal whether economies are expanding or contracting.\n\n3. **Inflation**: Determines what central banks will do next. High inflation → rate hikes → slower growth.\n\n4. **Risk Appetite**: Geopolitics, fear, greed. When uncertainty is high, capital flows to safe havens (USD, gold, treasuries). When confidence is high, it flows to risk assets (stocks, EM currencies).\n\n## How to Apply This\nBefore any trade: which macro regime are we in? Are you trading WITH or AGAINST the macro tide? Fighting the macro regime is the #1 mistake even experienced traders make.` } },
      { order_index: 3, title: 'Building a Portfolio vs. Taking Individual Trades', type: 'video', is_free_preview: false, duration_mins: 21,
        content: { youtube_id: 'a8w36UkgMak', description: 'How to think about your trades as a portfolio — correlation, sizing, and why being right on 4 trades and wrong on 1 can still lose money.' } },
      { order_index: 4, title: 'Practice: Analyze Your Current Portfolio', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Go to Community → My Account. Look at your open positions. For each one, write in your Journal: (1) What is the macro thesis? (2) How does this position correlate to others? (3) What is the max I\'m willing to lose? If you have no positions, open 3 uncorrelated ones (1 stock, 1 forex, 1 futures) and analyze the portfolio.', symbol: 'SPY', tab: 'journal' } },
    ],
  },

  {
    id: 'c6',
    slug: 'inthemoney-options-income',
    title: 'Options Income: Covered Calls & Cash-Secured Puts',
    description: 'The only options strategies where time actually works FOR you. Learn to generate consistent monthly income by selling options premium — exactly how Adam from InTheMoney does it on his $400K+ portfolio.',
    trader_name: 'InTheMoney (Adam)',
    trader_handle: '@InTheMoneyAdam',
    trader_avatar_color: '#00d4aa',
    trader_bio: 'Adam from InTheMoney. 458K YouTube subscribers. Options educator focused on income strategies for long-term investors. Known for clear, jargon-free explanations.',
    strategy_type: 'Options Income',
    difficulty: 'Intermediate',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#00d4aa',
    rating: 4.8,
    enrollment_count: 15700,
    tags: ['options', 'covered-calls', 'cash-secured-puts', 'income', 'theta'],
    sections: [
      { order_index: 0, title: 'Why Selling Options is Different From Buying Them', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# Selling vs. Buying Options\n\n## The Buyer's Problem\nWhen you buy a call option, you need:\n1. Price to move in your direction ✓\n2. Price to move far ENOUGH ✓  \n3. Price to move fast ENOUGH ✓ (before expiry)\n4. Implied volatility to not drop ✓\n\nYou need to be right on 4 things simultaneously. Most retail options buyers lose for exactly this reason.\n\n## The Seller's Advantage\nWhen you sell options, time works FOR you. Every day that passes, the option loses value. You collect that decay as income.\n\nThis is called **theta decay** — options lose value as expiration approaches, even if the underlying doesn't move.\n\n## The Two Main Strategies\n- **Covered Call**: You own 100 shares, sell a call against them. Generates monthly income.\n- **Cash-Secured Put**: You have cash in your account, sell a put. Generates income, and if assigned, you buy the stock at a discount.\n\n## The Key Requirement\nYou need to be COMFORTABLE owning the underlying stock. These are not pure speculation strategies.` } },
      { order_index: 1, title: 'Covered Calls: Generating Income on Stocks You Own', type: 'video', is_free_preview: true, duration_mins: 20,
        content: { youtube_id: 'TnSMPZAkMPs', description: 'Adam walks through the covered call strategy step by step — strike selection, expiration choice, when to roll, and realistic income expectations.' } },
      { order_index: 2, title: 'Cash-Secured Puts: Getting Paid to Wait', type: 'video', is_free_preview: false, duration_mins: 18,
        content: { youtube_id: 'SD9sEpE7L9k', description: 'How to use cash-secured puts to either collect income or acquire stock at a discount. The "Wheel Strategy" explained in full.' } },
      { order_index: 3, title: 'Strike Selection and Managing Positions', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# Choosing the Right Strike\n\n## For Covered Calls\n- **Delta 0.20–0.30**: Aggressive. More premium but higher chance of shares being called away.\n- **Delta 0.10–0.15**: Conservative. Less premium but you keep your shares more often.\n- **ATM (Delta 0.50)**: Maximum premium but high assignment risk.\n\nAdam's preference: 0.20–0.25 delta, 30–45 days to expiry.\n\n## For Cash-Secured Puts\n- Choose a strike where you'd be HAPPY buying the stock at that price\n- Delta 0.25–0.35 gives good premium with reasonable assignment chance\n- 30 days to expiry balances premium collection and flexibility\n\n## When to Close Early\n- If you've captured 50% of max profit in less than half the time → close and redeploy\n- If the position moves against you and reaches 2x your credit received → close to prevent larger loss\n\n## The Wheel in Practice\n1. Sell CSP on AAPL at $180 strike, collect $1.50 premium\n2. If assigned (price drops below $180): now own 100 shares at effective cost $178.50\n3. Sell covered call against those shares at $182 strike\n4. Repeat indefinitely` } },
      { order_index: 4, title: 'Practice: Analyze an Options Income Trade', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Open the Trade tab. Select AAPL. Look at the current price. Calculate: if you sold a covered call at a strike 5% above current price with 30 days to expiry, what would be a reasonable premium? (Use the options pricing concept from Section 1.) Journal your analysis: what would be your monthly income on 100 shares?', symbol: 'AAPL', tab: 'journal' } },
    ],
  },
]

function getClient() {
  if (!SUPABASE_ENABLED) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!SUPABASE_ENABLED) {
    if (slug) {
      const course = SEED_COURSES.find(c => c.slug === slug)
      return NextResponse.json({ course: course || null, sections: course?.sections || [], demo: true })
    }
    return NextResponse.json({ courses: SEED_COURSES, demo: true })
  }

  const sb = getClient()!

  if (slug) {
    const { data: course } = await sb.from('courses').select('*').eq('slug', slug).eq('is_published', true).single()
    const { data: sections } = await sb.from('course_sections').select('*').eq('course_id', course?.id).order('order_index')
    if (!course) {
      const seed = SEED_COURSES.find(c => c.slug === slug)
      return NextResponse.json({ course: seed || null, sections: seed?.sections || [], demo: true })
    }
    return NextResponse.json({ course, sections: sections || [] })
  }

  const { data: courses } = await sb.from('courses').select('*').eq('is_published', true).order('enrollment_count', { ascending: false })
  if (!courses?.length) return NextResponse.json({ courses: SEED_COURSES, demo: true })
  return NextResponse.json({ courses, demo: false })
}
