import type { Metadata } from 'next'
import { PaperPage, PageHero, Section, Reveal, Magnetic, INK, MUTE, LINE, ACCENT, PAPER } from '@/components/cinematic/Paper'

const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'How the AI Works — Methodology & Data | YN Finance',
  description: 'Exactly how the YN Finance AI Stock Analyzer works: the 5-agent research pipeline, the live data behind every call, how ratings and price targets are formed, and where the limits are. Full transparency.',
  alternates: { canonical: `${BASE}/methodology` },
}

const AGENTS = [
  { n: '01', t: 'Fundamentals', d: 'Reads valuation (P/E vs sector), growth, margins and balance-sheet health to judge whether the business justifies the price.' },
  { n: '02', t: 'Technical', d: 'Maps trend, momentum and key support/resistance from live price data, and locates the stock within its 52-week range.' },
  { n: '03', t: 'Sentiment', d: 'Weighs recent company news, the narrative and the Wall Street analyst consensus to gauge how the market is leaning.' },
  { n: '04', t: 'Risk', d: 'Stress-tests the downside — volatility, beta, event risk (earnings) and the specific things that could break the thesis.' },
  { n: '05', t: 'Portfolio Manager', d: 'Synthesizes the four specialists into one decision: a rating, conviction score, entry zone, stop, targets and an options play.' },
]

const SECTIONS = [
  { t: 'The data behind every call', b: 'Quotes, fundamentals, analyst ratings and company news come from Finnhub in real time — the same class of feeds professional desks use. Charts are live. Nothing on the analyzer is mocked or hard-coded. When data for a field isn’t available, we show that rather than inventing a number.' },
  { t: 'How ratings & targets are formed', b: 'Each agent scores its domain, then the Portfolio Manager weighs them into a single Buy/Hold/Sell rating and a conviction score. Price targets are framed as scenarios — a bear, base and bull 12-month case — because a single number hides the risk. Conviction is shown honestly: a 55% call looks different from a 90% one.' },
  { t: 'How the options figures work', b: 'The AI suggests a structure (a call or put), an approximate strike, breakeven and max loss, and draws the payoff at expiry. When a live options data provider is connected, we then pull the real contract nearest that strike from the live options chain — actual mid premium, implied volatility, delta/theta, open interest and breakeven (quotes may be delayed). If live chain data isn’t available for a name, we fall back to a realized-volatility estimate and label it clearly as an estimate.' },
  { t: 'We publish our record', b: 'Every analysis is logged the moment it’s generated — entry price and timestamp — and scored against live prices afterward. We don’t delete the losers. You can audit the AI’s hit rate and average return yourself on the public track record.' },
]

export default function MethodologyPage() {
  return (
    <PaperPage>
      <PageHero
        eyebrow="// TRANSPARENCY"
        title="How the AI actually works."
        accentWords={[3]}
        sub="No black box and no hand-waving. Here’s the exact pipeline behind every analysis, the live data it runs on, how the ratings and targets are formed — and, just as importantly, where the limits are."
      />

      <Section style={{ paddingTop: 0 }}>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 14 }}>// FIVE SPECIALIZED AGENTS</div></Reveal>
        <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.2vw,2.4rem)', maxWidth: 760, marginBottom: 36 }}>Not one generic prompt — five focused experts, then a manager that decides.</h2></Reveal>
        {AGENTS.map((a) => (
          <Reveal key={a.n}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(16px,4vw,40px)', alignItems: 'start', padding: 'clamp(22px,3vw,32px) 0', borderTop: `1px solid ${LINE}` }}>
              <div className="disp" style={{ fontSize: 'clamp(1.8rem,5vw,3rem)', color: 'rgba(10,10,12,.18)' }}>{a.n}</div>
              <div style={{ maxWidth: 720 }}>
                <h3 className="disp" style={{ fontSize: 'clamp(1.3rem,2.4vw,1.7rem)', marginBottom: 8 }}>{a.t}</h3>
                <p style={{ fontSize: 15.5, color: MUTE, lineHeight: 1.65 }}>{a.d}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </Section>

      <Section bg={PAPER}>
        <div style={{ maxWidth: 820 }}>
          {SECTIONS.map((s) => (
            <Reveal key={s.t} style={{ marginBottom: 40 }}>
              <h2 className="disp" style={{ fontSize: 'clamp(1.4rem,2.8vw,2rem)', marginBottom: 12 }}>{s.t}</h2>
              <p style={{ fontSize: 15.5, color: MUTE, lineHeight: 1.8 }}>{s.b}</p>
            </Reveal>
          ))}
          <Reveal>
            <div style={{ padding: '24px 26px', background: 'rgba(31,59,255,.05)', border: `1px solid rgba(31,59,255,.22)` }}>
              <h2 className="disp" style={{ fontSize: '1.2rem', color: ACCENT, marginBottom: 10 }}>What this is — and isn’t</h2>
              <p style={{ fontSize: 14.5, color: MUTE, lineHeight: 1.8 }}>YN Finance is an education and research tool, not a broker or a registered advisor, and nothing here is financial advice. The AI can be wrong, markets are uncertain, and past performance never guarantees future results. Use it to think faster and more thoroughly — then make your own decision.</p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <Reveal style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
          <h2 className="disp" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', marginBottom: 12 }}>See it on a real stock.</h2>
          <p style={{ fontSize: 16, color: MUTE, marginBottom: 28 }}>Run any ticker, then check the call against our public track record.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnetic href="/ai-stocks" style={{ gap: 8, background: INK, color: PAPER, padding: '16px 30px', fontSize: 15, fontWeight: 700 }}>Analyze a stock free →</Magnetic>
            <Magnetic href="/performance" style={{ gap: 8, background: 'transparent', color: INK, padding: '16px 28px', fontSize: 15, fontWeight: 700, border: `1px solid ${INK}` }}>View track record</Magnetic>
          </div>
        </Reveal>
      </Section>
    </PaperPage>
  )
}
