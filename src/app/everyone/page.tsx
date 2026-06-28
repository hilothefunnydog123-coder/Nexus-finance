'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/* ════════════════════════════════════════════════════════════════════════
   YN FOR EVERYONE — "THE WIRE"
   A live AI intelligence desk for normal-people money decisions. One call to
   /api/everyone/snapshot gives every market's verdict + the net's real
   reasoning + the actual news articles it read + what changed this week.
   Dark, cinematic, editorial — nothing like a search result.
   ════════════════════════════════════════════════════════════════════════ */

const BG = '#08090c', PANEL = 'rgba(255,255,255,.035)', INK = '#f3f2ec', SUB = '#9499a6'
const LINE = 'rgba(255,255,255,.09)'
const NOW = '#ffb454', WAIT = '#3ddc97', NEU = '#6aa3ff'
const DISP = 'var(--font-display), Inter, system-ui, sans-serif'

const MARKETS: Record<string, { name: string; href: string; q: string }> = {
  mortgage: { name: 'Mortgage rates', href: '/everyone/lock', q: 'Lock, or float?' },
  gas: { name: 'Gas prices', href: '/everyone/gas', q: 'Fill up, or wait?' },
  flights: { name: 'Airfares', href: '/everyone/flights', q: 'Book, or hold?' },
  electricity: { name: 'Electricity', href: '/everyone/electricity', q: 'Fix, or float?' },
}

type Call = {
  category: string; emoji: string; noun: string; verdict: string
  stance: 'now' | 'wait' | 'neutral'; confidence: number; backtest: number
  direction: string; headline: string; drivers: string[]
  sources: { title: string; uri: string }[]; engine: string; grounded: boolean
  proxy: string; asOf: string; movePct: number; agreement: number; whatChanged: string
}

const sc = (s?: string) => (s === 'now' ? NOW : s === 'wait' ? WAIT : NEU)
const slabel = (s?: string) => (s === 'now' ? 'ACT NOW' : s === 'wait' ? 'HOLD' : 'STEADY')
function host(uri: string) {
  try { const h = new URL(uri).hostname.replace(/^www\./, ''); return /google|vertexai|gstatic/.test(h) ? 'source' : h } catch { return 'source' }
}

