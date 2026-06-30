import Link from 'next/link'

// One consistent, content-rich footer across the marketing site — a major cohesion/trust signal.
const COLS: [string, [string, string][]][] = [
  ['Product', [['YN Edge', '/edge'], ['The Arena', '/arena'], ['AI Stock Analyzer', '/ai-stocks'], ['Stock Forecasts', '/stock'], ['Compare Stocks', '/compare'], ['Courses', '/courses'], ['Algorithms', '/algorithms'], ['AI Track Record', '/performance'], ['Intelligence Suite', '/intelligence'], ['Agent Network', '/agents']]],
  ['Company', [['About', '/company'], ['Affiliate Program', '/affiliates'], ['Careers', '/careers'], ['Press', '/press'], ['Investors', '/investors']]],
  ['Resources', [['How the AI Works', '/methodology'], ['Research', '/research'], ['Embed Widget', '/embed'], ['Developer API', '/developers'], ['Privacy', '/privacy'], ['Terms', '/terms']]],
]

export default function SiteFooter() {
  return (
    <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.07)', background: 'rgba(3,6,12,.85)', backdropFilter: 'blur(10px)', fontFamily: '"Inter",system-ui,sans-serif' }}>
      <style>{`.ft-lnk{color:#5d748a;text-decoration:none;font-size:13px;font-weight:600;transition:color .18s}.ft-lnk:hover{color:#cfe0ec}@media(max-width:760px){.ft-grid{grid-template-columns:1fr 1fr!important;gap:28px!important}}@media(max-width:460px){.ft-grid{grid-template-columns:1fr!important}}`}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '56px clamp(20px,4vw,40px) 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 32, marginBottom: 44 }} className="ft-grid">
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: '#06121f', boxShadow: '0 0 18px rgba(0,212,170,.35)' }}>YN</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#eaf4fa' }}>YN Finance</span>
            </Link>
            <p style={{ fontSize: 13, color: '#46596b', lineHeight: 1.7, maxWidth: 280, marginBottom: 18 }}>
              The AI research desk that closes the gap between you and Wall Street. Analyze, learn, automate.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 600, color: '#00d4aa', background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 100, padding: '6px 13px', width: 'fit-content' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 8px #00d4aa' }} />
              Live market data · operational
            </div>
          </div>
          {/* Link columns */}
          {COLS.map(([title, links]) => (
            <div key={title}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', color: '#5a7488', marginBottom: 16 }}>{title.toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {links.map(([l, h]) => <Link key={h} href={h} className="ft-lnk">{l}</Link>)}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11.5, color: '#3a4a5a', lineHeight: 1.7, marginBottom: 22, maxWidth: 820 }}>
          YN Finance provides educational tools, market data and AI-generated research for informational purposes only. Nothing here is financial, investment or trading advice, and we are not a broker-dealer or registered advisor. Markets carry risk; you are responsible for your own decisions. Past performance does not guarantee future results.
        </p>

        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#344656' }}>© {new Date().getFullYear()} YN Finance · ynfinance.org</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 12, color: '#344656' }}>Built by Neil Gilani &amp; Yannai Richter</span>
            <a href="https://twitter.com/ynfinance" target="_blank" rel="noreferrer" className="ft-lnk" aria-label="YN Finance on X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" /></svg>
            </a>
            <a href="mailto:support@ynfinance.org" className="ft-lnk">support@ynfinance.org</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
