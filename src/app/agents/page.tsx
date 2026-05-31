'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'
import AdsterraBanner from '@/components/ads/AdsterraBanner'
import NativeAd from '@/components/ads/NativeAd'

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
      if (dotRef.current)  dotRef.current.style.transform  = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
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
      <div ref={dotRef}  style={{ position:'fixed',top:0,left:0,width:8,height:8,borderRadius:'50%',background:'#00d4aa',pointerEvents:'none',zIndex:9999,willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed',top:0,left:0,width:32,height:32,borderRadius:'50%',border:'1.5px solid rgba(0,212,170,.5)',pointerEvents:'none',zIndex:9998,willChange:'transform' }}/>
    </>
  )
}

// ── Network Canvas ─────────────────────────────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = canvas.width = canvas.offsetWidth, H = canvas.height = canvas.offsetHeight, raf: number, t = 0
    type Node = { x:number;y:number;vx:number;vy:number;color:string;size:number;pulse:number }
    const nodes: Node[] = Array.from({length:28},()=>({ x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,color:['#00d4aa','#1e90ff','#a855f7','#00d4aa'][Math.floor(Math.random()*4)],size:2+Math.random()*3,pulse:Math.random()*Math.PI*2 }))
    const resize = () => { W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight }
    window.addEventListener('resize',resize)
    const draw = () => {
      ctx.clearRect(0,0,W,H); t+=0.008
      nodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;n.pulse+=0.04;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1})
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<140){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=`rgba(0,212,170,${(1-d/140)*.18})`;ctx.lineWidth=1;ctx.stroke()}}
      nodes.forEach(n=>{const p=.7+Math.sin(n.pulse)*.3;ctx.beginPath();ctx.arc(n.x,n.y,n.size*p,0,Math.PI*2);ctx.fillStyle=n.color;ctx.globalAlpha=.7;ctx.shadowBlur=8;ctx.shadowColor=n.color;ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0})
      if(Math.floor(t*10)%40===0){const src=nodes[Math.floor(Math.random()*nodes.length)];ctx.beginPath();ctx.arc(src.x,src.y,16,0,Math.PI*2);ctx.strokeStyle='#00d4aa';ctx.lineWidth=1;ctx.globalAlpha=.4;ctx.stroke();ctx.globalAlpha=1}
      raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)}
  },[])
  return <canvas ref={canvasRef} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}/>
}

// ── Agent definitions ──────────────────────────────────────────────────────────
const AGENT_DEFS = [
  { key:'earnings',    name:'Earnings Agent',    icon:'🔍', color:'#00d4aa', monitors:'Earnings call transcripts + SEC filings' },
  { key:'congress',    name:'Congress Agent',    icon:'🏛',  color:'#1e90ff', monitors:'House & Senate financial disclosures' },
  { key:'insider',     name:'Insider Agent',     icon:'💰', color:'#a855f7', monitors:'Form 4 filings for insider transactions' },
  { key:'options',     name:'Options Agent',     icon:'⚡', color:'#f59e0b', monitors:'Unusual intraday volatility signatures' },
  { key:'momentum',    name:'Momentum Agent',    icon:'📈', color:'#00d4aa', monitors:'Pre-market gaps and volume anomalies' },
  { key:'macro',       name:'Macro Agent',       icon:'🌍', color:'#1e90ff', monitors:'Fed speeches, economic releases, FX flows' },
  { key:'sentiment',   name:'Sentiment Agent',   icon:'📰', color:'#00d4aa', monitors:'News sentiment across 200+ sources' },
  { key:'convergence', name:'Convergence Agent', icon:'🎯', color:'#ff2d78', monitors:'Multiple simultaneous signals → alert' },
  { key:'darkpool',    name:'Dark Pool Agent',   icon:'📊', color:'#a855f7', monitors:'Large block volume + off-exchange activity' },
]

