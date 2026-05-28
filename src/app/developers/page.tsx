'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

// ── Custom Cursor ──────────────────────────────────────────────────────────────
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse   = useRef({ x: -200, y: -200 })
  const ring    = useRef({ x: -200, y: -200 })

  useEffect(() => {
    const move = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    let raf: number
    const loop = () => {
      if (dotRef.current) dotRef.current.style.transform = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.current.x - 16}px,${ring.current.y - 16}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#00d4aa', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(0,212,170,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
    </>
  )
}

// ── Code Example Tabs ──────────────────────────────────────────────────────────
const CODE_EXAMPLES: Record<string, string> = {
  curl: `curl -X GET "https://api.ynfinance.org/v1/congress/trades?limit=20&days=30" \\
  -H "Authorization: Bearer yn_live_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`,

  javascript: `const response = await fetch(
  'https://api.ynfinance.org/v1/congress/trades?limit=20&days=30',
  {
    headers: {
      'Authorization': 'Bearer yn_live_xxxxxxxxxxxxxxxxxxxx',
      'Content-Type': 'application/json',
    },
  }
);

const data = await response.json();
console.log(data.trades); // Array of congressional trades`,

  python: `import requests

url = "https://api.ynfinance.org/v1/congress/trades"
headers = {
    "Authorization": "Bearer yn_live_xxxxxxxxxxxxxxxxxxxx",
    "Content-Type": "application/json",
}
params = {"limit": 20, "days": 30}

response = requests.get(url, headers=headers, params=params)
data = response.json()

for trade in data["trades"]:
    print(f"{trade['representative']}: {trade['ticker']} ({trade['type']})")`,
}

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/analyze',
    desc: 'AI trade analysis — verdict, confidence, sentiment score, key levels, and recommendation.',
    curl: `curl -X POST "https://api.ynfinance.org/v1/analyze" \\
  -H "Authorization: Bearer yn_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"ticker":"NVDA","direction":"long","entry":950,"sl":920,"tp":1020}'`,
    response: `{
  "verdict": "STRONG BUY",
  "confidence": 84,
  "sentiment_score": 72,
  "key_levels": {
    "support": 920,
    "resistance": 1020,
    "strong_resistance": 1080
  },
  "recommendation": "Setup shows strong confluence..."
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/congress/trades',
    desc: 'Live congressional stock trade disclosures with suspicion scoring and AI analysis.',
    curl: `curl "https://api.ynfinance.org/v1/congress/trades?limit=20&days=30" \\
  -H "Authorization: Bearer yn_live_xxxx"`,
    response: `{
  "trades": [
    {
      "ticker": "NVDA",
      "representative": "Nancy Pelosi",
      "type": "Purchase",
      "amount": "$1,000,001+",
      "suspicion_score": 91,
      "transaction_date": "2026-04-15"
    }
  ],
  "stats": {
    "total_this_year": 847,
    "most_active_rep": "Nancy Pelosi"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/earnings/decode',
    desc: 'Forensic earnings analysis — truth score, beat rate, management lie detection.',
    curl: `curl -X POST "https://api.ynfinance.org/v1/earnings/decode" \\
  -H "Authorization: Bearer yn_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"TSLA"}'`,
    response: `{
  "truth_score": 62,
  "beat_rate": 71,
  "verdict": "YELLOW_FLAGS",
  "analysis": "Management guidance diverges from..."
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/smart-money/signals',
    desc: 'Insider purchases, unusual options activity, and cross-asset correlation signals.',
    curl: `curl "https://api.ynfinance.org/v1/smart-money/signals?type=all" \\
  -H "Authorization: Bearer yn_live_xxxx"`,
    response: `{
  "signals": [
    {
      "type": "insider",
      "ticker": "META",
      "direction": "BUY",
      "conviction": "HIGH",
      "source": "Form 4"
    }
  ],
  "last_updated": "2026-05-19T14:32:00Z"
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/intelligence/run',
    desc: 'Run any YN Intelligence weapon: lockup expiration, lie detector, galaxy brain, filing x-ray.',
    curl: `curl -X POST "https://api.ynfinance.org/v1/intelligence/run" \\
  -H "Authorization: Bearer yn_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"weapon":"liedetector","input":"AAPL"}'`,
    response: `{
  "result": {
    "verdict": "BEARISH_HIDDEN",
    "confidence": 78,
    "divergence_score": 65,
    "the_trade": "Buy 3-month puts..."
  }
}`,
  },
]

const RATE_LIMITS = [
  { tier: 'Free',       rpm: '5',    monthly: '100',     endpoints: '3' },
  { tier: 'Pro',        rpm: '60',   monthly: '10,000',  endpoints: 'All' },
  { tier: 'Enterprise', rpm: '600',  monthly: 'Unlimited', endpoints: 'All' },
]

export default function DevelopersPage() {
  const [codeTab, setCodeTab] = useState<'curl' | 'javascript' | 'python'>('curl')
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(0)
  const docsRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ background:'#030a10', minHeight:'100vh', color:'#e8f4f8', fontFamily:'"Inter",system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#00d4aa40 }
        @media(max-width:768px) {
          .hero-title { font-size:36px !important }
          .hero-sub   { font-size:15px !important }
          .pricing-grid { flex-direction:column !important }
          .endpoint-row { flex-direction:column !important; gap:8px !important }
          .nav-links { display:none !important }
        }
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(3,10,16,.92)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,.06)',
        padding:'0 24px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.12)' }}/>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.18em', color:'#00d4aa', fontFamily:'monospace' }}>DEVELOPERS</span>
        </div>
        <div className="nav-links" style={{ display:'flex', alignItems:'center', gap:24 }}>
          {[
            { label:'Pricing',   href:'#pricing' },
            { label:'Endpoints', href:'#endpoints' },
            { label:'Auth',      href:'#auth' },
            { label:'Examples',  href:'#examples' },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize:13, color:'#6a90a8', textDecoration:'none', letterSpacing:'0.04em', transition:'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00d4aa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6a90a8')}>
              {l.label}
            </a>
          ))}
          <a href="mailto:api@ynfinance.org" style={{
            fontSize:13, fontWeight:700, color:'#030a10',
            background:'#00d4aa', borderRadius:8,
            padding:'7px 16px', textDecoration:'none', letterSpacing:'0.04em',
          }}>
            Get API Key →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding:'100px 24px 80px', maxWidth:960, margin:'0 auto', textAlign:'center', animation:'fadeUp .6s ease both' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.25)', borderRadius:20, padding:'4px 14px', marginBottom:28 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', animation:'pulse 2s infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.14em', color:'#00d4aa', fontFamily:'monospace' }}>REST API · V1 · LIVE</span>
        </div>
        <h1 className="hero-title" style={{
          fontSize:54, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em',
          background:'linear-gradient(135deg,#e8f4f8 0%,#00d4aa 45%,#1e90ff 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          marginBottom:24,
        }}>
          YN Finance API —<br />Institutional intelligence<br />for your platform.
        </h1>
        <p className="hero-sub" style={{ fontSize:17, color:'#7a9aaa', lineHeight:1.7, maxWidth:640, margin:'0 auto 40px' }}>
          Plug congressional tracking, smart money signals, earnings forensics, and AI stock analysis directly into your app. REST API, JSON responses, usage-based pricing.
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="mailto:api@ynfinance.org" style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10',
            fontWeight:800, fontSize:14, letterSpacing:'0.04em',
            padding:'12px 28px', borderRadius:10, textDecoration:'none',
            boxShadow:'0 0 30px rgba(0,212,170,.25)',
          }}>
            Get API Key →
          </a>
          <button onClick={() => docsRef.current?.scrollIntoView({ behavior:'smooth' })} style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(255,255,255,.06)', color:'#e8f4f8',
            fontWeight:700, fontSize:14, letterSpacing:'0.04em',
            padding:'12px 28px', borderRadius:10, cursor:'pointer',
            border:'1px solid rgba(255,255,255,.12)',
          }}>
            View Docs ↓
          </button>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#00d4aa', fontFamily:'monospace', marginBottom:14 }}>PRICING</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Simple, transparent pricing.</h2>
        </div>
        <div className="pricing-grid" style={{ display:'flex', gap:20, alignItems:'stretch' }}>
          {/* Free */}
          <div style={{
            flex:1, padding:'32px 28px',
            background:'rgba(255,255,255,.03)',
            border:'1px solid rgba(255,255,255,.08)',
            borderRadius:16,
            animation:'fadeUp .5s ease .1s both',
          }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', color:'#6a90a8', fontFamily:'monospace', marginBottom:16 }}>FREE</div>
            <div style={{ fontSize:40, fontWeight:900, color:'#e8f4f8', marginBottom:4 }}>$0</div>
            <div style={{ fontSize:13, color:'#6a90a8', marginBottom:28 }}>No credit card required</div>
            {['100 calls / month', '3 endpoints', 'JSON responses', 'No SLA'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#6a90a8', flexShrink:0 }}/>
                <span style={{ fontSize:14, color:'#a0b4bf' }}>{f}</span>
              </div>
            ))}
            <a href="mailto:api@ynfinance.org" style={{
              display:'block', textAlign:'center', marginTop:28,
              padding:'11px 0', borderRadius:8,
              border:'1px solid rgba(255,255,255,.14)', color:'#e8f4f8',
              fontSize:13, fontWeight:700, textDecoration:'none', letterSpacing:'0.06em',
            }}>
              Get Free Key
            </a>
          </div>

          {/* Pro */}
          <div style={{
            flex:1, padding:'32px 28px',
            background:'rgba(0,212,170,.06)',
            border:'1px solid rgba(0,212,170,.3)',
            borderRadius:16, position:'relative',
            animation:'fadeUp .5s ease .2s both',
            boxShadow:'0 0 40px rgba(0,212,170,.08)',
          }}>
            <div style={{
              position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
              background:'linear-gradient(135deg,#00d4aa,#1e90ff)',
              color:'#030a10', fontSize:10, fontWeight:800, letterSpacing:'0.16em',
              padding:'3px 12px', borderRadius:10,
            }}>
              MOST POPULAR
            </div>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', color:'#00d4aa', fontFamily:'monospace', marginBottom:16 }}>PRO</div>
            <div style={{ fontSize:40, fontWeight:900, color:'#e8f4f8', marginBottom:4 }}>$49<span style={{ fontSize:16, color:'#6a90a8', fontWeight:400 }}>/mo</span></div>
            <div style={{ fontSize:13, color:'#6a90a8', marginBottom:28 }}>Billed monthly, cancel anytime</div>
            {['10,000 calls / month', 'All endpoints', 'Priority response', 'Email support', '99.5% uptime SLA'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', flexShrink:0 }}/>
                <span style={{ fontSize:14, color:'#c8e4e8' }}>{f}</span>
              </div>
            ))}
            <a href="mailto:api@ynfinance.org" style={{
              display:'block', textAlign:'center', marginTop:28,
              padding:'11px 0', borderRadius:8,
              background:'linear-gradient(135deg,#00d4aa,#1e90ff)',
              color:'#030a10', fontSize:13, fontWeight:800, textDecoration:'none', letterSpacing:'0.06em',
            }}>
              Get Pro Key →
            </a>
          </div>

          {/* Enterprise */}
          <div style={{
            flex:1, padding:'32px 28px',
            background:'rgba(168,85,247,.05)',
            border:'1px solid rgba(168,85,247,.2)',
            borderRadius:16,
            animation:'fadeUp .5s ease .3s both',
          }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', color:'#a855f7', fontFamily:'monospace', marginBottom:16 }}>ENTERPRISE</div>
            <div style={{ fontSize:40, fontWeight:900, color:'#e8f4f8', marginBottom:4 }}>Custom</div>
            <div style={{ fontSize:13, color:'#6a90a8', marginBottom:28 }}>Tailored to your volume</div>
            {['Unlimited calls', 'All endpoints', 'Dedicated support', '99.9% uptime SLA', 'Custom data exports', 'White-label options'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#a855f7', flexShrink:0 }}/>
                <span style={{ fontSize:14, color:'#a0b4bf' }}>{f}</span>
              </div>
            ))}
            <a href="mailto:api@ynfinance.org" style={{
              display:'block', textAlign:'center', marginTop:28,
              padding:'11px 0', borderRadius:8,
              border:'1px solid rgba(168,85,247,.35)', color:'#a855f7',
              fontSize:13, fontWeight:700, textDecoration:'none', letterSpacing:'0.06em',
            }}>
              Contact Us →
            </a>
          </div>
        </div>
      </div>

      {/* ENDPOINTS */}
      <div id="endpoints" ref={docsRef} style={{ padding:'80px 24px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#1e90ff', fontFamily:'monospace', marginBottom:14 }}>API REFERENCE</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Endpoints</h2>
        </div>

        {ENDPOINTS.map((ep, i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,.025)',
            border:'1px solid rgba(255,255,255,.07)',
            borderRadius:14, marginBottom:12, overflow:'hidden',
            transition:'border-color .2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(30,144,255,.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
          >
            <button
              onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
              style={{
                width:'100%', padding:'20px 24px', background:'none', border:'none',
                cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:14,
              }}
            >
              <span style={{
                fontSize:11, fontWeight:800, letterSpacing:'0.1em', fontFamily:'monospace',
                color: ep.method === 'GET' ? '#00d4aa' : '#1e90ff',
                background: ep.method === 'GET' ? 'rgba(0,212,170,.12)' : 'rgba(30,144,255,.12)',
                border: `1px solid ${ep.method === 'GET' ? 'rgba(0,212,170,.3)' : 'rgba(30,144,255,.3)'}`,
                borderRadius:6, padding:'3px 8px', flexShrink:0,
              }}>
                {ep.method}
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:'#e8f4f8', fontFamily:'monospace', flex:1 }}>{ep.path}</span>
              <span style={{ fontSize:13, color:'#6a90a8', flex:2, textAlign:'left' }}>{ep.desc}</span>
              <span style={{ fontSize:16, color:'#6a90a8', flexShrink:0 }}>{expandedEndpoint === i ? '−' : '+'}</span>
            </button>

            {expandedEndpoint === i && (
              <div style={{ padding:'0 24px 24px', borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', color:'#6a90a8', fontFamily:'monospace', marginBottom:10 }}>EXAMPLE REQUEST</div>
                    <pre style={{
                      background:'rgba(0,0,0,.4)', borderRadius:10, padding:'16px 18px',
                      fontSize:12, color:'#00d4aa', fontFamily:'"JetBrains Mono",monospace',
                      overflow:'auto', lineHeight:1.6, border:'1px solid rgba(0,212,170,.15)',
                      whiteSpace:'pre-wrap', wordBreak:'break-all',
                    }}>
                      {ep.curl}
                    </pre>
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', color:'#6a90a8', fontFamily:'monospace', marginBottom:10 }}>EXAMPLE RESPONSE</div>
                    <pre style={{
                      background:'rgba(0,0,0,.4)', borderRadius:10, padding:'16px 18px',
                      fontSize:12, color:'#a0b4bf', fontFamily:'"JetBrains Mono",monospace',
                      overflow:'auto', lineHeight:1.6, border:'1px solid rgba(255,255,255,.08)',
                      whiteSpace:'pre-wrap', wordBreak:'break-all',
                    }}>
                      {ep.response}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AUTHENTICATION */}
      <div id="auth" style={{ padding:'0 24px 80px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#a855f7', fontFamily:'monospace', marginBottom:14 }}>SECURITY</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Authentication</h2>
        </div>
        <div style={{
          background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.08)',
          borderRadius:16, padding:'36px 40px',
        }}>
          <p style={{ fontSize:15, color:'#a0b4bf', lineHeight:1.7, marginBottom:24 }}>
            All API requests must include your API key in the <code style={{ color:'#00d4aa', background:'rgba(0,212,170,.1)', padding:'1px 6px', borderRadius:4, fontFamily:'monospace' }}>Authorization</code> header as a Bearer token.
          </p>
          <pre style={{
            background:'rgba(0,0,0,.5)', borderRadius:10, padding:'20px 24px',
            fontSize:13, color:'#00d4aa', fontFamily:'"JetBrains Mono",monospace',
            lineHeight:1.7, border:'1px solid rgba(0,212,170,.2)', marginBottom:24,
          }}>
{`Authorization: Bearer yn_live_xxxxxxxxxxxxxxxxxxxx`}
          </pre>
          <p style={{ fontSize:15, color:'#a0b4bf', lineHeight:1.7, marginBottom:12 }}>
            Alternatively, you can pass your key using the <code style={{ color:'#1e90ff', background:'rgba(30,144,255,.1)', padding:'1px 6px', borderRadius:4, fontFamily:'monospace' }}>x-api-key</code> header:
          </p>
          <pre style={{
            background:'rgba(0,0,0,.5)', borderRadius:10, padding:'20px 24px',
            fontSize:13, color:'#1e90ff', fontFamily:'"JetBrains Mono",monospace',
            lineHeight:1.7, border:'1px solid rgba(30,144,255,.2)',
          }}>
{`x-api-key: yn_live_xxxxxxxxxxxxxxxxxxxx`}
          </pre>
        </div>
      </div>

      {/* RATE LIMITS */}
      <div style={{ padding:'0 24px 80px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#00d4aa', fontFamily:'monospace', marginBottom:14 }}>LIMITS</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Rate Limits</h2>
        </div>
        <div style={{
          background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.08)',
          borderRadius:16, overflow:'hidden',
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', background:'rgba(255,255,255,.04)', padding:'14px 24px' }}>
            {['Tier', 'Calls / Minute', 'Calls / Month', 'Endpoints'].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#6a90a8', fontFamily:'monospace' }}>{h}</div>
            ))}
          </div>
          {RATE_LIMITS.map((row, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr',
              padding:'16px 24px',
              borderTop:'1px solid rgba(255,255,255,.06)',
            }}>
              <div style={{ fontSize:13, fontWeight:700, color: i === 0 ? '#6a90a8' : i === 1 ? '#00d4aa' : '#a855f7' }}>{row.tier}</div>
              <div style={{ fontSize:14, fontFamily:'monospace', color:'#e8f4f8' }}>{row.rpm}</div>
              <div style={{ fontSize:14, fontFamily:'monospace', color:'#e8f4f8' }}>{row.monthly}</div>
              <div style={{ fontSize:14, fontFamily:'monospace', color:'#e8f4f8' }}>{row.endpoints}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CODE EXAMPLES */}
      <div id="examples" style={{ padding:'0 24px 80px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#1e90ff', fontFamily:'monospace', marginBottom:14 }}>QUICK START</div>
          <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Code Examples</h2>
          <p style={{ fontSize:15, color:'#6a90a8', marginTop:14 }}>Fetching the latest congressional trades</p>
        </div>
        <div style={{
          background:'rgba(0,0,0,.4)', border:'1px solid rgba(255,255,255,.08)',
          borderRadius:16, overflow:'hidden',
        }}>
          {/* Tab bar */}
          <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
            {(['curl', 'javascript', 'python'] as const).map(tab => (
              <button key={tab} onClick={() => setCodeTab(tab)} style={{
                padding:'12px 22px', background:'none', border:'none', cursor:'pointer',
                fontSize:13, fontWeight:700, letterSpacing:'0.08em', fontFamily:'monospace',
                color: codeTab === tab ? '#00d4aa' : '#6a90a8',
                borderBottom: codeTab === tab ? '2px solid #00d4aa' : '2px solid transparent',
                transition:'all .15s',
              }}>
                {tab === 'javascript' ? 'JavaScript' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <pre style={{
            padding:'28px 28px', fontSize:13, lineHeight:1.7,
            color:'#c8e4e8', fontFamily:'"JetBrains Mono",monospace',
            overflow:'auto', whiteSpace:'pre-wrap',
          }}>
            {CODE_EXAMPLES[codeTab]}
          </pre>
        </div>
      </div>

      {/* GET STARTED CTA */}
      <div style={{ padding:'0 24px 120px', maxWidth:700, margin:'0 auto', textAlign:'center' }}>
        <div style={{
          background:'linear-gradient(135deg,rgba(0,212,170,.08),rgba(30,144,255,.06))',
          border:'1px solid rgba(0,212,170,.2)', borderRadius:20, padding:'60px 40px',
        }}>
          <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8', marginBottom:16 }}>
            Ready to build?
          </h2>
          <p style={{ fontSize:16, color:'#7a9aaa', lineHeight:1.7, marginBottom:36 }}>
            Email us to get your API key. Free tier available immediately — Pro and Enterprise keys issued within 24 hours.
          </p>
          <a href="mailto:api@ynfinance.org" style={{
            display:'inline-flex', alignItems:'center', gap:10,
            background:'linear-gradient(135deg,#00d4aa,#1e90ff)',
            color:'#030a10', fontWeight:800, fontSize:15, letterSpacing:'0.04em',
            padding:'14px 36px', borderRadius:12, textDecoration:'none',
            boxShadow:'0 0 40px rgba(0,212,170,.2)',
          }}>
            Email api@ynfinance.org →
          </a>
        </div>
      </div>
    </div>
  )
}
