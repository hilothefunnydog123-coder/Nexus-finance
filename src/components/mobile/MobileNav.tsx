'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Cpu, Search, LineChart, Menu as MenuIcon, X, ArrowRight, Mic } from 'lucide-react'

// Routes that are full-screen immersive experiences — no bottom bar there.
const HIDE_ON = ['/galaxy', '/storm', '/the-open', '/brain/live', '/the-mind']

const SECTIONS: { title: string; items: [string, string, string][] }[] = [
  { title: 'Core', items: [['📈', 'BrainStock', '/brainstock'], ['⚡', 'Algorithms', '/algorithms'], ['🔍', 'AI Analyzer', '/ai-stocks'], ['⚔️', 'War Room', '/war-room'], ['🍴', 'Fork the Brain', '/fork'], ['🎙️', 'Voice copilot', '/copilot'], ['🎓', 'Courses', '/courses']] },
  { title: 'The proof', items: [['✅', 'Proof', '/proof'], ['📊', 'Performance', '/performance'], ['📐', 'Methodology', '/methodology'], ['💰', 'The Fund', '/fund'], ['⏮️', 'Time Machine', '/time-machine']] },
  { title: 'Spectacle', items: [['🎬', 'The Open', '/the-open'], ['🌌', 'Market Galaxy', '/galaxy'], ['🌩️', 'Conviction Storm', '/storm'], ['🧠', 'Enter the Net', '/brain/live'], ['🧬', 'The Mind', '/the-mind']] },
  { title: 'More', items: [['💎', 'Pricing', '/pricing'], ['📰', 'Daily Brief', '/daily'], ['🛰️', 'Intelligence', '/intelligence'], ['🤖', 'Copilot for TradingView', '/copilot/desktop']] },
]
const CHIPS = ['NVDA', 'TSLA', 'SPY', 'AAPL', 'QQQ', 'BTC']