// ── Types ──────────────────────────────────────────────────────────────────────
type RawData = Record<string, unknown>
type Signal = {
  id: string
  created_at: string
  agent_name: string
  ticker: string | null
  signal_text: string
  conviction: number
  source_url: string | null
  raw_data: RawData | null
}
type ConvergenceAlert = {
  id: string
  created_at: string
  ticker: string
  agent_count: number
  agents: string[]
  alert_text: string
}
type FeedItem = {
  id: string
  created_at: string
  agent: string
  agentKey: string
  ticker: string | null
  officialText: string
  plainText: string
  color: string
  conviction: number
  sourceUrl: string | null
  isConvergence: boolean
}

// ── Plain English translator ───────────────────────────────────────────────────
function toPlainEnglish(signal: Signal): string {
  const t   = signal.ticker ? `$${signal.ticker}` : 'this asset'
  const rd  = (signal.raw_data ?? {}) as RawData

  switch (signal.agent_name) {
    case 'congress': {
      const rep    = String(rd.representative ?? 'A member of Congress')
      const amount = String(rd.amount ?? 'a notable amount')
      return `${rep} just bought ${amount} of ${t} using their personal money. Members of Congress legally trade on information the public doesn't have access to. Historically, when a politician buys a stock — especially in large size — it often comes before favorable policy or government contracts. Add ${t} to your watchlist and look for a clean technical setup to enter.`
    }
    case 'insider': {
      const company = String(rd.company ?? signal.ticker ?? 'this company')
      return `Someone inside ${company} just filed paperwork with the SEC disclosing they moved company shares. Click "View source" to see if it was a BUY or a SELL. If it's a buy — executives rarely put their own money into their company's stock unless they believe it's going higher. Insider buying is one of the strongest signals of internal confidence money can show.`
    }
    case 'earnings': {
      const eps  = rd.epsEstimate != null ? ` Wall Street expects EPS of $${Number(rd.epsEstimate).toFixed(2)}.` : ''
      const when = rd.hour === 'bmo' ? 'before the market opens' : rd.hour === 'amc' ? 'after the market closes' : 'soon'
      return `${t} reports earnings ${when}.${eps} Stocks can swing 5–20% in minutes after an earnings release. If you hold ${t}: consider trimming your position before the report to reduce risk. If you're watching for a trade: do NOT enter right before — wait for the initial spike or drop to settle, then look for an entry on the second candle. The first reaction is almost always misleading.`
    }
    case 'macro': {
      const event = String(rd.event ?? 'A major economic event')
      const prev  = rd.prev != null ? ` Previous reading: ${rd.prev}${rd.unit ?? ''}.` : ''
      return `${event} is being released soon.${prev} This type of event moves the entire market — not just one stock. Bonds, stocks, the dollar, and gold all react instantly. Avoid opening new trades in the 30 minutes before and after the release. If you're already in positions, either tighten your stop losses or reduce your size temporarily. Once the dust settles (usually 15–30 minutes), look for the new trend direction.`
    }
    case 'sentiment': {
      const score = Number(rd.score ?? 0)
      const count = Number(rd.articleCount ?? 0)
      const bull  = score > 0
      const action = bull
        ? `This supports a long bias on ${t} — but always confirm with your chart before entering.`
        : `Be careful holding ${t} long right now. Negative news flow tends to drag prices lower over days, not hours. Tighten your stop or wait for sentiment to stabilize.`
      return `Based on ${count} recent news articles, the market narrative around ${t} is reading ${Math.abs(score)}% ${bull ? 'bullish' : 'bearish'}. ${action} Sentiment is a filter, not a signal on its own — use it to confirm what your chart is already telling you.`
    }
    case 'momentum': {
      const pct  = Number(rd.pct ?? 0)
      const bull = pct > 0
      const action = bull
        ? `Don't chase this move — entering now means buying at the top of a candle. Wait for a pullback to a support level (prior resistance, VWAP, or round number) before entering long. If you're already long, consider taking 30–50% profit here.`
        : `Don't try to catch a falling knife. Stocks in strong downtrends can keep falling further than logic suggests. Wait for a clear base to form with declining volume before looking for a bounce entry.`
      return `${t} is making a significant move today (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%). ${action} Strong momentum days create emotion — slow down and let the price action come to you.`
    }
    case 'options': {
      const range = Number(rd.rangeRatio ?? 0)
      return `${t} had a wide intraday range today (${range.toFixed(1)}% of its price) but barely moved net. This is what happens when big institutions are hedging with options — they're buying protection in both directions, which pushes the range wide without committing to a direction. Watch today's high and low as key levels: whichever side breaks first with strong volume is likely the next directional move.`
    }
    case 'darkpool': {
      const ratio = Number(rd.volRatio ?? 0)
      return `${t} just traded ${ratio.toFixed(1)}x its normal daily volume — the kind of size that only institutions can move. Dark pool trades happen off public exchanges so institutions don't move the market before they finish buying. When you see this kind of volume spike, it's almost never retail. Watch the next 2–3 trading sessions for follow-through. If the price holds up after the volume spike, that's confirmation big money is accumulating.`
    }
    default:
      return 'Monitor this signal and cross-reference with your chart and risk tolerance before acting.'
  }
}

