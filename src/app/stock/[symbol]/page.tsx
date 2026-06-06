import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { POPULAR_TICKERS, isLikelyTicker } from '@/lib/tickers'

export const revalidate = 3600 // ISR — refresh each ticker page hourly

const FH = process.env.FINNHUB_API_KEY ?? ''
const BASE = 'https://ynfinance.org'

type StockData = {
  symbol: string; name: string; industry: string; logo: string; weburl: string
  price: number; change: number; changePct: number; high: number; low: number; open: number; prevClose: number
  marketCap: number; pe: number; high52: number; low52: number; beta: number
  rec: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null
  news: { headline: string; source: string; url: string; datetime: number }[]
}

async function fh<T>(url: string): Promise<T | null> {
  if (!FH) return null
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

async function getStock(symbol: string): Promise<StockData | null> {
  const s = symbol.toUpperCase()
  const now = Math.floor(Date.now() / 1000)
  const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const [quote, profile, metricRes, recArr, newsArr] = await Promise.all([
    fh<{ c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }>(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FH}`),
    fh<{ name: string; finnhubIndustry: string; logo: string; weburl: string; marketCapitalization: number }>(`https://finnhub.io/api/v1/stock/profile2?symbol=${s}&token=${FH}`),
    fh<{ metric: Record<string, number> }>(`https://finnhub.io/api/v1/stock/metric?symbol=${s}&metric=all&token=${FH}`),
    fh<{ strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }[]>(`https://finnhub.io/api/v1/stock/recommendation?symbol=${s}&token=${FH}`),
    fh<{ headline: string; source: string; url: string; datetime: number }[]>(`https://finnhub.io/api/v1/company-news?symbol=${s}&from=${from}&to=${to}&token=${FH}`),
  ])

  // No price and no profile name → not a real/tradeable ticker
  if ((!quote || !quote.c) && (!profile || !profile.name)) return null
  void now

  const m = metricRes?.metric ?? {}
  return {
    symbol: s,
    name: profile?.name ?? s,
    industry: profile?.finnhubIndustry ?? '—',
    logo: profile?.logo ?? '',
    weburl: profile?.weburl ?? '',
    price: quote?.c ?? 0,
    change: quote?.d ?? 0,
    changePct: quote?.dp ?? 0,
    high: quote?.h ?? 0,
    low: quote?.l ?? 0,
    open: quote?.o ?? 0,
    prevClose: quote?.pc ?? 0,
    marketCap: profile?.marketCapitalization ?? 0,
    pe: m.peNormalizedAnnual ?? m.peTTM ?? 0,
    high52: m['52WeekHigh'] ?? 0,
    low52: m['52WeekLow'] ?? 0,
    beta: m.beta ?? 0,
    rec: recArr && recArr.length ? recArr[0] : null,
    news: (newsArr ?? []).filter(n => n.headline).slice(0, 5),
  }
}

function fmtCap(millions: number): string {
  if (!millions) return '—'
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(1)}B`
  return `$${millions.toFixed(0)}M`
}

function consensus(rec: StockData['rec']): { label: string; clr: string } {
  if (!rec) return { label: 'No coverage', clr: '#6a8497' }
  const bull = rec.strongBuy + rec.buy
  const bear = rec.sell + rec.strongSell
  const total = bull + rec.hold + bear || 1
  const bullPct = bull / total
  if (bullPct >= 0.66) return { label: 'Strong Buy', clr: '#00d4aa' }
  if (bullPct >= 0.45) return { label: 'Buy', clr: '#22c55e' }
  if (bear / total >= 0.45) return { label: 'Sell', clr: '#ff2d78' }
  return { label: 'Hold', clr: '#f59e0b' }
}

export async function generateStaticParams() {
  return POPULAR_TICKERS.map(symbol => ({ symbol }))
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params
  const s = decodeURIComponent(symbol).toUpperCase()
  if (!isLikelyTicker(s)) return { title: 'Stock Not Found | YN Finance' }
  const data = await getStock(s)
  if (!data) return { title: `${s} Stock | YN Finance`, robots: { index: false } }
  const dir = data.changePct >= 0 ? 'up' : 'down'
  const title = `${data.symbol} Stock Forecast, Price Target & AI Analysis | YN Finance`
  const description = `${data.name} (${data.symbol}) trades at $${data.price.toFixed(2)}, ${dir} ${Math.abs(data.changePct).toFixed(2)}% today. Get a free AI rating, bull & bear price targets, analyst consensus, key levels and an options play in seconds.`
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/stock/${data.symbol}` },
    openGraph: { title, description, url: `${BASE}/stock/${data.symbol}`, siteName: 'YN Finance', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const SECTOR_TICKERS = POPULAR_TICKERS.slice(0, 24)

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const s = decodeURIComponent(symbol).toUpperCase()
  if (!isLikelyTicker(s)) notFound()
  const d = await getStock(s)
  if (!d) notFound()

  const up = d.changePct >= 0
  const cons = consensus(d.rec)
  const pos52 = d.high52 > d.low52 ? Math.round(((d.price - d.low52) / (d.high52 - d.low52)) * 100) : 50

  const stats: [string, string][] = [
    ['Price', `$${d.price.toFixed(2)}`],
    ['Today', `${up ? '+' : ''}${d.changePct.toFixed(2)}%`],
    ['Market Cap', fmtCap(d.marketCap)],
    ['P/E Ratio', d.pe ? d.pe.toFixed(1) : '—'],
    ['52W High', d.high52 ? `$${d.high52.toFixed(2)}` : '—'],
    ['52W Low', d.low52 ? `$${d.low52.toFixed(2)}` : '—'],
    ['Beta', d.beta ? d.beta.toFixed(2) : '—'],
    ['Day Range', d.low && d.high ? `$${d.low.toFixed(2)}–$${d.high.toFixed(2)}` : '—'],
  ]

  // FAQ + structured data for rich SEO
  const faq = [
    { q: `Is ${d.symbol} a buy right now?`, a: `Wall Street's current consensus on ${d.name} (${d.symbol}) is "${cons.label}". For a full breakdown — an AI rating with bull and bear price targets, conviction score, key support/resistance levels and a suggested options play — run ${d.symbol} through the free YN Finance AI Stock Analyzer.` },
    { q: `What is ${d.symbol}'s stock price today?`, a: `${d.name} (${d.symbol}) is trading at $${d.price.toFixed(2)}, ${up ? 'up' : 'down'} ${Math.abs(d.changePct).toFixed(2)}% on the day, with a market cap of ${fmtCap(d.marketCap)}.` },
    { q: `What is the price target for ${d.symbol}?`, a: `Price targets depend on your time horizon and the scenario. The YN Finance AI Analyzer generates bear, base and bull 12-month targets for ${d.symbol} in seconds, free.` },
  ]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Stocks', item: `${BASE}/stock` },
        { '@type': 'ListItem', position: 2, name: d.symbol, item: `${BASE}/stock/${d.symbol}` },
      ] },
      { '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    ],
  }

  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`*{box-sizing:border-box;margin:0;padding:0}a{color:inherit}.lnk:hover{color:#00d4aa!important}`}</style>

      {/* NAV */}
      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'sticky', top: 0, background: 'rgba(4,10,18,.85)', backdropFilter: 'blur(16px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <Link href="/stock" className="lnk" style={{ fontSize: 13, color: '#6a8497', textDecoration: 'none', fontWeight: 600 }}>All Stocks</Link>
          <Link href="/performance" className="lnk" style={{ fontSize: 13, color: '#6a8497', textDecoration: 'none', fontWeight: 600 }}>Track Record</Link>
          <Link href={`/ai-stocks?ticker=${d.symbol}`} style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Analyze {d.symbol} →</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '36px clamp(16px,4vw,24px) 80px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: '#3a5566', marginBottom: 22 }}>
          <Link href="/stock" className="lnk" style={{ textDecoration: 'none', color: '#3a5566' }}>Stocks</Link> / <span style={{ color: '#6a8497' }}>{d.symbol}</span>
        </div>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
          {d.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.logo} alt={`${d.name} logo`} width={52} height={52} style={{ borderRadius: 12, background: '#fff', padding: 4 }} />
            : <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(0,212,170,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#00d4aa' }}>{d.symbol.slice(0, 2)}</div>}
          <div>
            <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.05 }}>{d.name} <span style={{ color: '#6a8497', fontWeight: 700 }}>({d.symbol})</span> Stock Forecast</h1>
            <div style={{ fontSize: 13, color: '#3a5566', marginTop: 6 }}>{d.industry} · AI analysis, price targets & analyst consensus</div>
          </div>
        </header>

        {/* Price block */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '20px 0 28px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 44, fontWeight: 900, fontFamily: '"SF Mono",ui-monospace,monospace', letterSpacing: '-1px' }}>${d.price.toFixed(2)}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: up ? '#00d4aa' : '#ff2d78' }}>{up ? '▲' : '▼'} {up ? '+' : ''}{d.change.toFixed(2)} ({up ? '+' : ''}{d.changePct.toFixed(2)}%)</span>
          <span style={{ fontSize: 12, color: '#3a5566' }}>today</span>
        </div>

        {/* Primary CTA card */}
        <div style={{ borderRadius: 18, padding: 'clamp(22px,4vw,32px)', background: 'linear-gradient(135deg, rgba(0,212,170,.1), rgba(30,144,255,.06))', border: '1px solid rgba(0,212,170,.22)', marginBottom: 30 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', color: '#00d4aa', marginBottom: 10 }}>FREE AI ANALYSIS</div>
          <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, letterSpacing: '-.5px', lineHeight: 1.15, marginBottom: 10 }}>Should you buy {d.symbol}? Get an instant AI rating.</h2>
          <p style={{ fontSize: 14.5, color: '#8aa0b2', lineHeight: 1.7, maxWidth: 600, marginBottom: 20 }}>
            Five specialized AI agents analyze {d.name} and return a Buy/Hold/Sell rating, bull &amp; bear 12-month price targets, a conviction score, key support and resistance levels, catalysts, and a suggested options play — in about 15 seconds.
          </p>
          <Link href={`/ai-stocks?ticker=${d.symbol}`} style={{ display: 'inline-block', background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '15px 32px', borderRadius: 12, fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 40px #00d4aa35' }}>
            Run free AI analysis on {d.symbol} →
          </Link>
        </div>

        {/* Key stats */}
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>{d.symbol} Key Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 30 }}>
          {stats.map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6a8497', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: '"SF Mono",ui-monospace,monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 52-week position + analyst consensus */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 30 }}>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Analyst Consensus</h3>
              <span style={{ fontSize: 13, fontWeight: 800, color: cons.clr, background: `${cons.clr}1a`, border: `1px solid ${cons.clr}40`, borderRadius: 8, padding: '4px 12px' }}>{cons.label}</span>
            </div>
            {d.rec ? (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#8aa0b2' }}>
                <span>Strong Buy <b style={{ color: '#00d4aa' }}>{d.rec.strongBuy}</b></span>
                <span>Buy <b style={{ color: '#22c55e' }}>{d.rec.buy}</b></span>
                <span>Hold <b style={{ color: '#f59e0b' }}>{d.rec.hold}</b></span>
                <span>Sell <b style={{ color: '#ff6b35' }}>{d.rec.sell}</b></span>
                <span>Strong Sell <b style={{ color: '#ff2d78' }}>{d.rec.strongSell}</b></span>
              </div>
            ) : <div style={{ fontSize: 13, color: '#6a8497' }}>No analyst coverage available.</div>}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#3a5566', marginBottom: 6 }}><span>52W Low ${d.low52.toFixed(2)}</span><span>{pos52}% of range</span><span>52W High ${d.high52.toFixed(2)}</span></div>
              <div style={{ height: 6, background: '#0c1822', borderRadius: 4, position: 'relative' }}>
                <div style={{ position: 'absolute', top: -3, left: `${Math.max(0, Math.min(100, pos52))}%`, width: 12, height: 12, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 10px #00d4aa', transform: 'translateX(-50%)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent news */}
        {d.news.length > 0 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>Latest {d.symbol} News</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
              {d.news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" className="lnk" style={{ display: 'block', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#dce8f0', lineHeight: 1.4, marginBottom: 5 }}>{n.headline}</div>
                  <div style={{ fontSize: 11.5, color: '#3a5566' }}>{n.source} · {new Date(n.datetime * 1000).toLocaleDateString()}</div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* FAQ */}
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>{d.symbol} Stock FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
          {faq.map(f => (
            <div key={f.q} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px 18px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{f.q}</h3>
              <p style={{ fontSize: 13.5, color: '#8aa0b2', lineHeight: 1.7 }}>{f.a}</p>
            </div>
          ))}
        </div>

        {/* Secondary CTA */}
        <div style={{ textAlign: 'center', padding: '32px 24px', borderRadius: 16, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 10 }}>Get the full AI breakdown on {d.symbol}</h2>
          <p style={{ fontSize: 14, color: '#6a8497', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.6 }}>3 free analyses, no card required. See exactly why the AI rates {d.symbol} the way it does.</p>
          <Link href={`/ai-stocks?ticker=${d.symbol}`} style={{ display: 'inline-block', background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '15px 34px', borderRadius: 12, fontSize: 15, fontWeight: 900, textDecoration: 'none' }}>Analyze {d.symbol} free →</Link>
        </div>

        {/* Internal links — crawl depth + related tickers */}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#6a8497', marginBottom: 14 }}>Explore other stocks</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTOR_TICKERS.filter(t => t !== d.symbol).map(t => (
            <Link key={t} href={`/stock/${t}`} className="lnk" style={{ fontSize: 12.5, fontWeight: 700, color: '#8aa0b2', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 13px', textDecoration: 'none' }}>{t}</Link>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#2a4050', marginTop: 40, lineHeight: 1.6 }}>
          Data via Finnhub, refreshed hourly. Not financial advice — for educational purposes only. Past performance does not guarantee future results. Always do your own research before trading {d.symbol}.
        </p>
      </div>
    </div>
  )
}
