'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

type KeyResult   = { key: string; prefix: string; tier: string; limit: number }
type UsageResult = { key_prefix: string; tier: string; name: string; calls_month: number; limit_month: number; calls_total: number; created_at: string; last_used_at: string | null }

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      style={{ background: done ? 'rgba(0,212,170,.2)' : 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.3)', color: '#00d4aa', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0, transition: 'all .2s' }}>
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, (used / total) * 100)
  const clr = pct > 80 ? '#ff2d78' : pct > 55 ? '#f59e0b' : '#00d4aa'
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
        <span style={{ color: '#4a6a78' }}>Calls this month</span>
        <span style={{ color: clr, fontFamily: 'monospace', fontWeight: 700 }}>{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: clr, borderRadius: 2, transition: 'width 1s ease', boxShadow: `0 0 8px ${clr}55` }}/>
      </div>
    </div>
  )
}

const CODE: Record<string, string> = {
  curl: `curl -X GET "https://ynfinance.org/api/v1/congress/trades?limit=10" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY_HERE"`,

  javascript: `const res = await fetch(
  'https://ynfinance.org/api/v1/congress/trades?limit=10',
  { headers: { 'Authorization': 'Bearer yn_live_YOUR_KEY_HERE' } }
)
const { trades } = await res.json()
console.log(trades)`,

  python: `import requests

data = requests.get(
  'https://ynfinance.org/api/v1/congress/trades',
  params={'limit': 10},
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY_HERE'}
).json()
print(data['trades'])`,
}