function convergencePlainEnglish(alert: ConvergenceAlert): string {
  const agentList = alert.agents.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(' and ')
  return `This is our highest-conviction alert. Multiple independent systems — ${agentList} — flagged $${alert.ticker} at the same time. When unrelated signals converge on the same ticker, it's rarely random. Pull up $${alert.ticker}'s chart right now. Look for a clean technical setup that aligns with the signal direction. If the chart confirms, this is worth sizing into carefully with a defined stop loss. If the chart doesn't confirm, wait — the signal is real but the timing may be early.`
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function convictionLabel(n: number): string {
  return n >= 3 ? 'HIGH' : n >= 2 ? 'MEDIUM' : 'LOW'
}
function convictionColor(n: number): string {
  return n >= 3 ? '#ff2d78' : n >= 2 ? '#f59e0b' : '#6a90a8'
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const [signals,     setSignals]     = useState<Signal[]>([])
  const [convergence, setConvergence] = useState<ConvergenceAlert[]>([])
  const [loading,     setLoading]     = useState(true)
  const [totalToday,  setTotalToday]  = useState(0)
  const [polling,     setPolling]     = useState(false)
  const [lastFetch,   setLastFetch]   = useState<Date | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const res  = await fetch('/api/agents/alerts?limit=40', { cache:'no-store' })
      const data = await res.json()
      setSignals(data.signals ?? [])
      setConvergence(data.convergence ?? [])
      setLastFetch(new Date())
      const today = new Date().toDateString()
      setTotalToday((data.signals as Signal[]).filter(s => new Date(s.created_at).toDateString() === today).length)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const iv = setInterval(fetchAlerts, 30000)
    return () => clearInterval(iv)
  }, [fetchAlerts])

  const triggerPoll = useCallback(async () => {
    setPolling(true)
    try {
      await fetch('/api/agents/poll', { method:'POST' })
      await fetchAlerts()
    } finally { setPolling(false) }
  }, [fetchAlerts])

  const agentStats = useMemo(() => {
    const today = new Date().toDateString()
    return AGENT_DEFS.map(def => {
      const mine   = signals.filter(s => s.agent_name === def.key)
      const todayCt = mine.filter(s => new Date(s.created_at).toDateString() === today).length
      const last   = mine[0]?.created_at
      return { ...def, lastSignal: last ? timeAgo(last) : 'no signals yet', signalCount: todayCt, status: last ? 'ACTIVE' : 'SCANNING' }
    })
  }, [signals])

  const feed: FeedItem[] = useMemo(() => {
    const convItems: FeedItem[] = convergence.map(c => ({
      id: c.id, created_at: c.created_at,
      agent: 'Convergence Agent', agentKey: 'convergence',
      ticker: c.ticker,
      officialText: c.alert_text,
      plainText: convergencePlainEnglish(c),
      color: '#ff2d78', conviction: 3, sourceUrl: null, isConvergence: true,
    }))

    const sigItems: FeedItem[] = signals.map(s => {
      const def = AGENT_DEFS.find(d => d.key === s.agent_name)
      return {
        id: s.id, created_at: s.created_at,
        agent: def?.name ?? s.agent_name, agentKey: s.agent_name,
        ticker: s.ticker,
        officialText: s.signal_text,
        plainText: toPlainEnglish(s),
        color: def?.color ?? '#00d4aa',
        conviction: s.conviction,
        sourceUrl: s.source_url,
        isConvergence: false,
      }
    })

    return [...convItems, ...sigItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 25)
  }, [signals, convergence])

  return (
    <div style={{ background:'#030a10', minHeight:'100vh', color:'#e8f4f8', fontFamily:'"Inter",system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseDot { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
        * { box-sizing:border-box;margin:0;padding:0 }
        ::selection { background:#00d4aa40 }
        @media(max-width:900px){.agents-grid{grid-template-columns:repeat(2,1fr) !important}.hero-title{font-size:32px !important}.hero-stat{flex-direction:column !important;gap:12px !important}.how-steps{flex-direction:column !important}}
        @media(max-width:500px){.agents-grid{grid-template-columns:1fr !important}}
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{ position:'sticky',top:0,zIndex:100,background:'rgba(3,10,16,.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <Link href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize:14,fontWeight:700,color:'#fff',letterSpacing:'-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width:1,height:20,background:'rgba(255,255,255,.12)' }}/>
          <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.18em',color:'#00d4aa',fontFamily:'monospace' }}>AGENT NETWORK</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{ width:6,height:6,borderRadius:'50%',background:'#00d4aa',animation:'pulseDot 1.5s infinite' }}/>
            <span style={{ fontSize:11,color:'#6a90a8',fontFamily:'monospace',letterSpacing:'0.08em' }}>LIVE</span>
          </div>
          {lastFetch && <span style={{ fontSize:10,color:'#4a6a7a',fontFamily:'monospace' }}>updated {timeAgo(lastFetch.toISOString())}</span>}
          <button onClick={triggerPoll} disabled={polling} style={{ fontSize:11,color:polling?'#4a6a7a':'#00d4aa',fontFamily:'monospace',letterSpacing:'0.08em',padding:'6px 12px',border:'1px solid rgba(0,212,170,.3)',borderRadius:6,background:'transparent',cursor:polling?'default':'pointer' }}>
            {polling ? 'POLLING…' : 'POLL NOW'}
          </button>
          <Link href="/intel" style={{ fontSize:12,color:'#6a90a8',textDecoration:'none',fontFamily:'monospace',letterSpacing:'0.08em',padding:'6px 12px',border:'1px solid rgba(255,255,255,.08)',borderRadius:6 }}>
            Live Dashboard →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position:'relative',overflow:'hidden',padding:'100px 24px 80px',textAlign:'center' }}>
        <div style={{ position:'absolute',inset:0,opacity:0.35 }}><NetworkCanvas /></div>
        <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 30%,#030a10 80%)',pointerEvents:'none' }}/>
        <div style={{ position:'relative',zIndex:2,maxWidth:800,margin:'0 auto',animation:'fadeUp .6s ease both' }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#ff2d78',fontFamily:'monospace',marginBottom:24 }}>AUTONOMOUS INTELLIGENCE NETWORK</div>
          <h1 className="hero-title" style={{ fontSize:52,fontWeight:900,lineHeight:1.05,letterSpacing:'-0.03em',color:'#e8f4f8',marginBottom:24 }}>
            Nine autonomous agents.<br/>
            <span style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>Running 24/7.</span><br/>
            Finding what the market doesn&apos;t know yet.
          </h1>
          <div className="hero-stat" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:32,marginTop:32,flexWrap:'wrap' }}>
            {[
              { label:'Signals today',      value: loading ? '—' : String(totalToday),                                                        color:'#00d4aa' },
              { label:'Active agents',      value: loading ? '—' : `${agentStats.filter(a=>a.status==='ACTIVE').length}/9`,                   color:'#1e90ff' },
              { label:'Convergence alerts', value: loading ? '—' : String(convergence.length),                                                 color:'#ff2d78' },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22,fontWeight:800,color:s.color,fontFamily:'monospace' }}>{s.value}</div>
                <div style={{ fontSize:11,color:'#6a90a8',letterSpacing:'0.1em',marginTop:4,fontFamily:'monospace' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AGENT GRID */}
      <div style={{ padding:'0 24px 80px',maxWidth:1100,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:48 }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#1e90ff',fontFamily:'monospace',marginBottom:14 }}>STATUS GRID</div>
          <h2 style={{ fontSize:32,fontWeight:900,letterSpacing:'-0.03em',color:'#e8f4f8' }}>Agent Network</h2>
        </div>
        <div className="agents-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16 }}>
          {agentStats.map((agent,i)=>(
            <div key={i} style={{ padding:'24px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,position:'relative',overflow:'hidden',animation:`fadeUp .5s ease ${0.06*i}s both`,transition:'border-color .2s,transform .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${agent.color}50`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='none'}}
            >
              <div style={{ position:'absolute',left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${agent.color}60,transparent)`,animation:'scanLine 4s linear infinite',animationDelay:`${i*.5}s`,pointerEvents:'none' }}/>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:22 }}>{agent.icon}</span>
                  <div style={{ fontSize:14,fontWeight:700,color:'#e8f4f8' }}>{agent.name}</div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <div style={{ width:6,height:6,borderRadius:'50%',background:agent.status==='ACTIVE'?'#00d4aa':'#f59e0b',animation:'pulseDot 1.5s infinite',animationDelay:`${i*.2}s` }}/>
                  <span style={{ fontSize:9,fontWeight:800,letterSpacing:'0.14em',color:agent.status==='ACTIVE'?'#00d4aa':'#f59e0b',fontFamily:'monospace' }}>{agent.status}</span>
                </div>
              </div>
              <p style={{ fontSize:12,color:'#6a90a8',lineHeight:1.5,marginBottom:20 }}>{agent.monitors}</p>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace',letterSpacing:'0.08em',marginBottom:3 }}>LAST SIGNAL</div>
                  <div style={{ fontSize:12,color:'#a0b4bf',fontFamily:'monospace' }}>{agent.lastSignal}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace',letterSpacing:'0.08em',marginBottom:3 }}>TODAY</div>
                  <div style={{ fontSize:20,fontWeight:800,color:agent.color,fontFamily:'monospace' }}>{agent.signalCount}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad — between agent grid and live feed */}
      <div style={{ display:'flex', justifyContent:'center', padding:'0 24px 48px' }}>
        <AdsterraBanner size="728x90" />
      </div>

      {/* LIVE FEED */}
      <div style={{ padding:'0 24px 80px',maxWidth:900,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:48 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:14 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#ff2d78',animation:'pulseDot 1s infinite' }}/>
            <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#ff2d78',fontFamily:'monospace' }}>LIVE FEED</span>
          </div>
          <h2 style={{ fontSize:32,fontWeight:900,letterSpacing:'-0.03em',color:'#e8f4f8' }}>Real-Time Signals</h2>
          <p style={{ fontSize:14,color:'#6a90a8',marginTop:12 }}>Every signal shows the raw source data <span style={{ color:'#00d4aa' }}>and</span> a plain-English breakdown of what to actually do with it.</p>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          {loading && (
            <div style={{ padding:'60px',textAlign:'center',color:'#4a6a7a',fontFamily:'monospace',fontSize:12,letterSpacing:'0.1em',border:'1px solid rgba(255,255,255,.06)',borderRadius:16 }}>
              CONNECTING TO AGENT NETWORK…
            </div>
          )}
          {!loading && feed.length === 0 && (
            <div style={{ padding:'60px',textAlign:'center',border:'1px solid rgba(255,255,255,.06)',borderRadius:16 }}>
              <div style={{ color:'#4a6a7a',fontFamily:'monospace',fontSize:12,letterSpacing:'0.1em',marginBottom:12 }}>NO SIGNALS YET</div>
              <p style={{ color:'#3a5a6a',fontSize:14,marginBottom:20 }}>Click POLL NOW in the top nav to pull live data from all 9 agents.</p>
            </div>
          )}

          {feed.map((item, i) => (
            <div key={item.id} style={{ border:`1px solid ${item.isConvergence ? 'rgba(255,45,120,.3)' : 'rgba(255,255,255,.07)'}`, borderRadius:16, overflow:'hidden', background: item.isConvergence ? 'rgba(255,45,120,.04)' : 'rgba(255,255,255,.02)', animation: i < 3 ? 'slideIn .35s ease both' : 'none' }}>

              {/* Signal header */}
              <div style={{ padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:item.color,flexShrink:0 }}/>
                <span style={{ fontSize:11,fontWeight:800,letterSpacing:'0.12em',color:item.color,fontFamily:'monospace' }}>
                  {item.agent.toUpperCase()}
                </span>
                {item.ticker && (
                  <span style={{ fontSize:13,fontWeight:800,color:'#e8f4f8',background:'rgba(255,255,255,.07)',borderRadius:6,padding:'2px 10px',fontFamily:'monospace' }}>
                    ${item.ticker}
                  </span>
                )}
                {item.isConvergence && (
                  <span style={{ fontSize:9,fontWeight:800,color:'#ff2d78',background:'rgba(255,45,120,.15)',border:'1px solid rgba(255,45,120,.4)',borderRadius:4,padding:'2px 8px',fontFamily:'monospace',letterSpacing:'0.12em' }}>
                    ⚡ CONVERGENCE
                  </span>
                )}
                <span style={{ marginLeft:'auto',fontSize:11,color:convictionColor(item.conviction),fontFamily:'monospace',fontWeight:700 }}>
                  {convictionLabel(item.conviction)} CONVICTION
                </span>
                <span style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace' }}>{timeAgo(item.created_at)}</span>
              </div>

              {/* Official data section */}
              <div style={{ padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.04)',background:'rgba(0,0,0,.2)' }}>
                <div style={{ fontSize:9,fontWeight:700,letterSpacing:'0.15em',color:'#4a6a7a',fontFamily:'monospace',marginBottom:8 }}>
                  📡 OFFICIAL DATA SOURCE
                </div>
                <p style={{ fontSize:13,color:'#7a9aaa',lineHeight:1.6,fontFamily:'monospace' }}>
                  {item.officialText}
                </p>
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,marginTop:8,fontSize:11,color:'#1e90ff',textDecoration:'none',fontFamily:'monospace',opacity:0.8 }}>
                    View primary source → {item.agent.includes('Congress') || item.agent.includes('Insider') ? '(SEC / Gov filing)' : ''}
                  </a>
                )}
              </div>

              {/* Plain English section */}
              <div style={{ padding:'16px 20px' }}>
                <div style={{ fontSize:9,fontWeight:700,letterSpacing:'0.15em',color:item.color,fontFamily:'monospace',marginBottom:8 }}>
                  💡 WHAT THIS MEANS FOR YOU
                </div>
                <p style={{ fontSize:14,color:'#c8dce8',lineHeight:1.75 }}>
                  {item.plainText}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Ad — after live feed */}
      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 24px 64px' }}>
        <NativeAd variant="broker" size="md" />
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding:'0 24px 80px',maxWidth:1000,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:56 }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#a855f7',fontFamily:'monospace',marginBottom:14 }}>ARCHITECTURE</div>
          <h2 style={{ fontSize:32,fontWeight:900,letterSpacing:'-0.03em',color:'#e8f4f8' }}>How It Works</h2>
        </div>
        <div className="how-steps" style={{ display:'flex',gap:24,alignItems:'stretch' }}>
          {[
            { step:'01',color:'#00d4aa',title:'24/7 Monitoring',desc:'Agents poll live data sources every 5 minutes: SEC EDGAR Form 4s, House/Senate disclosures, Finnhub earnings + economic calendar, 200+ news feeds, and real-time price quotes.' },
            { step:'02',color:'#1e90ff',title:'AI Signal Scoring',desc:'Each data point is scored for conviction 1–3. Low-signal noise is filtered out. Only statistically significant events surface — insider buys, macro catalysts, extreme sentiment.' },
            { step:'03',color:'#ff2d78',title:'Plain English Briefing',desc:'Every signal shows the raw official data alongside a clear, jargon-free explanation of what it means and exactly what action to consider — built for retail traders, not quants.' },
          ].map((s,i)=>(
            <div key={i} style={{ flex:1,padding:'32px 28px',background:'rgba(255,255,255,.025)',border:`1px solid ${s.color}25`,borderRadius:16,position:'relative',overflow:'hidden',animation:`fadeUp .5s ease ${.1*i}s both` }}>
              <div style={{ fontSize:64,fontWeight:900,fontFamily:'monospace',color:`${s.color}10`,position:'absolute',right:16,top:8,lineHeight:1,pointerEvents:'none' }}>{s.step}</div>
              <div style={{ width:40,height:40,borderRadius:10,background:`${s.color}15`,border:`1px solid ${s.color}35`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20 }}>
                <span style={{ fontSize:12,fontWeight:800,color:s.color,fontFamily:'monospace' }}>{s.step}</span>
              </div>
              <h3 style={{ fontSize:17,fontWeight:800,color:'#e8f4f8',marginBottom:12 }}>{s.title}</h3>
              <p style={{ fontSize:14,color:'#7a9aaa',lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:'0 24px 120px',maxWidth:700,margin:'0 auto',textAlign:'center' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(255,45,120,.07),rgba(168,85,247,.06))',border:'1px solid rgba(255,45,120,.2)',borderRadius:20,padding:'60px 40px' }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#ff2d78',fontFamily:'monospace',marginBottom:20 }}>GET ALERTS</div>
          <h2 style={{ fontSize:28,fontWeight:900,letterSpacing:'-0.02em',color:'#e8f4f8',marginBottom:16 }}>Be first when signals converge.</h2>
          <p style={{ fontSize:15,color:'#7a9aaa',lineHeight:1.7,marginBottom:40 }}>When two or more agents flag the same ticker at the same time, you get the alert before the crowd reacts — with a plain-English briefing on exactly what to do.</p>
          <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap' }}>
            <Link href="/app" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#ff2d78,#a855f7)',color:'#fff',fontWeight:800,fontSize:14,letterSpacing:'0.04em',padding:'13px 28px',borderRadius:10,textDecoration:'none',boxShadow:'0 0 30px rgba(255,45,120,.2)' }}>
              Open Trading Terminal →
            </Link>
            <Link href="/intelligence" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.06)',color:'#e8f4f8',fontWeight:700,fontSize:14,letterSpacing:'0.04em',padding:'13px 28px',borderRadius:10,textDecoration:'none',border:'1px solid rgba(255,255,255,.12)' }}>
              Intelligence Suite →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
