import Link from 'next/link'

// ── warm, consumer palette (deliberately the opposite of the trader site) ──
const INK = '#1c160f'
const SUB = '#6b6256'
const CREAM = '#fbf7f0'
const CARD = '#ffffff'
const GREEN = '#18925f'
const AMBER = '#f0892f'
const LINE = 'rgba(28,22,15,.08)'

const CATS = [
  { icon: '🏠', name: 'Mortgage rates', q: 'Lock today, or float?', live: true, href: '/everyone/lock', tone: GREEN },
  { icon: '⛽', name: 'Gas prices', q: 'Fill up now, or wait?', live: true, href: '/everyone/gas' },
  { icon: '✈️', name: 'Flights', q: 'Book now, or watch it?', live: true, href: '/everyone/flights' },
  { icon: '💡', name: 'Electricity plans', q: 'Lock a fixed rate, or not?', live: true, href: '/everyone/electricity' },
  { icon: '🚗', name: 'Used cars', q: 'Buy this month, or hold?', live: false },
  { icon: '🏡', name: 'Rent', q: 'Renew, or shop around?', live: false },
]

const STEPS = [
  { n: '1', t: 'Tell it your decision', d: 'A 30-second question — your loan, the rate you were quoted, when you need to close.' },
  { n: '2', t: 'The AI reads the market', d: 'The same forecasting engine behind our public stock track record reads the bond market’s trend and scores its conviction.' },
  { n: '3', t: 'Get the call — and the receipts', d: 'A plain-English verdict with a confidence and a backtested accuracy. No jargon, no horoscopes. We show our work.' },
]

