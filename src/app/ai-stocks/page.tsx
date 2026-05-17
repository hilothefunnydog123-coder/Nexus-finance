'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

const POPULAR = ['AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','GOOGL','SPY','QQQ','JPM','NFLX']

const AGENTS = [
  { icon:'📊', label:'Fundamentals', clr:'#00ff88', desc:'P/E · EPS · ROE · Growth' },
  { icon:'📈', label:'Technical',    clr:'#00d4ff', desc:'Trend · SMA · Momentum'  },
  { icon:'📰', label:'Sentiment',    clr:'#a855f7', desc:'News · Narrative · Social'},
  { icon:'🛡️', label:'Risk',         clr:'#ff9500', desc:'Downside · Hedges'       },
  { icon:'🎯', label:'Portfolio Mgr',clr:'#ff2d78', desc:'Final synthesis'         },
]

const RATING_CFG: Record<string,{clr:string;glow:string}> = {
  'Strong Buy': {clr:'#00ff88',glow:'#00ff8840'},
  'Buy':        {clr:'#00c896',glow:'#00c89630'},
  'Hold':       {clr:'#ff9500',glow:'#ff950030'},
  'Sell':       {clr:'#ff6b35',glow:'#ff6b3530'},
  'Strong Sell':{clr:'#ff2d78',glow:'#ff2d7830'},
}
const SENT_CLR: Record<string,string> = {
  'Very Bullish':'#00ff88','Bullish':'#00c896','Neutral':'#ff9500','Bearish':'#ff6b35','Very Bearish':'#ff2d78',
}
const TF_CLR: Record<string,string> = {Bullish:'#00ff88',Neutral:'#ff9500',Bearish:'#ff2d78'}

type KeyLevels  = {strong_support:number;support:number;resistance:number;strong_resistance:number}
type Options    = {strategy:string;type:string;strike:number;expiry_days:number;est_premium:number;breakeven_call:number;breakeven_put:number;max_loss:number;iv_environment:string;reasoning:string}
type Timeframes = {'1_week':string;'1_month':string;'3_months':string;'6_months':string}
type Analysis   = {
  rating:string;confidence:number;price_target:number;price_target_bear:number;price_target_bull:number
  time_horizon:string;executive_summary:string;investment_thesis:string;bull_case:string;bear_case:string
  entry_low:number;entry_high:number;stop_loss:number;take_profit_1:number;take_profit_2:number
  position_size_pct:number;key_levels:KeyLevels;risks:string[];catalysts:string[]
  sentiment:string;fundamentals_score:number;technical_score:number;sentiment_score:number
  analyst_consensus:string;vs_sector:string;timeframes:Timeframes;options:Options
}
type Candle = { t:number; o:number; h:number; l:number; c:number }
type Result = {
  ticker:string;name:string;price:number;change1d:number;prevClose:number
  high52:number;low52:number;pe:number;marketCap:number;beta:number;industry:string
  analystBuy:number;analystHold:number;analystSell:number;analystTotal:number
  candles:Candle[];timeframe:string;analysis:Analysis
}

