import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

// Seed courses shown when DB is empty — real strategies, real content structure
export const SEED_COURSES = [
  {
    id: 'c1', slug: '5-minute-scalp-mastery', title: 'The 5-Minute Scalp System',
    description: 'The exact high-probability scalping framework I\'ve used to pull consistent daily profits for 6 years. Entry triggers, exit rules, risk management — everything mapped out step by step.',
    trader_name: 'ScalpKing_NYC', trader_handle: '@ScalpKing_NYC', trader_avatar_color: '#00d4aa',
    trader_bio: 'Full-time scalper, 6 years. Specializes in NASDAQ momentum plays and ES futures. Former prop trader.',
    strategy_type: 'Scalping', difficulty: 'Intermediate', price_cents: 99, is_free: false,
    thumbnail_color: '#00d4aa', rating: 4.9, enrollment_count: 847, tags: ['scalping','NASDAQ','momentum','5-min'],
    sections: [
      { order_index: 0, title: 'What Makes a Real Scalp Setup', type: 'video', is_free_preview: true, duration_mins: 8, content: { youtube_id: 'dQw4w9WgXcQ', description: 'The 3 conditions that MUST be present before every scalp. Most beginners skip condition #2 and wonder why they keep getting stopped out.' } },
      { order_index: 1, title: 'The Pre-Market Routine (7–9:30 AM)', type: 'text', is_free_preview: true, duration_mins: 5, content: { text: `# The Pre-Market Routine\n\nEvery morning before market open I run through the exact same checklist. This isn't optional — it's what separates consistent profit from gambling.\n\n## Step 1: Identify the Gappers\nOpen the scanner at 7 AM. I'm looking for stocks gapping **+5% or more** on news catalyst. These become my watchlist for the day. No catalyst = no interest.\n\n## Step 2: Mark Key Levels\nFor each gapper, mark:\n- **Yesterday's high** — first target on gap-up plays\n- **Pre-market high** — resistance to watch\n- **Opening range** high/low (first 5-min candle)\n\n## Step 3: Check Overall Market\n- Is SPY trending or choppy?\n- Where is VIX? Above 20 = size down 50%\n- Any high-impact economic data today?\n\n## Step 4: Set Your Daily Loss Limit\nBefore you trade a single share, decide: *"If I lose $X today, I stop."* Write it down. Stick to it.` } },
      { order_index: 2, title: 'Entry Triggers: The 3-Candle Pattern', type: 'video', is_free_preview: false, duration_mins: 12, content: { youtube_id: 'dQw4w9WgXcQ', description: 'My primary entry pattern. Works on 1-min and 5-min charts. I\'ll show you 15 real examples from my trading week.' } },
      { order_index: 3, title: 'Stop Loss Placement (The Right Way)', type: 'text', is_free_preview: false, duration_mins: 6, content: { text: `# Stop Loss Placement\n\nMost traders place stops wrong and wonder why they keep getting tagged then watching the stock go their way.\n\n## The Rule: Stop Goes Below the REASON\n\nIf you're buying a breakout above $50, your stop goes **below the base** that formed before the breakout — not just $0.50 below your entry.\n\n## Specific Placements\n\n**Breakout play**: Stop below the consolidation base (usually 1–3% below entry)\n**VWAP bounce**: Stop below VWAP (if price closes below VWAP on a 5-min candle, you're wrong)\n**Opening range breakout**: Stop at the opposite side of the opening range\n\n## The Math That Matters\n\nBefore every trade: *Risk = Entry Price − Stop Price × Shares*\n\nNever risk more than 0.5% of your account on one scalp. If you have $50,000, that's $250 max loss per trade.` } },
      { order_index: 4, title: 'Exit Strategy: When to Take Profits', type: 'video', is_free_preview: false, duration_mins: 10, content: { youtube_id: 'dQw4w9WgXcQ', description: 'The hardest part — when to get out. I\'ll show you my scaled exit system and why I never try to hit the top.' } },
      { order_index: 5, title: 'Live Trade Walkthrough — 5 Real Trades', type: 'video', is_free_preview: false, duration_mins: 22, content: { youtube_id: 'dQw4w9WgXcQ', description: '5 trades from last week — 3 winners, 2 losers. I explain my thinking in real time for each one, including the losses.' } },
      { order_index: 6, title: 'Practice: Run the System Yourself', type: 'practice', is_free_preview: false, duration_mins: 30, content: { instructions: 'Open the Trade tab. Select NVDA or AMD. Switch to 5-min chart. Apply the 3-candle entry pattern from Section 3. Take 3 scalp trades using the exact stops from Section 4. Journal each one in your Trade Journal.', symbol: 'NVDA', tab: 'trade' } },
    ],
  },
  {
    id: 'c2', slug: 'vwap-day-trading', title: 'VWAP Day Trading Mastery',
    description: 'VWAP is the most important intraday level and most traders misuse it. Learn the institutional approach — how to use VWAP reclaims, rejections, and deviations to time entries like a pro.',
    trader_name: 'MomoMike_ATL', trader_handle: '@MomoMike_ATL', trader_avatar_color: '#1e90ff',
    trader_bio: 'Momentum day trader. Focuses on high-volume large-cap stocks. 5 years trading, profitable for 4.',
    strategy_type: 'Day Trading', difficulty: 'Beginner', price_cents: 99, is_free: false,
    thumbnail_color: '#1e90ff', rating: 4.8, enrollment_count: 1203, tags: ['VWAP','day-trading','stocks','momentum'],
    sections: [
      { order_index: 0, title: 'What is VWAP and Why Institutions Use It', type: 'text', is_free_preview: true, duration_mins: 6, content: { text: `# What is VWAP?\n\nVWAP (Volume-Weighted Average Price) is the average price a stock has traded at throughout the day, weighted by volume.\n\n## Why It Matters\n\nInstitutions (hedge funds, mutual funds) benchmark their executions against VWAP. When a large fund needs to buy 1 million shares, their traders try to buy at or below VWAP to show good execution to their portfolio managers.\n\nThis creates self-fulfilling support and resistance. When price is **above VWAP**, buyers are in control. Below VWAP, sellers dominate.\n\n## The Simple Rules\n- Price above VWAP + momentum = trend day, buy dips to VWAP\n- Price below VWAP + weakness = short bounces to VWAP  \n- VWAP reclaim (crossing above after being below) = potential trend change` } },
      { order_index: 1, title: 'VWAP Bounce Setup', type: 'video', is_free_preview: true, duration_mins: 14, content: { youtube_id: 'dQw4w9WgXcQ', description: 'My bread-and-butter setup. Price pulls back to VWAP on a trend day and bounces. I\'ll show you exactly how to identify and trade it.' } },
      { order_index: 2, title: 'VWAP Reclaim: The Power Move', type: 'video', is_free_preview: false, duration_mins: 11, content: { youtube_id: 'dQw4w9WgXcQ', description: 'When a stock reclaims VWAP after being below it, that\'s the signal. Shows you 8 examples.' } },
      { order_index: 3, title: 'VWAP Rejection: The Short Setup', type: 'text', is_free_preview: false, duration_mins: 8, content: { text: `# VWAP Rejection Short Setup\n\n**Setup conditions:**\n1. Stock is in a clear downtrend (lower highs, lower lows on 5-min)\n2. Price bounces up toward VWAP from below\n3. Watch for a rejection candle at VWAP (doji, shooting star, or bearish engulfing)\n4. Enter short on the next candle close below VWAP\n5. Stop above the rejection candle high\n6. Target: previous low or -1 standard deviation from VWAP` } },
      { order_index: 4, title: 'Practice: 3 VWAP Trades', type: 'practice', is_free_preview: false, duration_mins: 30, content: { instructions: 'Open the Trade tab. On SPY or QQQ (1-hour or 15-min chart), identify 3 moments where price interacted with VWAP. Take one of each: bounce, reclaim, or rejection. Size 10 shares max. Journal each trade.', symbol: 'SPY', tab: 'trade' } },
    ],
  },
  {
    id: 'c3', slug: 'options-flow-trading', title: 'Trading Options Flow Like a Hedge Fund',
    description: 'Dark pool prints and options sweeps predict stock moves before they happen. Learn to read the tape, identify unusual activity, and position ahead of the move like institutional traders do.',
    trader_name: 'ThetaQueen', trader_handle: '@ThetaQueen', trader_avatar_color: '#a855f7',
    trader_bio: 'Options specialist. Theta strategies + flow-based directional plays. Chicago background.',
    strategy_type: 'Options Flow', difficulty: 'Advanced', price_cents: 99, is_free: false,
    thumbnail_color: '#a855f7', rating: 4.9, enrollment_count: 634, tags: ['options','dark-pool','flow','institutional'],
    sections: [
      { order_index: 0, title: 'How Options Flow Works', type: 'text', is_free_preview: true, duration_mins: 7, content: { text: `# How Options Flow Works\n\n## What is a Sweep?\nAn options sweep is when a large buyer hits multiple exchanges simultaneously to fill a large order quickly. This indicates urgency — they want in NOW, not at the best price. This urgency tells us something.\n\n## What to Look For\n- **Size**: Sweeps over $500K premium = institutional\n- **OTM calls/puts**: Out-of-the-money options with large premium = directional bet\n- **Time**: 0-30 days to expiry + OTM = speculative directional bet\n- **Repeat**: Same strike/expiry bought multiple times = conviction\n\n## The Golden Rule\nFlow doesn't tell you the direction with certainty. It tells you where smart money is BETTING. Big difference. Always confirm with the chart.` } },
      { order_index: 1, title: 'Reading the Options Scanner', type: 'video', is_free_preview: true, duration_mins: 18, content: { youtube_id: 'dQw4w9WgXcQ', description: 'Live walkthrough of reading unusual options activity. I\'ll show you which alerts to pay attention to and which to ignore.' } },
      { order_index: 2, title: 'Confirmed Flow Trade Setup', type: 'video', is_free_preview: false, duration_mins: 15, content: { youtube_id: 'dQw4w9WgXcQ', description: '5-step checklist before following any flow. Step 4 eliminates 70% of false signals.' } },
      { order_index: 3, title: 'Practice: Analyze the Options Flow Tab', type: 'practice', is_free_preview: false, duration_mins: 20, content: { instructions: 'Go to the Scanner tab. Look at the Options Flow feed. For each whale alert, assess: What is the implied directional bet? Does the stock chart confirm it? Would you take the trade? Write your analysis for 3 alerts in your journal.', symbol: 'NVDA', tab: 'scanner' } },
    ],
  },
  {
    id: 'c4', slug: 'eurusd-swing-trading', title: 'EUR/USD Swing Trading System',
    description: 'A complete swing trading framework for the world\'s most liquid currency pair. Structure-based entries, economic calendar integration, and position management for 3–10 day holds.',
    trader_name: 'ForexFred', trader_handle: '@ForexFred', trader_avatar_color: '#00d4aa',
    trader_bio: '7 years in forex. Specializes in EUR/USD and GBP/USD. Former bank FX desk analyst.',
    strategy_type: 'Forex Swing', difficulty: 'Intermediate', price_cents: 99, is_free: false,
    thumbnail_color: '#ffa502', rating: 4.7, enrollment_count: 429, tags: ['forex','EUR/USD','swing','macro'],
    sections: [
      { order_index: 0, title: 'Why EUR/USD is the Best Forex Pair to Learn On', type: 'text', is_free_preview: true, duration_mins: 5, content: { text: `# Why EUR/USD\n\n- Tightest spreads (0.1–0.3 pips on good brokers)\n- Most liquid pair in the world — $1.1 trillion daily volume\n- Well-documented reaction to economic data\n- Clear structure — respects key levels well\n- Two main sessions: London (3 AM–12 PM ET) and New York (8 AM–5 PM ET)\n\n## The Macro Framework\nEUR/USD is driven by interest rate differentials between the ECB (European Central Bank) and the Federal Reserve.\n- Fed hawkish (raising rates) → USD strengthens → EUR/USD falls\n- ECB hawkish → EUR strengthens → EUR/USD rises\nAlways know where both central banks stand.` } },
      { order_index: 1, title: 'Market Structure: The Foundation', type: 'video', is_free_preview: true, duration_mins: 16, content: { youtube_id: 'dQw4w9WgXcQ', description: 'How to identify swing highs, swing lows, and the overall structure of the market. Everything else depends on this.' } },
      { order_index: 2, title: 'Entry Zones and Confluence', type: 'video', is_free_preview: false, duration_mins: 14, content: { youtube_id: 'dQw4w9WgXcQ', description: 'I only enter when 3+ factors align. What those factors are and how to find them.' } },
      { order_index: 3, title: 'Economic Calendar Integration', type: 'text', is_free_preview: false, duration_mins: 8, content: { text: `# Using the Economic Calendar for Forex\n\n## The Events That Move EUR/USD Most\n1. **US Non-Farm Payrolls (NFP)** — First Friday of every month. Biggest mover.\n2. **US CPI (inflation)** — Monthly. Massive for Fed expectations.\n3. **FOMC Decisions** — 8x per year. Rate decisions + forward guidance.\n4. **ECB Rate Decisions** — 8x per year. European equivalent.\n5. **US GDP** — Quarterly. Less volatile but important.\n\n## The Rule Around High-Impact Events\nDon't hold positions through red-folder events unless they're going your way AND sized down 50%. The spread widens, slippage is brutal, and the move can be 100+ pips in seconds.` } },
      { order_index: 4, title: 'Practice: Take a EUR/USD Swing Trade', type: 'practice', is_free_preview: false, duration_mins: 0, content: { instructions: 'Open the Trade tab → Forex tab → EUR/USD. On the 4H chart, identify the current market structure (is it trending up, down, or ranging?). Set a position with proper SL/TP using what you learned. Check the Economic Calendar before entering. Journal your setup reasoning.', symbol: 'EUR/USD', tab: 'trade' } },
    ],
  },
  {
    id: 'c5', slug: 'es-futures-intraday', title: 'ES Futures: The Professional\'s Playbook',
    description: 'Trade the S&P 500 E-Mini the way prop traders do — using market profile, VWAP, and order flow to identify high-probability intraday setups on the world\'s most liquid futures contract.',
    trader_name: 'DeltaForce_CHI', trader_handle: '@DeltaForce_CHI', trader_avatar_color: '#ff4757',
    trader_bio: 'Former prop trader, CME Group floor experience. Now trades ES and NQ exclusively. Teaches serious traders only.',
    strategy_type: 'Futures', difficulty: 'Advanced', price_cents: 99, is_free: false,
    thumbnail_color: '#ff4757', rating: 4.9, enrollment_count: 312, tags: ['futures','ES','intraday','market-profile'],
    sections: [
      { order_index: 0, title: 'Why Futures? Why ES?', type: 'text', is_free_preview: true, duration_mins: 6, content: { text: `# Why Trade ES Futures?\n\n## The Advantages Over Stocks\n- **Tax treatment**: 60% long-term, 40% short-term (beneficial in the US)\n- **Nearly 24-hour market**: Trade European and Asian sessions\n- **No PDT rule**: No $25,000 minimum to day trade\n- **Leverage**: 1 contract controls $262,400 of S&P 500 (at 5248)\n- **Liquidity**: 1.5 million+ contracts per day — no slippage issues\n\n## The Risks\n- Each point = $50. Each tick (0.25 points) = $12.50\n- Wrong direction with 1 contract and 10-point stop = $500 loss\n- Leverage is a tool, not free money\n\n## ES vs. MES (Micro ES)\nStart with MES (Micro E-Mini). Same contract, 1/10th the size ($5 per point). Practice with real money but manageable risk.` } },
      { order_index: 1, title: 'Market Profile Basics', type: 'video', is_free_preview: true, duration_mins: 20, content: { youtube_id: 'dQw4w9WgXcQ', description: 'The most powerful tool no retail trader uses. Understanding value areas, POC, and how to trade around them.' } },
      { order_index: 2, title: 'The Opening Drive: 9:30–10:00 AM', type: 'video', is_free_preview: false, duration_mins: 18, content: { youtube_id: 'dQw4w9WgXcQ', description: 'The opening 30 minutes sets the tone for the day. Here\'s how to read it and position accordingly.' } },
      { order_index: 3, title: 'Gap Plays: Fade vs. Follow', type: 'text', is_free_preview: false, duration_mins: 10, content: { text: `# Trading Gap Opens on ES\n\n## Gap Up Scenarios\n- **Large gap up (+15+ points) on no news**: 70% fill within 2 days. Fading works.\n- **Gap up on strong earnings/macro data**: Don't fade. Follow the direction.\n- **Small gap (+5–10 points)**: Wait for opening range before deciding.\n\n## The Gap Fill Trade\n1. ES gaps up 20 points overnight\n2. No significant catalyst\n3. Wait for the first 30 minutes\n4. If ES fails to make new highs in first 30 min, enter short targeting gap fill\n5. Stop above overnight high` } },
      { order_index: 4, title: 'Practice: Trade ES on the Simulator', type: 'practice', is_free_preview: false, duration_mins: 60, content: { instructions: 'Open the Trade tab → Futures → ES. Use the 5-min chart. Trade the opening range breakout: identify the high and low of the first 15-minute candle. Enter on a break of either side. Stop at the other side. Target 2:1. Size: 1 contract only. Journal your trade with emotion and grade.', symbol: 'ES', tab: 'trade' } },
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
