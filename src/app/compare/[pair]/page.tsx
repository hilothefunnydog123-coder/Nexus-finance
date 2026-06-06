import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStock, fmtCap, consensus, COMPARE_PAIRS, type StockData } from '@/lib/stockSeo'
import { isLikelyTicker } from '@/lib/tickers'
import SiteFooter from '@/components/SiteFooter'

export const revalidate = 3600
const BASE = 'https://ynfinance.org'

function parsePair(pair: string): [string, string] | null {
  const parts = decodeURIComponent(pair).toLowerCase().split('-vs-')
  if (parts.length !== 2) return null
  const a = parts[0].toUpperCase(), b = parts[1].toUpperCase()
  if (!isLikelyTicker(a) || !isLikelyTicker(b) || a === b) return null
  return [a, b].sort() as [string, string] // canonical alphabetical order
}

export async function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ pair: `${a.toLowerCase()}-vs-${b.toLowerCase()}` }))
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const { pair } = await params
  const p = parsePair(pair)
  if (!p) return { title: 'Compare Stocks | YN Finance' }
  const [a, b] = p
  const title = `${a} vs ${b}: Stock Comparison & AI Verdict | YN Finance`
  const description = `${a} vs ${b} — compare price, market cap, P/E, analyst consensus and momentum side by side, then get a free AI rating and price targets on each.`
  return {
    title, description,
    alternates: { canonical: `${BASE}/compare/${a.toLowerCase()}-vs-${b.toLowerCase()}` },
    openGraph: { title, description, url: `${BASE}/compare/${a.toLowerCase()}-vs-${b.toLowerCase()}`, siteName: 'YN Finance', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function StatCell({ a, b, aWin, bWin }: { a: string; b: string; aWin?: boolean; bWin?: boolean }) {
  return (
    <>
      <div style={{ textAlign: 'right', fontFamily: '"SF Mono",ui-monospace,monospace', fontWeight: 800, color: aWin ? '#00d4aa' : '#cfe0ec' }}>{aWin ? '◀ ' : ''}{a}</div>
      <div style={{ textAlign: 'left', fontFamily: '"SF Mono",ui-monospace,monospace', fontWeight: 800, color: bWin ? '#00d4aa' : '#cfe0ec' }}>{b}{bWin ? ' ▶' : ''}</div>
    </>
  )
}

export default async function ComparePage({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const p = parsePair(pair)
  if (!p) notFound()
  const [symA, symB] = p
  const [A, B] = await Promise.all([getStock(symA), getStock(symB)])
  if (!A || !B) notFound()

  const cA = consensus(A.rec), cB = consensus(B.rec)
  const pos = (d: StockData) => d.high52 > d.low52 ? Math.round(((d.price - d.low52) / (d.high52 - d.low52)) * 100) : 50

  // Honest, directional "edge" markers only where a metric has a clear better/worse
  const valA = A.pe > 0 && B.pe > 0 ? A.pe < B.pe : undefined
  const momA = A.changePct !== B.changePct ? A.changePct > B.changePct : undefined
  const consA = cA.score !== cB.score ? cA.score > cB.score : undefined
  const edges = [valA, momA, consA].filter(v => v !== undefined) as boolean[]
  const aWins = edges.filter(Boolean).length
  const leader = aWins > edges.length - aWins ? A : aWins < edges.length - aWins ? B : null

  const faq = [
    { q: `Is ${A.symbol} or ${B.symbol} the better stock?`, a: `${leader ? `On current data, ${leader.name} (${leader.symbol}) screens stronger across valuation, momentum and analyst consensus` : `${A.symbol} and ${B.symbol} screen evenly on current data`}. "Better" depends on your thesis and time horizon — run each through the free YN Finance AI Analyzer for a full rating and price targets.` },
    { q: `${A.symbol} vs ${B.symbol}: which is cheaper?`, a: `${A.symbol} trades at a P/E of ${A.pe ? A.pe.toFixed(1) : 'n/a'} versus ${B.pe ? B.pe.toFixed(1) : 'n/a'} for ${B.symbol}. Lower isn't automatically better — context matters.` },
  ]
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }

  const rows: { label: string; a: string; b: string; aWin?: boolean; bWin?: boolean }[] = [
    { label: 'Price', a: `$${A.price.toFixed(2)}`, b: `$${B.price.toFixed(2)}` },
    { label: 'Today', a: `${A.changePct >= 0 ? '+' : ''}${A.changePct.toFixed(2)}%`, b: `${B.changePct >= 0 ? '+' : ''}${B.changePct.toFixed(2)}%`, aWin: momA === true, bWin: momA === false },
    { label: 'Market Cap', a: fmtCap(A.marketCap), b: fmtCap(B.marketCap) },
    { label: 'P/E Ratio', a: A.pe ? A.pe.toFixed(1) : '—', b: B.pe ? B.pe.toFixed(1) : '—', aWin: valA === true, bWin: valA === false },
    { label: 'Beta', a: A.beta ? A.beta.toFixed(2) : '—', b: B.beta ? B.beta.toFixed(2) : '—' },
    { label: '52W Position', a: `${pos(A)}%`, b: `${pos(B)}%` },
    { label: 'Analyst View', a: cA.label, b: cB.label, aWin: consA === true, bWin: consA === false },
  ]

  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.lnk:hover{color:#00d4aa!important}`}</style>

      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'sticky', top: 0, background: 'rgba(4,10,18,.85)', backdropFilter: 'blur(16px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <Link href="/stock" className="lnk" style={{ fontSize: 13, color: '#6a8497', textDecoration: 'none', fontWeight: 600 }}>All Stocks</Link>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px clamp(16px,4vw,24px) 70px' }}>
        <div style={{ fontSize: 12, color: '#3a5566', marginBottom: 20 }}>
          <Link href="/stock" className="lnk" style={{ textDecoration: 'none', color: '#3a5566' }}>Stocks</Link> / <span style={{ color: '#6a8497' }}>{A.symbol} vs {B.symbol}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 12 }}>
          {A.symbol} vs {B.symbol}: Which Stock Wins?
        </h1>
        <p style={{ fontSize: 16, color: '#6a8497', lineHeight: 1.7, maxWidth: 600, marginBottom: 30 }}>
          {A.name} vs {B.name} — side by side on the metrics that matter, plus a free AI rating and price targets on each.
        </p>

        {/* Verdict banner */}
        {leader && (
          <div style={{ borderRadius: 14, padding: '18px 22px', background: 'linear-gradient(135deg, rgba(0,212,170,.1), rgba(30,144,255,.05))', border: '1px solid rgba(0,212,170,.25)', marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: '#8aa0b2' }}>On current data, </span>
            <b style={{ fontSize: 15, color: '#00d4aa' }}>{leader.symbol}</b>
            <span style={{ fontSize: 14, color: '#8aa0b2' }}> screens stronger across valuation, momentum &amp; analyst consensus ({Math.max(aWins, edges.length - aWins)} of {edges.length} signals).</span>
          </div>
        )}

        {/* Header row with logos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 8 }}>
          {[A, B].map((d, i) => (
            <div key={d.symbol} style={{ textAlign: i === 0 ? 'right' : 'left', order: i === 0 ? 0 : 2 }}>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: '"SF Mono",ui-monospace,monospace' }}>{d.symbol}</div>
              <div style={{ fontSize: 12, color: '#6a8497' }}>{d.industry}</div>
            </div>
          ))}
          <div style={{ order: 1, fontSize: 13, fontWeight: 800, color: '#3a5566' }}>VS</div>
        </div>

        {/* Comparison table */}
        <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 30 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 10, alignItems: 'center', padding: '14px 18px', borderTop: i ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <StatCell a={r.a} b={r.b} aWin={r.aWin} bWin={r.bWin} />
              <div style={{ order: 1, textAlign: 'center', fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', color: '#5a7488', gridColumn: 2, gridRow: 1 }}>{r.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Dual CTA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
          {[A, B].map(d => (
            <Link key={d.symbol} href={`/ai-stocks?ticker=${d.symbol}`} style={{ textAlign: 'center', background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '15px', borderRadius: 12, fontSize: 14.5, fontWeight: 900, textDecoration: 'none' }}>
              Run AI analysis on {d.symbol} →
            </Link>
          ))}
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>{A.symbol} vs {B.symbol} FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 34 }}>
          {faq.map(f => (
            <div key={f.q} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px 18px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{f.q}</h3>
              <p style={{ fontSize: 13.5, color: '#8aa0b2', lineHeight: 1.7 }}>{f.a}</p>
            </div>
          ))}
        </div>

        {/* Other comparisons */}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#6a8497', marginBottom: 14 }}>Popular comparisons</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMPARE_PAIRS.filter(([x, y]) => !(x === A.symbol && y === B.symbol)).slice(0, 12).map(([x, y]) => (
            <Link key={`${x}${y}`} href={`/compare/${x.toLowerCase()}-vs-${y.toLowerCase()}`} className="lnk" style={{ fontSize: 12.5, fontWeight: 700, color: '#8aa0b2', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 13px', textDecoration: 'none' }}>{x} vs {y}</Link>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#2a4050', marginTop: 36, lineHeight: 1.6 }}>
          Data via Finnhub, refreshed hourly. Not financial advice — educational purposes only. &quot;Screens stronger&quot; reflects current quantitative metrics, not a recommendation.
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}