// ── CANDLESTICK CHART ─────────────────────────────────────────────────────────
function CandlestickChart({ candles, levels, ticker, timeframe }: {
  candles: Candle[]
  levels: { entry_low:number; entry_high:number; stop_loss:number; take_profit_1:number; take_profit_2:number; price:number }
  ticker: string
  timeframe: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current; if (!canvas || candles.length < 2) return
    const ctx = canvas.getContext('2d')!
    const DPR = window.devicePixelRatio || 1
    const W   = canvas.offsetWidth * DPR
    const H   = canvas.offsetHeight * DPR
    canvas.width = W; canvas.height = H
    ctx.scale(DPR, DPR)
    const CW = canvas.offsetWidth, CH = canvas.offsetHeight

    const ML = 12, MR = 110, MT = 38, MB = 36
    const chartW = CW - ML - MR, chartH = CH - MT - MB

    // Price range including all levels
    const allPrices = [
      ...candles.flatMap(c => [c.h, c.l]),
      levels.entry_low, levels.entry_high, levels.stop_loss,
      levels.take_profit_1, levels.take_profit_2, levels.price,
    ].filter(Boolean)
    const rawMin = Math.min(...allPrices), rawMax = Math.max(...allPrices)
    const pad    = (rawMax - rawMin) * 0.08
    const minP   = rawMin - pad, maxP = rawMax + pad
    const toY    = (p: number) => MT + chartH - ((p - minP) / (maxP - minP)) * chartH
    const candleW = Math.max(1.5, (chartW / candles.length) * 0.7)
    const toX    = (i: number) => ML + (i + 0.5) * (chartW / candles.length)

    // Background
    ctx.fillStyle = '#030a06'
    ctx.fillRect(0, 0, CW, CH)

    // Grid lines
    const priceSteps = 6
    ctx.setLineDash([2, 4])
    ctx.lineWidth = 0.5
    for (let i = 0; i <= priceSteps; i++) {
      const p = minP + (maxP - minP) * (i / priceSteps)
      const y = toY(p)
      ctx.strokeStyle = '#00ff8810'
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(CW - MR, y); ctx.stroke()
      ctx.fillStyle = '#1a4a2a'; ctx.font = '9px JetBrains Mono,monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`$${p.toFixed(0)}`, ML - 2, y + 3)
    }
    ctx.setLineDash([])

    // Title
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 11px JetBrains Mono,monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${ticker}  DAILY  [${timeframe}]`, ML, 20)
    ctx.fillStyle = '#1a4a2a'; ctx.font = '9px JetBrains Mono,monospace'
    ctx.fillText(`${candles.length} bars`, ML + 160, 20)

    // Level zones & lines
    const LEVELS = [
      { price: levels.take_profit_2, label: 'TP2',    clr: '#00ff88', dash: [6,3] },
      { price: levels.take_profit_1, label: 'TP1',    clr: '#00d4ff', dash: [6,3] },
      { price: levels.price,         label: 'PRICE',  clr: '#ffffff', dash: [0,0] },
      { price: levels.entry_high,    label: 'ENTRY ↑',clr: '#f0b429', dash: [4,3] },
      { price: levels.entry_low,     label: 'ENTRY ↓',clr: '#f0b429', dash: [4,3] },
      { price: levels.stop_loss,     label: 'STOP',   clr: '#ff2d78', dash: [3,3] },
    ]

    // Entry zone fill
    const eyTop = toY(levels.entry_high), eyBot = toY(levels.entry_low)
    ctx.fillStyle = 'rgba(240,180,41,0.06)'
    ctx.fillRect(ML, eyTop, chartW, eyBot - eyTop)

    LEVELS.forEach(({ price: lp, label, clr, dash }) => {
      if (!lp) return
      const y = toY(lp)
      ctx.setLineDash(dash)
      ctx.strokeStyle = clr + '90'
      ctx.lineWidth   = label === 'PRICE' ? 1.5 : 1
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(CW - MR, y); ctx.stroke()
      ctx.setLineDash([])

      // Arrow  → →
      const ax = CW - MR + 4
      ctx.fillStyle = clr
      ctx.beginPath()
      ctx.moveTo(ax, y)
      ctx.lineTo(ax + 7, y - 4)
      ctx.lineTo(ax + 7, y + 4)
      ctx.closePath(); ctx.fill()

      // Label box
      const bx = ax + 10, bw = 78, bh = 16
      ctx.fillStyle = clr + '18'
      ctx.strokeStyle = clr + '50'
      ctx.lineWidth = 1
      roundRect(ctx, bx, y - bh/2, bw, bh, 2)
      ctx.fill(); ctx.stroke()

      ctx.fillStyle = clr
      ctx.font = `bold 9px JetBrains Mono,monospace`
      ctx.textAlign = 'left'
      ctx.fillText(`${label}  $${lp.toFixed(2)}`, bx + 4, y + 3)
    })

    // Candles
    candles.forEach((c, i) => {
      const x   = toX(i)
      const top = Math.min(c.o, c.c), bot = Math.max(c.o, c.c)
      const bull = c.c >= c.o
      const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)))
      const clr   = bull ? '#00ff88' : '#ff2d78'

      // Wick
      ctx.strokeStyle = clr + '90'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(x, toY(c.h)); ctx.lineTo(x, toY(c.l))
      ctx.stroke()

      // Body
      ctx.fillStyle = bull ? clr + '90' : clr + '80'
      ctx.fillRect(x - candleW/2, toY(top) - (bull ? 0 : bodyH), candleW, bodyH || 1)
      ctx.strokeStyle = clr
      ctx.lineWidth   = 0.8
      ctx.strokeRect(x - candleW/2, toY(top) - (bull ? 0 : bodyH), candleW, bodyH || 1)
    })

    // Date labels
    const step = Math.max(1, Math.floor(candles.length / 5))
    ctx.fillStyle = '#1a4a2a'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center'
    for (let i = 0; i < candles.length; i += step) {
      const d = new Date(candles[i].t * 1000)
      const lbl = `${d.getMonth()+1}/${d.getDate()}`
      ctx.fillText(lbl, toX(i), CH - 8)
    }
  }, [candles, levels, ticker, timeframe])

  return <canvas ref={ref} style={{ width:'100%', height:340, display:'block' }}/>
}

function roundRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// ── MATRIX RAIN CANVAS ────────────────────────────────────────────────────────
function MatrixCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight
    const CHARS = 'AAPL NVDA TSLA MSFT 8.2% +1.45 -3.2 BUY SELL HOLD 185.40 724.60 0.85 RSI MACD EPS PE ROE SMA ATR IV CALL PUT +12.4 -0.8 SPY QQQ 72 88 95'.split('')
    const COLS  = Math.floor(W / 18)
    const drops = Array.from({length:COLS}, () => Math.random() * -100)
    const speeds= Array.from({length:COLS}, () => 0.3 + Math.random() * 0.7)
    let raf: number

    function draw() {
      ctx.fillStyle = 'rgba(3,10,16,0.08)'
      ctx.fillRect(0, 0, W, H)
      drops.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const bright = y * 18 > H - 40
        ctx.fillStyle = bright ? '#00ff88' : `rgba(0,${Math.floor(80+Math.random()*80)},${Math.floor(50+Math.random()*50)},${0.4+Math.random()*.4})`
        ctx.font = `${10+Math.floor(Math.random()*3)}px "JetBrains Mono",monospace`
        ctx.fillText(char, i * 18, y * 18)
        if (y * 18 > H && Math.random() > 0.975) drops[i] = 0
        else drops[i] += speeds[i]
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    const onResize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])
  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.35}}/>
}

// ── NEURAL NET CANVAS ─────────────────────────────────────────────────────────
function NeuralCanvas({active,agentIdx}:{active:boolean;agentIdx:number}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const W = c.width = c.offsetWidth, H = c.height = c.offsetHeight
    // layers: input(4) → hidden1(5) → hidden2(5) → output(1)
    const layers = [[4],[5],[5],[1]]
    type Node = {x:number;y:number;layer:number;idx:number;pulse:number}
    const nodes: Node[] = []
    const layerX = [W*.15, W*.38, W*.62, W*.85]
    layers.forEach((l, li) => {
      const count = l[0]
      for (let i = 0; i < count; i++) {
        nodes.push({ x: layerX[li], y: H*(i+1)/(count+1), layer:li, idx:i, pulse: Math.random()*Math.PI*2 })
      }
    })
    const agentClrs = ['#00ff88','#00d4ff','#a855f7','#ff9500','#ff2d78']
    let t = 0, raf: number
    function draw() {
      ctx.clearRect(0,0,W,H)
      t += 0.03
      // Draw edges
      nodes.forEach(n => {
        if (n.layer >= layerX.length-1) return
        const nexts = nodes.filter(m => m.layer === n.layer+1)
        nexts.forEach(m => {
          const flow = (Math.sin(t*2 - n.idx*0.5 + n.layer) + 1)/2
          const clr  = active ? agentClrs[agentIdx % agentClrs.length] : '#00ff88'
          ctx.beginPath()
          ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y)
          ctx.strokeStyle = clr + Math.floor(flow*120).toString(16).padStart(2,'0')
          ctx.lineWidth = active ? 1.5 : 0.5
          ctx.stroke()
          // Traveling dot
          if (active) {
            const prog = ((t*0.8 + n.idx*0.3) % 1)
            ctx.beginPath()
            ctx.arc(n.x+(m.x-n.x)*prog, n.y+(m.y-n.y)*prog, 3, 0, Math.PI*2)
            ctx.fillStyle = clr
            ctx.shadowBlur = 10; ctx.shadowColor = clr
            ctx.fill(); ctx.shadowBlur = 0
          }
        })
      })
      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(t*2 + n.pulse)*0.4 + 0.6
        const clr   = active ? agentClrs[agentIdx % agentClrs.length] : '#00ff88'
        const r     = active ? 7 + pulse*3 : 5
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2)
        ctx.fillStyle = clr + Math.floor(pulse*200).toString(16).padStart(2,'0')
        ctx.shadowBlur = active ? 20 : 8; ctx.shadowColor = clr
        ctx.fill(); ctx.shadowBlur = 0
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2)
        ctx.strokeStyle = clr; ctx.lineWidth = 1.5; ctx.stroke()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [active, agentIdx])
  return <canvas ref={ref} style={{width:'100%',height:'100%',display:'block'}}/>
}

// ── RADAR SCANNER ─────────────────────────────────────────────────────────────
function Radar({active}:{active:boolean}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const S = 220; c.width = S; c.height = S
    const cx = S/2, cy = S/2, r = S/2 - 8
    let angle = 0, raf: number
    function draw() {
      ctx.clearRect(0,0,S,S)
      // Rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx,cy,r*i/4,0,Math.PI*2)
        ctx.strokeStyle = `rgba(0,255,136,${0.08+i*.03})`; ctx.lineWidth = 1; ctx.stroke()
      }
      // Cross hairs
      ctx.strokeStyle = 'rgba(0,255,136,0.12)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke()
      // Sweep gradient
      const grad  = ctx.createLinearGradient(cx,cy,cx+r,cy)
      grad.addColorStop(0, 'rgba(0,255,136,0.5)')
      grad.addColorStop(1, 'rgba(0,255,136,0)')
      ctx.save()
      ctx.translate(cx,cy); ctx.rotate(angle)
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r,-0.4,0.1); ctx.closePath()
      ctx.fillStyle = 'rgba(0,255,136,0.15)'; ctx.fill()
      ctx.restore()
      // Blip dots
      if (active) {
        const blips = [{a:0.8,d:0.5},{a:2.2,d:0.7},{a:3.8,d:0.35},{a:5.1,d:0.6}]
        blips.forEach(b => {
          const bx = cx+Math.cos(b.a)*r*b.d, by = cy+Math.sin(b.a)*r*b.d
          const fade = Math.max(0, Math.cos(angle-b.a)*0.7+0.3)
          ctx.beginPath(); ctx.arc(bx,by,4,0,Math.PI*2)
          ctx.fillStyle = `rgba(0,255,136,${fade})`
          ctx.shadowBlur = 12; ctx.shadowColor = '#00ff88'
          ctx.fill(); ctx.shadowBlur = 0
        })
      }
      // Outer ring
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2)
      ctx.strokeStyle = active ? '#00ff8880' : '#00ff8830'; ctx.lineWidth = 2; ctx.stroke()
      angle = (angle + (active ? 0.04 : 0.012)) % (Math.PI*2)
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [active])
  return <canvas ref={ref} style={{width:220,height:220}}/>
}

// ── SCORE BAR ─────────────────────────────────────────────────────────────────
function ScoreBar({score,label,clr}:{score:number;label:string;clr?:string}) {
  const c = clr||(score>=7?'#00ff88':score>=5?'#ff9500':'#ff2d78')
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:11,color:'#4a7a6a',fontFamily:'monospace'}}>{label}</span>
        <span style={{fontSize:11,fontWeight:800,color:c,fontFamily:'monospace',textShadow:`0 0 8px ${c}`}}>{score}/10</span>
      </div>
      <div style={{height:4,background:'#041810',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${score*10}%`,background:`linear-gradient(90deg,${c}aa,${c})`,borderRadius:2,transition:'width 1.4s cubic-bezier(.22,1,.36,1)',boxShadow:`0 0 10px ${c}`}}/>
      </div>
    </div>
  )
}