export default function TheWire() {
  const [board, setBoard] = useState<Call[] | null>(null)
  const [err, setErr] = useState(false)
  const [reduce, setReduce] = useState(false)
  const auraRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  useEffect(() => {
    let alive = true
    fetch('/api/everyone/snapshot')
      .then((r) => r.json())
      .then((j) => { if (alive) Array.isArray(j?.board) ? setBoard(j.board) : setErr(true) })
      .catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (reduce) return
    let raf = 0
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (auraRef.current) auraRef.current.style.transform = `translateY(${window.scrollY * 0.2}px)` }) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [reduce])

  // lead story = most actionable call (non-neutral, highest confidence)
  const lead = board ? ([...board].filter((c) => c.stance !== 'neutral' && c.engine !== 'unavailable').sort((a, b) => b.confidence - a.confidence)[0] || board[0]) : null
  // aggregated newswire — every article the net read, deduped
  const wire: { src: { title: string; uri: string }; cat: Call }[] = []
  if (board) { const seen = new Set<string>(); for (const c of board) for (const s of c.sources || []) { if (seen.has(s.uri)) continue; seen.add(s.uri); wire.push({ src: s, cat: c }) } }

  return (
    <div style={{ background: BG, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes wF{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes wA1{0%,100%{transform:translate(-6%,-4%) scale(1)}50%{transform:translate(16%,12%) scale(1.35)}}
        @keyframes wA2{0%,100%{transform:translate(10%,8%) scale(1.1)}50%{transform:translate(-14%,-10%) scale(1.4)}}
        @keyframes wPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 currentColor}50%{opacity:.55;box-shadow:0 0 0 5px transparent}}
        @keyframes wSheen{to{background-position:220% center}}
        @keyframes wMar{to{transform:translateX(-50%)}}
        @keyframes wShim{to{background-position:-200% 0}}
        @keyframes wDraw{from{stroke-dashoffset:var(--c)}}
        .w-blob{position:absolute;border-radius:50%;filter:blur(70px);will-change:transform;pointer-events:none;opacity:.5}
        .w-head{background:linear-gradient(100deg,#f3f2ec 18%,#ffb454 42%,#3ddc97 58%,#6aa3ff 72%,#f3f2ec 92%);background-size:240% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:wSheen 8s linear infinite}
        .w-card{position:relative;transition:transform .22s cubic-bezier(.16,1,.3,1),border-color .22s,box-shadow .22s;overflow:hidden}
        .w-card:hover{transform:translateY(-5px)}
        .w-art{transition:background .18s,border-color .18s,transform .18s}.w-art:hover{transform:translateX(3px)}
        .w-skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:wShim 1.3s linear infinite;border-radius:8px}
        .w-mar{display:flex;width:max-content;animation:wMar 30s linear infinite}.w-mar:hover{animation-play-state:paused}
        .w-mag{transition:transform .18s cubic-bezier(.16,1,.3,1)}
        a{color:inherit;text-decoration:none}
        @media(max-width:820px){.w-lead{grid-template-columns:1fr!important}.w-desk{grid-template-columns:1fr!important}.w-pipe{grid-template-columns:1fr!important}}
        @media (prefers-reduced-motion:reduce){*{animation:none!important}.w-mar{flex-wrap:wrap;width:auto}}
      `}</style>

      {/* ── header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,9,12,.72)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 22px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 30, height: 30, background: INK, color: BG, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderRadius: 8 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.01em' }}>The Wire</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: SUB, border: `1px solid ${LINE}`, borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/everyone/proof" style={{ fontSize: 13, fontWeight: 600, color: SUB }}>Track record</Link>
            <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: INK, border: `1px solid ${LINE}`, borderRadius: 999, padding: '7px 14px' }}>For traders →</Link>
          </div>
        </div>
      </header>

      {/* ── live verdict ticker ── */}
      <div style={{ borderBottom: `1px solid ${LINE}`, background: 'rgba(255,255,255,.02)', overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)' }}>
        <div className="w-mar" style={{ padding: '9px 0' }}>
          {[0, 1].map((dup) => (
            <div key={dup} style={{ display: 'flex', gap: 34, paddingLeft: 34, whiteSpace: 'nowrap' }}>
              {(board || Object.keys(MARKETS).map((k) => ({ category: k, emoji: '·', verdict: '…', confidence: 0, stance: 'neutral' } as Call))).map((c, i) => (
                <span key={i} style={{ display: 'inline-flex', gap: 9, alignItems: 'center', fontFamily: 'ui-monospace,monospace', fontSize: 12.5 }}>
                  <span style={{ color: SUB, letterSpacing: '.08em' }}>{(MARKETS[c.category]?.name || c.category).toUpperCase()}</span>
                  <b style={{ color: sc(c.stance) }}>{c.verdict}</b>
                  {c.confidence > 0 && <span style={{ color: SUB }}>{c.confidence}%</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO / lead story ── */}
      <section style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '56px 22px 30px' }}>
        <div ref={auraRef} aria-hidden style={{ position: 'absolute', inset: '-10% -10% 0', zIndex: 0, pointerEvents: 'none' }}>
          <span className="w-blob" style={{ width: '42vw', height: '42vw', left: '-6vw', top: '-4vw', background: '#ffb454', animation: 'wA1 22s ease-in-out infinite' }} />
          <span className="w-blob" style={{ width: '40vw', height: '40vw', right: '-6vw', top: '0', background: '#3ddc97', animation: 'wA2 26s ease-in-out infinite' }} />
          <span className="w-blob" style={{ width: '30vw', height: '30vw', left: '36vw', top: '14vw', background: '#6aa3ff', animation: 'wA1 30s ease-in-out infinite' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 11.5, fontWeight: 800, letterSpacing: '.18em', color: WAIT, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, color: WAIT, animation: 'wPulse 2s infinite' }} /> LIVE · THE NET IS READING THE MARKET
          </div>
          <h1 className="w-head" style={{ fontFamily: DISP, fontSize: 'clamp(40px,7.5vw,84px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 0.97, margin: '0 0 18px', maxWidth: 1000 }}>
            Should you spend it<br />this week — or wait?
          </h1>
          <p style={{ fontSize: 'clamp(16px,1.9vw,20px)', color: SUB, lineHeight: 1.6, maxWidth: 620, marginBottom: 34 }}>
            An AI that grades its calls in public, pointed at the prices that actually hit your wallet. It reads the markets, reads the news, and tells you when to pull the trigger — and <b style={{ color: INK }}>shows you exactly why.</b>
          </p>

          {/* lead story card */}
          <div className="w-lead" style={{ display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 18 }}>
            <div className="w-card" style={{ borderRadius: 22, border: `1px solid ${lead ? sc(lead.stance) + '44' : LINE}`, background: PANEL, padding: 26, boxShadow: lead ? `0 30px 80px ${sc(lead.stance)}18` : 'none', animation: reduce ? 'none' : 'wF 7s ease-in-out infinite' }}>
              {!board && !err ? <LeadSkeleton /> : lead && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: sc(lead.stance) }}>● TOP CALL TODAY</span>
                    <span style={{ fontSize: 26 }}>{lead.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: SUB }}>{MARKETS[lead.category]?.name || lead.noun}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(48px,8vw,76px)', fontWeight: 800, letterSpacing: '-.03em', color: sc(lead.stance), lineHeight: 0.9 }}>{lead.verdict}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sc(lead.stance), background: sc(lead.stance) + '1c', borderRadius: 999, padding: '5px 12px' }}>{slabel(lead.stance)} · {lead.confidence}% CONFIDENCE</span>
                  </div>
                  <p style={{ fontSize: 19, fontWeight: 600, color: INK, lineHeight: 1.4, margin: '16px 0 0' }}>{lead.headline}</p>
                  {lead.whatChanged && <p style={{ fontSize: 14.5, color: SUB, lineHeight: 1.55, marginTop: 12, paddingLeft: 13, borderLeft: `2px solid ${sc(lead.stance)}66` }}><b style={{ color: INK }}>What changed this week — </b>{lead.whatChanged}</p>}
                  {!!lead.sources?.length && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', color: SUB, marginBottom: 9 }}>WHAT IT READ</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {lead.sources.slice(0, 3).map((s, i) => <Article key={i} s={s} color={sc(lead.stance)} />)}
                      </div>
                    </div>
                  )}
                  <Link href={MARKETS[lead.category]?.href || '/everyone'} className="w-mag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, fontSize: 15, fontWeight: 800, color: BG, background: sc(lead.stance), borderRadius: 12, padding: '13px 22px' }}>Open the full breakdown →</Link>
                </>
              )}
              {err && <div style={{ color: SUB, fontSize: 15 }}>The desk is reconnecting to the market — refresh in a moment.</div>}
            </div>

            {/* decision pipeline — "more than you can search up" */}
            <div className="w-card" style={{ borderRadius: 22, border: `1px solid ${LINE}`, background: PANEL, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: SUB, marginBottom: 18 }}>HOW THE NET DECIDED</div>
              {!board && !err ? <div className="w-skel" style={{ height: 220 }} /> : lead && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <Pipe n="1" title="Forecast the market" color={NEU} body={<>Two markets that drive {lead.noun} were each run through the net and blended — pointing {lead.direction === 'rising' ? 'up' : lead.direction === 'easing' ? 'down' : 'sideways'} <b style={{ color: INK }}>{Math.abs(lead.movePct).toFixed(1)}%</b>.</>} />
                  <Pipe n="2" title="Score the conviction" color={WAIT} body={<><b style={{ color: INK }}>{lead.backtest}%</b> backtested accuracy · <b style={{ color: INK }}>{Math.round(lead.agreement * 100)}%</b> the two signals agree.</>} />
                  <Pipe n="3" title="Read this week's news" color={NOW} body={<>{lead.grounded ? <><b style={{ color: INK }}>{lead.sources.length}</b> live articles checked against the forecast.</> : <>Reasoned from the model’s knowledge (live news key not set).</>}</>} />
                  <Pipe n="4" title="Fuse into a verdict" color={sc(lead.stance)} last body={<>Net + news → <b style={{ color: sc(lead.stance) }}>{lead.verdict}</b> at <b style={{ color: INK }}>{lead.confidence}%</b>.</>} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── THE DESK — every market ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 22px' }}>
        <Reveal><SectionHead kicker="THE DESK" title="Every call the net is making right now" sub="Each verdict is the net’s forecast fused with this week’s real headlines — graded in public." /></Reveal>
        <div className="w-desk" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {(board || [0, 1, 2, 3]).map((c, i) => (
            <Reveal key={i} delay={i * 70}>
              {typeof c === 'number' || !board ? <DeskSkeleton /> : <DeskCard c={c as Call} />}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── ON THE WIRE — real news feed ── */}
      {wire.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 22px' }}>
          <Reveal><SectionHead kicker="ON THE WIRE" title="The news the net is reading" sub="Real, current articles pulled live and weighed against each forecast — not a static blog." /></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {wire.slice(0, 8).map(({ src, cat }, i) => (
              <Reveal key={i} delay={(i % 4) * 60}>
                <a href={src.uri} target="_blank" rel="noopener noreferrer" className="w-art" style={{ display: 'block', height: '100%', background: PANEL, border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, borderLeft: `3px solid ${sc(cat.stance)}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, fontSize: 11, color: SUB }}>
                    <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 700, color: sc(cat.stance) }}>{MARKETS[cat.category]?.name || cat.noun}</span>
                    <span>· {host(src.uri)}</span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: INK, lineHeight: 1.45 }}>{src.title}</div>
                  <div style={{ fontSize: 12, color: SUB, marginTop: 10 }}>open ↗</div>
                </a>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── trust ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 22px' }}>
        <Reveal>
          <div style={{ background: 'linear-gradient(120deg,rgba(61,220,151,.08),rgba(106,163,255,.06))', border: `1px solid ${LINE}`, borderRadius: 20, padding: '26px 26px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 34 }}>🧾</span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: DISP, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Why trust a free AI telling you to wait?</div>
              <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.6, marginTop: 5 }}>Every call is timestamped the moment it’s made and graded against what actually happens — the same engine that posts and grades our public stock forecasts. No black box, no cherry-picking.</div>
            </div>
            <Link href="/everyone/proof" style={{ fontSize: 14, fontWeight: 800, color: BG, background: INK, borderRadius: 12, padding: '13px 22px', whiteSpace: 'nowrap' }}>See the track record →</Link>
          </div>
        </Reveal>
      </section>

      {/* ── coming soon + CTA ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 22px 70px', textAlign: 'center' }}>
        <Reveal>
          <div style={{ fontSize: 12.5, color: SUB, marginBottom: 28 }}>
            Coming to the desk: <b style={{ color: INK }}>🚗 used cars</b> · <b style={{ color: INK }}>🏡 rent</b> · <b style={{ color: INK }}>💍 big purchases</b>
          </div>
          <h2 style={{ fontFamily: DISP, fontSize: 'clamp(28px,4.5vw,48px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 auto 22px', maxWidth: 640, lineHeight: 1.06 }}>Stop guessing on the biggest checks you’ll ever write.</h2>
          <Link href="/everyone/lock" className="w-mag" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: BG, background: `linear-gradient(135deg,${WAIT},#27b07b)`, borderRadius: 14, padding: '17px 34px', boxShadow: `0 16px 40px ${WAIT}33` }}>Time my mortgage rate →</Link>
        </Reveal>
      </section>

      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ fontSize: 12.5, color: SUB }}>YN Finance · The Wire. A forecast you can check — not financial advice.</span>
          <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: INK }}>← YN Finance for traders</Link>
        </div>
      </footer>
    </div>
  )
}

/* ── pieces ── */
function DeskCard({ c }: { c: Call }) {
  const col = sc(c.stance)
  const why = (c.drivers || []).find((d) => !/neural-net ensemble|backtested|baseline/i.test(d)) || c.drivers?.[1] || c.drivers?.[0] || ''
  return (
    <Link href={MARKETS[c.category]?.href || '/everyone'} style={{ display: 'block', height: '100%' }}>
      <div className="w-card" style={{ height: '100%', borderRadius: 18, border: `1px solid ${col}33`, background: PANEL, padding: 20, boxShadow: `0 1px 0 ${col}22 inset` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{c.emoji}</span>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>{MARKETS[c.category]?.name || c.noun}</div>
              <div style={{ fontSize: 12, color: SUB }}>{MARKETS[c.category]?.q}</div>
            </div>
          </div>
          <Ring value={c.confidence} color={col} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: DISP, fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: col }}>{c.verdict}</span>
          {c.grounded && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: WAIT, border: `1px solid ${WAIT}44`, borderRadius: 999, padding: '2px 7px' }}>● LIVE NEWS</span>}
        </div>
        <p style={{ fontSize: 13.5, color: SUB, lineHeight: 1.5, marginTop: 10, minHeight: 40 }}>{why}</p>
        {!!c.sources?.length && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {c.sources.slice(0, 2).map((s, i) => (
              <span key={i} style={{ fontSize: 11, color: SUB, background: 'rgba(255,255,255,.05)', border: `1px solid ${LINE}`, borderRadius: 999, padding: '4px 9px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📰 {s.title}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 800, color: col }}>full breakdown →</div>
      </div>
    </Link>
  )
}

function Article({ s, color }: { s: { title: string; uri: string }; color: string }) {
  return (
    <a href={s.uri} target="_blank" rel="noopener noreferrer" className="w-art" style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`, borderRadius: 11, padding: '10px 12px' }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flex: 'none' }} />
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
      <span style={{ fontSize: 11, color: SUB, flex: 'none' }}>{host(s.uri)} ↗</span>
    </a>
  )
}

function Pipe({ n, title, body, color, last }: { n: string; title: string; body: React.ReactNode; color: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 13, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: color + '22', color, border: `1px solid ${color}55`, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13 }}>{n}</span>
        {!last && <span style={{ width: 1.5, flex: 1, background: `linear-gradient(${color}55,transparent)`, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  )
}

function Ring({ value, color }: { value: number; color: string }) {
  const size = 46, sw = 5, r = (size - sw) / 2, c = 2 * Math.PI * r
  const v = useCountUp(value)
  const off = c * (1 - Math.max(0, Math.min(100, v)) / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, color }}>{Math.round(v)}</div>
    </div>
  )
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, color: WAIT, animation: 'wPulse 2s infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: SUB }}>{kicker}</span>
      </div>
      <h2 style={{ fontFamily: DISP, fontSize: 'clamp(24px,3.4vw,36px)', fontWeight: 800, letterSpacing: '-.025em', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 14.5, color: SUB, marginTop: 8, maxWidth: 620, lineHeight: 1.55 }}>{sub}</p>
    </div>
  )
}

function LeadSkeleton() {
  return <div style={{ display: 'grid', gap: 14 }}><div className="w-skel" style={{ height: 18, width: 180 }} /><div className="w-skel" style={{ height: 64, width: '70%' }} /><div className="w-skel" style={{ height: 16, width: '90%' }} /><div className="w-skel" style={{ height: 44 }} /><div className="w-skel" style={{ height: 44 }} /></div>
}
function DeskSkeleton() {
  return <div style={{ borderRadius: 18, border: `1px solid ${LINE}`, background: PANEL, padding: 20 }}><div className="w-skel" style={{ height: 40, width: '60%', marginBottom: 14 }} /><div className="w-skel" style={{ height: 30, width: '40%', marginBottom: 12 }} /><div className="w-skel" style={{ height: 38 }} /></div>
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVis(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(20px)', transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}

function useCountUp(to: number, dur = 950) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / dur); setN(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [to, dur])
  return n
}
