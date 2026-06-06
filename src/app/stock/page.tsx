import type { Metadata } from 'next'
import Link from 'next/link'
import { POPULAR_TICKERS } from '@/lib/tickers'
import SiteFooter from '@/components/SiteFooter'

export const revalidate = 86400

const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'Stock Forecasts & AI Price Targets — Every Major Stock | YN Finance',
  description: 'Free AI stock analysis, price targets and analyst consensus for AAPL, NVDA, TSLA, MSFT and 70+ of the most-traded stocks. Pick a ticker and get an instant AI rating.',
  alternates: { canonical: `${BASE}/stock` },
}

export default function StockIndex() {
  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.lnk:hover{color:#00d4aa!important}.tk:hover{border-color:rgba(0,212,170,.5)!important;background:rgba(0,212,170,.06)!important}`}</style>

      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <Link href="/ai-stocks" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Open Analyzer →</Link>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(16px,4vw,24px) 80px' }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 14 }}>
          Stock Forecasts &amp; AI Price Targets
        </h1>
        <p style={{ fontSize: 16, color: '#6a8497', lineHeight: 1.7, maxWidth: 620, marginBottom: 36 }}>
          Free AI analysis on every major stock — rating, bull &amp; bear 12-month price targets, analyst consensus, key levels and an options play. Pick a ticker to get started.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
          {POPULAR_TICKERS.map(t => (
            <Link key={t} href={`/stock/${t}`} className="tk" style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, fontFamily: '"SF Mono",ui-monospace,monospace', color: '#dce8f0', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '16px 10px', textDecoration: 'none', transition: 'all .15s' }}>{t}</Link>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#2a4050', marginTop: 40, lineHeight: 1.6 }}>
          Not financial advice — educational purposes only. Data via Finnhub. Don&apos;t see your ticker? Search any symbol in the <Link href="/ai-stocks" className="lnk" style={{ color: '#6a8497', textDecoration: 'none' }}>AI Analyzer</Link>.
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}