// ── CONFIDENCE RING ───────────────────────────────────────────────────────────
function Ring({pct,clr,size=88}:{pct:number;clr:string;size?:number}) {
  const r=(size-10)/2, circ=2*Math.PI*r, dash=(pct/100)*circ
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#041810" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{transition:'stroke-dasharray 1.4s cubic-bezier(.22,1,.36,1)',filter:`drop-shadow(0 0 8px ${clr})`}}/>
    </svg>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AIStocksPage() {
  const [input,setInput]         = useState('')
  const [loading,setLoading]     = useState(false)
  const [agentIdx,setAgentIdx]   = useState(0)
  const [result,setResult]       = useState<Result|null>(null)
  const [error,setError]         = useState('')
  const [cursorX,setCursorX]     = useState(-100)
  const [cursorY,setCursorY]     = useState(-100)
  const [account,setAccount]     = useState('10000')
  const [riskPct,setRiskPct]     = useState('1')
  const [timeframe,setTimeframe] = useState('3M')
  const intervalRef = useRef<NodeJS.Timeout|null>(null)
  const resultsRef  = useRef<HTMLDivElement>(null)

  // Smooth cursor
  useEffect(() => {
    let ax=-100,ay=-100,tx=-100,ty=-100,raf:number
    const onMove=(e:MouseEvent)=>{tx=e.clientX;ty=e.clientY}
    const loop=()=>{ax+=(tx-ax)*.1;ay+=(ty-ay)*.1;setCursorX(ax);setCursorY(ay);raf=requestAnimationFrame(loop)}
    window.addEventListener('mousemove',onMove); raf=requestAnimationFrame(loop)
    return ()=>{window.removeEventListener('mousemove',onMove);cancelAnimationFrame(raf)}
  },[])

  const analyze = useCallback(async (sym:string) => {
    const t=sym.trim().toUpperCase(); if(!t) return
    setInput(t); setLoading(true); setResult(null); setError('')
    let idx=0; intervalRef.current=setInterval(()=>{idx=(idx+1)%AGENTS.length;setAgentIdx(idx)},900)
    try {
      const r=await fetch('/api/stock-analyzer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:t,timeframe})})
      const d=await r.json()
      if(!r.ok||d.error){setError(d.error||'Analysis failed');return}
      setResult(d)
      setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    } catch {setError('Network error.')}
    finally {if(intervalRef.current)clearInterval(intervalRef.current);setLoading(false)}
  },[timeframe])

  const a     = result?.analysis
  const rCfg  = RATING_CFG[a?.rating??''] ?? RATING_CFG['Hold']
  const sClr  = SENT_CLR[a?.sentiment??''] ?? '#ff9500'
  const upDay = (result?.change1d??0)>=0
  const accNum=parseFloat(account)||10000, riskNum=parseFloat(riskPct)||1
  const riskDollar=(accNum*riskNum/100).toFixed(0)
  const posSize=a&&result&&a.stop_loss&&result.price>a.stop_loss?Math.floor(parseFloat(riskDollar)/Math.abs(result.price-a.stop_loss)):0

  return (
    <div style={{background:'#030a06',color:'#a0ffcc',fontFamily:'"JetBrains Mono","Fira Code",monospace',minHeight:'100vh',overflowX:'hidden',cursor:'none'}}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes flicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1}20%,24%,55%{opacity:.4}}
        @keyframes scan-h {0%{top:-4px}100%{top:100%}}
        @keyframes ping   {0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}
        @keyframes blink  {0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes holo   {0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes glitch {0%,100%{transform:none}92%{transform:skew(-1deg)}94%{transform:skew(1deg) scaleX(1.01)}96%{transform:none}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes ticker {0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        :root { --green: #00ff88; --cyan: #00d4ff; --purple: #a855f7; --orange: #ff9500; --pink: #ff2d78; }
        html { scroll-behavior: smooth; }
        .nav-link{color:#4a7a6a;text-decoration:none;font-size:12px;transition:color .2s;letter-spacing:.5px}
        .nav-link:hover{color:#00ff88;text-shadow:0 0 10px #00ff88}
        .card{background:rgba(3,12,6,.9);border:1px solid #00ff8820;border-radius:4px;backdrop-filter:blur(12px);position:relative;overflow:hidden}
        .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#00ff8850,transparent);pointer-events:none}
        .chip{background:rgba(0,20,10,.8);border:1px solid #00ff8820;border-radius:2px;padding:6px 14px;font-size:11px;cursor:pointer;color:#4a7a6a;transition:all .15s;font-family:inherit;font-weight:700;letter-spacing:1px}
        .chip:hover{border-color:#00ff8860;color:#00ff88;background:rgba(0,255,136,.06);box-shadow:0 0 16px rgba(0,255,136,.15)}
        .glow-green{text-shadow:0 0 20px #00ff88,0 0 40px #00ff8840}
        .glow-cyan{text-shadow:0 0 20px #00d4ff}
        .terminal-row{display:flex;gap:8px;align-items:baseline;margin-bottom:4px}
        .t-prompt{color:#00ff8870;font-size:11px;flex-shrink:0}
        .t-cmd{color:#00ff88;font-size:11px}
        .t-out{color:#4a7a6a;font-size:11px}
        ::selection{background:#00ff8830}
        @media(max-width:768px){.hide-sm{display:none!important}.grid-2{grid-template-columns:1fr!important}.grid-3{grid-template-columns:1fr!important}}
      `}</style>

      {/* CUSTOM CURSOR — crosshair style */}
      <div style={{position:'fixed',zIndex:9999,pointerEvents:'none',left:cursorX,top:cursorY}}>
        <div style={{position:'absolute',width:1,height:16,background:'#00ff88',top:-8,left:0,boxShadow:'0 0 6px #00ff88'}}/>
        <div style={{position:'absolute',width:16,height:1,background:'#00ff88',left:-8,top:0,boxShadow:'0 0 6px #00ff88'}}/>
        <div style={{position:'absolute',width:6,height:6,borderRadius:'50%',border:'1px solid #00ff88',top:-3,left:-3}}/>
      </div>

      {/* MATRIX BACKGROUND */}
      <MatrixCanvas/>

      {/* GREEN SCANLINE */}
      <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',left:0,right:0,height:2,background:'linear-gradient(transparent,rgba(0,255,136,.04),transparent)',animation:'scan-h 8s linear infinite'}}/>
        {/* CRT vignette */}
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.5) 100%)'}}/>
        {/* Horizontal scanlines */}
        <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,.03) 0px,rgba(0,0,0,.03) 1px,transparent 1px,transparent 2px)'}}/>
      </div>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:52,display:'flex',alignItems:'center',padding:'0 28px',gap:32,background:'rgba(3,10,6,.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid #00ff8815'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:4,background:'linear-gradient(135deg,#00ff88,#00d4ff)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:10,color:'#030a06',letterSpacing:'-0.5px',boxShadow:'0 0 16px #00ff8860'}}>YN</div>
          <span style={{fontWeight:900,fontSize:13,color:'#00ff88',letterSpacing:'2px',textShadow:'0 0 12px #00ff88'}}>YN_FINANCE</span>
        </Link>
        <div className="hide-sm" style={{display:'flex',gap:28}}>
          {[['DAILY','/daily'],['ARENA','/arena'],['COURSES','/courses'],['TERMINAL','/app']].map(([l,h])=>(
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          <div style={{fontSize:10,color:'#00ff8870',fontFamily:'monospace'}}>
            <span style={{animation:'blink 1s infinite'}}>█</span> SYSTEM ONLINE
          </div>
          <Link href="/app" style={{background:'transparent',border:'1px solid #00ff88',color:'#00ff88',padding:'7px 18px',borderRadius:2,fontSize:11,fontWeight:700,textDecoration:'none',letterSpacing:'1px',boxShadow:'0 0 16px #00ff8830',transition:'all .2s'}}>LAUNCH →</Link>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:2,paddingTop:52}}>

        <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:60,alignItems:'center',maxWidth:960,width:'100%',padding:'0 32px'}} className="grid-2">

          {/* LEFT: Search + title */}
          <div>
            {/* Terminal header */}
            <div style={{marginBottom:24,fontFamily:'monospace',fontSize:11}}>
              <div className="terminal-row"><span className="t-prompt">sys@yn-ai:~$</span><span className="t-cmd"> ./start_analyzer.sh</span></div>
              <div className="terminal-row"><span className="t-out">[OK] Loading 5-agent model...</span></div>
              <div className="terminal-row"><span className="t-out">[OK] Finnhub data stream connected</span></div>
              <div className="terminal-row"><span className="t-out">[OK] Gemini 2.0 ready<span style={{animation:'blink 1s infinite'}}>_</span></span></div>
            </div>

            <h1 style={{fontSize:'clamp(38px,6vw,72px)',fontWeight:900,lineHeight:.95,letterSpacing:'-2px',marginBottom:16,animation:'glitch 6s infinite'}}>
              <span style={{color:'#00ff88',textShadow:'0 0 30px #00ff88,0 0 60px #00ff8840',display:'block'}}>AI STOCK</span>
              <span style={{color:'#00d4ff',textShadow:'0 0 30px #00d4ff',display:'block'}}>ANALYZER</span>
            </h1>

            <p style={{fontSize:13,color:'#4a7a6a',lineHeight:1.8,marginBottom:32,maxWidth:480,letterSpacing:'.3px'}}>
              Five specialized agents. One decisive call. Entry zones, stop loss, price targets, options strategy, catalysts. Institutional research in 15 seconds — free.
            </p>

            {/* SEARCH BAR — terminal style */}
            <div style={{marginBottom:16,position:'relative'}}>
              <div style={{display:'flex',background:'rgba(0,20,10,.95)',border:`1px solid ${loading?'#00ff88':'#00ff8840'}`,borderRadius:2,overflow:'hidden',boxShadow:loading?'0 0 40px rgba(0,255,136,.3)':'none',transition:'all .4s'}}>
                <span style={{padding:'16px 16px',fontSize:13,color:'#00ff8860',flexShrink:0,borderRight:'1px solid #00ff8820',letterSpacing:'1px'}}>$</span>
                <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&analyze(input)}
                  placeholder="ENTER TICKER..." style={{flex:1,background:'transparent',border:'none',padding:'16px 16px',fontSize:16,color:'#00ff88',fontFamily:'inherit',fontWeight:800,letterSpacing:'3px',outline:'none'}}/>
                <button onClick={()=>analyze(input)} disabled={loading}
                  style={{background:loading?'transparent':'#00ff88',border:'none',borderLeft:'1px solid #00ff8840',padding:'0 24px',cursor:loading?'not-allowed':'pointer',color:'#030a06',fontWeight:900,fontSize:12,letterSpacing:'1px',fontFamily:'inherit',transition:'all .2s',whiteSpace:'nowrap',boxShadow:loading?'none':'inset 0 0 20px #00000030'}}>
                  {loading?<span style={{color:'#00ff8880'}}>···</span>:'ANALYZE'}
                </button>
              </div>
              {loading && <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00ff88,#00d4ff,#a855f7,#00ff88)',backgroundSize:'200%',animation:'holo .8s linear infinite'}}/>}
            </div>

            {/* TIMEFRAME */}
            <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
              <span style={{fontSize:9,color:'#1a4a2a',letterSpacing:'1px',marginRight:4}}>CHART:</span>
              {['1M','3M','6M','1Y'].map(tf=>(
                <button key={tf} onClick={()=>setTimeframe(tf)} style={{background:timeframe===tf?'#00ff8820':'transparent',border:`1px solid ${timeframe===tf?'#00ff88':'#00ff8820'}`,borderRadius:2,padding:'4px 12px',fontSize:10,cursor:'pointer',color:timeframe===tf?'#00ff88':'#1a4a2a',fontFamily:'inherit',fontWeight:700,letterSpacing:'1px',transition:'all .15s'}}>
                  {tf}
                </button>
              ))}
            </div>
            {/* TICKER CHIPS */}
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {POPULAR.map(s=><button key={s} className="chip" onClick={()=>analyze(s)}>{s}</button>)}
            </div>
            <div style={{fontSize:10,color:'#1a4a2a',letterSpacing:'1px'}}>// ANALYSIS TAKES ~15 SECONDS · MODEL: NANO-BANANA-PRO</div>
          </div>

          {/* RIGHT: Radar */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20}} className="hide-sm">
            <div style={{position:'relative'}}>
              <Radar active={loading}/>
              {loading && (
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#00ff88',letterSpacing:'2px',fontWeight:700}}>SCANNING</div>
                  <div style={{fontSize:14,color:'#00ff88',fontWeight:900,letterSpacing:'1px',marginTop:4}}>{input}</div>
                </div>
              )}
            </div>
            <div style={{fontSize:9,color:'#1a4a2a',letterSpacing:'2px',textAlign:'center'}}>
              NEURAL_SCANNER_v2.0<br/>5-AGENT SYSTEM ONLINE
            </div>
            {/* Agent status indicators */}
            <div style={{display:'flex',flexDirection:'column',gap:6,width:'100%'}}>
              {AGENTS.map((ag,i)=>(
                <div key={ag.label} style={{display:'flex',alignItems:'center',gap:8,fontSize:10}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:loading&&agentIdx===i?ag.clr:'#1a4a2a',boxShadow:loading&&agentIdx===i?`0 0 8px ${ag.clr}`:'none',transition:'all .3s',flexShrink:0}}/>
                  <span style={{color:loading&&agentIdx>=i?ag.clr:'#1a4a2a',transition:'color .3s',letterSpacing:'.5px'}}>{ag.label.toUpperCase()}</span>
                  {loading&&agentIdx>i && <span style={{marginLeft:'auto',color:ag.clr,fontSize:9}}>DONE</span>}
                  {loading&&agentIdx===i && <span style={{marginLeft:'auto',color:ag.clr,fontSize:9,animation:'blink 1s infinite'}}>ACTIVE</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LOADING — full neural network visualization */}
      {loading && (
        <div style={{maxWidth:700,margin:'0 auto 60px',padding:'0 24px',position:'relative',zIndex:2}}>
          <div style={{background:'rgba(3,12,6,.95)',border:'1px solid #00ff8830',borderRadius:4,overflow:'hidden',backdropFilter:'blur(16px)',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00ff88,#00d4ff,#a855f7)',backgroundSize:'200%',animation:'holo .6s linear infinite'}}/>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #00ff8815',display:'flex',alignItems:'center',gap:12}}>
              <div style={{display:'flex',gap:6}}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}</div>
              <span style={{fontSize:11,color:'#4a7a6a',letterSpacing:'.5px'}}>yn_analyzer — {input}.exe</span>
              <div style={{marginLeft:'auto',fontSize:10,color:'#00ff88',animation:'blink 1s infinite',letterSpacing:'1px'}}>● RUNNING</div>
            </div>
            {/* Terminal output */}
            <div style={{padding:'16px 24px',borderBottom:'1px solid #00ff8815',fontFamily:'monospace',fontSize:11}}>
              {AGENTS.slice(0,agentIdx+1).map((ag,i)=>(
                <div key={ag.label} style={{marginBottom:4,animation:'fadeUp .3s ease'}}>
                  <span style={{color:'#1a4a2a'}}>[{String(i+1).padStart(2,'0')}] </span>
                  <span style={{color:ag.clr}}>{ag.label.toUpperCase()}_AGENT</span>
                  <span style={{color:'#1a4a2a'}}> → </span>
                  <span style={{color:'#4a7a6a'}}>{ag.desc}</span>
                  {agentIdx>i && <span style={{color:ag.clr,marginLeft:8}}>✓ COMPLETE</span>}
                  {agentIdx===i && <span style={{color:ag.clr,animation:'blink .8s infinite',marginLeft:8}}>▋ PROCESSING...</span>}
                </div>
              ))}
            </div>
            {/* Neural network viz */}
            <div style={{height:160,padding:'0 24px'}}>
              <NeuralCanvas active={loading} agentIdx={agentIdx}/>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{maxWidth:580,margin:'0 auto 48px',padding:'0 24px',position:'relative',zIndex:2}}>
          <div style={{background:'rgba(255,45,120,.08)',border:'1px solid rgba(255,45,120,.3)',borderRadius:2,padding:'12px 18px',color:'#ff2d78',fontSize:12,fontFamily:'monospace',letterSpacing:'.5px'}}>
            [ERROR] {error}
          </div>
        </div>
      )}

      {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
      {result && a && !loading && (
        <div ref={resultsRef} style={{maxWidth:1060,margin:'0 auto 80px',padding:'0 20px',position:'relative',zIndex:2}}>

          {/* SYSTEM OUTPUT HEADER */}
          <div style={{fontFamily:'monospace',fontSize:11,marginBottom:20,padding:'12px 16px',background:'rgba(3,12,6,.9)',border:'1px solid #00ff8820',borderRadius:2}}>
            <span style={{color:'#1a4a2a'}}>[ANALYSIS COMPLETE] </span>
            <span style={{color:'#00ff88'}}>{result.ticker}</span>
            <span style={{color:'#1a4a2a'}}> — {result.name} — {result.industry}</span>
            <span style={{marginLeft:16,color:upDay?'#00ff88':'#ff2d78',fontWeight:700}}>${result.price.toFixed(2)} ({upDay?'+':''}{result.change1d.toFixed(2)}%)</span>
          </div>

          {/* VERDICT ROW */}
          <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:16,alignItems:'center',marginBottom:16}} className="grid-2">
            {/* Confidence ring */}
            <div style={{position:'relative',width:88,height:88}}>
              <Ring pct={a.confidence} clr={rCfg.clr} size={88}/>
              <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:17,fontWeight:900,color:rCfg.clr,fontFamily:'monospace',textShadow:`0 0 12px ${rCfg.clr}`}}>{a.confidence}</span>
                <span style={{fontSize:7,color:'#4a7a6a',letterSpacing:1}}>CONF%</span>
              </div>
            </div>

            <div>
              <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>// PORTFOLIO MANAGER VERDICT</div>
              <div style={{fontSize:36,fontWeight:900,letterSpacing:'-1px',color:rCfg.clr,textShadow:`0 0 30px ${rCfg.glow},0 0 60px ${rCfg.glow}`,animation:'glitch 8s infinite'}}>{a.rating}</div>
              <div style={{fontSize:11,color:'#4a7a6a',marginTop:4,letterSpacing:'.5px'}}>{a.time_horizon} · {a.sentiment} sentiment</div>
            </div>

            <div style={{textAlign:'right'}}>
              <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>// 12-MONTH TARGET</div>
              <div style={{fontSize:32,fontWeight:900,color:'#00d4ff',fontFamily:'monospace',textShadow:'0 0 20px #00d4ff'}}>${a.price_target.toFixed(2)}</div>
              <div style={{fontSize:12,color:((a.price_target-result.price)/result.price*100)>=0?'#00ff88':'#ff2d78',fontWeight:700,marginTop:4}}>
                {((a.price_target-result.price)/result.price*100).toFixed(1)}% upside
              </div>
            </div>
          </div>

          {/* CANDLESTICK CHART */}
          {result.candles && result.candles.length > 5 && (
            <div className="card" style={{padding:'8px',marginBottom:12,overflow:'hidden'}}>
              {/* Timeframe selector inside chart card */}
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px 4px'}}>
                <span style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px'}}>// CHART_VIEW</span>
                <div style={{marginLeft:'auto',display:'flex',gap:5}}>
                  {['1M','3M','6M','1Y'].map(tf=>(
                    <button key={tf} onClick={()=>{ setTimeframe(tf); if(result) result.timeframe=tf }}
                      style={{background:result.timeframe===tf?'#00ff8820':'transparent',border:`1px solid ${result.timeframe===tf?'#00ff88':'#00ff8815'}`,borderRadius:2,padding:'3px 10px',fontSize:9,cursor:'pointer',color:result.timeframe===tf?'#00ff88':'#1a4a2a',fontFamily:'inherit',fontWeight:700,letterSpacing:'1px'}}>
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <CandlestickChart
                candles={result.candles}
                ticker={result.ticker}
                timeframe={result.timeframe}
                levels={{
                  entry_low:     a.entry_low,
                  entry_high:    a.entry_high,
                  stop_loss:     a.stop_loss,
                  take_profit_1: a.take_profit_1,
                  take_profit_2: a.take_profit_2,
                  price:         result.price,
                }}
              />
            </div>
          )}

          {/* SUMMARY */}
          <div className="card" style={{padding:'18px 22px',marginBottom:12,borderLeft:`2px solid ${rCfg.clr}`,boxShadow:`-4px 0 20px ${rCfg.glow}`}}>
            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:8}}>// EXECUTIVE_SUMMARY</div>
            <p style={{fontSize:13,lineHeight:1.75,color:'#a0ffcc',letterSpacing:'.2px'}}>{a.executive_summary}</p>
          </div>

          {/* THESIS + SCORES */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'20px 22px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:12}}>// INVESTMENT_THESIS</div>
              <p style={{fontSize:13,lineHeight:1.8,color:'#a0ffcc',marginBottom:18,letterSpacing:'.2px'}}>{a.investment_thesis}</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={{background:'rgba(0,255,136,.05)',border:'1px solid rgba(0,255,136,.2)',borderRadius:2,padding:'12px 14px'}}>
                  <div style={{fontSize:9,color:'#00ff88',letterSpacing:'1px',marginBottom:8}}>// BULL_CASE</div>
                  <p style={{fontSize:12,color:'#a0ffcc',lineHeight:1.6}}>{a.bull_case}</p>
                </div>
                <div style={{background:'rgba(255,45,120,.05)',border:'1px solid rgba(255,45,120,.2)',borderRadius:2,padding:'12px 14px'}}>
                  <div style={{fontSize:9,color:'#ff2d78',letterSpacing:'1px',marginBottom:8}}>// BEAR_CASE</div>
                  <p style={{fontSize:12,color:'#a0ffcc',lineHeight:1.6}}>{a.bear_case}</p>
                </div>
              </div>
            </div>

            <div className="card" style={{padding:'20px 22px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:14}}>// AGENT_SCORES</div>
              <ScoreBar score={a.fundamentals_score} label="FUNDAMENTALS" clr="#00ff88"/>
              <ScoreBar score={a.technical_score}    label="TECHNICAL"    clr="#00d4ff"/>
              <ScoreBar score={a.sentiment_score}    label="SENTIMENT"    clr="#a855f7"/>
              <div style={{borderTop:'1px solid #00ff8815',paddingTop:12,marginTop:4,display:'flex',flexDirection:'column',gap:8}}>
                {[['SENTIMENT',a.sentiment,sClr],['VS_SECTOR',a.vs_sector,a.vs_sector==='Outperform'?'#00ff88':a.vs_sector==='Underperform'?'#ff2d78':'#ff9500'],['WALL_ST.',a.analyst_consensus,rCfg.clr]].map(([l,v,c])=>(
                  <div key={l as string} style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:10,color:'#4a7a6a',letterSpacing:'.5px'}}>{l}</span>
                    <span style={{fontSize:10,fontWeight:700,color:c as string,textShadow:`0 0 8px ${c}`}}>{v as string}</span>
                  </div>
                ))}
                {result.analystTotal>0 && (
                  <div style={{marginTop:4}}>
                    <div style={{fontSize:9,color:'#1a4a2a',marginBottom:4,letterSpacing:'.5px'}}>{result.analystBuy}B / {result.analystHold}H / {result.analystSell}S</div>
                    <div style={{height:3,background:'#041810',borderRadius:1,overflow:'hidden',display:'flex'}}>
                      <div style={{background:'#00ff88',width:`${(result.analystBuy/result.analystTotal)*100}%`,boxShadow:'0 0 6px #00ff88'}}/>
                      <div style={{background:'#ff9500',width:`${(result.analystHold/result.analystTotal)*100}%`}}/>
                      <div style={{background:'#ff2d78',width:`${(result.analystSell/result.analystTotal)*100}%`}}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ENTRY/EXIT */}
          <div className="card" style={{padding:'18px 22px',marginBottom:12}}>
            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:14}}>// ENTRY_EXIT_STRATEGY</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8}}>
              {[
                {label:'ENTRY_ZONE',val:`$${a.entry_low.toFixed(2)}–$${a.entry_high.toFixed(2)}`,clr:'#00d4ff'},
                {label:'STOP_LOSS', val:`$${a.stop_loss.toFixed(2)}`,  clr:'#ff2d78'},
                {label:'TARGET_1',  val:`$${a.take_profit_1.toFixed(2)}`,clr:'#00ff88'},
                {label:'TARGET_2',  val:`$${a.take_profit_2.toFixed(2)}`,clr:'#00ff88'},
                {label:'R/R_RATIO', val:a.stop_loss&&a.entry_high?`1:${(Math.abs(a.take_profit_1-a.entry_high)/Math.abs(a.entry_high-a.stop_loss)).toFixed(1)}`:'N/A',clr:'#a855f7'},
                {label:'ALLOC_%',   val:`${a.position_size_pct??2}%`,   clr:'#ff9500'},
              ].map(({label,val,clr})=>(
                <div key={label} style={{background:`${clr}08`,border:`1px solid ${clr}25`,borderRadius:2,padding:'12px 14px'}}>
                  <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:6}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:800,fontFamily:'monospace',color:clr,textShadow:`0 0 10px ${clr}80`,letterSpacing:'.5px'}}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* OPTIONS + POSITION CALC */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'20px 22px',borderColor:a.options.type==='CALL'?'#00ff8840':a.options.type==='PUT'?'#ff2d7840':'#00ff8820'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:5}}>// OPTIONS_PLAY</div>
                  <div style={{fontSize:18,fontWeight:900,color:a.options.type==='CALL'?'#00ff88':a.options.type==='PUT'?'#ff2d78':'#ff9500',textShadow:`0 0 20px ${a.options.type==='CALL'?'#00ff88':a.options.type==='PUT'?'#ff2d78':'#ff9500'}`}}>{a.options.strategy}</div>
                </div>
                <div style={{background:a.options.type==='CALL'?'#00ff8815':'#ff2d7815',border:`1px solid ${a.options.type==='CALL'?'#00ff8840':'#ff2d7840'}`,borderRadius:2,padding:'5px 14px',fontSize:12,fontWeight:900,color:a.options.type==='CALL'?'#00ff88':'#ff2d78',fontFamily:'monospace',letterSpacing:'1px'}}>
                  {a.options.type}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                {[
                  {label:'STRIKE',  val:`$${a.options.strike.toFixed(2)}`},
                  {label:'EXPIRY',  val:`${a.options.expiry_days}d`},
                  {label:'PREMIUM', val:`$${a.options.est_premium.toFixed(2)}`},
                  {label:'B/EVEN',  val:`$${(a.options.type==='CALL'?a.options.breakeven_call:a.options.breakeven_put).toFixed(2)}`},
                  {label:'MAX_LOSS',val:`$${a.options.max_loss}`},
                  {label:'IV_ENV',  val:a.options.iv_environment?.split(' — ')[0]??'N/A'},
                ].map(({label,val})=>(
                  <div key={label} style={{background:'rgba(0,20,10,.8)',border:'1px solid #00ff8815',borderRadius:2,padding:'9px 12px'}}>
                    <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:4}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:'#a0ffcc'}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(0,20,10,.8)',border:'1px solid #00ff8815',borderRadius:2,padding:'10px 14px',fontSize:12,color:'#4a7a6a',lineHeight:1.7,letterSpacing:'.2px'}}>
                <span style={{color:'#4a7a6a',fontSize:9,letterSpacing:'1px',display:'block',marginBottom:4}}>// REASONING</span>
                <span style={{color:'#a0ffcc'}}>{a.options.reasoning}</span>
              </div>
            </div>

            <div className="card" style={{padding:'20px 22px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:14}}>// POSITION_SIZING_CALC</div>
              {[{label:'ACCOUNT_SIZE ($)',val:account,set:setAccount},{label:'RISK_PER_TRADE (%)',val:riskPct,set:setRiskPct}].map(({label,val,set})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} style={{width:'100%',background:'rgba(0,20,10,.9)',border:'1px solid #00ff8830',borderRadius:2,padding:'10px 14px',color:'#00ff88',fontSize:14,fontFamily:'monospace',fontWeight:700,outline:'none',letterSpacing:'1px'}}/>
                </div>
              ))}
              <div style={{borderTop:'1px solid #00ff8815',paddingTop:12,display:'flex',flexDirection:'column',gap:10}}>
                {[
                  {label:'RISK_AMOUNT',  val:`$${riskDollar}`,              clr:'#ff2d78'},
                  {label:'STOP_LOSS',    val:`$${a.stop_loss.toFixed(2)}`,  clr:'#ff9500'},
                  {label:'SHARES_TO_BUY',val:posSize>0?posSize.toString():'N/A',clr:'#00ff88'},
                  {label:'POS_VALUE',    val:posSize>0?`$${(posSize*result.price).toFixed(0)}`:'N/A',clr:'#00d4ff'},
                  {label:'AI_ALLOC_%',   val:`${a.position_size_pct??2}% of portfolio`,clr:'#a855f7'},
                ].map(({label,val,clr})=>(
                  <div key={label} style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:10,color:'#4a7a6a',letterSpacing:'.5px'}}>{label}</span>
                    <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:clr,textShadow:`0 0 8px ${clr}`}}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TIMEFRAMES + LEVELS + RISKS */}
          <div className="grid-3" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:12}}>// TIMEFRAME_OUTLOOK</div>
              {a.timeframes && Object.entries(a.timeframes).map(([tf,val])=>(
                <div key={tf} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #00ff8810'}}>
                  <span style={{fontSize:10,color:'#4a7a6a',letterSpacing:'.5px'}}>{tf.replace('_',' ').toUpperCase()}</span>
                  <span style={{fontSize:10,fontWeight:700,color:TF_CLR[val as string]??'#ff9500',textShadow:`0 0 8px ${TF_CLR[val as string]??'#ff9500'}`,letterSpacing:'1px'}}>{(val as string).toUpperCase()}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:12}}>// KEY_PRICE_LEVELS</div>
              {a.key_levels&&[
                {label:'STRONG_RESIST',val:a.key_levels.strong_resistance,clr:'#ff2d78'},
                {label:'RESISTANCE',   val:a.key_levels.resistance,       clr:'#ff9500'},
                {label:'CURRENT',      val:result.price,                  clr:'#a0ffcc'},
                {label:'SUPPORT',      val:a.key_levels.support,          clr:'#00d4ff'},
                {label:'STRONG_SUPP',  val:a.key_levels.strong_support,   clr:'#00ff88'},
              ].map(({label,val,clr})=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',marginBottom:5,background:`${clr}08`,border:`1px solid ${clr}20`,borderRadius:2}}>
                  <span style={{fontSize:9,color:'#4a7a6a',letterSpacing:'.3px'}}>{label}</span>
                  <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:clr,textShadow:`0 0 8px ${clr}`}}>${(val??0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:9,color:'#00d4ff',letterSpacing:'2px',marginBottom:10}}>// CATALYSTS</div>
              {(a.catalysts??[]).map((c,i)=>(
                <div key={i} style={{display:'flex',gap:8,padding:'8px 10px',marginBottom:6,background:'rgba(0,212,255,.06)',border:'1px solid rgba(0,212,255,.2)',borderRadius:2}}>
                  <span style={{color:'#00d4ff',fontSize:10,fontWeight:700,flexShrink:0}}>[{i+1}]</span>
                  <span style={{fontSize:11,color:'#a0ffcc',lineHeight:1.5}}>{c}</span>
                </div>
              ))}
              <div style={{fontSize:9,color:'#ff2d78',letterSpacing:'2px',marginBottom:10,marginTop:12}}>// KEY_RISKS</div>
              {(a.risks??[]).map((r,i)=>(
                <div key={i} style={{display:'flex',gap:8,padding:'8px 10px',marginBottom:6,background:'rgba(255,45,120,.05)',border:'1px solid rgba(255,45,120,.18)',borderRadius:2}}>
                  <span style={{color:'#ff2d78',fontSize:10,fontWeight:700,flexShrink:0}}>[{i+1}]</span>
                  <span style={{fontSize:11,color:'#a0ffcc',lineHeight:1.5}}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{textAlign:'center',marginTop:24}}>
            <div style={{fontSize:9,color:'#1a4a2a',letterSpacing:'2px',marginBottom:12}}>// ANALYZE_ANOTHER_TICKER</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center'}}>
              {POPULAR.filter(s=>s!==result.ticker).slice(0,10).map(s=><button key={s} className="chip" onClick={()=>analyze(s)}>{s}</button>)}
            </div>
          </div>
        </div>
      )}

      <div style={{textAlign:'center',padding:'20px',borderTop:'1px solid #00ff8810',fontSize:9,color:'#1a4a2a',position:'relative',zIndex:2,letterSpacing:'2px',background:'rgba(3,10,6,.9)',backdropFilter:'blur(12px)'}}>
        // NOT FINANCIAL ADVICE · EDUCATIONAL PURPOSES ONLY · ALWAYS DYOR
      </div>
    </div>
  )
}
