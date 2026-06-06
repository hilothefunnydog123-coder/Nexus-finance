import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'

const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'How the AI Works — Methodology & Data | YN Finance',
  description: 'Exactly how the YN Finance AI Stock Analyzer works: the 5-agent research pipeline, the live data behind every call, how ratings and price targets are formed, and where the limits are. Full transparency.',
  alternates: { canonical: `${BASE}/methodology` },
}

const AGENTS = [
  { n: '01', t: 'Fundamentals', c: '#00d4aa', d: 'Reads valuation (P/E vs sector), growth, margins and balance-sheet health to judge whether the business justifies the price.' },
  { n: '02', t: 'Technical', c: '#1e90ff', d: 'Maps trend, momentum and key support/resistance from live price data, and locates the stock within its 52-week range.' },
  { n: '03', t: 'Sentiment', c: '#a855f7', d: 'Weighs recent company news, the narrative and the Wall Street analyst consensus to gauge how the market is leaning.' },
  { n: '04', t: 'Risk', c: '#f59e0b', d: 'Stress-tests the downside — volatility, beta, event risk (earnings) and the specific things that could break the thesis.' },
  { n: '05', t: 'Portfolio Manager', c: '#ff2d78', d: 'Synthesizes the four specialists into one decision: a rating, conviction score, entry zone, stop, targets and an options play.' },
]

const SECTIONS = [
  { t: 'The data behind every call', b: 'Quotes, fundamentals, analyst ratings and company news come from Finnhub in real time — the same class of feeds professional desks use. Charts are live. Nothing on the analyzer is mocked or hard-coded. When data for a field isn’t available, we show that rather than inventing a number.' },
  { t: 'How ratings & targets are formed', b: 'Each agent scores its domain, then the Portfolio Manager weighs them into a single Buy/Hold/Sell rating and a conviction score. Price targets are framed as scenarios — a bear, base and bull 12-month case — because a single number hides the risk. Conviction is shown honestly: a 55% call looks different from a 90% one.' },
  { t: 'How the options figures work', b: 'The options desk suggests a structure (e.g. a call or put), an approximate strike, breakeven and max loss, and draws the payoff at expiry. These premiums are estimated from realized volatility — they are not pulled from a live options chain, so treat them as a directional guide, not an exact quote. A live options feed is on the roadmap.' },
  { t: 'We publish our record', b: 'Every analysis is logged the moment it’s generated — entry price and timestamp — and scored against live prices afterward. We don’t delete the losers. You can audit the AI’s hit rate and average return yourself on the public track record.' },
]

export default function MethodologyPage() {
  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.lnk:hover{color:#00d4aa!important}`}</style>
      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <Link href="/ai-stocks" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Try the analyzer →</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px clamp(16px,4vw,24px) 80px' }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '2px', color: '#00d4aa', border: '1px solid rgba(0,212,170,.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 22 }}>TRANSPARENCY</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.03, marginBottom: 16 }}>How the AI actually works.</h1>
        <p style={{ fontSize: 17, color: '#6a8497', lineHeight: 1.7, maxWidth: 620, marginBottom: 48 }}>
          No black box and no hand-waving. Here’s the exact pipeline behind every analysis, the live data it runs on, how the ratings and targets are formed — and, just as importantly, where the limits are.
        </p>

        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>Five specialized agents</h2>
        <p style={{ fontSize: 15, color: '#6a8497', lineHeight: 1.7, marginBottom: 24 }}>Instead of one generic prompt, the analyzer runs five focused agents — each an expert in one lens — then a manager that makes the final call.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 52 }}>
          {AGENTS.map(a => (
            <div key={a.n} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 900, fontFamily: '"SF Mono",ui-monospace,monospace', color: a.c, flexShrink: 0, paddingTop: 2 }}>{a.n}</div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{a.t}</h3>
                <p style={{ fontSize: 14, color: '#8aa0b2', lineHeight: 1.65 }}>{a.d}</p>
              </div>
            </div>
          ))}
        </div>

        {SECTIONS.map(s => (
          <div key={s.t} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 900, letterSpacing: '-.5px', marginBottom: 12 }}>{s.t}</h2>
            <p style={{ fontSize: 15, color: '#8aa0b2', lineHeight: 1.8 }}>{s.b}</p>
          </div>
        ))}

        {/* Honesty box */}
        <div style={{ borderRadius: 16, padding: '24px 26px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.22)', marginBottom: 44 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', marginBottom: 10 }}>What this is — and isn’t</h2>
          <p style={{ fontSize: 14, color: '#cdb88a', lineHeight: 1.8 }}>
            YN Finance is an education and research tool, not a broker or a registered advisor, and nothing here is financial advice. The AI can be wrong, markets are uncertain, and past performance never guarantees future results. Use it to think faster and more thoroughly — then make your own decision.
          </p>
        </div>

        <div style={{ textAlign: 'center', padding: '36px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,212,170,.1), rgba(30,144,255,.05))', border: '1px solid rgba(0,212,170,.22)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 10 }}>See it on a real stock</h2>
          <p style={{ fontSize: 14.5, color: '#6a8497', maxWidth: 440, margin: '0 auto 22px', lineHeight: 1.6 }}>Run any ticker, then check the call against our public track record.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/ai-stocks" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '14px 30px', borderRadius: 12, fontSize: 15, fontWeight: 900, textDecoration: 'none' }}>Analyze a stock free →</Link>
            <Link href="/performance" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#dce8f0', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>View track record</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