export default function DevelopersPage() {
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [tab, setTab] = useState<'curl'|'javascript'|'python'>('curl')

  // Free tier
  const [fEmail, setFEmail] = useState('')
  const [fName,  setFName]  = useState('')
  const [fBusy,  setFBusy]  = useState(false)
  const [fKey,   setFKey]   = useState<KeyResult | null>(null)
  const [fErr,   setFErr]   = useState('')

  // Pro upgrade
  const [pPrefix, setPPrefix] = useState('')
  const [pEmail,  setPEmail]  = useState('')
  const [pBusy,   setPBusy]   = useState(false)
  const [pErr,    setPErr]    = useState('')

  // Usage checker
  const [uInput,  setUInput]  = useState('')
  const [uBusy,   setUBusy]   = useState(false)
  const [uResult, setUResult] = useState<UsageResult | null>(null)
  const [uErr,    setUErr]    = useState('')
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('upgraded') === 'true') {
      setUpgraded(true)
      const prefix = p.get('prefix') ?? ''
      if (prefix) { setUInput(prefix); setTimeout(() => runUsage(prefix), 600) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let ax = -100, ay = -100, tx = -100, ty = -100, raf: number
    const m = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    const l = () => { ax += (tx-ax)*.1; ay += (ty-ay)*.1; setCursorX(ax); setCursorY(ay); raf = requestAnimationFrame(l) }
    window.addEventListener('mousemove', m); raf = requestAnimationFrame(l)
    return () => { window.removeEventListener('mousemove', m); cancelAnimationFrame(raf) }
  }, [])

  async function genFree(e: React.FormEvent) {
    e.preventDefault(); setFErr(''); setFKey(null)
    if (!fEmail.trim()) { setFErr('Email required'); return }
    setFBusy(true)
    try {
      const r = await fetch('/api/v1/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: fEmail.trim().toLowerCase(), name: fName.trim() || 'My App' }) })
      const d = await r.json()
      if (!r.ok) { setFErr(d.error ?? 'Failed'); return }
      setFKey({ key: d.key, prefix: d.prefix, tier: d.tier, limit: d.limit })
    } catch { setFErr('Network error') }
    finally { setFBusy(false) }
  }

  async function upgradePro(e: React.FormEvent) {
    e.preventDefault(); setPErr('')
    if (!pPrefix.trim()) { setPErr('Enter your API key prefix'); return }
    if (!pEmail.trim())  { setPErr('Billing email required'); return }
    setPBusy(true)
    try {
      const r = await fetch('/api/v1/keys/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_prefix: pPrefix.trim(), email: pEmail.trim().toLowerCase() }) })
      const d = await r.json()
      if (!r.ok) { setPErr(d.error ?? 'Upgrade failed'); return }
      if (d.checkout_url) window.location.href = d.checkout_url
    } catch { setPErr('Network error') }
    finally { setPBusy(false) }
  }

  async function runUsage(val = uInput) {
    setUErr(''); setUResult(null)
    if (!val.trim()) { setUErr('Enter your API key'); return }
    setUBusy(true)
    try {
      const r = await fetch('/api/v1/keys', { headers: { 'Authorization': `Bearer ${val.trim()}` } })
      const d = await r.json()
      if (!r.ok) { setUErr(d.error ?? 'Key not found'); return }
      setUResult(d)
    } catch { setUErr('Network error') }
    finally { setUBusy(false) }
  }

  const ENDPOINTS = [
    { method:'POST', path:'/api/v1/analyze',             clr:'#3b8eea', desc:'AI trade analysis — verdict, key levels, recommendation', req:'{ ticker, direction, entry, sl, tp }', res:'{ verdict, confidence, key_levels, recommendation }' },
    { method:'GET',  path:'/api/v1/congress/trades',     clr:'#ff2d78', desc:'Congressional trade disclosures with suspicion scores',  req:'?limit=20&days=30',                    res:'{ trades: [{ representative, ticker, type, suspicion_score }] }' },
    { method:'POST', path:'/api/v1/earnings/decode',     clr:'#f59e0b', desc:'Earnings forensics — management honesty score',          req:'{ symbol }',                           res:'{ truth_score, beat_rate, verdict }' },
    { method:'GET',  path:'/api/v1/smart-money/signals', clr:'#00d4aa', desc:'Insider purchases + unusual options activity',            req:'?type=all|insider|options',            res:'{ signals: [{ ticker, signal_type, signal_strength }] }' },
    { method:'POST', path:'/api/v1/intelligence/run',    clr:'#a855f7', desc:'Run any of the 6 YN Intelligence weapons',               req:'{ weapon, input }',                    res:'{ result: { ... } }' },
  ]

  return (
    <div style={{ background:'#030a10', color:'#dce8f0', fontFamily:'"Inter",system-ui,sans-serif', minHeight:'100vh', cursor:'none', overflowX:'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        input{background:rgba(0,0,0,.5)!important;border:1px solid rgba(255,255,255,.08)!important;color:#dce8f0!important;padding:.72rem 1rem!important;font-family:inherit!important;font-size:13.5px!important;border-radius:8px!important;outline:none!important;transition:border-color .2s,box-shadow .2s!important;width:100%!important}
        input:focus{border-color:rgba(59,142,234,.4)!important;box-shadow:0 0 18px rgba(59,142,234,.07)!important}
        input::placeholder{color:#1a3050!important}
        .nav-link{color:#4a6a78;text-decoration:none;font-size:13px;transition:color .2s}.nav-link:hover{color:#00d4aa}
        pre{white-space:pre-wrap;word-break:break-all;font-size:12.5px}
        ::selection{background:#3b8eea25}
        @media(max-width:900px){.pg3{grid-template-columns:1fr!important}.pg2{grid-template-columns:1fr!important}.hsm{display:none!important}}
      `}</style>

      <div style={{ position:'fixed', zIndex:9999, pointerEvents:'none', left:cursorX-5, top:cursorY-5, width:10, height:10, borderRadius:'50%', background:'#3b8eea', mixBlendMode:'difference' }}/>
      <div style={{ position:'fixed', zIndex:9998, pointerEvents:'none', left:cursorX-18, top:cursorY-18, width:36, height:36, borderRadius:'50%', border:'1px solid rgba(59,142,234,.4)', transition:'left .08s,top .08s' }}/>

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:58, display:'flex', alignItems:'center', padding:'0 28px', gap:24, background:'rgba(3,10,16,.9)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}><YNMark size={28}/><span style={{ fontWeight:900, fontSize:14, letterSpacing:'-.3px' }}>YN Finance</span></Link>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#3b8eea', fontWeight:700, letterSpacing:'.8px' }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'#3b8eea', animation:'pulse-dot 1.5s infinite', display:'inline-block' }}/>
          DEVELOPERS · API v1
        </div>
        <div style={{ display:'flex', gap:20, marginLeft:'auto' }}>
          {[['Company','/company'],['Research','/research'],['Platform','/app']].map(([l,h])=><Link key={l} href={h} className="nav-link">{l}</Link>)}
        </div>
      </nav>

      <div style={{ paddingTop:58, position:'relative', zIndex:1 }}>

        {/* HERO */}
        <div style={{ textAlign:'center', padding:'68px 24px 56px', maxWidth:700, margin:'0 auto', animation:'fadeUp .6s ease' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(59,142,234,.08)', border:'1px solid rgba(59,142,234,.2)', borderRadius:20, padding:'6px 18px', marginBottom:20, fontSize:10, color:'#3b8eea', fontWeight:700, letterSpacing:'1.5px' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#3b8eea', animation:'pulse-dot 1.5s infinite', display:'inline-block' }}/>
            YN FINANCE API · v1.0 · REST · JSON
          </div>
          <h1 style={{ fontSize:'clamp(34px,5.5vw,66px)', fontWeight:900, letterSpacing:'-3px', lineHeight:.93, marginBottom:18 }}>
            Build on the intelligence<br/>
            <span style={{ background:'linear-gradient(135deg,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Wall Street keeps private.</span>
          </h1>
          <p style={{ fontSize:16, color:'#3a5a6a', lineHeight:1.7 }}>Congressional trades. Smart money signals. Earnings forensics. AI analysis. Plug it into any app in minutes.</p>
        </div>

        {/* SUCCESS BANNER */}
        {upgraded && (
          <div style={{ maxWidth:700, margin:'0 auto 32px', padding:'0 24px', animation:'fadeUp .4s ease' }}>
            <div style={{ background:'rgba(59,142,234,.1)', border:'1px solid rgba(59,142,234,.3)', borderRadius:10, padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:18 }}>🎉</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#3b8eea' }}>You&apos;re now on Pro!</div>
                <div style={{ fontSize:12, color:'#2a4050', marginTop:2 }}>Your API key has been upgraded to 10,000 calls/month. Check your usage below.</div>
              </div>
            </div>
          </div>
        )}

        {/* PRICING — 3 cards */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 72px' }}>
          <div className="pg3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>

            {/* FREE */}
            <div style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(0,212,170,.16)', borderRadius:16, overflow:'hidden' }}>
              <div style={{ height:3, background:'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
              <div style={{ padding:'26px 24px' }}>
                <div style={{ fontSize:9, color:'#00d4aa', letterSpacing:'2px', fontFamily:'monospace', fontWeight:700, marginBottom:12 }}>FREE</div>
                <div style={{ fontSize:38, fontWeight:900, color:'#dce8f0', fontFamily:'monospace', letterSpacing:'-2px', marginBottom:4 }}>$0<span style={{ fontSize:15, color:'#2a4050', letterSpacing:0 }}>/mo</span></div>
                <div style={{ fontSize:12, color:'#2a4050', marginBottom:22 }}>100 calls · 5 endpoints · No card</div>

                {fKey ? (
                  <div style={{ animation:'fadeUp .3s ease' }}>
                    <div style={{ background:'rgba(0,212,170,.06)', border:'1px solid rgba(0,212,170,.18)', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
                      <div style={{ fontSize:9, color:'#00d4aa', fontFamily:'monospace', letterSpacing:'2px', fontWeight:700, marginBottom:10 }}>YOUR KEY — COPY NOW</div>
                      <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
                        <code style={{ flex:1, fontFamily:'monospace', fontSize:10, color:'#00d4aa', background:'rgba(0,0,0,.5)', padding:'8px 10px', borderRadius:6, wordBreak:'break-all', border:'1px solid rgba(0,212,170,.12)', lineHeight:1.5 }}>{fKey.key}</code>
                        <CopyBtn text={fKey.key}/>
                      </div>
                      <div style={{ fontSize:10, color:'#ff2d78', fontFamily:'monospace' }}>⚠ One-time display. Save it now.</div>
                    </div>
                    <div style={{ fontSize:11, color:'#2a4050', marginBottom:10 }}>Free tier · {fKey.limit} calls/month</div>
                    <button onClick={() => { setFKey(null); setFEmail(''); setFName('') }} style={{ fontSize:11, color:'#1a3040', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>Generate another →</button>
                  </div>
                ) : (
                  <form onSubmit={genFree} style={{ display:'flex', flexDirection:'column', gap:9 }}>
                    <input type="email" placeholder="your@email.com" value={fEmail} onChange={e => setFEmail(e.target.value)} required/>
                    <input type="text"  placeholder="App name (optional)" value={fName} onChange={e => setFName(e.target.value)} maxLength={64}/>
                    {fErr && <div style={{ color:'#ff2d78', fontSize:11, fontFamily:'monospace' }}>{fErr}</div>}
                    <button type="submit" disabled={fBusy} style={{ padding:'12px', background:'linear-gradient(135deg,#00d4aa,#1e90ff)', border:'none', borderRadius:8, color:'#030a10', fontWeight:900, fontSize:13, cursor:fBusy?'not-allowed':'pointer', fontFamily:'inherit', opacity:fBusy?.7:1, boxShadow:'0 0 22px rgba(0,212,170,.2)', marginTop:2 }}>
                      {fBusy ? 'Generating...' : 'Get Free Key →'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* PRO */}
            <div style={{ background:'rgba(4,10,18,.97)', border:'1px solid rgba(59,142,234,.28)', borderRadius:16, overflow:'hidden', position:'relative', boxShadow:'0 0 50px rgba(59,142,234,.06)' }}>
              <div style={{ height:3, background:'linear-gradient(90deg,#3b8eea,#a855f7)' }}/>
              <div style={{ position:'absolute', top:14, right:14, fontSize:'8px', color:'#3b8eea', background:'rgba(59,142,234,.1)', border:'1px solid rgba(59,142,234,.22)', borderRadius:10, padding:'3px 9px', fontWeight:800, letterSpacing:'1px' }}>MOST POPULAR</div>
              <div style={{ padding:'26px 24px' }}>
                <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2px', fontFamily:'monospace', fontWeight:700, marginBottom:12 }}>PRO</div>
                <div style={{ fontSize:38, fontWeight:900, color:'#dce8f0', fontFamily:'monospace', letterSpacing:'-2px', marginBottom:4 }}>$49<span style={{ fontSize:15, color:'#2a4050', letterSpacing:0 }}>/mo</span></div>
                <div style={{ fontSize:12, color:'#2a4050', marginBottom:22 }}>10,000 calls · All endpoints · Priority</div>

                <form onSubmit={upgradePro} style={{ display:'flex', flexDirection:'column', gap:9 }}>
                  <div style={{ fontSize:10, color:'#2a4050', fontFamily:'monospace', letterSpacing:'.5px', marginBottom:2 }}>YOUR EXISTING FREE KEY</div>
                  <input type="text"  placeholder="yn_live_xxxxxxxxxxxx" value={pPrefix} onChange={e => setPPrefix(e.target.value)} required/>
                  <input type="email" placeholder="billing@email.com"    value={pEmail}  onChange={e => setPEmail(e.target.value)}  required/>
                  {pErr && <div style={{ color:'#ff2d78', fontSize:11, fontFamily:'monospace' }}>{pErr}</div>}
                  <button type="submit" disabled={pBusy} style={{ padding:'12px', background:pBusy?'transparent':'linear-gradient(135deg,#3b8eea,#a855f7)', border:pBusy?'1px solid rgba(59,142,234,.3)':'none', borderRadius:8, color:pBusy?'#3b8eea':'#fff', fontWeight:900, fontSize:13, cursor:pBusy?'not-allowed':'pointer', fontFamily:'inherit', opacity:pBusy?.7:1, boxShadow:pBusy?'none':'0 0 24px rgba(59,142,234,.18)', marginTop:2 }}>
                    {pBusy ? 'Redirecting to Stripe...' : 'Upgrade — $49/mo →'}
                  </button>
                  <div style={{ fontSize:10, color:'#1a3040', textAlign:'center' }}>Stripe checkout · Cancel anytime</div>
                </form>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(168,85,247,.14)', borderRadius:16, overflow:'hidden' }}>
              <div style={{ height:3, background:'linear-gradient(90deg,#a855f7,#ec4899)' }}/>
              <div style={{ padding:'26px 24px' }}>
                <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'2px', fontFamily:'monospace', fontWeight:700, marginBottom:12 }}>ENTERPRISE</div>
                <div style={{ fontSize:38, fontWeight:900, color:'#dce8f0', fontFamily:'monospace', letterSpacing:'-2px', marginBottom:4 }}>Custom</div>
                <div style={{ fontSize:12, color:'#2a4050', marginBottom:22 }}>Unlimited · SLA · Dedicated support</div>
                {['Unlimited API calls','99.9% uptime SLA','Dedicated Slack channel','Custom rate limits','White-label options','Priority feature requests'].map(f => (
                  <div key={f} style={{ display:'flex', gap:8, fontSize:12, color:'#4a6a78', marginBottom:9 }}>
                    <span style={{ color:'#a855f7', flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
                <a href="mailto:api@ynfinance.org?subject=Enterprise API" style={{ display:'block', textAlign:'center', background:'rgba(168,85,247,.08)', border:'1px solid rgba(168,85,247,.25)', color:'#a855f7', padding:'12px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', marginTop:16, transition:'all .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(168,85,247,.16)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(168,85,247,.08)')}>
                  Contact Sales →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* USAGE CHECKER */}
        <div style={{ maxWidth:700, margin:'0 auto', padding:'0 24px 72px' }}>
          <div style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'26px' }}>
            <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>CHECK KEY USAGE</div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input type="text" placeholder="Enter your full API key (yn_live_...)" value={uInput} onChange={e => setUInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runUsage()} style={{ flex:1 }}/>
              <button onClick={() => runUsage()} disabled={uBusy}
                style={{ padding:'0 18px', background:'rgba(59,142,234,.1)', border:'1px solid rgba(59,142,234,.25)', color:'#3b8eea', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:12, whiteSpace:'nowrap', flexShrink:0, transition:'all .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(59,142,234,.2)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(59,142,234,.1)')}>
                {uBusy ? '...' : 'Check →'}
              </button>
            </div>
            {uErr && <div style={{ color:'#ff2d78', fontSize:11, fontFamily:'monospace', marginBottom:10 }}>{uErr}</div>}
            {uResult && (
              <div style={{ animation:'fadeUp .3s ease' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                  {[['TIER', uResult.tier.toUpperCase(), uResult.tier==='pro'?'#3b8eea':'#00d4aa'],['NAME', uResult.name,'#dce8f0'],['TOTAL CALLS', uResult.calls_total.toLocaleString(),'#a855f7']].map(([l,v,c]) => (
                    <div key={l} style={{ background:'rgba(0,0,0,.3)', border:'1px solid rgba(255,255,255,.05)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:8, color:'#1a3040', letterSpacing:'2px', marginBottom:5 }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:900, color:c, fontFamily:'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <UsageBar used={uResult.calls_month} total={uResult.limit_month}/>
                {uResult.tier === 'free' && (
                  <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(59,142,234,.05)', border:'1px solid rgba(59,142,234,.14)', borderRadius:8, fontSize:12, color:'#3b8eea' }}>
                    On Free (100 calls/month). Enter your key in the Pro card above to upgrade → $49/month, 10,000 calls.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ENDPOINTS */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 72px' }}>
          <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:22 }}>ENDPOINTS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {ENDPOINTS.map(ep => (
              <div key={ep.path} style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(255,255,255,.06)', borderRadius:11, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ fontSize:9, fontWeight:800, color:ep.clr, background:`${ep.clr}12`, border:`1px solid ${ep.clr}25`, borderRadius:4, padding:'3px 8px', fontFamily:'monospace', flexShrink:0 }}>{ep.method}</span>
                  <code style={{ fontSize:13, color:'#dce8f0', fontFamily:'monospace', fontWeight:600 }}>{ep.path}</code>
                  <span className="hsm" style={{ fontSize:11, color:'#2a4050', marginLeft:'auto' }}>{ep.desc}</span>
                </div>
                <div className="pg2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                  <div style={{ padding:'12px 20px', borderRight:'1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize:8, color:'#1a3040', letterSpacing:'2px', fontFamily:'monospace', marginBottom:6 }}>REQUEST</div>
                    <pre style={{ fontFamily:'monospace', fontSize:11, color:'#6a9aaa', lineHeight:1.5 }}>{ep.req}</pre>
                  </div>
                  <div style={{ padding:'12px 20px' }}>
                    <div style={{ fontSize:8, color:'#1a3040', letterSpacing:'2px', fontFamily:'monospace', marginBottom:6 }}>RESPONSE</div>
                    <pre style={{ fontFamily:'monospace', fontSize:11, color:'#00d4aa', lineHeight:1.5 }}>{ep.res}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CODE EXAMPLES */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px' }}>
          <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:18 }}>CODE EXAMPLES</div>
          <div style={{ background:'rgba(4,10,18,.95)', border:'1px solid rgba(255,255,255,.06)', borderRadius:13, overflow:'hidden' }}>
            <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.05)', background:'rgba(0,0,0,.2)' }}>
              {(['curl','javascript','python'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:'11px 20px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'monospace', fontSize:12, fontWeight:700, color:tab===t?'#3b8eea':'#2a4050', borderBottom:tab===t?'2px solid #3b8eea':'2px solid transparent', transition:'all .2s' }}>{t}</button>
              ))}
            </div>
            <pre style={{ padding:'22px', fontFamily:'monospace', lineHeight:1.8, color:'#c8d8e0', overflowX:'auto' }}>{CODE[tab]}</pre>
          </div>
        </div>

        {/* AUTH + RATE LIMITS */}
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="pg2">
          <div>
            <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>AUTHENTICATION</div>
            <div style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(255,255,255,.06)', borderRadius:11, padding:'20px' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#dce8f0', marginBottom:10 }}>Bearer Token</div>
              <pre style={{ fontFamily:'monospace', fontSize:11, color:'#00d4aa', background:'rgba(0,0,0,.4)', padding:'12px', borderRadius:7, border:'1px solid rgba(0,212,170,.1)', marginBottom:14 }}>{`Authorization: Bearer yn_live_xxxx`}</pre>
              <div style={{ fontSize:12, fontWeight:700, color:'#dce8f0', marginBottom:10 }}>Header Alternative</div>
              <pre style={{ fontFamily:'monospace', fontSize:11, color:'#00d4aa', background:'rgba(0,0,0,.4)', padding:'12px', borderRadius:7, border:'1px solid rgba(0,212,170,.1)' }}>{`x-api-key: yn_live_xxxx`}</pre>
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>RATE LIMITS</div>
            <div style={{ background:'rgba(4,10,18,.92)', border:'1px solid rgba(255,255,255,.06)', borderRadius:11, overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'10px 18px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                {['Tier','Monthly','Per min','Price'].map(h => <div key={h} style={{ fontSize:8, color:'#1a3040', letterSpacing:'2px', fontFamily:'monospace', fontWeight:700 }}>{h}</div>)}
              </div>
              {[['Free','100','10','$0'],['Pro','10,000','60','$49/mo'],['Enterprise','∞','300+','Custom']].map(([t,m,r,p]) => (
                <div key={t} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                  <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:t==='Pro'?'#3b8eea':t==='Enterprise'?'#a855f7':'#00d4aa' }}>{t}</div>
                  {[m,r,p].map(v => <div key={v} style={{ fontFamily:'monospace', fontSize:12, color:'#6a8a9a' }}>{v}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