export default function EveryoneLanding() {
  return (
    <div style={{ background: CREAM, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .ev-rise{animation:pop .7s cubic-bezier(.16,1,.3,1) both}
        .ev-cat{transition:transform .18s ease, box-shadow .18s ease}
        .ev-cat:hover{transform:translateY(-4px)}
        .ev-live:hover{box-shadow:0 18px 40px rgba(24,146,95,.22)}
        a{color:inherit}
      `}</style>

      {/* top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(251,247,240,.86)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 30, height: 30, background: INK, color: CREAM, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderRadius: 8 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>YN Finance</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: AMBER, background: 'rgba(240,137,47,.12)', border: '1px solid rgba(240,137,47,.3)', borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href="/everyone/lock" style={{ fontSize: 14, fontWeight: 700, color: CREAM, background: GREEN, padding: '9px 17px', borderRadius: 999, textDecoration: 'none' }}>Time my rate</Link>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>For traders →</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '64px 22px 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,.9fr)', gap: 44, alignItems: 'center' }} className="ev-herogrid">
          <div className="ev-rise">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: GREEN, background: 'rgba(24,146,95,.1)', border: '1px solid rgba(24,146,95,.25)', borderRadius: 999, padding: '6px 13px', marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN }} /> An AI that proves it — now for real life
            </div>
            <h1 style={{ fontSize: 'clamp(40px,6.5vw,68px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.02, margin: '0 0 20px' }}>
              Buy now,<br />or wait?
            </h1>
            <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: SUB, lineHeight: 1.6, maxWidth: 480, marginBottom: 30 }}>
              The same AI that grades its stock calls in public — pointed at the prices that actually keep you up at night.
              Mortgage rates, gas, cars, flights. Ask it when to pull the trigger, and it shows its track record.
            </p>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/everyone/lock" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 13, padding: '15px 28px', textDecoration: 'none', boxShadow: '0 12px 30px rgba(24,146,95,.3)' }}>🏠 Should I lock my mortgage rate? →</Link>
              <span style={{ fontSize: 13, color: SUB }}>Free · 30 seconds · no signup</span>
            </div>
          </div>

          {/* hero visual: a verdict card */}
          <div className="ev-rise" style={{ animationDelay: '.12s' }}>
            <div style={{ background: CARD, borderRadius: 22, border: `1px solid ${LINE}`, boxShadow: '0 30px 70px rgba(28,22,15,.12)', padding: 22, animation: 'floaty 6s ease-in-out infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: SUB }}>$420,000 · 30-yr · quoted 6.9%</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(24,146,95,.1)', borderRadius: 999, padding: '4px 10px' }}>● live read</span>
              </div>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 6 }}>The call</div>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.02em', color: GREEN, lineHeight: 1 }}>FLOAT</div>
              <div style={{ fontSize: 14.5, color: INK, marginTop: 8, fontWeight: 600 }}>Don’t lock yet — rates are easing.</div>
              <div style={{ height: 1, background: LINE, margin: '16px 0' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                {[['72%', 'confidence'], ['68%', 'backtested'], ['~$63', '/mo upside']].map(([v, l]) => (
                  <div key={l} style={{ flex: 1, textAlign: 'center', background: '#f7f3ec', borderRadius: 11, padding: '10px 4px' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: INK }}>{v}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: SUB, marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 13, lineHeight: 1.5 }}>Sample read. The live tool uses today’s bond market and shows its real backtested accuracy.</div>
            </div>
          </div>
        </div>
      </section>

      {/* category grid */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '34px 22px' }}>
        <h2 style={{ fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 900, letterSpacing: '-.02em', marginBottom: 8 }}>The prices it’s learning to call</h2>
        <p style={{ fontSize: 16, color: SUB, marginBottom: 26, maxWidth: 560 }}>Mortgage, gas, flights and electricity are live — each powered by the <b style={{ color: INK }}>same neural net</b>, now reading oil, gasoline, natural gas and bonds. Every call you run grades itself and trains it. More coming as its record on each builds.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {CATS.map((c) => {
            const inner = (
              <div className={`ev-cat${c.live ? ' ev-live' : ''}`} style={{ background: CARD, border: `1px solid ${c.live ? 'rgba(24,146,95,.4)' : LINE}`, borderRadius: 18, padding: 20, height: '100%', cursor: c.live ? 'pointer' : 'default', position: 'relative', opacity: c.live ? 1 : 0.92 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 14, color: SUB }}>{c.q}</div>
                <div style={{ marginTop: 14 }}>
                  {c.live
                    ? <span style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>● LIVE · get the call →</span>
                    : <span style={{ fontSize: 11.5, fontWeight: 700, color: SUB, background: '#f1ece3', borderRadius: 999, padding: '4px 10px' }}>coming soon</span>}
                </div>
              </div>
            )
            return c.live && c.href ? <Link key={c.name} href={c.href} style={{ textDecoration: 'none' }}>{inner}</Link> : <div key={c.name}>{inner}</div>
          })}
        </div>
      </section>

      {/* how it proves it */}
      <section style={{ background: '#fff', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '50px 22px' }}>
          <h2 style={{ fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 900, letterSpacing: '-.02em', marginBottom: 30 }}>How it works — and how it proves it</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 22 }}>
            {STEPS.map((s) => (
              <div key={s.n}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${AMBER},#ffb35c)`, color: '#3a2306', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 17, marginBottom: 13 }}>{s.n}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 7 }}>{s.t}</div>
                <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.6 }}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, background: '#f7f3ec', borderRadius: 16, padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26 }}>🧾</span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>Why you can trust a free AI telling you to wait</div>
              <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55, marginTop: 3 }}>The engine behind this is the same one that posts and grades stock forecasts in public — un-cherry-picked. Every call here is backtested, and we show the number. No black box.</div>
            </div>
            <Link href="/proof" style={{ fontSize: 13.5, fontWeight: 700, color: GREEN, textDecoration: 'none', whiteSpace: 'nowrap' }}>See the track record →</Link>
          </div>
        </div>
      </section>

      {/* big CTA */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 22px 30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,4.5vw,46px)', fontWeight: 900, letterSpacing: '-.03em', margin: '0 auto 14px', maxWidth: 640, lineHeight: 1.08 }}>Stop guessing on the biggest checks you’ll ever write.</h2>
        <p style={{ fontSize: 17, color: SUB, maxWidth: 520, margin: '0 auto 26px' }}>Start with the one that matters most. Ask the AI when to lock.</p>
        <Link href="/everyone/lock" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 14, padding: '17px 34px', textDecoration: 'none', boxShadow: '0 14px 34px rgba(24,146,95,.32)' }}>Time my mortgage rate →</Link>
      </section>

      {/* footer */}
      <footer style={{ borderTop: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ fontSize: 13, color: SUB }}>YN Finance · for everyone. Not financial advice — a forecast you can check.</span>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 700, color: INK, textDecoration: 'none' }}>← YN Finance for traders</Link>
        </div>
      </footer>

      <style>{`@media(max-width:760px){ .ev-herogrid{ grid-template-columns:1fr!important } }`}</style>
    </div>
  )
}
