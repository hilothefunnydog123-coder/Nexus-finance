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
    thumbnail_img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'What is Gap & Go?', type: 'text', is_free_preview: true, duration_mins: 6,
        content: { text: `# The Gap & Go Strategy\n\nGap & Go is the most beginner-friendly day trading strategy that still produces professional-level results when executed correctly.\n\n## The Basic Concept\nEvery morning, some stocks gap up (open higher than yesterday's close) due to news, earnings, or catalysts. The Gap & Go strategy trades the continuation of that momentum in the first 30–60 minutes of market open.\n\n## Why It Works\n- News creates genuine buying interest, not just technical noise\n- Small-cap stocks have higher volatility = bigger moves\n- First hour is highest volume = best liquidity for entries and exits\n- Clear risk levels (pre-market highs/lows) make stop placement obvious\n\n## The 3 Requirements Ross Uses\n1. **Catalyst**: Earnings, FDA approval, contract win, etc.\n2. **Volume**: At least 3x average pre-market volume\n3. **Float**: Under 20 million shares (less supply = more volatile)` },
        quiz: [
          { q: 'What does "gap up" mean in the Gap & Go strategy?', options: ['A stock that gaps down in price at the open', 'A stock that opens higher than yesterday\'s closing price due to a catalyst', 'A stock with a gap in its chart from technical analysis', 'A stock that is halted pre-market'], answer: 1 },
          { q: 'Which of these is NOT one of Ross Cameron\'s 3 requirements for a Gap & Go trade?', options: ['A real catalyst (news/earnings)', 'At least 3x pre-market volume', 'A float under 20 million shares', 'A stock price over $100'], answer: 3 },
        ] },
      { order_index: 1, title: 'The Pre-Market Scan (7:00–9:30 AM)', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# Pre-Market Scanning Routine\n\nRoss is at his desk by 7 AM every trading day. Here's what he does:\n\n## Step 1: Run the Gapper Scan\nFilter for stocks gapping +10% or more with news. The higher the gap percentage, the better the potential momentum.\n\n## Step 2: Check the Float\nSmall float (under 20M shares) = limited supply = price moves fast. This is what creates the 50-100% moves you see on big days.\n\n## Step 3: Read the News\nIs the catalyst real? FDA approval > press release. Earnings beat > rumor. Real catalysts hold momentum longer.\n\n## Step 4: Mark Pre-Market Levels\n- Pre-market high (resistance to watch)\n- Pre-market low (support / stop level)\n- Previous day's close (gap fill target if momentum fails)\n\n## Step 5: Set Up the Level 2\nWatch the order book on your top 2-3 names. You'll see buyers stacking vs sellers — this tells you strength of demand before the open.` },
        quiz: [
          { q: 'When scanning pre-market, what gap percentage does Ross filter for as a minimum?', options: ['+5% or more', '+10% or more', '+25% or more', '+50% or more'], answer: 1 },
          { q: 'Why does a small float (under 20M shares) matter for Gap & Go?', options: ['It means the company is safer to trade', 'Limited supply means price moves faster and creates larger swings', 'Small float stocks are always profitable', 'It means the stock is cheaper to buy'], answer: 1 },
        ] },
      { order_index: 2, title: 'The Entry: Opening Bell to 10 AM', type: 'video', is_free_preview: false, duration_mins: 18,
        content: { youtube_id: 'GKkgqe2UfFg', description: 'Ross walks through his exact entry criteria — the "first pullback" entry on 1-min chart, how to read the tape, and why he waits instead of chasing the open.' } },
      { order_index: 3, title: 'Stop Loss and Position Sizing', type: 'text', is_free_preview: false, duration_mins: 10,
        content: { text: `# Position Sizing: Ross's $50 Rule\n\nRoss risks a fixed dollar amount per trade — not a percentage. Here's the framework:\n\n## Calculate Your Stop First\nEntry: $5.20\nStop: $4.90 (below pre-market support)\nRisk per share: $0.30\n\n## Calculate Max Shares\nIf you risk $150 max per trade:\n$150 ÷ $0.30 = 500 shares max\n\n## The Key Rule\nNEVER hold through your stop. If price hits your stop, you're wrong. Get out. The next setup is more important than hoping this one comes back.\n\n## Scaling Up\nRoss started with 100 shares. As he proved his edge worked, he scaled to 1,000, then 5,000, then 10,000 shares per trade. The strategy didn't change — only the size.` },
        quiz: [
          { q: 'You want to risk $150 on a trade. Your entry is $5.00 and your stop is $4.75. How many shares maximum can you buy?', options: ['200 shares', '400 shares', '600 shares', '800 shares'], answer: 2 },
          { q: 'According to Ross\'s rule, what should you do if price hits your stop loss?', options: ['Hold and wait for it to come back', 'Double down to average your cost', 'Sell immediately — you were wrong', 'Move your stop lower to give it room'], answer: 2 },
        ] },
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
    thumbnail_img: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'Why Retail Technical Analysis Gets It Wrong', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# The Institutional Perspective\n\nRetail traders learn support/resistance, trendlines, and indicators. Institutional traders look at completely different things.\n\n## The Core Insight\nInstitutions need LIQUIDITY to fill their massive orders. They can't just "buy the dip" — a fund buying $500 million of EUR/USD needs millions of retail sell orders on the other side.\n\nSo what do they do? They engineer price to sweep areas where retail stops are clustered, fill their orders at those prices, then drive the market in their intended direction.\n\n## What This Means for You\nInstead of trading support/resistance, you learn to identify WHERE retail stops are clustered and ANTICIPATE the institutional sweep, then ride the real move.\n\n## The Key Concepts\n- **Order Blocks**: The last candle before a significant move — where institutions placed their orders\n- **Fair Value Gaps (FVG)**: Imbalances in price delivery that get filled\n- **Liquidity**: Stops and pending orders that institutions need to fill their trades\n- **Market Structure**: The real trend based on institutional footprints` },
        quiz: [
          { q: 'Why do institutions need retail traders to place stop orders before they can fill their own trades?', options: ['Retail stops are always in the wrong place', 'Institutions need liquidity (opposing orders) to fill their massive positions at scale', 'Retail traders provide better prices than the open market', 'Institutions are required by law to use retail order flow'], answer: 1 },
          { q: 'What is an Order Block in Smart Money Concepts?', options: ['A range where price has traded sideways for weeks', 'A cluster of retail buy orders at support', 'The last candle before a significant institutional move — where they placed their orders', 'An area blocked off by market makers from retail access'], answer: 2 },
        ] },
      { order_index: 1, title: 'Order Blocks: Finding Institutional Footprints', type: 'video', is_free_preview: true, duration_mins: 22,
        content: { youtube_id: 'xFn9kxcfMUc', description: 'ICT explains the Order Block concept — the most important SMC tool. How to identify them, why they work, and how to trade them on forex and futures.' } },
      { order_index: 2, title: 'Fair Value Gaps (FVG) Explained', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# Fair Value Gaps\n\nA Fair Value Gap (FVG) occurs when price moves so aggressively in one direction that it skips over a price range — leaving an "imbalance."\n\n## How to Identify One\nOn a candlestick chart, look for 3 consecutive candles where:\n- The HIGH of candle 1 is BELOW the LOW of candle 3 (bullish FVG)\n- OR the LOW of candle 1 is ABOVE the HIGH of candle 3 (bearish FVG)\nThe gap between candle 1 and candle 3 is the Fair Value Gap.\n\n## Why Price Returns to Fill Them\nMarkets are efficient — they don't like imbalances. Price tends to retrace back into the FVG to "fill" it before continuing the original direction.\n\n## Trading the FVG\n1. Identify a bullish FVG during a downward move\n2. Wait for price to retrace INTO the gap\n3. Enter long when price touches the top of the gap\n4. Stop below the bottom of the gap\n5. Target: the original high before the gap formed` },
        quiz: [
          { q: 'A Fair Value Gap forms when price moves so aggressively that it skips a range. In a bullish FVG, which is true?', options: ['The low of candle 3 is BELOW the high of candle 1', 'The high of candle 1 is BELOW the low of candle 3 (gap between them)', 'Candle 2 is a doji with no body', 'The high of candle 3 equals the high of candle 1'], answer: 1 },
          { q: 'When trading a bullish FVG, where should your stop loss be placed?', options: ['Above the top of the FVG', 'Below the bottom of the FVG', 'At the midpoint of the FVG', 'At the previous day\'s low'], answer: 1 },
        ] },
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
    thumbnail_img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'Why Trend Following Works (And Why Most Traders Ignore It)', type: 'text', is_free_preview: true, duration_mins: 7,
        content: { text: `# The Case for Trend Following\n\nTrend following is the most boring-sounding and highest-performing systematic approach to trading over the long run.\n\n## The Data\nThe top performing hedge funds of the last 40 years (Man Group AHL, Renaissance, Winton) all use systematic trend following strategies.\n\n## Why Retail Traders Avoid It\n- It requires patience (entries don't come every day)\n- You miss the absolute top and bottom (scary for beginners)\n- There are long drawdown periods that test your conviction\n- It's not exciting enough for social media content\n\n## Why It Works Anyway\nMarkets trend because human behavior is predictable. Fear and greed cause price to overshoot fair value in both directions. Trend followers ride these overshoots.\n\n## Rayner's Core Rules\n1. Trade in the direction of the long-term trend (200 EMA)\n2. Enter on pullbacks to the moving average\n3. Exit when price reverses the trend structure\n4. Risk no more than 1% per trade` },
        quiz: [
          { q: 'Which major hedge funds use systematic trend following as their primary strategy?', options: ['Goldman Sachs and JPMorgan', 'Man Group AHL, Winton, and Renaissance', 'Citadel and Bridgewater', 'BlackRock and Vanguard'], answer: 1 },
          { q: 'What is Rayner\'s maximum risk per trade?', options: ['5% of account', '2% of account', '1% of account', '0.5% of account'], answer: 2 },
        ] },
      { order_index: 1, title: 'The 200 EMA: Your Market Compass', type: 'video', is_free_preview: true, duration_mins: 14,
        content: { youtube_id: 'fEPLo_5bEhA', description: 'Rayner explains the 200 EMA in depth — how to use it as a trend filter, when to trade above it vs below it, and common mistakes.' } },
      { order_index: 2, title: 'Pullback Entries: Getting In at the Right Price', type: 'text', is_free_preview: false, duration_mins: 11,
        content: { text: `# The Pullback Entry\n\nNever chase price. Wait for it to come to you.\n\n## The Setup\n1. Identify an uptrend (price above 200 EMA, higher highs, higher lows)\n2. Wait for a pullback toward the 20 or 50 EMA\n3. Watch for a bullish candlestick pattern at the moving average (hammer, engulfing, pin bar)\n4. Enter on the next candle open after the signal\n\n## Why This Works\nYou're buying when a portion of the market is selling (scared weak hands exiting). You're entering AFTER the pullback — not during it. Your stop is clear (below the signal candle low).\n\n## The 3 Types of Pullbacks\n- **Shallow** (30-40% of the prior swing): Strongest trend, entry at 20 EMA\n- **Medium** (50% retrace): Average trend, entry at 50 EMA\n- **Deep** (60-70% retrace): Weakening trend — be careful, size down` },
        quiz: [
          { q: 'In a pullback entry, when exactly do you enter the trade?', options: ['When price is falling (during the pullback)', 'At the absolute top of the previous swing high', 'After a bullish signal candle forms at the moving average — on the next candle open', 'When price breaks back to the previous high'], answer: 2 },
          { q: 'A deep pullback (60-70% of the prior swing) signals what about the trend?', options: ['The trend is getting stronger', 'The trend is weakening — size down', 'Nothing — deep pullbacks are always the best entry', 'The trend has reversed'], answer: 1 },
        ] },
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
    thumbnail_img: 'https://images.unsplash.com/photo-1611997008406-5d49e43bae45?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'The Harsh Reality of Day Trading', type: 'text', is_free_preview: true, duration_mins: 9,
        content: { text: `# What Nobody Tells You About Day Trading\n\n## The Real Statistics\n- 90% of day traders lose money long-term\n- Of the 10% who profit, most make less than a part-time job\n- The top 1% make the majority of all day trading profits\n\nThis isn't to discourage you. It's to make sure you enter with realistic expectations.\n\n## Why Most Fail (And How to Be Different)\n\n**Mistake 1: Overtrading**\nBoring days feel like wasted days. So traders force setups that aren't there. Pros know that "no trade is a trade."\n\n**Mistake 2: Revenge Trading**\nYou lose $200. You immediately take another trade to make it back. You lose $400. This is the #1 account killer.\n\n**Mistake 3: No Edge**\nMost traders have never backtested their strategy. They trade vibes. That's not a business, it's gambling.\n\n## The Humbled Trader Rule\nIf you lose more than 2% of your account in a day, STOP. Log off. The market will be there tomorrow.` },
        quiz: [
          { q: 'What percentage of day traders lose money long-term according to the statistics?', options: ['50%', '70%', '80%', '90%'], answer: 3 },
          { q: 'What is "revenge trading"?', options: ['Copying a trader who beat you in a contest', 'Taking another trade immediately after a loss, trying to make the money back emotionally', 'Shorting a stock that went against you', 'Trading the same stock that caused you a loss yesterday'], answer: 1 },
        ] },
      { order_index: 1, title: 'Sympathy Plays: Trading the Runner\'s Neighbors', type: 'video', is_free_preview: true, duration_mins: 17,
        content: { youtube_id: 'WV8P4dJGsrE', description: 'Shay\'s favorite setup: when one stock in a sector runs 50%, similar stocks often follow. How to identify and trade sympathy plays safely.' } },
      { order_index: 2, title: 'Trading Psychology: Why You Sabotage Yourself', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# The Psychology Trap\n\n## Fear of Missing Out (FOMO)\nYou watch a stock go from $5 to $8. You think "it's going to $10" and buy at $8. It reverses to $6. You held too long. This is FOMO.\n\n**The fix**: Create a rule — if I missed the first 30% of a move, I don't enter. The setup is compromised.\n\n## Revenge Trading\nAfter a loss, your brain wants to "make it back." This emotional state causes you to take bad setups with too much size.\n\n**The fix**: Mandatory 15-minute break after any loss over 1%. Walk away from the screen.\n\n## Overconfidence After a Win\nYou make $500 in the morning. You feel invincible. You size up for the afternoon. You give it all back plus more.\n\n**The fix**: Set a daily profit target ($X). When hit, stop trading. Lock it in.\n\n## The Journal Solution\nEvery trade, write down: What was your emotional state? Were you calm or reactive? Over time you'll see your worst trades cluster around specific emotions.` },
        quiz: [
          { q: 'What is the fix for FOMO (Fear of Missing Out) according to Humbled Trader?', options: ['Buy more of the stock when it\'s running', 'Set a rule: if you missed the first 30% of a move, don\'t enter', 'Watch the stock for 5 minutes before buying', 'FOMO is fine — you just need to manage your position size'], answer: 1 },
          { q: 'After a big morning win, what is the CORRECT thing to do?', options: ['Size up your next trades since you\'re in the zone', 'Keep trading — winning streaks should be maximized', 'Set a daily profit target and stop trading when you hit it', 'Only take double-sized positions for the rest of the day'], answer: 2 },
        ] },
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
    thumbnail_img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'How Goldman Sachs Traders Think About Risk', type: 'text', is_free_preview: true, duration_mins: 10,
        content: { text: `# The Institutional Mindset\n\nRetail traders think about individual trades. Institutional traders think about portfolios and risk-adjusted returns.\n\n## The Biggest Difference\nAt Goldman, every position was evaluated in terms of:\n- Expected return vs. expected risk\n- Correlation to other positions in the book\n- Maximum drawdown if the thesis was wrong\n- Time horizon for the thesis to play out\n\nNobody at a trading desk said "I think AAPL is going up." They said: "Given current macro environment, AAPL has 15% upside over 3 months with a max loss of 8% — and it's uncorrelated to our current energy exposure."\n\n## What This Means for You\nStop thinking about each trade in isolation. Start thinking about your entire portfolio of positions and how they interact.\n\n## Anton's Core Principle\n"The primary job of a trader is capital preservation. Returns follow naturally when you protect your capital first."` },
        quiz: [
          { q: 'How did Goldman Sachs traders frame a position — which statement is closest to how they think?', options: ['"AAPL looks bullish on the chart"', '"AAPL has 15% upside, max loss 8%, over 3 months, uncorrelated to our energy book"', '"AAPL just had a big day so it\'s going higher"', '"Everyone on Twitter is bullish AAPL"'], answer: 1 },
          { q: 'What does Anton Kreil say is the PRIMARY job of a trader?', options: ['Generating maximum returns', 'Capital preservation — returns follow from protecting capital first', 'Beating the S&P 500 every year', 'Finding the next 10x stock'], answer: 1 },
        ] },
      { order_index: 1, title: 'The Industry Wants You to Fail — Here\'s Why', type: 'video', is_free_preview: true, duration_mins: 24,
        content: { youtube_id: '3G-p-F9TMJQ', description: 'Anton\'s famous breakdown of why retail brokers, trading educators, and financial media benefit from retail traders losing money — and what to do instead.' } },
      { order_index: 2, title: 'Macro Catalysts: Trading the Big Picture', type: 'text', is_free_preview: false, duration_mins: 14,
        content: { text: `# Trading the Macro Picture\n\n## The 4 Macro Drivers\nAll price movement in financial markets traces back to one of four things:\n\n1. **Interest Rates**: Central bank policy drives everything. When rates rise, borrowing costs increase, growth slows, stocks fall (generally). Vice versa.\n\n2. **Economic Growth**: GDP, jobs, PMI data signal whether economies are expanding or contracting.\n\n3. **Inflation**: Determines what central banks will do next. High inflation → rate hikes → slower growth.\n\n4. **Risk Appetite**: Geopolitics, fear, greed. When uncertainty is high, capital flows to safe havens (USD, gold, treasuries). When confidence is high, it flows to risk assets (stocks, EM currencies).\n\n## How to Apply This\nBefore any trade: which macro regime are we in? Are you trading WITH or AGAINST the macro tide? Fighting the macro regime is the #1 mistake even experienced traders make.` },
        quiz: [
          { q: 'When interest rates RISE, what generally happens to stock prices?', options: ['Stocks go up because investors want higher yields', 'Stocks fall because borrowing costs increase and growth slows', 'Stocks are unaffected by interest rates', 'Only tech stocks are affected'], answer: 1 },
          { q: 'When geopolitical uncertainty is HIGH, where does capital typically flow?', options: ['Into high-growth tech stocks', 'Into emerging market currencies', 'Into safe havens: USD, gold, and US Treasuries', 'Into crypto assets'], answer: 2 },
        ] },
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
    thumbnail_img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'Why Selling Options is Different From Buying Them', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# Selling vs. Buying Options\n\n## The Buyer's Problem\nWhen you buy a call option, you need:\n1. Price to move in your direction ✓\n2. Price to move far ENOUGH ✓  \n3. Price to move fast ENOUGH ✓ (before expiry)\n4. Implied volatility to not drop ✓\n\nYou need to be right on 4 things simultaneously. Most retail options buyers lose for exactly this reason.\n\n## The Seller's Advantage\nWhen you sell options, time works FOR you. Every day that passes, the option loses value. You collect that decay as income.\n\nThis is called **theta decay** — options lose value as expiration approaches, even if the underlying doesn't move.\n\n## The Two Main Strategies\n- **Covered Call**: You own 100 shares, sell a call against them. Generates monthly income.\n- **Cash-Secured Put**: You have cash in your account, sell a put. Generates income, and if assigned, you buy the stock at a discount.\n\n## The Key Requirement\nYou need to be COMFORTABLE owning the underlying stock. These are not pure speculation strategies.` },
        quiz: [
          { q: 'What is theta decay in options?', options: ['The increase in an option\'s value when the stock rises', 'The daily loss of value in an option as it approaches expiration', 'A penalty fee charged by brokers for holding options', 'The volatility risk of holding options overnight'], answer: 1 },
          { q: 'When selling a cash-secured put, what happens if price falls below your strike at expiration (assignment)?', options: ['You lose all your premium and the trade closes', 'You are required to buy 100 shares at the strike price (which you wanted anyway)', 'The broker automatically rolls your position', 'You must buy the option back at a higher price'], answer: 1 },
        ] },
      { order_index: 1, title: 'Covered Calls: Generating Income on Stocks You Own', type: 'video', is_free_preview: true, duration_mins: 20,
        content: { youtube_id: 'TnSMPZAkMPs', description: 'Adam walks through the covered call strategy step by step — strike selection, expiration choice, when to roll, and realistic income expectations.' } },
      { order_index: 2, title: 'Cash-Secured Puts: Getting Paid to Wait', type: 'video', is_free_preview: false, duration_mins: 18,
        content: { youtube_id: 'SD9sEpE7L9k', description: 'How to use cash-secured puts to either collect income or acquire stock at a discount. The "Wheel Strategy" explained in full.' } },
      { order_index: 3, title: 'Strike Selection and Managing Positions', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# Choosing the Right Strike\n\n## For Covered Calls\n- **Delta 0.20–0.30**: Aggressive. More premium but higher chance of shares being called away.\n- **Delta 0.10–0.15**: Conservative. Less premium but you keep your shares more often.\n- **ATM (Delta 0.50)**: Maximum premium but high assignment risk.\n\nAdam's preference: 0.20–0.25 delta, 30–45 days to expiry.\n\n## For Cash-Secured Puts\n- Choose a strike where you'd be HAPPY buying the stock at that price\n- Delta 0.25–0.35 gives good premium with reasonable assignment chance\n- 30 days to expiry balances premium collection and flexibility\n\n## When to Close Early\n- If you've captured 50% of max profit in less than half the time → close and redeploy\n- If the position moves against you and reaches 2x your credit received → close to prevent larger loss\n\n## The Wheel in Practice\n1. Sell CSP on AAPL at $180 strike, collect $1.50 premium\n2. If assigned (price drops below $180): now own 100 shares at effective cost $178.50\n3. Sell covered call against those shares at $182 strike\n4. Repeat indefinitely` },
        quiz: [
          { q: 'Adam\'s preferred delta for covered calls is 0.20–0.25. What does a lower delta (e.g. 0.10) mean?', options: ['Higher premium but more chance of assignment', 'Lower premium but you keep your shares more often (conservative)', 'The option expires faster', 'The strike is below current price'], answer: 1 },
          { q: 'The "50% rule" for closing options early means what?', options: ['Close when you\'ve lost 50% of your premium', 'Close when you\'ve captured 50% of max profit early — redeploy the capital sooner', 'Only sell options 50 days before expiry', 'Never risk more than 50% of your premium'], answer: 1 },
        ] },
      { order_index: 4, title: 'Practice: Analyze an Options Income Trade', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Open the Trade tab. Select AAPL. Look at the current price. Calculate: if you sold a covered call at a strike 5% above current price with 30 days to expiry, what would be a reasonable premium? (Use the options pricing concept from Section 1.) Journal your analysis: what would be your monthly income on 100 shares?', symbol: 'AAPL', tab: 'journal' } },
    ],
  },

  {
    id: 'c7',
    slug: 'graham-stephan-index-investing',
    title: 'How I Built $50M+ Through Index Investing',
    description: 'Graham Stephan built serious wealth by avoiding complicated strategies. Learn the boring-but-bulletproof approach: index funds, real estate, tax strategy, and compound interest — the fundamentals that actually work long-term.',
    trader_name: 'Graham Stephan',
    trader_handle: '@GrahamStephan',
    trader_avatar_color: '#00d4aa',
    trader_bio: '5M+ YouTube subscribers. Real estate investor and financial educator. Built multi-million dollar portfolio through real estate, stocks, and YouTube. One of the most-watched personal finance creators.',
    strategy_type: 'Long-Term Investing',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#00d4aa',
    rating: 4.8,
    enrollment_count: 38200,
    tags: ['index-funds', 'real-estate', 'long-term', 'compound-interest', 'beginner'],
    thumbnail_img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'Why 99% of Active Traders Underperform the S&P 500', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# The Uncomfortable Truth About Active Trading\n\n## The Data Doesn't Lie\nOver any 10-year period, more than 90% of actively managed funds — run by professional analysts with Bloomberg terminals and billion-dollar research budgets — underperform the S&P 500 index.\n\nIf professionals with every advantage can't beat the market consistently, what chance does a retail trader checking charts on their phone have?\n\n## What This Means\nIt doesn't mean don't trade. It means: the foundation of your wealth should be passive index investing. Day trading is a business with income, not a replacement for a long-term investment strategy.\n\n## The Compounding Math\n$10,000 invested in the S&P 500 in 1990:\n- With 10% average annual return\n- Without touching it\n- By 2024 = $178,000\n\nThe same $10,000 actively traded by the average retail trader? Studies show most end up below where they started.\n\n## Graham's Framework\n1. Max out tax-advantaged accounts first (401k, IRA)\n2. Invest in low-cost index funds (VOO, VTI)\n3. Buy real estate if you can afford it\n4. Only THEN do active trading with a small speculative portion` },
        quiz: [
          { q: 'Over any 10-year period, what percentage of professionally managed funds underperform the S&P 500?', options: ['30%', '50%', '70%', 'More than 90%'], answer: 3 },
          { q: 'In Graham\'s framework, what should you do BEFORE active trading?', options: ['Start trading immediately with a small account', 'Max out tax-advantaged accounts (401k, IRA) and invest in index funds first', 'Learn technical analysis for 2 years', 'Save 6 months of expenses then start day trading'], answer: 1 },
        ] },
      { order_index: 1, title: 'Index Funds: The Only Investment Beginners Need', type: 'video', is_free_preview: true, duration_mins: 19,
        content: { youtube_id: 'fwe-PjrX23o', description: 'Graham breaks down exactly how index funds work, which ones to buy, and why Warren Buffett recommends them even over his own fund.' } },
      { order_index: 2, title: 'Real Estate vs. Stocks: Which Builds More Wealth?', type: 'video', is_free_preview: false, duration_mins: 22,
        content: { youtube_id: 'C_tdo7VbMoo', description: 'The real numbers behind real estate vs. stock market returns — including leverage, tax advantages, and the hidden costs most people ignore.' } },
      { order_index: 3, title: 'Tax Strategy: Keep More of What You Make', type: 'text', is_free_preview: false, duration_mins: 10,
        content: { text: `# Tax Optimization for Investors\n\n## The Three Account Types\n1. **401(k)/403(b)**: Pre-tax. Reduces taxable income now, pays tax on withdrawal.\n2. **Roth IRA**: After-tax. Grows tax-FREE. No tax on withdrawals ever.\n3. **Taxable Brokerage**: Most flexible but no tax advantages.\n\n## The Order of Operations\n1. 401k up to employer match (free money)\n2. Max Roth IRA ($7,000/year 2024)\n3. Max 401k ($23,000/year 2024)\n4. Taxable brokerage account\n\n## Long-Term vs Short-Term Capital Gains\n- Hold any investment >1 year = long-term rate (0%, 15%, or 20%)\n- Hold <1 year = short-term rate (your ordinary income rate, often 22-37%)\n\nFor a $50,000 profit:\n- Short-term: $13,500–$18,500 in taxes\n- Long-term: $7,500 or less\n\nThis alone is why day traders need to be very good to overcome the tax disadvantage.` },
        quiz: [
          { q: 'A Roth IRA is "after-tax." What is the key benefit of this?', options: ['You get a tax deduction now when you contribute', 'Your money grows and withdrawals are completely tax-free forever', 'You pay lower taxes on dividends inside the account', 'Contributions have no annual limit'], answer: 1 },
          { q: 'You made $50,000 profit on a stock you held for 8 months. What tax rate applies?', options: ['Long-term capital gains rate (0–20%)', 'Short-term capital gains rate (your ordinary income rate, 22–37%)', 'No tax — gains under $75,000 are exempt', 'Flat 10% rate for all stock gains'], answer: 1 },
        ] },
      { order_index: 4, title: 'Practice: Build Your Investment Portfolio', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Open the Trade tab. Buy SPY (S&P 500 ETF) with 50% of your paper account. Buy QQQ (NASDAQ ETF) with 25%. Leave 25% in cash. This is the foundational Graham-style portfolio. Journal: what is your target hold time? How would you respond to a 30% market drop?', symbol: 'SPY', tab: 'trade' } },
    ],
  },

  {
    id: 'c8',
    slug: 'wall-street-trapper-investing',
    title: 'Investing From the Hood to Wall Street',
    description: 'Leon Howard (Wall Street Trapper) learned the financial system that was never taught in his community — and built wealth from nothing. Learn the real fundamentals of building generational wealth: stocks, options basics, and financial literacy for everyone.',
    trader_name: 'Wall Street Trapper',
    trader_handle: '@WallStTrapper',
    trader_avatar_color: '#ffa502',
    trader_bio: 'Leon Howard. Financial educator making Wall Street accessible to communities it was never designed to serve. Author, speaker, and investor. Massive following on Instagram and Twitter/X.',
    strategy_type: 'Financial Literacy',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#ffa502',
    rating: 4.9,
    enrollment_count: 29400,
    tags: ['financial-literacy', 'generational-wealth', 'stocks', 'beginner', 'community'],
    thumbnail_img: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'The Financial System They Never Taught You', type: 'text', is_free_preview: true, duration_mins: 9,
        content: { text: `# The Real Financial Education\n\nThe financial system was built by wealthy people, for wealthy people. It wasn't designed to be easy to understand — complexity keeps more people out.\n\n## What Schools Don't Teach\n- How compound interest makes the rich richer\n- How debt is weaponized against people without financial literacy\n- How the stock market actually works and who really benefits\n- How to build assets instead of just earning income\n\n## The Fundamental Difference: Assets vs. Liabilities\nRich people buy assets (things that put money IN your pocket)\nEveryone else buys liabilities (things that take money OUT)\n\n**Assets**: Stocks, real estate, businesses, bonds\n**Liabilities**: Car payments, credit card debt, consumer purchases\n\n## The First Step\nYou don't need $1,000 to start. You need to understand the game. Once you understand how money works, the amount you start with matters less than you think.\n\n## Leon's Core Message\n"Trap music was about survival. Stocks are about legacy. Both require understanding the rules of the game you're playing."` },
        quiz: [
          { q: 'Which of the following is an ASSET by Wall Street Trapper\'s definition?', options: ['A car loan payment', 'Credit card debt', 'Rental property that generates monthly income', 'A new TV bought on financing'], answer: 2 },
          { q: 'What does Leon Howard say you need MOST to start building wealth?', options: ['At least $10,000 to begin', 'A financial advisor', 'Understanding how money works — not a specific starting amount', 'A high-paying job first'], answer: 2 },
        ] },
      { order_index: 1, title: 'How the Stock Market Really Works', type: 'video', is_free_preview: true, duration_mins: 16,
        content: { youtube_id: 'p7HKvqRI_Bo', description: 'Leon explains the stock market from absolute zero — no jargon, no complexity. If you\'ve never invested before, start here.' } },
      { order_index: 2, title: 'Building Generational Wealth: The Blueprint', type: 'video', is_free_preview: false, duration_mins: 21,
        content: { youtube_id: 'eikbQPldhPY', description: 'The specific steps to start building wealth you can pass down — starting with as little as $50/month.' } },
      { order_index: 3, title: 'Dividend Investing: Getting Paid While You Sleep', type: 'text', is_free_preview: false, duration_mins: 10,
        content: { text: `# Dividends: Passive Income From Stocks\n\n## What is a Dividend?\nSome companies share their profits with shareholders every quarter. If you own stock in them, you get paid — just for holding.\n\n## Example\n- You own 100 shares of JPMorgan (JPM)\n- JPM pays $4.00/share/year in dividends\n- That's $400/year passive income — without selling a single share\n\n## Dividend Yield\nIf JPM stock is at $200 and pays $4/year:\nDividend yield = $4 ÷ $200 = 2% per year\n\n## The Power of Reinvestment (DRIP)\nInstead of taking the cash, reinvest dividends to buy more shares. Those new shares pay dividends. Those dividends buy more shares. Over 30 years, this is how ordinary people become millionaires.\n\n## Strong Dividend Stocks to Research\n- JPMorgan (JPM): 2.1% yield\n- Apple (AAPL): 0.5% yield  \n- Johnson & Johnson (JNJ): 3.1% yield\n- Realty Income (O): 5.8% yield (monthly payments)\n\nAlways research before buying. Past dividends don't guarantee future ones.` },
        quiz: [
          { q: 'You own 100 shares of a stock paying $4.00/year dividend. How much passive income do you receive annually?', options: ['$40', '$400', '$4,000', '$4 total shared among shareholders'], answer: 1 },
          { q: 'What is a DRIP (Dividend Reinvestment Plan)?', options: ['A strategy of selling stocks after they pay dividends', 'Automatically reinvesting dividends to buy more shares — compounding your position over time', 'A type of high-yield savings account', 'A broker fee for receiving dividends'], answer: 1 },
        ] },
      { order_index: 4, title: 'Practice: Start Your Dividend Portfolio', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Open the Trade tab. Buy 10 shares of JPM using your paper account. Look at the current price and calculate: if JPM pays $4.00/year dividend, what would your annual income be from this position? What if you had 1,000 shares? Journal your long-term wealth vision.', symbol: 'JPM', tab: 'trade' } },
    ],
  },

  {
    id: 'c9',
    slug: 'kevin-oleary-portfolio-management',
    title: 'Mr. Wonderful\'s Rules for Building a Portfolio',
    description: 'Kevin O\'Leary has invested in hundreds of companies across Shark Tank and his personal portfolio. Learn his framework for evaluating investments, sizing positions, and the ruthless rules that guide every decision he makes.',
    trader_name: 'Kevin O\'Leary',
    trader_handle: '@KevinOLearyWtf',
    trader_avatar_color: '#1e90ff',
    trader_bio: 'Kevin O\'Leary (Mr. Wonderful). Shark Tank investor. $400M+ personal portfolio. Chairman of O\'Leary Financial Group. Known for blunt, no-nonsense investing philosophy. Massive social media presence.',
    strategy_type: 'Portfolio Management',
    difficulty: 'Intermediate',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#1e90ff',
    rating: 4.7,
    enrollment_count: 22100,
    tags: ['portfolio-management', 'shark-tank', 'dividend', 'value-investing', 'risk-management'],
    thumbnail_img: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=220&fit=crop&auto=format&q=80',
    sections: [
      { order_index: 0, title: 'The 20-Stock Rule: Why Diversification Has Limits', type: 'text', is_free_preview: true, duration_mins: 7,
        content: { text: `# Kevin's 20-Stock Rule\n\nKevin O'Leary runs a concentrated portfolio of 20 stocks max. Here's why:\n\n## Too Few Stocks = Too Much Risk\nIf you own 1 stock and it crashes 50%, your portfolio crashes 50%. Not acceptable.\n\n## Too Many Stocks = Index Fund in Disguise\nIf you own 200 stocks, you might as well buy an index fund and stop paying attention. You have no edge.\n\n## 20 is the Sweet Spot\n- Enough to diversify away company-specific risk\n- Few enough that you can actually understand each position\n- If one stock goes to zero, you lose 5% — survivable\n\n## Kevin's Sector Rules\n- No single stock more than 5% of portfolio\n- No single sector more than 20% of portfolio\n- At least 50% must pay dividends (provides income floor)\n\n## The Dividend Requirement\n"If a company won't pay me a dividend, they'd better explain why they're reinvesting that money better than I could." — Kevin O'Leary` },
        quiz: [
          { q: 'In Kevin O\'Leary\'s portfolio, what is the maximum any single stock can represent?', options: ['10% of portfolio', '5% of portfolio', '20% of portfolio', '25% of portfolio'], answer: 1 },
          { q: 'Kevin requires at least 50% of his portfolio to pay dividends. Why?', options: ['Dividend stocks always outperform the market', 'Dividends provide an income floor — you get paid even when stock prices fall', 'Non-dividend stocks are illegal in some accounts', 'Dividends reduce your tax burden on gains'], answer: 1 },
        ] },
      { order_index: 1, title: 'How to Evaluate Any Investment in 60 Seconds', type: 'video', is_free_preview: true, duration_mins: 13,
        content: { youtube_id: 'f5OtOCp9-9Q', description: 'Kevin\'s rapid evaluation framework — the 3 questions he asks before investing in any business or stock.' } },
      { order_index: 2, title: 'When to Sell: Kevin\'s Hard Rules', type: 'text', is_free_preview: false, duration_mins: 8,
        content: { text: `# Kevin O'Leary's Sell Rules\n\nMost investors have no selling rules. Kevin has hard ones:\n\n## Rule 1: Cut Any Stock That Drops 15% From Cost\n"You bought it at $100, it's at $85. The reason doesn't matter. You were wrong. Sell it."\n\nWhy? Because a 15% loss needs a 17.6% gain just to break even. A 50% loss needs a 100% gain. Stop the bleeding early.\n\n## Rule 2: Sell If the Dividend Is Cut\nIf a company cuts its dividend, management is signaling stress. Sell before the market fully prices this in.\n\n## Rule 3: Rebalance Quarterly\nEvery 3 months, if any position is over 5% of your portfolio (because it ran up), trim it back to 5%. Take profits systematically, not emotionally.\n\n## Rule 4: Never Fall in Love With a Stock\n"Companies don't love you back. They're pieces of paper."` },
        quiz: [
          { q: 'Kevin\'s Rule 1: you bought a stock at $100, it drops to $85. What should you do?', options: ['Hold — it will recover eventually', 'Buy more to average down', 'Sell immediately — you were wrong, the reason doesn\'t matter', 'Set a stop at $75 and give it more room'], answer: 2 },
          { q: 'How often does Kevin rebalance his portfolio?', options: ['Daily', 'Monthly', 'Quarterly — every 3 months', 'Once a year at tax time'], answer: 2 },
        ] },
      { order_index: 3, title: 'Building the Kevin O\'Leary Portfolio', type: 'video', is_free_preview: false, duration_mins: 18,
        content: { youtube_id: 'XxmFGGqWxoI', description: 'Kevin walks through his actual portfolio allocation principles and how to apply them with any starting amount.' } },
      { order_index: 4, title: 'Practice: Build Your 5-Stock Portfolio', type: 'practice', is_free_preview: false, duration_mins: 20,
        content: { instructions: 'Open the Trade tab. Using Kevin\'s rules, build a 5-stock portfolio (max 20% each): pick from different sectors, at least 3 must pay dividends. Max 20% in any single position. Journal why you chose each stock and what would make you sell it.', symbol: 'JPM', tab: 'trade' } },
    ],
  },

  {
    id: 'c10',
    slug: 'powell-trades-wick-theory',
    title: 'Wick Theory: Tick-Precision Entries for NASDAQ Day Trading',
    description: 'Powell turned Wick Theory into $60K+ months. Learn his exact framework for reading candle wicks as institutional rejection signals, identifying Rejection Blocks, and entering trades to the tick — not guessing, not chasing.',
    trader_name: 'Powell Trades',
    trader_handle: '@Powelltrades',
    trader_avatar_color: '#ff6b35',
    trader_bio: '154K+ YouTube subscribers. Day trader focused on NASDAQ and futures. Known for "tick-precision" entries using Wick Theory and Rejection Blocks. $60,000 profit months documented publicly. Active Discord community.',
    strategy_type: 'Day Trading',
    difficulty: 'Intermediate',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#ff6b35',
    thumbnail_img: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&h=220&fit=crop&auto=format&q=80',
    rating: 4.8,
    enrollment_count: 11200,
    tags: ['wick-theory', 'nasdaq', 'futures', 'scalping', 'tick-precision', 'day-trading'],
    sections: [
      { order_index: 0, title: 'What is Wick Theory and Why It Changes Everything', type: 'text', is_free_preview: true, duration_mins: 8,
        content: { text: `# Wick Theory: Reading What Price Actually Did\n\nMost traders look at candle bodies. Powell taught himself to read the wicks — and that changed everything.\n\n## What a Wick Actually Tells You\nA candle wick forms when price travels to a certain level and gets REJECTED. That rejection isn't random. It means someone — a large institution, a market maker, an algorithm — was waiting at that level and absorbed all the buying or selling pressure.\n\nLong wick above body = price tried to go higher, was rejected hard\nLong wick below body = price tried to go lower, was rejected hard\n\n## Why Wicks Are the Most Honest Signal on a Chart\nIndicators are lagging. Price patterns are subjective. But wicks are factual — they show exactly where price was rejected. Every single time.\n\n## The Three Wick Setups Powell Uses\n1. **Top Wick Rejection** — at a key resistance or prior high, price wicks into it and closes back below. Short setup.\n2. **Bottom Wick Rejection** — at a key support or prior low, price wicks into it and closes back above. Long setup.\n3. **Inside Wick** — a wick that sweeps a prior high/low and immediately reverses. The most powerful of the three.\n\n## The Core Principle\nPriceMANIPULATES weak hands first. It runs stops above a high or below a low to collect liquidity, then reverses. The wick IS that manipulation. Recognizing it in real time is Powell's edge.` },
        quiz: [
          { q: 'What does a long wick ABOVE a candle body indicate in Wick Theory?', options: ['Price is likely to continue higher tomorrow', 'Price tried to push higher but was strongly rejected — institutional sellers were at that level', 'The candle is bullish and will follow through', 'Volume was too low for the move to continue'], answer: 1 },
          { q: 'Why does price often sweep a prior high or low before reversing?', options: ['It\'s a random market fluctuation', 'To collect liquidity — stop orders cluster above highs and below lows, price runs them before the real move', 'Chart patterns require two tests of a level', 'Market makers are legally required to test key levels'], answer: 1 },
        ] },
      { order_index: 1, title: 'Rejection Blocks: Where Institutions Leave Footprints', type: 'text', is_free_preview: true, duration_mins: 9,
        content: { text: `# Rejection Blocks\n\nAn Order Block marks where institutions PLACED orders. A Rejection Block marks where institutions REFUSED to let price go.\n\n## How to Identify a Rejection Block\nLook for this pattern:\n1. A candle with a significantly long wick (at least 2x the body length)\n2. That wick tests a SIGNIFICANT level (prior swing high, prior swing low, round number, pre-market high/low)\n3. Price closes strongly back in the opposite direction of the wick\n4. Volume is elevated on the rejection candle\n\n## The Confluence Stack\nA Rejection Block becomes HIGH PROBABILITY when it appears with:\n- A significant price level (not a random spot on the chart)\n- A fair value gap below/above it (an imbalance for price to fill)\n- The time of day (10 AM open, 2 PM reversal window, 4 PM close)\n\n## Why Rejection Blocks Work on NASDAQ\nNASDAQ moves FAST. Institutions can't fill large orders slowly — they need a specific price. When they defend that price, the rejection is violent. Wicks on NQ (NASDAQ futures) can represent thousands of dollars in moves within seconds.\n\n## The AMD Cycle: The Big Picture\nPrior to every Rejection Block setup, Powell reads the AMD cycle:\n- **Accumulation**: Slow, boring price action — institutions collecting positions\n- **Manipulation**: The wick/stop hunt — institutions triggering retail stops\n- **Distribution**: The real move — institutions unloading into the opposing momentum\n\nThe Rejection Block fires at the end of Manipulation, right before Distribution begins.` },
        quiz: [
          { q: 'In the AMD cycle, when does a Rejection Block entry typically fire?', options: ['During Accumulation — when price is slow and boring', 'At the end of Manipulation (the stop hunt), right before Distribution (the real move)', 'During Distribution when momentum is strongest', 'After the full cycle completes and price has already moved 80%'], answer: 1 },
          { q: 'Which of these makes a Rejection Block HIGH PROBABILITY?', options: ['A long wick anywhere on the chart at any time', 'A long wick at a significant level, with a fair value gap nearby, during a key time window', 'Any candle with volume above average', 'A double wick pattern on any timeframe'], answer: 1 },
        ] },
      { order_index: 2, title: 'Tick-Precision Entry Execution', type: 'video', is_free_preview: false, duration_mins: 20,
        content: { youtube_id: 'tNyT7tHOmGI', description: 'Powell walks through the setup that generated $60K in a single month — his exact wick-based entry methodology, stop placement, and how he identifies top and bottom ticking opportunities in real time on NASDAQ.' } },
      { order_index: 3, title: 'The 10 AM Key Open: Powell\'s Session Framework', type: 'text', is_free_preview: false, duration_mins: 11,
        content: { text: `# The 10 AM Key Open\n\nThe first 30 minutes of market open (9:30–10:00 AM ET) are the most manipulative of the day. Powell doesn't trade them. He waits.\n\n## Why 10 AM is the Reset\nAt 9:30 AM, algorithms, emotional retail traders, and news-driven volume create chaos. By 10 AM, the manipulation from the open is usually complete. Price has:\n- Run the pre-market high or low (the stop hunt is done)\n- Shown its hand on direction for the session\n- Created a clear structure for the rest of the day\n\n## Powell's 10 AM Checklist\nAt exactly 10:00–10:15 AM, ask:\n1. Did price sweep the pre-market high AND reverse back below? → Bearish bias for the session\n2. Did price sweep the pre-market low AND reclaim it? → Bullish bias for the session\n3. Is there an obvious unmitigated Rejection Block from the open? → That's your target zone\n4. Is there a fair value gap between current price and the Rejection Block? → High-probability setup forming\n\n## Placing the Trade\n- Entry: At the WICK of the Rejection Block (not the close of the candle — at the wick tip)\n- Stop: 3-5 ticks beyond the extreme of the wick\n- Target 1: The fair value gap fill (quick partial profit)\n- Target 2: The session high/low or next significant level\n\n## The 1:7 Risk-to-Reward\nPowell is known for 1:7 RR trades. This is only possible when you enter at the EXACT rejection zone (wick tip) with a tight stop. A sloppy entry turns a 1:7 into a 1:2 — or a loss.` },
        quiz: [
          { q: 'Why does Powell avoid trading the first 30 minutes (9:30–10 AM)?', options: ['Markets are closed until 10 AM', 'The first 30 minutes are the most manipulative — chaotic algorithms and news drive fake moves', 'Volume is too low to enter positions', 'He focuses on the European session instead'], answer: 1 },
          { q: 'At 10 AM, price has swept the pre-market high and reversed back below it. What is Powell\'s session bias?', options: ['Bullish — the sweep confirmed demand', 'Bearish — the sweep collected buy-side liquidity, real move is likely down', 'Neutral — one sweep isn\'t enough information', 'Bullish — pre-market highs always act as support after being tested'], answer: 1 },
        ] },
      { order_index: 4, title: 'Practice: Execute a Wick Theory Setup on NQ', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Open the Trade tab. Select NQ or QQQ on the 5-minute chart. Wait until after 10 AM. Identify: (1) Did price sweep the pre-market high or low? (2) Is there a long wick at a significant level? (3) Is there a fair value gap nearby? If yes to all three, enter at the tip of the wick with a stop 5 ticks beyond. Journal your AMD cycle read and why you took or skipped the trade.', symbol: 'QQQ', tab: 'trade' } },
    ],
  },

  {
    id: 'c11',
    slug: 'tursonz-smr-model',
    title: 'The SMR Model: Sweep, Market Structure Shift & Fair Value Return',
    description: 'Yaqub Tursonz built a three-step forex swing trading system that requires almost no screen time. Identify where liquidity is swept, confirm the structure shift, enter on the return to fair value. Clean, repeatable, and proven.',
    trader_name: 'Yaqub Tursonz',
    trader_handle: '@tursonzz',
    trader_avatar_color: '#6c63ff',
    trader_bio: 'Forex swing trader and educator. Creator of the SMR Model (Sweep-Market Structure-Return). Known for a quality-over-quantity approach — fewer trades, higher conviction. Teaches through tursonztrading.com with free public resources.',
    strategy_type: 'Swing Trading',
    difficulty: 'Intermediate',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#6c63ff',
    thumbnail_img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=220&fit=crop&auto=format&q=80',
    rating: 4.8,
    enrollment_count: 8700,
    tags: ['smr-model', 'forex', 'swing-trading', 'liquidity-sweep', 'market-structure', 'fair-value-gap'],
    sections: [
      { order_index: 0, title: 'The SMR Philosophy: Trade Less, Win More', type: 'text', is_free_preview: true, duration_mins: 7,
        content: { text: `# Why Most Forex Traders Overtrade and Lose\n\nThe most common reason traders blow accounts isn't bad entries — it's too many entries. The SMR model is built around the opposite philosophy.\n\n## The Problem with Most Approaches\n- Traders take 10–20 setups per week, each with 50% confidence\n- Win rate ends up at 40–50% — not enough to overcome spreads and psychology\n- After losses, revenge trading multiplies the damage\n\n## The SMR Philosophy\nYaqub's system asks: what if you only traded the HIGHEST quality setups, where you have 70%+ conviction? Even with half the trades, your results improve dramatically.\n\n## The Three Rules Before Taking ANY Trade\n1. You must identify where liquidity was swept (the trap)\n2. You must see confirmation that market structure shifted (the signal)\n3. You must wait for price to return to fair value before entry (the entry)\n\nMissing any of the three = no trade. No exceptions.\n\n## What This Feels Like in Practice\nSome weeks you take 1–2 trades. Some weeks zero. That discomfort is the edge. Most retail traders can't sit on their hands. That patience IS the alpha.\n\n## Why Forex for the SMR Model\nForex markets are driven by central banks and institutional flow. The sweeps are cleaner, the fair value gaps fill more reliably, and swing trades can hold for days — meaning you don't need to watch screens all day.` },
        quiz: [
          { q: 'What is the core philosophy behind Tursonz\'s SMR approach?', options: ['Trade as many setups as possible to maximize opportunities', 'Only take the highest-conviction setups where all three SMR conditions are met — quality over quantity', 'Focus exclusively on the news and fundamentals for entry signals', 'Use automated bots to trade every SMR signal without manual screening'], answer: 1 },
          { q: 'If you identify a liquidity sweep and a market structure shift, but price hasn\'t returned to the fair value gap yet, what should you do?', options: ['Enter now — two out of three is good enough', 'Wait — missing the third condition (Return to FVG) means no trade per the SMR rules', 'Enter half size and add the rest when FVG is reached', 'Skip the trade entirely and find a different setup'], answer: 1 },
        ] },
      { order_index: 1, title: 'S — Sweep of Liquidity: Identifying the Trap', type: 'text', is_free_preview: true, duration_mins: 10,
        content: { text: `# S: Sweep of Liquidity\n\nThe first component of the SMR model. Before any real institutional move, price engineers a sweep — a false breakout that liquidates retail positions.\n\n## What is a Liquidity Sweep?\nRetail traders place stops in predictable locations:\n- Just above obvious swing highs (buy stops)\n- Just below obvious swing lows (sell stops)\n\nInstitutions need these orders as their exit or entry. So they push price to those levels, trigger the stops (sweep the liquidity), fill their own positions against the retail traders, and then reverse.\n\n## How to Identify a Sweep on the Chart\nLook for these patterns:\n- **Equal Highs/Lows**: Two or more candles with nearly identical highs or lows. These are stop magnets.\n- **Previous Day High/Low**: Always a target for sweeps at the open.\n- **Round Numbers**: 1.2000 on EUR/USD, 1800 on Gold — retail clusters orders here.\n- **Trendline Breaks**: Price appears to break a trendline, then immediately snaps back. That was the sweep.\n\n## What a Valid Sweep Looks Like\n1. Price reaches a clearly visible prior high or low\n2. It SLIGHTLY exceeds that level (wicks past it — even by 1–2 pips counts)\n3. Price immediately rejects and closes back on the other side of the level\n4. The wick beyond the level is the smoking gun — that's where the stops were taken\n\n## Timeframe for Sweeps\nFor swing trading, identify sweeps on the 4-hour or Daily chart. Lower timeframe sweeps happen constantly and add noise. Higher timeframe sweeps are the ones that precede multi-day or multi-week moves.` },
        quiz: [
          { q: 'Why do institutions engineer liquidity sweeps before their real moves?', options: ['To confuse retail technical analysts', 'They need the stop orders clustered at key levels as opposing liquidity to fill their own large positions', 'Regulations require institutions to test key levels before moving price', 'Sweeps are random and don\'t have a specific purpose'], answer: 1 },
          { q: 'You see EUR/USD make two nearly identical highs at 1.0850, then price briefly wicks to 1.0852 and closes back at 1.0845. What just happened?', options: ['A bullish breakout — price is heading higher', 'A failed breakout — the market is uncertain', 'A liquidity sweep — stops above the equal highs were taken, potential reversal coming', 'Normal price noise — this pattern has no significance'], answer: 2 },
        ] },
      { order_index: 2, title: 'M — Market Structure Shift: Confirming the Reversal', type: 'text', is_free_preview: false, duration_mins: 12,
        content: { text: `# M: Market Structure Shift (MSS)\n\nThe sweep tells you WHERE. The Market Structure Shift tells you WHEN. Without confirmation, a sweep is just a wick on a chart.\n\n## What is Market Structure?\nMarkets move in patterns:\n- **Uptrend**: Higher Highs + Higher Lows (HH, HL)\n- **Downtrend**: Lower Highs + Lower Lows (LH, LL)\n- **Ranging**: Price bounces between the same highs and lows\n\n## What is a Market Structure Shift (MSS)?\nAn MSS occurs when the prevailing structure is BROKEN. Specifically:\n- In an uptrend (HH, HL): price creates a Lower Low — breaks the last Higher Low. That's a bearish MSS.\n- In a downtrend (LH, LL): price creates a Higher High — breaks the last Lower High. That's a bullish MSS.\n\nThe MSS is CONFIRMATION that the sweep worked. Institutions filled their positions and are now driving price the other way.\n\n## The Exact Candle to Watch\nAfter a liquidity sweep, watch for the FIRST candle that breaks the most recent swing point in the opposite direction. That candle is your MSS confirmation. Don't wait for a second break — the first one is the signal.\n\n## Why MSS Matters More Than the Sweep Alone\nPretty much every key level gets swept eventually. But not every sweep leads to a reversal. The MSS is the filter. If price sweeps a high but can't break structure to the downside — the sweep failed and the uptrend likely continues.` },
        quiz: [
          { q: 'Price is in an uptrend (Higher Highs, Higher Lows). A Market Structure Shift to the downside occurs when:', options: ['Price creates a new Higher High', 'Price fails to reach the previous high but doesn\'t break any lows', 'Price creates a Lower Low — breaking the most recent Higher Low', 'Two consecutive bearish candles appear on the 1-hour chart'], answer: 2 },
          { q: 'After a liquidity sweep, price breaks structure downward. But then it immediately recovers and makes a new high. What does this tell you?', options: ['The bearish SMR setup is confirmed — enter short', 'The sweep failed — the uptrend is likely continuing, abort the short setup', 'Wait for one more sweep before entering', 'The fair value gap entry is ready to be used'], answer: 1 },
        ] },
      { order_index: 3, title: 'R — Return to Fair Value Gap: The Entry Point', type: 'text', is_free_preview: false, duration_mins: 13,
        content: { text: `# R: Return to Fair Value Gap\n\nThe sweep happened. Structure shifted. Now you wait. The entry is NOT at the MSS — it's at the Fair Value Gap created during the MSS candle.\n\n## What is a Fair Value Gap (FVG)?\nWhen price moves aggressively in one direction (like during the MSS), it often leaves a "gap" — a price range that was skipped over so fast that it was never properly traded. Markets are inefficient during aggressive moves.\n\nThe FVG is the three-candle pattern:\n- Candle 1 closes at $X\n- Candle 2 (the aggressive move) skips a range entirely\n- Candle 3 opens above/below the range\n- The gap between Candle 1's high and Candle 3's low = the FVG\n\n## Why Price Returns to the FVG\nMarkets seek efficiency. The gap represents an "imbalance" — prices where no two-sided trading occurred. Price has a strong tendency to return and fill this imbalance before continuing the trend.\n\n## The Tursonz Entry Protocol\n1. After the MSS, identify the FVG left by the MSS candle\n2. Set a LIMIT ORDER at the top of the FVG (for a short) or bottom of the FVG (for a long)\n3. Stop loss: beyond the extreme of the liquidity sweep\n4. Target: the next significant level (previous day low, major support/resistance, equal lows)\n\n## Risk Management for SMR Swing Trades\n- Risk 1% per trade (this is a swing trade — losses should be small, wins should be big)\n- Minimum 1:3 risk-to-reward. If you can't get 1:3, skip the trade\n- Once in profit by 1R, move stop to breakeven — let the trade breathe\n\n## Patience is the Strategy\nThe FVG fill can happen hours or even days after the MSS. Set your limit order and walk away. Checking the chart every 5 minutes is not part of Tursonz's system.` },
        quiz: [
          { q: 'Where exactly does Tursonz place the entry for a SHORT SMR trade?', options: ['At the bottom of the MSS candle', 'At the top of the Fair Value Gap left by the MSS move — as price returns to fill the imbalance', 'At the exact low where the liquidity sweep occurred', 'At the midpoint of the entire swing move'], answer: 1 },
          { q: 'Your SMR stop loss is placed where?', options: ['10 pips below the FVG entry', 'At a fixed 20-pip stop regardless of structure', 'Beyond the extreme of the liquidity sweep (outside the wick that swept the liquidity)', 'At the 50% retracement of the prior swing'], answer: 2 },
        ] },
      { order_index: 4, title: 'Practice: Identify and Plan a Full SMR Trade', type: 'practice', is_free_preview: false, duration_mins: 35,
        content: { instructions: 'Open the Trade tab. Select EUR/USD on the 4H chart. Scroll back and find a recent swing. Ask: (1) Was there a sweep of a prior high or low? (2) Did structure shift after the sweep? (3) Did price return to a Fair Value Gap before continuing? Mark all three on your chart. Now look at current price: is a new SMR setup forming? Journal all three conditions — S, M, and R — and whether the trade qualifies.', symbol: 'EUR/USD', tab: 'trade' } },
    ],
  },

  {
    id: 'c12',
    slug: 'pb-blake-mechanical-model',
    title: 'The PB Mechanical Model: Systemized ICT With a 71%+ Win Rate',
    description: 'Blake and Patrick took ICT concepts — which most traders find overwhelming — and built a fully mechanical, rules-based system anyone can execute. The Mechanical Model has achieved 417+ consecutive days of consistent payouts and a documented 71%+ win rate.',
    trader_name: 'PB Blake & Patrick',
    trader_handle: '@PBBlakeYT',
    trader_avatar_color: '#e040fb',
    trader_bio: 'Blake and Patrick — co-founders of PB Trading. 80K+ YouTube subscribers. Known for simplifying ICT into mechanical, beginner-accessible systems. Documented $500K+ in personal trading profits. 71%+ win rate on their Mechanical Model. 4.86/5 rating from 1,000+ community reviews on Whop.',
    strategy_type: 'Smart Money Concepts',
    difficulty: 'Beginner',
    price_cents: 99,
    is_free: false,
    thumbnail_color: '#e040fb',
    thumbnail_img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=220&fit=crop&auto=format&q=80',
    rating: 4.9,
    enrollment_count: 17400,
    tags: ['ICT', 'mechanical-model', 'fair-value-gap', 'IFVG', 'smart-money', 'beginner', 'day-trading'],
    sections: [
      { order_index: 0, title: 'Why ICT Felt Impossible (And How PB Blake Fixed It)', type: 'text', is_free_preview: true, duration_mins: 7,
        content: { text: `# The ICT Problem\n\nICT (Inner Circle Trader) concepts are among the most powerful trading frameworks ever created. They're also notoriously difficult to learn. Hundreds of hours of content. Dozens of concepts. No clear system.\n\n## What Most ICT Students Experience\n- Learn Order Blocks for weeks, then get confused by Fair Value Gaps\n- Try to apply multiple concepts at once and freeze up at the chart\n- Take trades "based on ICT" but can't explain their exact rules\n- No consistent framework for combining concepts into decisions\n\n## What PB Blake Did Differently\nBlake and Patrick took everything and asked one question: what is the MINIMUM number of rules needed to consistently identify high-probability setups?\n\nThe answer: Four.\n\n## The Four Requirements of the Mechanical Model\n1. A swing low (structural low)\n2. A swing high (structural high)\n3. A lower low (breaking the prior structure)\n4. A liquidity sweep (the fake-out that precedes the real move)\n\nIf all four are present, you have a valid Mechanical Model setup. If not — no trade. That's it. No interpretation, no judgment calls.\n\n## Why "Mechanical" Matters\nThe enemy of profitable trading is discretion. When you can decide anything, you can rationalize anything. The Mechanical Model removes that. Either the rules are met or they're not. This is how you get to 71%+ win rates consistently.` },
        quiz: [
          { q: 'What makes the PB Mechanical Model "mechanical"?', options: ['It uses automated bots to execute trades', 'It requires exactly four specific conditions to be met — no interpretation or judgment calls allowed', 'It only trades during specific times of day without analysis', 'It always uses the same position size regardless of setup'], answer: 1 },
          { q: 'What are the four requirements for a valid Mechanical Model setup?', options: ['Order Block + FVG + Volume spike + News catalyst', 'Swing low + Swing high + Lower low + Liquidity sweep', 'Trend + Pullback + Signal candle + Confirmation close', 'Support + Resistance + RSI divergence + Moving average cross'], answer: 1 },
        ] },
      { order_index: 1, title: 'Fair Value Gaps: The Foundation of PB Theory', type: 'video', is_free_preview: true, duration_mins: 22,
        content: { youtube_id: 'UlErFycqm4c', description: 'Blake breaks down Fair Value Gaps from scratch — how to identify them on any chart, why price returns to fill them, and how they serve as the primary entry tool in the PB Mechanical Model. This is the most important video in the course.' } },
      { order_index: 2, title: 'Inverse FVGs: When the Gap Flips to Support or Resistance', type: 'video', is_free_preview: false, duration_mins: 19,
        content: { youtube_id: 'FfFt0L-NyDI', description: 'The Inverse Fair Value Gap (IFVG) is one of PB\'s most powerful tools. When price violates a FVG from the wrong direction, that same gap becomes support or resistance. Blake walks through dozens of real chart examples.' } },
      { order_index: 3, title: 'Executing the Mechanical Model: The If-Then System', type: 'text', is_free_preview: false, duration_mins: 14,
        content: { text: `# The Mechanical Model: Step-by-Step Execution\n\nHere is the complete if-then decision tree that Blake and Patrick use every single trading day.\n\n## Step 1: Establish Bias on the Higher Timeframe\nStart on the 15-minute or 1-hour chart. Ask:\n- Is the current move predominantly bullish (Higher Highs, Higher Lows) or bearish (Lower Highs, Lower Lows)?\n- Where is the draw on liquidity? (What price level are institutions likely targeting next?)\n\nYour entry will be IN THE DIRECTION of the higher timeframe bias. Never fight it.\n\n## Step 2: Identify the Four Mechanical Model Conditions\nZoom to the 5-minute chart. Look for:\n1. **Swing Low** — a clear low with higher candles on both sides\n2. **Swing High** — a clear high with lower candles on both sides\n3. **Lower Low** — price takes out the swing low (for a BULLISH reversal setup)\n4. **Liquidity Sweep** — that lower low is a wick that immediately snaps back above the swing low\n\nIf all four exist: you have a valid setup. Proceed to Step 3.\n\n## Step 3: Enter on the FVG Inversion\nAfter the sweep and snap-back:\n- A strong bullish candle fires upward, leaving a Fair Value Gap below it\n- WAIT for price to return and pull back INTO that FVG\n- Enter LONG at the midpoint of the FVG\n- Stop: below the wick low (below the sweep)\n- Target: the nearest draw on liquidity above (previous swing high, equal highs, HTF target)\n\n## Step 4: Manage the Trade\n- At 1:1 risk-to-reward, move stop to breakeven (eliminate loss risk)\n- At 1:2, take 50% of position off\n- Let the final 50% run to the full target\n\n## The Most Common Mistake\nTaking setups where the HTF bias is AGAINST your entry direction. If the 1-hour is bearish and you're trying to go long on a 5-minute mechanical model — the odds drop dramatically. Alignment is everything.` },
        quiz: [
          { q: 'In a BULLISH Mechanical Model setup, which specific condition serves as the entry trigger?', options: ['The moment price creates the Lower Low', 'Price returning into the Fair Value Gap left by the snap-back candle after the liquidity sweep', 'A moving average crossover on the 5-minute chart', 'Price closing above the swing high on the 15-minute chart'], answer: 1 },
          { q: 'Blake\'s trade management rule at 1:1 risk-to-reward is to:', options: ['Close the entire position and take the profit', 'Add to the position since you\'re profitable', 'Move stop loss to breakeven — remove the risk of a loss', 'Switch to a trailing stop at 5 pips below price'], answer: 2 },
        ] },
      { order_index: 4, title: 'Practice: Execute the Full Mechanical Model Checklist', type: 'practice', is_free_preview: false, duration_mins: 30,
        content: { instructions: 'Open the Trade tab. Select any liquid instrument on the 15-minute chart and establish HTF bias. Then zoom to the 5-minute chart. Run the checklist: (1) Is there a swing low? (2) Is there a swing high? (3) Did price create a lower low? (4) Was it a sweep (immediate snap-back)? If all four: identify the FVG and set a limit entry at its midpoint with stop below the sweep wick. Journal your HTF bias and why you think all four conditions are met.', symbol: 'NQ', tab: 'trade' } },
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
