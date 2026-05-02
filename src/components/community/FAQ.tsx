'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

interface FAQItem { q: string; a: string }
interface FAQSection { title: string; emoji: string; items: FAQItem[] }

const SECTIONS: FAQSection[] = [
  {
    title: 'About YN Capital',
    emoji: '🏢',
    items: [
      { q: 'What is YN Capital?', a: 'YN Capital is a simulated prop firm trading environment built into YN Finance. You trade with a virtual account following real prop firm rules — no real money is at risk. Think of it as the most realistic FTMO/TopStep practice environment available.' },
      { q: 'Is this real trading?', a: 'No real money is involved. YN Capital uses paper trading (virtual funds) with real market prices. Your performance is tracked against professional prop firm rules, giving you the discipline and experience to eventually apply to a real prop firm.' },
      { q: 'Is YN Capital free?', a: 'The simulation environment is free. In the future, premium tiers with additional features, coaching, and verified certificates for real prop firm applications will be available via Stripe.' },
      { q: 'How is this different from just paper trading?', a: 'Standard paper trading has no rules, no pressure, and no consequences. YN Capital enforces strict profit targets, drawdown limits, and daily loss rules — exactly like real prop firms. Breaking any rule fails your challenge, just like it would at FTMO or TopStep.' },
    ],
  },
  {
    title: 'Challenge Rules',
    emoji: '📋',
    items: [
      { q: 'What are the drawdown rules?', a: 'The Maximum Drawdown limit measures from your highest account peak to your lowest point. If your account falls 5% below its peak at any time, your challenge is automatically failed. The Daily Loss Limit (2–2.5%) resets at midnight ET each day.' },
      { q: 'What instruments can I trade?', a: 'You can trade all instruments available on YN Finance — US stocks, forex pairs (EUR/USD, GBP/USD, USD/JPY, and more), and futures contracts (ES, NQ, GC, CL, and more). All instruments have real-time price feeds.' },
      { q: 'What are the trading hours?', a: 'Stocks: 9:30 AM – 4:00 PM ET (NYSE/NASDAQ sessions). Forex: 24 hours Sunday–Friday. Futures: Nearly 24/5 with brief maintenance windows. We recommend avoiding low-liquidity periods near market open/close for best execution.' },
      { q: 'Can I hold positions overnight?', a: 'Starter and Pro challenges: No overnight holds allowed (must close before 4 PM ET). Elite challenge: Overnight holds permitted. This is displayed on your challenge dashboard.' },
      { q: 'Is there a maximum position size?', a: 'No hard lot size limit, but your margin usage is capped by your free margin balance. Using more than 5% of account value on a single trade is considered high risk and not recommended.' },
      { q: 'Can I trade news events?', a: 'Yes, but exercise caution. High-impact news (NFP, CPI, FOMC) causes extreme volatility. We recommend closing positions 5 minutes before major releases. Your daily loss limit still applies during news events.' },
    ],
  },
  {
    title: 'Passing the Evaluation',
    emoji: '✅',
    items: [
      { q: 'How do I pass?', a: 'You must: (1) Hit the profit target before the time limit expires, (2) Never exceed the max drawdown at any point, (3) Trade at least the minimum number of trading days, and (4) Never exceed the daily loss limit on any single day.' },
      { q: 'What happens when I pass?', a: 'When all rules are met, your challenge status updates to "Passed" and you receive a congratulations email. A certificate of achievement is generated on your dashboard. You can then request your simulated payout to demonstrate your achievement.' },
      { q: 'Can I restart after failing?', a: 'Yes. You can start a new challenge at any time. Many successful prop traders failed multiple evaluations before passing — treat each attempt as a learning experience. Review your trade history to understand what broke your rules.' },
      { q: 'Can I have multiple challenges at once?', a: 'Currently one active challenge at a time per account. This mirrors how real prop firms operate — focus on one account and master it before scaling.' },
    ],
  },
  {
    title: 'Payouts & Payments',
    emoji: '💰',
    items: [
      { q: 'How does the payout work?', a: 'YN Capital payouts are simulated — they demonstrate your achievement and trading credentials. When you request a payout, you receive a formal email confirmation and your certificate is upgraded to "Payout Requested" status. Real monetary payouts will be processed through Rise (coming soon) once the platform launches commercially.' },
      { q: 'When will Rise integration be available?', a: 'Rise is being integrated as the payout provider for the commercial launch. Rise handles global contractor payments and will process prop firm payouts directly to your bank account. ETA: Q3 2026.' },
      { q: 'Will there be challenge fees?', a: 'Yes — Stripe payments are being integrated for challenge fees ($49 Starter / $149 Pro / $299 Elite). These fees will give you access to verified certificates accepted by partner real prop firms. Currently in beta testing.' },
      { q: 'What percentage of profits can I keep?', a: 'The standard split for YN Capital funded accounts will be 80/20 (80% to you). Top performers on the leaderboard for 3+ consecutive months qualify for the 90/10 Elite Split program.' },
      { q: 'Is there a refund policy?', a: 'Challenge fees (when activated) will be refundable within 14 days if you haven\'t made any trades. Once you begin trading, no refunds are issued — this mirrors real prop firm policy.' },
    ],
  },
  {
    title: 'Account Management',
    emoji: '⚙️',
    items: [
      { q: 'How do I reset my account?', a: 'On the prop challenge dashboard, click "Exit Challenge" to leave an active challenge. You can then start a new one immediately. Your paper trading account can be reset to $100,000 from the Positions panel in the Trade tab.' },
      { q: 'Is my progress saved if I log out?', a: 'Yes — all challenge data is saved to your Supabase account. You can log out, switch devices, or close the browser and your progress will be exactly where you left it when you log back in.' },
      { q: 'What browsers are supported?', a: 'YN Finance works on all modern browsers: Chrome, Firefox, Safari, and Edge. For the best experience, use Chrome or Edge on a desktop/laptop. Mobile is supported but the professional trading interface is optimized for desktop.' },
      { q: 'Can I share my certificate?', a: 'Yes — use the "Save as PDF" button on your certificate to download it. You can attach it to job applications, LinkedIn profiles, or share it with real prop firm recruiters as evidence of your trading discipline.' },
    ],
  },
  {
    title: 'Platform & Tools',
    emoji: '💻',
    items: [
      { q: 'What charts are used?', a: 'YN Finance uses real TradingView charts with live data. Every chart is the actual TradingView widget — you get full access to all TradingView indicators, drawing tools, and timeframes. No fake or simulated charts.' },
      { q: 'What data feeds are used?', a: 'Stock prices: Finnhub API (real-time WebSocket). Charts: TradingView live data. Forex/Futures: Simulated feeds based on realistic market conditions. Add your Finnhub API key (free at finnhub.io) to activate live stock data.' },
      { q: 'Can I use automated trading/EAs?', a: 'No automated trading is permitted during challenges. All trades must be placed manually through the YN Finance platform. Automated trading defeats the purpose of proving your manual trading discipline.' },
      { q: 'Will TradeLocker be integrated?', a: 'Yes — TradeLocker integration is in development. This will allow you to connect your TradeLocker account and have your real trades count toward YN Capital challenges. Requires a TradeLocker broker account and API credentials.' },
      { q: 'Is there a mobile app?', a: 'Not yet — YN Finance is a web application accessible on all devices. A dedicated iOS/Android app is planned for Q4 2026. The web app works on mobile browsers but is optimized for desktop use.' },
    ],
  },
]

function FAQItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border-b border-[#1a2d4a] last:border-0 transition-colors ${open ? 'bg-[#071220]' : 'hover:bg-[#071220]/50'}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left">
        <span className="text-[12px] font-semibold text-[#cdd6f4] leading-snug">{item.q}</span>
        {open ? <ChevronUp size={14} className="text-[#00d4aa] shrink-0" /> : <ChevronDown size={14} className="text-[#4a5e7a] shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-[#7f93b5] leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle size={16} className="text-[#1e90ff]" />
          <h2 className="text-base font-black text-[#cdd6f4]">Frequently Asked Questions</h2>
        </div>
        <p className="text-[11px] text-[#4a5e7a]">Everything you need to know about YN Capital — no ambiguity, no fine print</p>
      </div>

      {/* Section nav */}
      <div className="flex gap-1.5 px-5 py-3 border-b border-[#1a2d4a] bg-[#040c14] overflow-x-auto shrink-0">
        <button onClick={() => setActiveSection(null)}
          className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors shrink-0 ${!activeSection ? 'bg-[#1e90ff] border-[#1e90ff] text-white' : 'border-[#1a2d4a] text-[#7f93b5] hover:border-[#1e3a5f]'}`}>
          All
        </button>
        {SECTIONS.map(s => (
          <button key={s.title} onClick={() => setActiveSection(activeSection === s.title ? null : s.title)}
            className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors shrink-0 flex items-center gap-1 ${
              activeSection === s.title ? 'bg-[#1e90ff] border-[#1e90ff] text-white' : 'border-[#1a2d4a] text-[#7f93b5] hover:border-[#1e3a5f]'
            }`}>
            {s.emoji} {s.title}
          </button>
        ))}
      </div>

      <div className="flex-1 p-5 space-y-4">
        {SECTIONS.filter(s => !activeSection || s.title === activeSection).map(section => (
          <div key={section.title} className="bg-[#040c14] rounded-xl border border-[#1a2d4a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a2d4a] bg-[#071220] flex items-center gap-2">
              <span>{section.emoji}</span>
              <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">{section.title}</span>
              <span className="text-[9px] text-[#4a5e7a] ml-1">{section.items.length} questions</span>
            </div>
            {section.items.map(item => <FAQItem key={item.q} item={item} />)}
          </div>
        ))}

        {/* Contact footer */}
        <div className="bg-[#071220] rounded-xl border border-[#1a2d4a] p-5 text-center">
          <p className="text-[11px] text-[#7f93b5] mb-2">Still have questions?</p>
          <p className="text-[10px] text-[#4a5e7a]">
            Post in <span className="text-[#00d4aa]">#general</span> on the Trade-Room or email{' '}
            <span className="text-[#00d4aa]">support@ynfinance.org</span>
          </p>
        </div>
      </div>
    </div>
  )
}
