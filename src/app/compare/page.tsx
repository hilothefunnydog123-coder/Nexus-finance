import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPARE_PAIRS } from '@/lib/stockSeo'
import SiteFooter from '@/components/SiteFooter'

export const revalidate = 86400
const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'Compare Stocks Head-to-Head — AI Verdicts | YN Finance',
  description: 'Compare any two stocks side by side — price, valuation, momentum and analyst consensus — then get a free AI rating on each. AAPL vs MSFT, NVDA vs AMD and more.',
  alternates: { canonical: `${BASE}/compare` },
}

export default function CompareIndex() {
  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.cm:hover{border-color:rgba(0,212,170,.5)!important;background:rgba(0,212,170,.06)!important}`}</style>
      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <Link href="/stock" style={{ fontSize: 13, color: '#6a8497', textDecoration: 'none', fontWeight: 600 }}>All Stocks</Link>
      </nav>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px clamp(16px,4vw,24px) 70px' }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 14 }}>Compare Stocks Head-to-Head</h1>
        <p style={{ fontSize: 16, color: '#6a8497', lineHeight: 1.7, maxWidth: 600, marginBottom: 36 }}>
          Two stocks, side by side — valuation, momentum and analyst consensus — with a free AI verdict on each. Pick a matchup.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {COMPARE_PAIRS.map(([a, b]) => (
            <Link key={`${a}${b}`} href={`/compare/${a.toLowerCase()}-vs-${b.toLowerCase()}`} className="cm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 800, fontFamily: '"SF Mono",ui-monospace,monospace', color: '#dce8f0', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '18px 12px', textDecoration: 'none', transition: 'all .15s' }}>
              {a} <span style={{ fontSize: 11, color: '#3a5566' }}>vs</span> {b}
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
