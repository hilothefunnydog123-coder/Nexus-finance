'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const API_KEY = 'AIzaSyACZjdcSbccKMVF-aYhW-XN5C_w-_gSrj8'

const MODULES = [
  { id:'lockup',      name:'Lock-Up Assassin', icon:'🔫', clr:'#ff2d78', tag:'SCHEDULED DESTRUCTION',     classif:'SECRET',     hook:'Every IPO has a 180-day lock-up. When it expires, insiders sell. This is guaranteed, dated, and sized.' },
  { id:'liedetector', name:'Lie Detector',     icon:'🧪', clr:'#f59e0b', tag:'FORENSIC EARNINGS ANALYSIS', classif:'SECRET',     hook:'AI reads the earnings narrative vs the actual numbers. Divergence score 0–100.' },
  { id:'galaxybrain', name:'Galaxy Brain',     icon:'🧠', clr:'#a855f7', tag:'MACRO DOMINO TRACER',       classif:'TOP SECRET', hook:'One macro event triggers a chain. AI finds the non-obvious end of the chain.' },
  { id:'flow',        name:'Forced Flow',      icon:'🌊', clr:'#00d4ff', tag:'MECHANICAL MONEY MOVEMENTS', classif:'TOP SECRET', hook:'Billions HAVE to move into specific stocks this month. Front-run the mechanical flow.' },
  { id:'signals',     name:'Signal Radar',     icon:'⚡', clr:'#00ff88', tag:'CROSS-ASSET CORRELATION',   classif:'SECRET',     hook:'Korean Won weakens → Qualcomm drops 72h later. 7/8 times.' },
  { id:'filing',      name:'Filing X-Ray',     icon:'📄', clr:'#ec4899', tag:'SEC DOCUMENT INTELLIGENCE',  classif:'TOP SECRET', hook:'AI reads SEC filings the second they drop. Extracts what management buried.' },
]

type Analysis = {
  overall_sentiment: string
  sentiment_score: number
  verdict: string
  summary: string
  news: { title:string; source:string; sentiment:string; impact:string; date:string }[]
  trade_analysis: {
    position_assessment: string
    risk_assessment: string
    market_conditions: string
    confluence_factors: string[]
    risk_factors: string[]
  }
  key_levels: { strong_support:number; support:number; resistance:number; strong_resistance:number }
  recommendation: string
  confidence: number
}