export default function MobileNav() {
  const path = usePathname() || '/'
  const router = useRouter()
  const [sheet, setSheet] = useState<null | 'ask' | 'menu'>(null)
  const [tkr, setTkr] = useState('')

  const open = sheet !== null
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(null) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [open])
  useEffect(() => { setSheet(null) }, [path])

  if (HIDE_ON.some((p) => path.startsWith(p))) return null

  const go = (sym: string) => { const s = sym.trim().toUpperCase().replace(/[^A-Z0-9.]/g, ''); if (s) router.push(`/stock/${s}`) }
  const active = (href: string) => href === '/' ? path === '/' : path.startsWith(href)
  const TAB = (href: string, Icon: typeof Home, label: string) => (
    <Link href={href} className="yn-tab" aria-current={active(href) ? 'page' : undefined} data-active={active(href)}>
      <Icon size={21} strokeWidth={active(href) ? 2.6 : 2} />
      <span>{label}</span>
    </Link>
  )

  return (
    <>
      <style>{`
        .yn-mnav, .yn-msheet-wrap { display: none }
        @media (max-width: 819px) {
          .yn-mnav { display: grid }
          .yn-msheet-wrap { display: block }
          body { padding-bottom: calc(58px + env(safe-area-inset-bottom)) }
        }
        .yn-mnav{ position:fixed; left:0; right:0; bottom:0; z-index:2147480000;
          grid-template-columns:repeat(5,1fr); align-items:end;
          height:calc(58px + env(safe-area-inset-bottom)); padding-bottom:env(safe-area-inset-bottom);
          background:rgba(8,9,14,.82); backdrop-filter:blur(18px) saturate(1.4); -webkit-backdrop-filter:blur(18px) saturate(1.4);
          border-top:1px solid rgba(255,255,255,.09); font-family:Inter,system-ui,sans-serif }
        .yn-tab{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:58px;
          text-decoration:none; color:#7c879c; font-size:10px; font-weight:600; -webkit-tap-highlight-color:transparent; transition:color .2s }
        .yn-tab[data-active="true"]{ color:#10d693 }
        .yn-tab:active{ transform:scale(.92) }
        .yn-ask{ position:relative }
        .yn-askbtn{ position:absolute; top:-22px; left:50%; transform:translateX(-50%); width:54px; height:54px; border-radius:50%;
          border:none; cursor:pointer; display:grid; place-items:center; color:#04140c;
          background:linear-gradient(135deg,#10d693,#5b8cff); box-shadow:0 8px 24px rgba(16,214,147,.5), 0 0 0 5px rgba(8,9,14,.82);
          -webkit-tap-highlight-color:transparent; transition:transform .2s }
        .yn-askbtn:active{ transform:translateX(-50%) scale(.9) }
        .yn-ask span{ margin-top:30px; font-size:10px; font-weight:600; color:#7c879c }
        /* sheet */
        .yn-back{ position:fixed; inset:0; z-index:2147480001; background:rgba(2,4,8,.6); backdrop-filter:blur(4px); opacity:0; transition:opacity .25s }
        .yn-back.show{ opacity:1 }
        .yn-sheet{ position:fixed; left:0; right:0; bottom:0; z-index:2147480002; max-height:86vh; overflow:auto;
          background:linear-gradient(180deg,#0c1018,#070910); border-top:1px solid rgba(255,255,255,.1);
          border-radius:22px 22px 0 0; padding:10px 18px calc(26px + env(safe-area-inset-bottom));
          transform:translateY(110%); transition:transform .34s cubic-bezier(.16,1,.3,1); font-family:Inter,system-ui,sans-serif; color:#eaf2ff }
        .yn-sheet.show{ transform:translateY(0) }
        .yn-grab{ width:38px; height:4px; border-radius:99px; background:rgba(255,255,255,.2); margin:6px auto 14px }
        .yn-sheet h3{ font-size:11px; letter-spacing:.16em; color:#6b7a93; font-weight:700; margin:18px 4px 10px; font-family:ui-monospace,monospace }
        .yn-srch{ display:flex; gap:8px; align-items:center; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:13px 14px }
        .yn-srch input{ flex:1; background:none; border:none; outline:none; color:#fff; font-size:16px }
        .yn-srch button{ border:none; border-radius:10px; background:linear-gradient(135deg,#10d693,#5b8cff); color:#04140c; font-weight:800; padding:8px 14px; cursor:pointer; display:flex; align-items:center; gap:5px }
        .yn-chips{ display:flex; gap:8px; flex-wrap:wrap; margin-top:12px }
        .yn-chip{ font-family:ui-monospace,monospace; font-size:13px; font-weight:700; color:#cdd6ff; background:rgba(31,59,255,.12); border:1px solid rgba(31,59,255,.28); border-radius:10px; padding:8px 12px; cursor:pointer }
        .yn-quick{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:14px }
        .yn-qa{ display:flex; flex-direction:column; gap:6px; align-items:center; text-align:center; text-decoration:none; color:#dfe8ff; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:14px 8px; font-size:11.5px; font-weight:600 }
        .yn-link{ display:flex; align-items:center; gap:12px; text-decoration:none; color:#dfe8ff; padding:13px 12px; border-radius:13px; font-size:15px; font-weight:600 }
        .yn-link:active{ background:rgba(255,255,255,.06) }
        .yn-link .em{ font-size:19px; width:24px; text-align:center }
        .yn-link[data-active="true"]{ background:rgba(16,214,147,.1); color:#10d693 }
        .yn-close{ position:absolute; top:14px; right:16px; background:rgba(255,255,255,.06); border:none; color:#9aa6bd; width:32px; height:32px; border-radius:10px; display:grid; place-items:center }
        @media (prefers-reduced-motion: reduce){ .yn-sheet,.yn-back{ transition:none } }
      `}</style>

      <nav className="yn-mnav" role="navigation" aria-label="Primary mobile">
        {TAB('/', Home, 'Home')}
        {TAB('/brainstock', Cpu, 'Brain')}
        <div className="yn-ask">
          <button className="yn-askbtn" aria-label="Quick access" aria-expanded={sheet === 'ask'} onClick={() => setSheet(sheet === 'ask' ? null : 'ask')}><Search size={23} strokeWidth={2.6} /></button>
          <span style={{ display: 'block', textAlign: 'center' }}>Ask</span>
        </div>
        {TAB('/algorithms', LineChart, 'Algos')}
        <button className="yn-tab" aria-label="Menu" aria-expanded={sheet === 'menu'} data-active={sheet === 'menu'} onClick={() => setSheet(sheet === 'menu' ? null : 'menu')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <MenuIcon size={21} strokeWidth={2} /><span>Menu</span>
        </button>
      </nav>

      {/* backdrop + sheets */}
      <div className="yn-msheet-wrap">
        <div className={`yn-back${open ? ' show' : ''}`} style={{ pointerEvents: open ? 'auto' : 'none' }} onClick={() => setSheet(null)} aria-hidden />

        {/* ASK sheet */}
        <div className={`yn-sheet${sheet === 'ask' ? ' show' : ''}`} role="dialog" aria-modal="true" aria-label="Quick access" style={{ visibility: sheet === 'ask' ? 'visible' : 'hidden' }}>
          <div className="yn-grab" />
          <h3 style={{ marginTop: 4 }}>JUMP TO A TICKER</h3>
          <div className="yn-srch">
            <Search size={18} color="#6b7a93" />
            <input value={tkr} onChange={(e) => setTkr(e.target.value)} placeholder="Search a symbol…" inputMode="text" autoCapitalize="characters" onKeyDown={(e) => { if (e.key === 'Enter') go(tkr) }} />
            <button onClick={() => go(tkr)}>Go <ArrowRight size={15} /></button>
          </div>
          <div className="yn-chips">{CHIPS.map((c) => <button key={c} className="yn-chip" onClick={() => go(c)}>{c}</button>)}</div>
          <h3>OR START HERE</h3>
          <div className="yn-quick">
            <Link href="/brainstock" className="yn-qa"><span style={{ fontSize: 22 }}>📈</span>Today’s calls</Link>
            <Link href="/ai-stocks" className="yn-qa"><span style={{ fontSize: 22 }}>🔍</span>Analyze a stock</Link>
            <Link href="/algorithms" className="yn-qa"><span style={{ fontSize: 22 }}>⚡</span>Algorithms</Link>
            <Link href="/copilot" className="yn-qa"><Mic size={20} />Talk to it</Link>
            <Link href="/proof" className="yn-qa"><span style={{ fontSize: 22 }}>✅</span>The proof</Link>
            <Link href="/pricing" className="yn-qa"><span style={{ fontSize: 22 }}>💎</span>Go Pro</Link>
          </div>
        </div>

        {/* MENU sheet */}
        <div className={`yn-sheet${sheet === 'menu' ? ' show' : ''}`} role="dialog" aria-modal="true" aria-label="All products" style={{ visibility: sheet === 'menu' ? 'visible' : 'hidden' }}>
          <button className="yn-close" aria-label="Close" onClick={() => setSheet(null)}><X size={17} /></button>
          <div className="yn-grab" />
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <h3>{sec.title.toUpperCase()}</h3>
              {sec.items.map(([em, label, href]) => (
                <Link key={href} href={href} className="yn-link" data-active={active(href)}>
                  <span className="em">{em}</span>{label}
                </Link>
              ))}
            </div>
          ))}
          <div style={{ height: 8 }} />
        </div>
      </div>
    </>
  )
}