// ── NEURAL CANVAS ─────────────────────────────────────────────────────────────
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x:-1000, y:-1000 })

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width = window.innerWidth
    let H = c.height = window.innerHeight
    let raf: number, t = 0

    const nodes = Array.from({ length:100 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      z: 0.2 + Math.random()*0.8,
      vx: (Math.random()-.5)*0.25, vy: (Math.random()-.5)*0.25,
      phase: Math.random()*Math.PI*2,
    }))

    // Matrix rain
    const cols = Math.floor(W/22)
    const rain = Array.from({ length:cols }, () => ({
      y: Math.random()*H - H,
      speed: 0.4 + Math.random()*1.2,
      alpha: 0.015 + Math.random()*0.03,
    }))

    // Pulse ripples
    const ripples: { x:number; y:number; r:number; a:number; clr:string }[] = []
    const COLS = ['#00d4aa','#a855f7','#1e90ff','#00ff88']
    const spawnRipple = () => {
      const n = nodes[Math.floor(Math.random()*nodes.length)]
      ripples.push({ x:n.x, y:n.y, r:0, a:0.5, clr:COLS[Math.floor(Math.random()*COLS.length)] })
    }
    const ri = setInterval(spawnRipple, 1400)

    const draw = () => {
      ctx.clearRect(0,0,W,H)

      // Faint matrix rain
      rain.forEach((d,i) => {
        ctx.fillStyle = `rgba(0,212,170,${d.alpha})`
        ctx.font = '10px monospace'
        ctx.fillText(Math.random()>.6?'1':'0', i*22, d.y)
        d.y += d.speed; if (d.y > H) d.y = -20
      })

      // Update nodes with mouse gravity
      nodes.forEach(n => {
        const dx = mouse.current.x - n.x, dy = mouse.current.y - n.y
        const dist = Math.sqrt(dx*dx+dy*dy)
        if (dist < 180 && dist > 0) { n.vx += dx/dist*0.018; n.vy += dy/dist*0.018 }
        n.vx *= 0.97; n.vy *= 0.97
        n.x += n.vx; n.y += n.vy
        if (n.x < 0) n.x = W; if (n.x > W) n.x = 0
        if (n.y < 0) n.y = H; if (n.y > H) n.y = 0
      })

      // Connections
      for (let i=0; i<nodes.length; i++) {
        for (let j=i+1; j<nodes.length; j++) {
          const a=nodes[i], b=nodes[j]
          const dx=a.x-b.x, dy=a.y-b.y, d=Math.sqrt(dx*dx+dy*dy)
          if (d < 140) {
            const alpha = (1-d/140)*0.1*((a.z+b.z)/2)
            const g = ctx.createLinearGradient(a.x,a.y,b.x,b.y)
            g.addColorStop(0,`rgba(0,212,170,${alpha})`); g.addColorStop(.5,`rgba(168,85,247,${alpha*.6})`); g.addColorStop(1,`rgba(0,212,170,${alpha})`)
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
            ctx.strokeStyle=g; ctx.lineWidth=a.z*.8; ctx.stroke()
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        const pulse = 0.7 + Math.sin(t*.05+n.phase)*.3
        const sz = (1+n.z*2.5)*pulse
        ctx.beginPath(); ctx.arc(n.x,n.y,sz,0,Math.PI*2)
        ctx.fillStyle=`rgba(0,212,170,${0.3+n.z*.5})`
        ctx.shadowBlur=6*n.z; ctx.shadowColor='#00d4aa'
        ctx.fill(); ctx.shadowBlur=0
      })

      // Ripples
      for (let i=ripples.length-1; i>=0; i--) {
        const rp=ripples[i]
        ctx.beginPath(); ctx.arc(rp.x,rp.y,rp.r,0,Math.PI*2)
        ctx.strokeStyle=`${rp.clr}${Math.floor(rp.a*255).toString(16).padStart(2,'0')}`
        ctx.lineWidth=1; ctx.stroke()
        rp.r+=2.5; rp.a-=0.012
        if (rp.a<=0) ripples.splice(i,1)
      }

      t++; raf=requestAnimationFrame(draw)
    }
    draw()

    const onMouse = (e:MouseEvent) => { mouse.current={x:e.clientX,y:e.clientY} }
    const resize = () => { W=c.width=window.innerWidth; H=c.height=window.innerHeight }
    window.addEventListener('mousemove',onMouse)
    window.addEventListener('resize',resize)
    return () => { cancelAnimationFrame(raf); clearInterval(ri); window.removeEventListener('mousemove',onMouse); window.removeEventListener('resize',resize) }
  },[])

  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.65}}/>
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function calcRR(entry:number, sl:number, tp:number, dir:string) {
  const risk = dir==='long' ? entry-sl : sl-entry
  const reward = dir==='long' ? tp-entry : entry-tp
  if (risk<=0||reward<=0) return null
  return (reward/risk).toFixed(2)
}
function sentimentClass(s:string) {
  if (!s) return 'neutral'
  const u=s.toUpperCase()
  if (u.includes('BULL')||u.includes('BUY')) return 'bull'
  if (u.includes('BEAR')||u.includes('SELL')) return 'bear'
  return 'neutral'
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TradeAnalyzerPage() {
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'long'|'short'>('long')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [size, setSize] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis|null>(null)
  const [tradeInfo, setTradeInfo] = useState<{ticker:string;direction:string;entry:string;sl:string;tp:string;rr:string|null}|null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [cardTilts, setCardTilts] = useState<Record<string,{x:number;y:number}>>({})
  const [cardHovs, setCardHovs] = useState<Record<string,boolean>>({})
  const logRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Custom cursor
  useEffect(() => {
    let ax=-100,ay=-100,tx=-100,ty=-100,raf:number
    const m=(e:MouseEvent)=>{tx=e.clientX;ty=e.clientY}
    const l=()=>{ax+=(tx-ax)*.1;ay+=(ty-ay)*.1;setCursorX(ax);setCursorY(ay);raf=requestAnimationFrame(l)}
    window.addEventListener('mousemove',m); raf=requestAnimationFrame(l)
    return ()=>{window.removeEventListener('mousemove',m);cancelAnimationFrame(raf)}
  },[])

  const handleCardMove = (e:React.MouseEvent, id:string) => {
    const r=e.currentTarget.getBoundingClientRect()
    const cx=r.width/2, cy=r.height/2
    setCardTilts(p=>({...p,[id]:{x:-(e.clientY-r.top-cy)/cy*10, y:(e.clientX-r.left-cx)/cx*10}}))
  }
  const handleCardLeave = (id:string) => setCardTilts(p=>({...p,[id]:{x:0,y:0}}))

  async function analyze() {
    setError('')
    if (!ticker) { setError('Ticker required'); return }
    if (!entry||!sl||!tp) { setError('Entry, SL, and TP required'); return }
    const e=parseFloat(entry), s=parseFloat(sl), t2=parseFloat(tp)
    const rr=calcRR(e,s,t2,direction)
    setTradeInfo({ticker,direction,entry,sl,tp,rr})
    setLoading(true); setAnalysis(null); setLogLines([])

    const logs=[
      '[INIT] YN Intelligence Terminal — Classified Session Started',
      `[SCAN] Asset: ${ticker.toUpperCase()} · Bias: ${direction.toUpperCase()}`,
      '[CONN] Secure channel established to Gemini AI...',
      '[DATA] Fetching live market intelligence + recent news...',
      '[AI]   Running sentiment analysis and risk modeling...',
      '[CALC] Computing confluence factors and key price levels...',
      '[DONE] Intelligence report compiled — rendering...',
    ]
    let i=0
    logRef.current=setInterval(()=>{
      if(i<logs.length){setLogLines(p=>[...p,logs[i]]);i++}
      else clearInterval(logRef.current!)
    },450)

    const prompt=`You are a professional forex and financial markets analyst with access to real-time news.

Analyze this trade setup and provide a comprehensive analysis:

TRADE DETAILS:
- Ticker: ${ticker}
- Direction: ${direction.toUpperCase()}
- Entry: ${entry}
- Stop Loss: ${sl}
- Take Profit: ${tp}
- Position Size: ${size||'Not specified'}
- Risk/Reward Ratio: ${rr?rr+':1':'Unable to calculate'}
- Additional Context: ${context||'None'}

Provide a complete analysis in this EXACT JSON format (no markdown, just raw JSON):
{
  "overall_sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "sentiment_score": number from -100 to 100,
  "verdict": "STRONG BUY" or "BUY" or "HOLD" or "SELL" or "STRONG SELL" or "AVOID",
  "summary": "2-3 sentence overall market summary for ${ticker}",
  "news": [{"title":"...","source":"...","sentiment":"...","impact":"...","date":"..."}],
  "trade_analysis": {
    "position_assessment": "...",
    "risk_assessment": "...",
    "market_conditions": "...",
    "confluence_factors": ["..."],
    "risk_factors": ["..."]
  },
  "key_levels": {"strong_support":0,"support":0,"resistance":0,"strong_resistance":0},
  "recommendation": "...",
  "confidence": 0
}
Include 4-6 real recent news items. Be specific with prices and levels for ${ticker}.`

    try {
      const res=await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.3,maxOutputTokens:4096}})}
      )
      const data=await res.json()
      if(!data.candidates?.[0]) throw new Error('No response from AI')
      const rawText=data.candidates[0].content.parts[0].text
      const jsonMatch=rawText.match(/\{[\s\S]*\}/)
      if(!jsonMatch) throw new Error('Could not parse AI response')
      setAnalysis(JSON.parse(jsonMatch[0]))
      setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    } catch(err:unknown) {
      setError('Analysis failed: '+(err instanceof Error?err.message:String(err)))
    } finally {
      setLoading(false)
      if(logRef.current) clearInterval(logRef.current)
    }
  }

  const verdictClass = analysis ? sentimentClass(analysis.verdict) : 'neutral'
  const rrColor = tradeInfo?.rr ? (parseFloat(tradeInfo.rr)>=2?'#00ff88':parseFloat(tradeInfo.rr)>=1?'#f59e0b':'#ff2d78') : '#f59e0b'
  const confColor = analysis ? (analysis.confidence>=70?'#00ff88':analysis.confidence>=40?'#f59e0b':'#ff2d78') : '#f59e0b'
  const sentScore = analysis?.sentiment_score??0
  const sentColor = sentScore>20?'#00ff88':sentScore<-20?'#ff2d78':'#f59e0b'
  const verdClr = verdictClass==='bull'?'#00ff88':verdictClass==='bear'?'#ff2d78':'#f59e0b'

  const rrPreview = entry&&sl&&tp ? calcRR(parseFloat(entry),parseFloat(sl),parseFloat(tp),direction) : null
  const rrPreviewNum = rrPreview ? parseFloat(rrPreview) : 0
  const rrPreviewClr = rrPreviewNum>=2?'#00ff88':rrPreviewNum>=1?'#f59e0b':'#ff2d78'

  return (
    <div style={{background:'#030a10',color:'#dce8f0',fontFamily:'"Inter",system-ui,sans-serif',minHeight:'100vh',overflowX:'hidden',cursor:'none',position:'relative'}}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes glitch{0%,90%,100%{transform:none;text-shadow:0 0 40px rgba(0,212,170,.3)}94%{transform:skew(-1.5deg);text-shadow:-3px 0 #ff2d78,3px 0 #00d4ff}97%{transform:skew(1.5deg);text-shadow:3px 0 #a855f7,-3px 0 #00ff88}}
        @keyframes scanLine{0%{top:-4px}100%{top:calc(100% + 4px)}}
        @keyframes pulse-w{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes holo{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 30px rgba(0,212,170,.08),0 40px 80px rgba(0,0,0,.4)}50%{box-shadow:0 0 60px rgba(0,212,170,.15),0 40px 80px rgba(0,0,0,.5)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes typeIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
        @keyframes rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes glow-pulse{0%,100%{text-shadow:0 0 20px rgba(0,212,170,.4)}50%{text-shadow:0 0 60px rgba(0,212,170,.8),0 0 100px rgba(0,212,170,.3)}}

        input{background:rgba(0,0,0,.55)!important;border:1px solid rgba(0,212,170,.18)!important;color:#dce8f0!important;padding:.85rem 1.1rem!important;font-family:'SF Mono','Fira Code',monospace!important;font-size:.88rem!important;border-radius:6px!important;outline:none!important;transition:border-color .25s,box-shadow .25s!important;width:100%!important}
        input:focus{border-color:rgba(0,212,170,.55)!important;box-shadow:0 0 24px rgba(0,212,170,.1)!important}
        input::placeholder{color:#1a3a52!important}
        .nav-link{color:#4a6a78;text-decoration:none;font-size:13px;transition:color .2s}
        .nav-link:hover{color:#00d4aa}
        ::selection{background:#00d4aa25}
        @media(max-width:700px){.fg2{grid-template-columns:1fr!important}.wg3{grid-template-columns:1fr!important}.s3{grid-template-columns:1fr 1fr!important}.kl2{grid-template-columns:1fr!important}}
      `}</style>

      {/* Cursor */}
      <div style={{position:'fixed',zIndex:9999,pointerEvents:'none',left:cursorX-5,top:cursorY-5,width:10,height:10,borderRadius:'50%',background:'#00d4aa',mixBlendMode:'difference'}}/>
      <div style={{position:'fixed',zIndex:9998,pointerEvents:'none',left:cursorX-18,top:cursorY-18,width:36,height:36,borderRadius:'50%',border:'1px solid rgba(0,212,170,.45)',transition:'left .08s,top .08s'}}/>

      <NeuralCanvas/>

      {/* Ambient */}
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}}>
        <div style={{position:'absolute',top:'5%',left:'5%',width:800,height:800,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,212,170,.04),transparent 70%)',animation:'pulse-w 7s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'5%',right:'5%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,.035),transparent 70%)',animation:'pulse-w 9s ease-in-out infinite 1.5s'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(0,212,170,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,.022) 1px,transparent 1px)',backgroundSize:'64px 64px'}}/>
      </div>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:56,display:'flex',alignItems:'center',padding:'0 28px',gap:24,background:'rgba(3,10,16,.88)',backdropFilter:'blur(24px)',borderBottom:'1px solid rgba(0,212,170,.1)'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#00d4aa,#1e90ff)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:10,color:'#030a10',boxShadow:'0 0 16px #00d4aa35'}}>YN</div>
          <span style={{fontWeight:900,fontSize:14,letterSpacing:'-.3px',color:'#dce8f0'}}>YN Finance</span>
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:'#00d4aa',fontWeight:700,letterSpacing:'.8px'}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:'#00d4aa',display:'inline-block',animation:'pulse-w 1.4s infinite'}}/>
          TRADE ANALYZER
        </div>
        <div style={{display:'flex',gap:20,marginLeft:'auto'}}>
          <Link href="/intelligence" className="nav-link">Intelligence Suite</Link>
          <Link href="/app" className="nav-link">Terminal</Link>
          <Link href="/arena" className="nav-link">Arena</Link>
        </div>
      </nav>

      <div style={{paddingTop:56,position:'relative',zIndex:1}}>

        {/* HERO */}
        <div style={{textAlign:'center',padding:'72px 24px 52px',animation:'fadeUp .7s ease'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,212,170,.07)',border:'1px solid rgba(0,212,170,.18)',borderRadius:20,padding:'6px 18px',marginBottom:22,fontSize:9,color:'#00d4aa',fontWeight:700,letterSpacing:'1.8px'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#00d4aa',display:'inline-block',animation:'pulse-w 1.5s infinite'}}/>
            YN INTELLIGENCE SUITE · MODULE 0 · ALWAYS LOADED
          </div>
          <h1 style={{fontSize:'clamp(48px,9vw,104px)',fontWeight:900,letterSpacing:'-5px',lineHeight:.86,marginBottom:22,animation:'glitch 9s infinite'}}>
            Trade<br/>
            <span style={{background:'linear-gradient(135deg,#00d4aa 0%,#1e90ff 40%,#a855f7 80%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundSize:'200% 100%',animation:'holo 4s linear infinite'}}>Analyzer</span>
          </h1>
          <p style={{fontSize:15,color:'#3a5a6a',maxWidth:480,margin:'0 auto',lineHeight:1.75,fontFamily:'monospace',letterSpacing:'.3px'}}>
            Input any trade setup. Get classified AI intelligence — live news sentiment, confluence factors, key levels, and a final verdict.
          </p>
          {/* Decorative line */}
          <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:280,margin:'28px auto 0'}}>
            <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(0,212,170,.3))'}}/>
            <div style={{width:4,height:4,borderRadius:'50%',background:'#00d4aa',animation:'pulse-w 2s infinite'}}/>
            <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(0,212,170,.3),transparent)'}}/>
          </div>
        </div>

        {/* TERMINAL FORM */}
        <div style={{maxWidth:840,margin:'0 auto',padding:'0 24px 52px'}}>
          <div style={{background:'rgba(0,0,0,.6)',border:'1px solid rgba(0,212,170,.18)',borderRadius:14,overflow:'hidden',backdropFilter:'blur(24px)',boxShadow:'0 40px 100px rgba(0,0,0,.55)',animation:'borderGlow 5s ease-in-out infinite'}}>

            {/* Terminal title bar */}
            <div style={{padding:'13px 20px',borderBottom:'1px solid rgba(0,212,170,.1)',display:'flex',alignItems:'center',gap:10,background:'rgba(0,212,170,.025)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,212,170,.5),transparent)',backgroundSize:'200% 100%',animation:'shimmer 2.5s linear infinite'}}/>
              <div style={{display:'flex',gap:5}}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}/>)}</div>
              <span style={{fontFamily:'monospace',fontSize:10,color:'#00d4aa',fontWeight:700,letterSpacing:'1.2px'}}>ANALYSIS_TERMINAL.exe — CLASSIFIED INTELLIGENCE TOOL</span>
              <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                <span style={{fontSize:'8px',color:'#ff2d78',background:'rgba(255,45,120,.1)',border:'1px solid rgba(255,45,120,.2)',borderRadius:3,padding:'2px 7px',fontWeight:800,letterSpacing:'1.2px'}}>CLASSIFIED</span>
                <span style={{fontSize:'8px',color:'#00d4aa',background:'rgba(0,212,170,.1)',border:'1px solid rgba(0,212,170,.2)',borderRadius:3,padding:'2px 7px',fontWeight:800,letterSpacing:'1.2px'}}>● LIVE</span>
              </div>
            </div>

            {/* Scan line */}
            <div style={{position:'relative',height:0,overflow:'visible',zIndex:10}}>
              <div style={{position:'absolute',left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(0,212,170,.6),transparent)',animation:'scanLine 4s linear infinite',top:0,pointerEvents:'none'}}/>
            </div>

            <div style={{padding:'28px 30px 26px'}}>
              <div className="fg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>

                {/* Ticker */}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontFamily:'monospace',fontSize:'8px',color:'rgba(0,212,170,.7)',letterSpacing:'2.5px',fontWeight:700}}>TICKER / PAIR</label>
                  <input type="text" placeholder="AAPL · EUR/USD · BTC/USD · ES" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())}/>
                </div>

                {/* Direction */}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontFamily:'monospace',fontSize:'8px',color:'rgba(0,212,170,.7)',letterSpacing:'2.5px',fontWeight:700}}>DIRECTION</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',border:'1px solid rgba(0,212,170,.18)',borderRadius:6,overflow:'hidden',height:46}}>
                    {(['long','short'] as const).map(d=>(
                      <button key={d} onClick={()=>setDirection(d)} style={{
                        fontFamily:'monospace',fontSize:'.82rem',fontWeight:700,letterSpacing:'1px',cursor:'pointer',border:'none',transition:'all .2s',
                        background:direction===d?(d==='long'?'rgba(0,255,136,.15)':'rgba(255,45,120,.15)'):'rgba(0,0,0,.4)',
                        color:direction===d?(d==='long'?'#00ff88':'#ff2d78'):'#1a3a52'
                      }}>{d==='long'?'▲ LONG':'▼ SHORT'}</button>
                    ))}
                  </div>
                </div>

                {[
                  {label:'ENTRY PRICE',val:entry,set:setEntry,ph:'0.00',t:'number'},
                  {label:'POSITION SIZE',val:size,set:setSize,ph:'1.5 lots · 100 shares',t:'text'},
                  {label:'STOP LOSS',val:sl,set:setSl,ph:'0.00',t:'number'},
                  {label:'TAKE PROFIT',val:tp,set:setTp,ph:'0.00',t:'number'},
                ].map(({label,val,set,ph,t})=>(
                  <div key={label} style={{display:'flex',flexDirection:'column',gap:6}}>
                    <label style={{fontFamily:'monospace',fontSize:'8px',color:'rgba(0,212,170,.7)',letterSpacing:'2.5px',fontWeight:700}}>{label}</label>
                    <input type={t} placeholder={ph} value={val} onChange={e=>set(e.target.value)} step="any"/>
                  </div>
                ))}

                <div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',gap:6}}>
                  <label style={{fontFamily:'monospace',fontSize:'8px',color:'rgba(0,212,170,.7)',letterSpacing:'2.5px',fontWeight:700}}>CONTEXT (OPTIONAL)</label>
                  <input type="text" placeholder="Key level bounce · holding overnight · earnings tomorrow..." value={context} onChange={e=>setContext(e.target.value)}/>
                </div>
              </div>

              {/* R:R preview */}
              {rrPreview && (
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,padding:'10px 16px',background:`${rrPreviewClr}08`,border:`1px solid ${rrPreviewClr}20`,borderRadius:6}}>
                  <span style={{fontFamily:'monospace',fontSize:'9px',color:'#2a4a62',letterSpacing:'1.5px'}}>R:R PREVIEW</span>
                  <span style={{fontFamily:'monospace',fontSize:18,fontWeight:900,color:rrPreviewClr,textShadow:`0 0 14px ${rrPreviewClr}`}}>{rrPreview}:1</span>
                  <span style={{fontFamily:'monospace',fontSize:'9px',color:rrPreviewClr,marginLeft:'auto',letterSpacing:'1px'}}>{rrPreviewNum>=2?'EXCELLENT':rrPreviewNum>=1?'ACCEPTABLE':'POOR RATIO'}</span>
                </div>
              )}

              {error&&<div style={{marginBottom:14,padding:'12px 16px',background:'rgba(255,45,120,.07)',border:'1px solid rgba(255,45,120,.25)',borderRadius:6,fontFamily:'monospace',fontSize:12,color:'#ff2d78',letterSpacing:'.3px'}}>[ERR] {error}</div>}

              <button onClick={analyze} disabled={loading} style={{
                width:'100%',padding:'17px',
                background:loading?'transparent':'linear-gradient(135deg,#00d4aa 0%,#1e90ff 60%,#a855f7 100%)',
                border:loading?'1px solid rgba(0,212,170,.25)':'none',
                borderRadius:8,cursor:loading?'not-allowed':'pointer',
                color:loading?'#00d4aa':'#030a10',fontFamily:'monospace',fontSize:12,fontWeight:900,
                letterSpacing:'2.5px',transition:'all .3s',
                boxShadow:loading?'none':'0 0 50px rgba(0,212,170,.25),0 8px 32px rgba(0,0,0,.4)',
                opacity:loading?.65:1,position:'relative',overflow:'hidden',
              }}>
                {!loading&&<div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)',backgroundSize:'200% 100%',animation:'shimmer 2s linear infinite'}}/>}
                <span style={{position:'relative'}}>{loading?<span style={{animation:'pulse-w .7s infinite'}}>● ANALYZING TRADE...</span>:'EXECUTE ANALYSIS →'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading&&(
          <div style={{maxWidth:840,margin:'0 auto',padding:'0 24px 48px',animation:'fadeIn .3s ease'}}>
            <div style={{background:'rgba(0,0,0,.7)',border:'1px solid rgba(0,212,170,.18)',borderRadius:10,overflow:'hidden',backdropFilter:'blur(20px)'}}>
              <div style={{padding:'13px 20px',borderBottom:'1px solid rgba(0,212,170,.08)',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#00d4aa',animation:'pulse-w .6s infinite'}}/>
                <span style={{fontFamily:'monospace',fontSize:10,color:'#00d4aa',fontWeight:700,letterSpacing:'1.5px'}}>RUNNING CLASSIFIED ANALYSIS</span>
              </div>
              <div style={{padding:'22px 26px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#00d4aa,transparent)',animation:'scanLine 1.4s linear infinite'}}/>
                {logLines.map((line,i)=>(
                  <div key={i} style={{fontFamily:'monospace',fontSize:12,color:i===logLines.length-1?'#00d4aa':'#1a3a52',marginBottom:7,animation:'typeIn .2s ease',letterSpacing:'.4px'}}>
                    {line}{i===logLines.length-1&&<span style={{animation:'pulse-w .7s infinite'}}>▋</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {analysis&&tradeInfo&&(
          <div ref={resultsRef} style={{maxWidth:840,margin:'0 auto',padding:'0 24px 52px',animation:'fadeUp .5s ease'}}>

            {/* Status bar */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,padding:'10px 16px',background:'rgba(0,255,136,.05)',border:'1px solid rgba(0,255,136,.18)',borderRadius:7,fontFamily:'monospace',fontSize:10}}>
              <span style={{color:'#00ff88',fontWeight:700,fontSize:13}}>✓</span>
              <span style={{color:'#00ff88',letterSpacing:'.8px'}}>INTELLIGENCE REPORT READY</span>
              <span style={{color:'#1a3a52',marginLeft:'auto',letterSpacing:'.5px'}}>{tradeInfo.ticker} · {tradeInfo.direction.toUpperCase()} · {new Date().toLocaleTimeString()}</span>
            </div>

            {/* VERDICT */}
            <div style={{background:'rgba(0,0,0,.65)',border:`1px solid ${verdClr}28`,borderRadius:12,overflow:'hidden',backdropFilter:'blur(20px)',marginBottom:14,position:'relative'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${verdClr},transparent 60%)`}}/>
              <div style={{position:'absolute',bottom:0,right:0,width:'40%',height:1,background:`linear-gradient(90deg,transparent,${verdClr}35)`}}/>
              <div style={{padding:'26px 30px'}}>
                <div style={{fontFamily:'monospace',fontSize:'8px',color:'#1a3a52',letterSpacing:'2.5px',marginBottom:14}}>VERDICT</div>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14,flexWrap:'wrap'}}>
                  <span style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:900,color:verdClr,fontFamily:'monospace',textShadow:`0 0 40px ${verdClr}60`,letterSpacing:'-1px'}}>
                    {analysis.verdict||analysis.overall_sentiment}
                  </span>
                  <span style={{fontSize:11,color:'#1a3a52',fontFamily:'monospace'}}>{tradeInfo.ticker} · {tradeInfo.direction.toUpperCase()} @ {tradeInfo.entry}</span>
                </div>
                <p style={{fontSize:14,color:'#7a9aaa',lineHeight:1.8}}>{analysis.summary}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="s3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
              {[
                {label:'RISK / REWARD',value:tradeInfo.rr?tradeInfo.rr+':1':'N/A',color:rrColor},
                {label:'AI CONFIDENCE',value:`${analysis.confidence}%`,color:confColor},
                {label:'SENTIMENT SCORE',value:`${sentScore>0?'+':''}${sentScore}`,color:sentColor},
              ].map(({label,value,color})=>(
                <div key={label} style={{background:'rgba(0,0,0,.55)',border:`1px solid ${color}18`,borderRadius:9,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${color}35,transparent)`}}/>
                  <div style={{fontFamily:'monospace',fontSize:'8px',color:'#1a3a52',letterSpacing:'2px',marginBottom:9}}>{label}</div>
                  <div style={{fontFamily:'monospace',fontSize:'1.55rem',fontWeight:900,color,textShadow:`0 0 18px ${color}50`}}>{value}</div>
                </div>
              ))}
            </div>

            {/* News */}
            <SL>LIVE INTELLIGENCE · NEWS SENTIMENT</SL>
            <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:18}}>
              {(analysis.news||[]).map((n,i)=>{
                const nc=sentimentClass(n.sentiment)
                const c=nc==='bull'?'#00ff88':nc==='bear'?'#ff2d78':'#f59e0b'
                return (
                  <div key={i} style={{background:'rgba(0,0,0,.45)',border:'1px solid rgba(255,255,255,.05)',borderRadius:8,padding:'14px 18px',display:'flex',gap:12,alignItems:'flex-start',transition:'border-color .2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=`${c}28`}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.05)'}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:c,marginTop:5,flexShrink:0,boxShadow:`0 0 8px ${c}`}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:4,lineHeight:1.55,color:'#b8c8d0'}}>{n.title}</div>
                      <div style={{fontFamily:'monospace',fontSize:'8px',color:'#1a3a52',display:'flex',gap:14,flexWrap:'wrap',letterSpacing:'.5px'}}>
                        <span style={{color:c}}>{n.source}</span>
                        <span>{n.date||'Recent'}</span>
                        <span>{n.impact||'MEDIUM'} IMPACT</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trade Analysis */}
            <SL>TRADE ANALYSIS · CLASSIFIED REPORT</SL>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
              {[
                {title:'POSITION ASSESSMENT',content:analysis.trade_analysis?.position_assessment},
                {title:'MARKET CONDITIONS',content:analysis.trade_analysis?.market_conditions},
                {title:'RISK ASSESSMENT',content:analysis.trade_analysis?.risk_assessment},
              ].map(({title,content})=>(
                <RB key={title} title={title}>{content}</RB>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <RB title="CONFLUENCE FACTORS" clr="#00ff88">
                  {(analysis.trade_analysis?.confluence_factors||[]).map((f,i)=>(
                    <div key={i} style={{display:'flex',gap:8,marginBottom:5}}>
                      <span style={{color:'#00ff88',flexShrink:0,fontWeight:700,fontFamily:'monospace'}}>+</span>
                      <span style={{fontSize:12,color:'#7a9aaa',lineHeight:1.55}}>{f}</span>
                    </div>
                  ))}
                </RB>
                <RB title="RISK FACTORS" clr="#ff2d78">
                  {(analysis.trade_analysis?.risk_factors||[]).map((f,i)=>(
                    <div key={i} style={{display:'flex',gap:8,marginBottom:5}}>
                      <span style={{color:'#ff2d78',flexShrink:0,fontWeight:700,fontFamily:'monospace'}}>!</span>
                      <span style={{fontSize:12,color:'#7a9aaa',lineHeight:1.55}}>{f}</span>
                    </div>
                  ))}
                </RB>
              </div>
            </div>

            {/* Key Levels */}
            <SL>KEY PRICE LEVELS</SL>
            <div className="kl2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[
                ['STRONG SUPPORT',analysis.key_levels?.strong_support,'#00ff88'],
                ['SUPPORT',analysis.key_levels?.support,'#00ff88'],
                ['RESISTANCE',analysis.key_levels?.resistance,'#ff2d78'],
                ['STRONG RESISTANCE',analysis.key_levels?.strong_resistance,'#ff2d78'],
              ].map(([name,val,clr])=>(
                <div key={String(name)} style={{background:'rgba(0,0,0,.5)',border:`1px solid ${clr}14`,borderRadius:8,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontFamily:'monospace',fontSize:'8px',color:'#1a3a52',letterSpacing:'1.5px'}}>{String(name)}</span>
                  <span style={{fontFamily:'monospace',fontSize:20,fontWeight:900,color:String(clr),textShadow:`0 0 14px ${clr}50`}}>{val??'N/A'}</span>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div style={{background:'rgba(0,0,0,.55)',border:`1px solid ${verdClr}22`,borderRadius:11,padding:'24px 28px',marginBottom:28,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${verdClr},transparent 70%)`}}/>
              <div style={{fontFamily:'monospace',fontSize:'8px',color:'#1a3a52',letterSpacing:'2.5px',marginBottom:11}}>FINAL RECOMMENDATION</div>
              <p style={{fontSize:14,color:'#b8c8d0',lineHeight:1.8}}>{analysis.recommendation}</p>
            </div>
          </div>
        )}

        {/* ── GRADIENT BRIDGE ──────────────────────────────────────────────── */}
        <div style={{position:'relative',overflow:'hidden'}}>
          {/* Top fade */}
          <div style={{height:80,background:'linear-gradient(to bottom,rgba(3,10,16,0),rgba(4,3,10,1))',position:'relative'}}>
            <div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',textAlign:'center',width:'100%'}}>
              <div style={{display:'flex',alignItems:'center',gap:16,maxWidth:300,margin:'0 auto'}}>
                <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,.25))'}}/>
                <span style={{fontFamily:'monospace',fontSize:'8px',color:'rgba(168,85,247,.35)',letterSpacing:'3px',whiteSpace:'nowrap'}}>INTELLIGENCE SUITE</span>
                <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(168,85,247,.25),transparent)'}}/>
              </div>
            </div>
          </div>

          {/* Intelligence Suite section */}
          <div style={{background:'rgba(4,3,10,1)',paddingBottom:80}}>
            {/* Header */}
            <div style={{textAlign:'center',padding:'48px 24px 48px',animation:'fadeUp .6s ease'}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,45,120,.08)',border:'1px solid rgba(255,45,120,.22)',borderRadius:20,padding:'6px 18px',marginBottom:20,fontSize:'8px',color:'#ff2d78',fontWeight:700,letterSpacing:'2px'}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#ff2d78',display:'inline-block',animation:'pulse-w 1.5s infinite'}}/>
                EXPAND YOUR ARSENAL · SIX WEAPONS
              </div>
              <h2 style={{fontSize:'clamp(34px,6vw,72px)',fontWeight:900,letterSpacing:'-2.5px',marginBottom:14}}>
                <span style={{background:'linear-gradient(135deg,#ff2d78 0%,#a855f7 50%,#00d4ff 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundSize:'200%',animation:'holo 4s linear infinite'}}>Intelligence Suite</span>
              </h2>
              <p style={{fontSize:14,color:'#2a3a42',lineHeight:1.7,maxWidth:460,margin:'0 auto'}}>
                Six tools the market doesn&apos;t know exist. Lock-up timing, earnings forensics, macro chains, mechanical flows, cross-asset signals, SEC X-Ray.
              </p>
            </div>

            {/* Weapons grid */}
            <div className="wg3" style={{maxWidth:1100,margin:'0 auto',padding:'0 24px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {MODULES.map((mod,i)=>{
                const tilt=cardTilts[mod.id]||{x:0,y:0}
                return (
                  <Link key={mod.id} href="/intelligence" style={{textDecoration:'none',display:'block'}}>
                    <div
                      onMouseMove={e=>handleCardMove(e,mod.id)}
                      onMouseEnter={()=>setCardHovs(p=>({...p,[mod.id]:true}))}
                      onMouseLeave={()=>{setCardHovs(p=>({...p,[mod.id]:false}));handleCardLeave(mod.id)}}
                      style={{
                        background:'rgba(4,3,10,.95)',
                        border:`1px solid ${mod.clr}${cardHovs[mod.id]?'50':'16'}`,
                        backdropFilter:'blur(16px)',
                        padding:'26px 22px',borderRadius:11,
                        cursor:'pointer',
                        position:'relative',overflow:'hidden',
                        transform:`perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transition:'transform .12s ease,box-shadow .25s ease,border-color .25s ease',
                        boxShadow:cardHovs[mod.id]?`0 24px 64px rgba(0,0,0,.5),0 0 48px ${mod.clr}14`:'none',
                        animation:'fadeUp .6s ease both',
                        animationDelay:`${i*.07}s`,
                        willChange:'transform',
                      }}
                    >
                      {/* Top accent */}
                      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${mod.clr},transparent 65%)`}}/>
                      {/* Inner glow (follows tilt) */}
                      <div style={{position:'absolute',inset:0,borderRadius:11,background:`radial-gradient(circle at ${50+tilt.y*3}% ${50-tilt.x*3}%,${mod.clr}10,transparent 65%)`,pointerEvents:'none'}}/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                        <span style={{fontSize:28,filter:`drop-shadow(0 0 14px ${mod.clr})`}}>{mod.icon}</span>
                        <span style={{fontSize:'7px',color:mod.clr,background:`${mod.clr}10`,border:`1px solid ${mod.clr}28`,borderRadius:3,padding:'2px 7px',fontWeight:800,letterSpacing:'1.2px'}}>{mod.classif}</span>
                      </div>
                      <div style={{fontFamily:'monospace',fontSize:'7px',color:'#1a2a32',letterSpacing:'1.5px',marginBottom:5}}>{mod.tag}</div>
                      <h3 style={{fontSize:17,fontWeight:900,letterSpacing:'-.3px',color:'#dce8f0',marginBottom:8}}>{mod.name}</h3>
                      <p style={{fontSize:12,color:'#2a4a58',lineHeight:1.65,marginBottom:16}}>{mod.hook}</p>
                      <div style={{paddingTop:12,borderTop:`1px solid ${mod.clr}10`,display:'flex',justifyContent:'flex-end'}}>
                        <span style={{fontSize:11,color:mod.clr,fontWeight:700,letterSpacing:'.8px'}}>DEPLOY →</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div style={{textAlign:'center',marginTop:40,fontSize:10,color:'#0a1a22',fontFamily:'monospace',letterSpacing:'1px'}}>
              POWERED BY GEMINI AI + LIVE MARKET DATA · FREE TO USE
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function SL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
      <div style={{fontFamily:'monospace',fontSize:'8px',color:'#00d4aa',letterSpacing:'2.5px',fontWeight:700,whiteSpace:'nowrap'}}>{children}</div>
      <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(0,212,170,.28),transparent)'}}/>
    </div>
  )
}

function RB({ title, children, clr='#00d4aa' }: { title:string; children:React.ReactNode; clr?:string }) {
  return (
    <div style={{background:'rgba(0,0,0,.45)',border:'1px solid rgba(255,255,255,.045)',borderRadius:8,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,width:40,height:1,background:clr,opacity:.4}}/>
      <h3 style={{fontFamily:'monospace',fontSize:'8px',fontWeight:700,letterSpacing:'2px',color:clr,marginBottom:10}}>{title}</h3>
      {typeof children==='string'
        ? <p style={{fontSize:13,color:'#7a9aaa',lineHeight:1.75}}>{children}</p>
        : children}
    </div>
  )
}
