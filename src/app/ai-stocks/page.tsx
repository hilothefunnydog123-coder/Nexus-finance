'use client'

import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react'
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
  nextEarnings:string|null;lastEPS:number|null;estEPS:number|null;epsSurprise:string|null
  news?:{headline:string;source:string;url:string;datetime:number}[]
  candles:Candle[];timeframe:string;analysis:Analysis
}

type ScanResult = {
  ticker:string;name?:string;price?:number;change1d?:number;pe?:number
  industry?:string;nextEarnings?:string|null;error:boolean
  rating?:string;confidence?:number;price_target?:number
  entry_low?:number;entry_high?:number;stop_loss?:number;take_profit_1?:number
  one_liner?:string;sentiment?:string;top_risk?:string;urgency?:string
}

const RATING_SCORE: Record<string,number> = {
  'Strong Buy':5,'Buy':4,'Hold':3,'Sell':2,'Strong Sell':1,
}
const RATING_CLR: Record<string,string> = {
  'Strong Buy':'#00ff88','Buy':'#00c896','Hold':'#ff9500','Sell':'#ff6b35','Strong Sell':'#ff2d78',
}

// ── WATCHLIST SCANNER UI ──────────────────────────────────────────────────────
function ScannerPanel({ isPro, onSelectTicker }: { isPro:boolean; onSelectTicker:(t:string)=>void }) {
  const [watchlist,   setWatchlist]  = useState<string[]>(['AAPL','NVDA','TSLA','MSFT','AMZN'])
  const [addInput,    setAddInput]   = useState('')
  const [scanning,    setScanning]   = useState(false)
  const [results,     setResults]    = useState<ScanResult[]>([])
  const [scanError,   setScanError]  = useState('')
  const [scanAgentIdx,setScanAgent]  = useState(0)
  const scanRef = useRef<NodeJS.Timeout|null>(null)

  // Persist watchlist
  useEffect(() => {
    const saved = localStorage.getItem('yn_watchlist')
    if (saved) { try { setWatchlist(JSON.parse(saved)) } catch {} }
  }, [])
  function saveList(list: string[]) { setWatchlist(list); localStorage.setItem('yn_watchlist', JSON.stringify(list)) }
  function addTicker() {
    const t = addInput.trim().toUpperCase()
    if (!t || watchlist.includes(t) || watchlist.length >= 8) return
    saveList([...watchlist, t]); setAddInput('')
  }
  function removeTicker(t: string) { saveList(watchlist.filter(x => x !== t)) }

  async function runScan() {
    if (!isPro && watchlist.length > 3) { setScanError('Upgrade to Pro to scan more than 3 tickers'); return }
    setScanning(true); setResults([]); setScanError('')
    let idx=0; scanRef.current=setInterval(()=>{idx=(idx+1)%5;setScanAgent(idx)},600)
    try {
      const r = await fetch('/api/scan-watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tickers:watchlist})})
      const d = await r.json()
      if (d.error) { setScanError(d.error); return }
      setResults(d.results ?? [])
    } catch { setScanError('Scan failed. Try again.') }
    finally { if(scanRef.current)clearInterval(scanRef.current); setScanning(false) }
  }

  const agentNames = ['Fetching data...','Running fundamentals...','Technical scan...','Sentiment analysis...','Ranking signals...']

  return (
    <div>
      {/* Watchlist editor */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:10}}>// YOUR_WATCHLIST {watchlist.length}/8</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {watchlist.map(t=>(
            <div key={t} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,20,10,.9)',border:'1px solid #00ff8830',borderRadius:2,padding:'6px 12px'}}>
              <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:'#00ff88',letterSpacing:'1px'}}>{t}</span>
              <button onClick={()=>removeTicker(t)} style={{background:'transparent',border:'none',color:'#4a7a6a',cursor:'pointer',fontSize:14,lineHeight:1,padding:0,fontFamily:'inherit'}}>×</button>
            </div>
          ))}
          {watchlist.length < 8 && (
            <div style={{display:'flex',gap:0}}>
              <input value={addInput} onChange={e=>setAddInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&addTicker()}
                placeholder="+ ADD" style={{width:80,background:'rgba(0,20,10,.9)',border:'1px solid #00ff8815',borderRight:'none',borderRadius:'2px 0 0 2px',padding:'6px 10px',color:'#00ff88',fontSize:11,fontFamily:'monospace',fontWeight:700,outline:'none',letterSpacing:'1px'}}/>
              <button onClick={addTicker} style={{background:'#00ff8820',border:'1px solid #00ff8830',borderRadius:'0 2px 2px 0',padding:'6px 10px',color:'#00ff88',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>ADD</button>
            </div>
          )}
        </div>

        <button onClick={runScan} disabled={scanning||watchlist.length===0}
          style={{width:'100%',background:scanning?'transparent':'linear-gradient(135deg,#00ff88,#00d4ff)',border:`1px solid ${scanning?'#00ff8830':'transparent'}`,borderRadius:2,padding:'14px',color:scanning?'#00ff88':'#030a06',fontWeight:900,fontSize:13,cursor:scanning?'not-allowed':'pointer',fontFamily:'monospace',letterSpacing:'1px',transition:'all .2s',boxShadow:scanning?'none':'0 0 30px rgba(0,255,136,.3)'}}>
          {scanning ? agentNames[scanAgentIdx] : `⚡ SCAN ${watchlist.length} STOCKS`}
        </button>
        {!isPro && <div style={{fontSize:10,color:'#1a4a2a',marginTop:6,letterSpacing:'.5px',textAlign:'center'}}>Free: scan up to 3 · Pro: scan up to 8</div>}
      </div>

      {scanError && <div style={{background:'rgba(255,45,120,.08)',border:'1px solid rgba(255,45,120,.2)',borderRadius:2,padding:'10px 14px',color:'#ff2d78',fontSize:11,marginBottom:16}}>{scanError}</div>}

      {/* Results */}
      {results.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:4}}>// RANKED_BY_SIGNAL_STRENGTH</div>
          {results.map((r,i)=>{
            const clr = r.error ? '#4a7a6a' : (RATING_CLR[r.rating ?? '']??'#f59e0b')
            if (r.error) return (
              <div key={r.ticker} style={{background:'rgba(0,20,10,.5)',border:'1px solid #00ff8810',borderRadius:2,padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontFamily:'monospace',fontWeight:800,color:'#4a7a6a',fontSize:13}}>{r.ticker}</span>
                <span style={{fontSize:11,color:'#1a4a2a'}}>scan failed</span>
              </div>
            )
            const upDay = (r.change1d ?? 0) >= 0
            const urgencyClr = r.urgency==='high'?'#ff2d78':r.urgency==='medium'?'#f59e0b':'#4a7a6a'
            return (
              <div key={r.ticker} onClick={()=>onSelectTicker(r.ticker)}
                style={{background:'rgba(0,20,10,.8)',border:`1px solid ${clr}30`,borderRadius:2,padding:'14px 16px',cursor:'pointer',transition:'all .2s',position:'relative',overflow:'hidden'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=clr+'60';e.currentTarget.style.background='rgba(0,40,20,.9)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=clr+'30';e.currentTarget.style.background='rgba(0,20,10,.8)'}}>
                {/* Rank badge */}
                <div style={{position:'absolute',top:0,left:0,width:3,height:'100%',background:clr,boxShadow:`0 0 8px ${clr}`}}/>
                <div style={{marginLeft:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:16,fontWeight:900,fontFamily:'monospace',color:'#00ff88',letterSpacing:'1px'}}>{r.ticker}</span>
                    <span style={{fontSize:11,color:'#4a7a6a'}}>{r.name}</span>
                    <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,color:clr,background:`${clr}15`,padding:'2px 10px',borderRadius:2,border:`1px solid ${clr}30`}}>{r.rating}</span>
                    <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:upDay?'#00ff88':'#ff2d78'}}>{upDay?'+':''}{r.change1d?.toFixed(2)}%</span>
                    <span style={{fontSize:11,fontFamily:'monospace',color:'#a0ffcc'}}>${r.price?.toFixed(2)}</span>
                  </div>
                  <div style={{fontSize:12,color:'#a0ffcc',marginBottom:6,lineHeight:1.5}}>{r.one_liner}</div>
                  <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{fontSize:10,color:'#4a7a6a'}}>CONFIDENCE</div>
                      <div style={{height:4,width:60,background:'#041810',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${r.confidence}%`,background:`${clr}`,boxShadow:`0 0 6px ${clr}`}}/>
                      </div>
                      <div style={{fontSize:10,fontFamily:'monospace',color:clr,fontWeight:700}}>{r.confidence}%</div>
                    </div>
                    {r.nextEarnings && <div style={{fontSize:10,color:'#4a7a6a'}}>📅 EPS {r.nextEarnings}</div>}
                    <div style={{fontSize:10,fontWeight:700,color:urgencyClr,letterSpacing:'.5px',marginLeft:'auto'}}>
                      {r.urgency?.toUpperCase()} URGENCY → FULL ANALYSIS
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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

// Canvas text helpers for share card / video
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text||'').split(/\s+/); const lines: string[] = []; let line = ''
  for (const w of words) { const test = line ? line+' '+w : w; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w } else line = test }
  if (line) lines.push(line); return lines
}
function oneLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let s = String(text||''); if (ctx.measureText(s).width <= maxWidth) return s
  while (s.length > 1 && ctx.measureText(s+'…').width > maxWidth) s = s.slice(0, -1)
  return s.trim()+'…'
}
function splitSentences(t?: string): string[] {
  return String(t||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length > 12)
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

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({text,clr}:{text:string;clr:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'26px 0 14px'}}>
      <span style={{fontSize:12,fontWeight:800,letterSpacing:'3px',color:clr,textShadow:`0 0 16px ${clr}80`,whiteSpace:'nowrap'}}>{text}</span>
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${clr}40,transparent)`}}/>
    </div>
  )
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

// ── ANIMATED COUNT-UP NUMBER ──────────────────────────────────────────────────
function AnimatedNum({value,prefix='',suffix='',decimals=2,style}:{value:number;prefix?:string;suffix?:string;decimals?:number;style?:CSSProperties}){
  const [n,setN]=useState(0)
  useEffect(()=>{
    let raf=0; const dur=950; const start=performance.now()
    const tick=(t:number)=>{const p=Math.min(1,(t-start)/dur); const e=1-Math.pow(1-p,3); setN(value*e); if(p<1)raf=requestAnimationFrame(tick)}
    raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf)
  },[value])
  return <span style={style}>{prefix}{n.toFixed(decimals)}{suffix}</span>
}

// ── CONVICTION TUG-OF-WAR ──────────────────────────────────────────────────────
function ConvictionMeter({rating,confidence,fund,tech,sent}:{rating:string;confidence:number;fund:number;tech:number;sent:number}){
  const scoreAvg=(fund+tech+sent)/3
  let bull=scoreAvg*10+(((RATING_SCORE[rating]??3)-3)*8)
  bull=Math.max(6,Math.min(94,Math.round(bull)))
  const bear=100-bull
  const honest = confidence<60 ? 'LOW CONVICTION — treat as a lean, not a layup' : confidence<75 ? 'MODERATE CONVICTION' : 'HIGH CONVICTION'
  const hClr = confidence<60?'#ff9500':confidence<75?'#00d4ff':'#00ff88'
  return (
    <div style={{marginTop:4}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontFamily:'monospace',marginBottom:6,letterSpacing:'.5px'}}>
        <span style={{color:'#00ff88',fontWeight:800}}>🐂 BULLS {bull}%</span>
        <span style={{color:'#ff2d78',fontWeight:800}}>{bear}% BEARS 🐻</span>
      </div>
      <div style={{position:'relative',height:10,borderRadius:6,overflow:'hidden',display:'flex',border:'1px solid #00ff8820'}}>
        <div style={{width:`${bull}%`,background:'linear-gradient(90deg,#00ff8830,#00ff88)',boxShadow:'0 0 12px #00ff8860',transition:'width 1s cubic-bezier(.22,1,.36,1)'}}/>
        <div style={{flex:1,background:'linear-gradient(90deg,#ff2d78,#ff2d7830)',boxShadow:'0 0 12px #ff2d7860'}}/>
        <div style={{position:'absolute',top:-2,left:`calc(${bull}% - 1px)`,width:2,height:14,background:'#fff',boxShadow:'0 0 8px #fff',transition:'left 1s cubic-bezier(.22,1,.36,1)'}}/>
      </div>
      <div style={{fontSize:9.5,color:hClr,letterSpacing:'1px',marginTop:7,fontWeight:700}}>● {honest} · {confidence}% CONFIDENCE</div>
    </div>
  )
}

// ── OPTIONS PAYOFF DIAGRAM ─────────────────────────────────────────────────────
function OptionsPayoff({type,strike,premium,spot}:{type:string;strike:number;premium:number;spot:number}){
  if((type!=='CALL'&&type!=='PUT')||!strike||!premium||!spot) return null
  const lo=Math.min(spot,strike)*0.82, hi=Math.max(spot,strike)*1.18
  const N=64
  const pts:{s:number;pl:number}[]=[]
  for(let i=0;i<=N;i++){const s=lo+(hi-lo)*i/N; const intr=type==='CALL'?Math.max(0,s-strike):Math.max(0,strike-s); pts.push({s,pl:intr-premium})}
  const pls=pts.map(p=>p.pl), maxPl=Math.max(...pls), minPl=Math.min(...pls)
  const be=type==='CALL'?strike+premium:strike-premium
  const W=600,H=200,ML=8,MR=8,MT=14,MB=22, cw=W-ML-MR, ch=H-MT-MB
  const x=(s:number)=>ML+(s-lo)/(hi-lo)*cw
  const y=(pl:number)=>MT+ch-(pl-minPl)/((maxPl-minPl)||1)*ch
  const zeroY=y(0)
  const line=pts.map((p,i)=>`${i?'L':'M'}${x(p.s).toFixed(1)} ${y(p.pl).toFixed(1)}`).join(' ')
  const area=(pos:boolean)=>{const seg=pts.filter(p=>pos?p.pl>=0:p.pl<=0); if(seg.length<2)return ''
    return seg.map((p,i)=>`${i?'L':'M'}${x(p.s).toFixed(1)} ${y(p.pl).toFixed(1)}`).join(' ')+' '+seg.slice().reverse().map(p=>`L${x(p.s).toFixed(1)} ${zeroY.toFixed(1)}`).join(' ')+' Z'}
  const movePct=((be-spot)/spot*100)
  const mk=(s:number,c:string,lbl:string)=>(
    <g key={lbl}>
      <line x1={x(s)} y1={MT} x2={x(s)} y2={H-MB} stroke={c} strokeWidth={1} strokeDasharray="3 3" opacity={0.7}/>
      <text x={x(s)} y={MT-3} fill={c} fontSize={9} fontFamily="monospace" textAnchor="middle">{lbl}</text>
    </g>
  )
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
        <path d={area(true)}  fill="#00ff8818"/>
        <path d={area(false)} fill="#ff2d7818"/>
        <line x1={ML} y1={zeroY} x2={W-MR} y2={zeroY} stroke="#4a7a6a" strokeWidth={1} strokeDasharray="2 4"/>
        <path d={line} fill="none" stroke="#a855f7" strokeWidth={2} style={{filter:'drop-shadow(0 0 6px #a855f7)'}}/>
        {mk(strike,'#ffffff','STRIKE')}
        {mk(be,'#ff9500','B/E')}
        {mk(spot,'#00d4ff','SPOT')}
      </svg>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:8}}>
        {[
          {l:'BREAKEVEN',v:`$${be.toFixed(2)}`,c:'#ff9500'},
          {l:'MOVE NEEDED',v:`${movePct>=0?'+':''}${movePct.toFixed(1)}%`,c:Math.abs(movePct)<5?'#00ff88':'#ff9500'},
          {l:'MAX LOSS / CONTRACT',v:`$${(premium*100).toFixed(0)}`,c:'#ff2d78'},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:'rgba(0,20,10,.6)',border:`1px solid ${c}25`,borderRadius:2,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:8,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:3}}>{l}</div>
            <div style={{fontSize:13,fontWeight:800,fontFamily:'monospace',color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:9,color:'#1a4a2a',letterSpacing:'.5px',marginTop:8,textAlign:'center'}}>// 1 CONTRACT = 100 SHARES · P/L AT EXPIRY · EST. PREMIUM FROM REALIZED VOL</div>
    </div>
  )
}

// ── EARNINGS COUNTDOWN HELPER ──────────────────────────────────────────────────
function daysUntil(dateStr?:string|null):number|null{
  if(!dateStr) return null
  const d=new Date(dateStr); if(isNaN(d.getTime())) return null
  return Math.ceil((d.getTime()-Date.now())/86400000)
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AIStocksPage() {
  const [mode,setMode]           = useState<'analyze'|'scan'>('analyze')
  const [input,setInput]         = useState('')
  const [loading,setLoading]     = useState(false)
  const [agentIdx,setAgentIdx]   = useState(0)
  const [result,setResult]       = useState<Result|null>(null)
  const [error,setError]         = useState('')
  const [cursorX,setCursorX]     = useState(-100)
  const [cursorY,setCursorY]     = useState(-100)
  const [account,setAccount]     = useState('10000')
  const [riskPct,setRiskPct]     = useState('1')
  const [timeframe,setTimeframe]   = useState('3M')
  const [showPaywall,setShowPaywall] = useState(false)
  const [isPro,setIsPro]           = useState(false)
  const [freeUsed,setFreeUsed]     = useState(0)
  const [pwEmail,setPwEmail]       = useState('')
  const [pwLoading,setPwLoading]   = useState(false)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)
  const resultsRef  = useRef<HTMLDivElement>(null)
  const FREE_LIMIT  = 3

  // ── Head-to-head compare ──
  const [cmpInput,setCmpInput]   = useState('')
  const [cmp,setCmp]             = useState<Result|null>(null)
  const [cmpLoading,setCmpLoading] = useState(false)

  // ── Share (card + video) ──
  const [shareBusy,setShareBusy] = useState<''|'video'|'both'>('')
  const [vidPct,setVidPct]       = useState(0)
  const [canShare,setCanShare]   = useState(false)
  useEffect(()=>{ setCanShare(typeof navigator!=='undefined' && typeof navigator.canShare==='function') },[])

  // ── First-visit onboarding ──
  const [showIntro,setShowIntro] = useState(false)
  useEffect(()=>{ try{ if(!localStorage.getItem('yn_analyzer_intro')) setShowIntro(true) }catch{} },[])
  const dismissIntro = ()=>{ try{ localStorage.setItem('yn_analyzer_intro','1') }catch{}; setShowIntro(false) }

  // ── Per-ticker AI memory ("last time we rated X…") ──
  type TickerHist = { count:number; hitRate:number|null; current:number|null; calls:{id:string;rating:string;analyzed_at:string;price_at_analysis:number;confidence:number;return_pct:number|null;correct:boolean|null}[] }
  const [tickerHist,setTickerHist] = useState<TickerHist|null>(null)
  useEffect(()=>{
    const tk=result?.ticker
    if(!tk){ setTickerHist(null); return }
    let cancelled=false
    fetch(`/api/ai-calls?ticker=${encodeURIComponent(tk)}`).then(r=>r.json()).then((d:TickerHist&{count:number})=>{ if(!cancelled) setTickerHist(d&&d.count>0?d:null) }).catch(()=>{})
    return ()=>{ cancelled=true }
  },[result?.ticker])

  // ── Live options chain (Polygon) — real Greeks/IV/premium, falls back silently ──
  type LiveOpt = { ticker:string; type:string; strike:number; expiration:string|null; dte:number|null; premium:number|null; bid:number|null; ask:number|null; iv:number|null; delta:number|null; gamma:number|null; theta:number|null; vega:number|null; openInterest:number|null; volume:number|null; breakeven:number|null; underlying:number|null }
  const [liveOpt,setLiveOpt] = useState<LiveOpt|null>(null)
  useEffect(()=>{
    const o=result?.analysis?.options
    if(!result?.ticker||!o||(o.type!=='CALL'&&o.type!=='PUT')||!o.strike){ setLiveOpt(null); return }
    let cancelled=false; setLiveOpt(null)
    fetch(`/api/options?symbol=${encodeURIComponent(result.ticker)}&type=${o.type}&strike=${o.strike}&expiry=${o.expiry_days||30}`)
      .then(r=>r.json()).then((d:{ok:boolean;contract:LiveOpt})=>{ if(!cancelled&&d&&d.ok&&d.contract) setLiveOpt(d.contract) }).catch(()=>{})
    return ()=>{ cancelled=true }
  },[result?.ticker])

  // ── Ticker autocomplete ──
  const [sug,setSug]             = useState<{symbol:string;description:string}[]>([])
  const [showSug,setShowSug]     = useState(false)
  const [sugLoading,setSugLoading] = useState(false)
  const [notFound,setNotFound]   = useState(false)
  const sugTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  function onTickerType(v: string) {
    const val = v.toUpperCase().replace(/[^A-Z0-9.\-]/g,'')
    setInput(val); setNotFound(false)
    if (sugTimer.current) clearTimeout(sugTimer.current)
    if (val.trim().length < 1) { setSug([]); setShowSug(false); setSugLoading(false); return }
    setSugLoading(true); setShowSug(true)
    sugTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/symbol-search?q=${encodeURIComponent(val.trim())}`)
        const d = await r.json()
        const list = (d.results ?? []) as {symbol:string;description:string}[]
        setSug(list)
        setNotFound(!d.unavailable && list.length === 0)
      } catch { setSug([]); setNotFound(false) }
      finally { setSugLoading(false) }
    }, 250)
  }
  function pickTicker(sym: string) {
    setInput(sym); setSug([]); setShowSug(false); setNotFound(false)
  }

  // Load usage from localStorage + check for pro activation
  useEffect(() => {
    const month = new Date().toISOString().slice(0,7)
    const stored = JSON.parse(localStorage.getItem('yn_usage') ?? '{}')
    if (stored.month !== month) {
      localStorage.setItem('yn_usage', JSON.stringify({ month, count: 0 }))
      setFreeUsed(0)
    } else {
      setFreeUsed(stored.count ?? 0)
    }
    // Check if pro (cookie set after Stripe payment or URL param)
    const params = new URLSearchParams(window.location.search)
    if (params.get('pro') === '1' || document.cookie.includes('yn-sub-id')) {
      setIsPro(true)
      if (params.get('pro') === '1') {
        window.history.replaceState({}, '', '/ai-stocks')
      }
    }
  }, [])

  async function handlePaywall() {
    if (!pwEmail.includes('@')) return
    setPwLoading(true)
    try {
      const r = await fetch('/api/stripe/analyzer/checkout', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: pwEmail }),
      })
      const d = await r.json()
      if (d.demo) { alert('Stripe not configured yet — add keys to Netlify env vars'); setPwLoading(false); return }
      if (d.url) window.location.href = d.url
    } catch { setPwLoading(false) }
  }

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

    // Check free limit
    if (!isPro) {
      const month   = new Date().toISOString().slice(0,7)
      const stored  = JSON.parse(localStorage.getItem('yn_usage') ?? '{}')
      const count   = stored.month === month ? (stored.count ?? 0) : 0
      if (count >= FREE_LIMIT) { setShowPaywall(true); return }
    }

    setInput(t); setLoading(true); setResult(null); setCmp(null); setCmpInput(''); setError(''); setNotFound(false); setShowSug(false)
    let idx=0; intervalRef.current=setInterval(()=>{idx=(idx+1)%AGENTS.length;setAgentIdx(idx)},900)
    try {
      const r=await fetch('/api/stock-analyzer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:t,timeframe})})
      const d=await r.json()
      if(!r.ok||d.error){setError(d.error||'Analysis failed');return}
      setResult(d)

      // Increment usage
      if (!isPro) {
        const month  = new Date().toISOString().slice(0,7)
        const stored = JSON.parse(localStorage.getItem('yn_usage') ?? '{}')
        const count  = stored.month === month ? (stored.count ?? 0) + 1 : 1
        localStorage.setItem('yn_usage', JSON.stringify({ month, count }))
        setFreeUsed(count)
      }

      // Log to track record (fire and forget)
      const a = d.analysis
      fetch('/api/ai-calls', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          ticker: t, rating: a.rating, price_at_analysis: d.price,
          price_target: a.price_target, stop_loss: a.stop_loss,
          take_profit_1: a.take_profit_1, confidence: a.confidence,
        }),
      }).catch(()=>{})

      setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    } catch {setError('Network error.')}
    finally {if(intervalRef.current)clearInterval(intervalRef.current);setLoading(false)}
  },[timeframe, isPro])

  // Auto-run analysis when arriving from a /stock/[symbol] SEO page (?ticker=AAPL)
  const analyzeRef = useRef(analyze); analyzeRef.current = analyze
  useEffect(()=>{
    const p = new URLSearchParams(window.location.search).get('ticker')
    if(!p) return
    const sym = p.toUpperCase().replace(/[^A-Z0-9.\-]/g,'')
    if(!sym) return
    setInput(sym)
    window.history.replaceState({}, '', '/ai-stocks')
    const id = setTimeout(()=>analyzeRef.current(sym), 350) // let pro-detection settle first
    return ()=>clearTimeout(id)
  },[])

  // Run a head-to-head comparison ticker (reuses the same analyzer endpoint)
  const runCompare = useCallback(async (sym:string)=>{
    const t=sym.trim().toUpperCase(); if(!t||!result||t===result.ticker) return
    setCmpLoading(true); setCmp(null)
    try {
      const r=await fetch('/api/stock-analyzer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticker:t,timeframe})})
      const d=await r.json()
      if(r.ok&&!d.error) setCmp(d)
    } catch {/* ignore — compare is best-effort */}
    finally { setCmpLoading(false) }
  },[result,timeframe])

  // Draw + return a branded verdict card as a PNG blob (shared by download & native-share)
  const makeCardBlob = useCallback(()=> new Promise<Blob|null>(resolve=>{
    if(!result||!result.analysis){ resolve(null); return }
    const r=result, a2=result.analysis
    const W=1200,H=630
    const c=document.createElement('canvas'); c.width=W; c.height=H
    const x=c.getContext('2d'); if(!x){ resolve(null); return }
    const vc=RATING_CLR[a2.rating]??'#00ff88'
    const up=r.price>0?(a2.price_target-r.price)/r.price*100:0

    // Background + cinematic glow + grid
    x.fillStyle='#050b10'; x.fillRect(0,0,W,H)
    const rg=x.createRadialGradient(W*0.8,H*0.18,0,W*0.8,H*0.18,720)
    rg.addColorStop(0,vc+'2e'); rg.addColorStop(1,'transparent'); x.fillStyle=rg; x.fillRect(0,0,W,H)
    x.strokeStyle='rgba(255,255,255,.035)'; x.lineWidth=1
    for(let gx=0;gx<=W;gx+=40){ x.beginPath(); x.moveTo(gx,0); x.lineTo(gx,H); x.stroke() }
    for(let gy=0;gy<=H;gy+=40){ x.beginPath(); x.moveTo(0,gy); x.lineTo(W,gy); x.stroke() }
    x.strokeStyle=vc+'55'; x.lineWidth=2; roundRect(x,16,16,W-32,H-32,18); x.stroke()
    x.fillStyle=vc; roundRect(x,56,50,42,42,10); x.fill()
    x.fillStyle='#050b10'; x.textAlign='center'; x.font='900 19px Inter,system-ui,sans-serif'; x.fillText('YN',77,79)
    x.textAlign='left'; x.fillStyle='#eaf4fa'; x.font='800 22px Inter,system-ui,sans-serif'; x.fillText('YN FINANCE',110,70)
    x.fillStyle='#6a8497'; x.font='600 12px Inter,system-ui,sans-serif'; x.fillText('AI STOCK ANALYZER',110,89)

    // Ticker block
    x.fillStyle='#ffffff'; x.font='900 122px "SF Mono",ui-monospace,monospace'; x.fillText(r.ticker,52,238)
    x.fillStyle='#8aa0b2'; x.font='600 23px Inter,system-ui,sans-serif'; x.fillText(oneLine(x,r.name,560),56,280)
    x.fillStyle=up>=0?'#00ff88':'#ff2d78'; x.font='800 24px "SF Mono",ui-monospace,monospace'; x.fillText(`$${r.price.toFixed(2)}`,56,320)

    // Verdict (right)
    x.textAlign='right'
    x.fillStyle='#6a8497'; x.font='700 14px Inter,system-ui,sans-serif'; x.fillText('AI VERDICT', W-64, 148)
    x.shadowBlur=42; x.shadowColor=vc; x.fillStyle=vc; x.font='900 78px Inter,system-ui,sans-serif'; x.fillText(a2.rating.toUpperCase(), W-64, 222); x.shadowBlur=0
    x.fillStyle='#8aa0b2'; x.font='700 17px "SF Mono",ui-monospace,monospace'; x.fillText(`CONVICTION ${a2.confidence}%`, W-64, 256)
    x.textAlign='left'
    const barW=360, barX=W-64-barW, barY=272
    x.fillStyle='rgba(255,255,255,.08)'; roundRect(x,barX,barY,barW,10,5); x.fill()
    x.fillStyle=vc; roundRect(x,barX,barY,barW*Math.max(0,Math.min(100,a2.confidence))/100,10,5); x.fill()

    // Why
    x.fillStyle='#6a8497'; x.font='700 13px Inter,system-ui,sans-serif'; x.fillText('THE WHY', 56, 372)
    const whyText=(a2.catalysts&&a2.catalysts[0]) || splitSentences(a2.executive_summary)[0] || a2.investment_thesis || ''
    x.fillStyle='#b8cad8'; x.font='500 19px Inter,system-ui,sans-serif'
    wrapText(x, whyText, W-112).slice(0,2).forEach((ln,i)=> x.fillText(ln, 56, 400+i*28))

    // Target ladder
    const ty=466, gap=12, tw=(W-112-gap*2)/3
    ;([['BEAR',a2.price_target_bear,'#ff2d78'],['BASE',a2.price_target,'#00d4ff'],['BULL',a2.price_target_bull,'#00ff88']] as [string,number,string][]).forEach(([lbl,val,clr],i)=>{
      const tx=56+i*(tw+gap)
      x.fillStyle=clr+'14'; roundRect(x,tx,ty,tw,74,10); x.fill()
      x.strokeStyle=clr+'40'; x.lineWidth=1; roundRect(x,tx,ty,tw,74,10); x.stroke()
      x.fillStyle='#6a8497'; x.font='700 12px Inter,system-ui,sans-serif'; x.fillText(`${lbl} TARGET`, tx+16, ty+27)
      x.fillStyle=clr; x.font='900 31px "SF Mono",ui-monospace,monospace'; x.fillText(`$${Number(val||0).toFixed(2)}`, tx+16, ty+60)
    })

    // Footer
    x.fillStyle='#3a5566'; x.font='600 15px Inter,system-ui,sans-serif'
    x.fillText('ynfinance.org   ·   Free AI analysis on any stock   ·   Not financial advice', 56, H-34)
    x.textAlign='right'; x.fillStyle=vc; x.font='800 16px Inter,system-ui,sans-serif'; x.fillText(`BASE ${up>=0?'+':''}${up.toFixed(1)}%`, W-64, H-34); x.textAlign='left'

    c.toBlob(b=>resolve(b),'image/png')
  }),[result])

  const downloadCard = useCallback(async()=>{
    const b=await makeCardBlob(); if(!b||!result) return
    const u=URL.createObjectURL(b); const link=document.createElement('a'); link.href=u; link.download=`${result.ticker}-yn-verdict.png`; link.click(); URL.revokeObjectURL(u)
  },[makeCardBlob,result])

  // Native share (mobile) — shares the actual PNG, biggest virality lever on phones
  const shareNative = useCallback(async()=>{
    const b=await makeCardBlob(); if(!b||!result||!result.analysis) return
    try{
      const file=new File([b], `${result.ticker}-yn-verdict.png`, {type:'image/png'})
      const data: ShareData & {files?:File[]} = {
        title:`${result.ticker} — ${result.analysis.rating}`,
        text:`AI verdict on ${result.ticker}: ${result.analysis.rating} (${result.analysis.confidence}% conviction). Analyze any stock free →`,
        url:'https://ynfinance.org/ai-stocks',
      }
      if(navigator.canShare?.({files:[file]})){ data.files=[file]; await navigator.share(data) }
      else await navigator.share(data)
    }catch{/* user cancelled */}
  },[makeCardBlob,result])

  // Record a cinematic ~9s animated breakdown (verdict → conviction → why → targets) → downloadable video
  const recordVideo = useCallback(async()=>{
    if(!result||!result.analysis) return
    const r=result, a2=result.analysis
    const S=1080, FPS=30, DUR=9.5
    const canvas=document.createElement('canvas'); canvas.width=S; canvas.height=S
    const ctx=canvas.getContext('2d'); if(!ctx) return
    if(typeof canvas.captureStream!=='function' || typeof MediaRecorder==='undefined'){ alert('Video export needs a recent Chrome, Edge or Firefox.'); return }
    const mimes=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    const mime=mimes.find(m=>{ try{ return MediaRecorder.isTypeSupported(m) }catch{ return false } })
    if(!mime){ alert('Your browser can’t export video. Try Chrome or Edge.'); return }
    const ext=mime.startsWith('video/mp4')?'mp4':'webm'

    const vc=RATING_CLR[a2.rating]??'#00ff88'
    const up=r.price>0?(a2.price_target-r.price)/r.price*100:0
    const why=((a2.catalysts&&a2.catalysts.length>=2)?a2.catalysts:splitSentences(a2.executive_summary).length?splitSentences(a2.executive_summary):[a2.investment_thesis]).filter(Boolean).slice(0,3)

    const stream=canvas.captureStream(FPS)
    let ac:AudioContext|null=null
    try{
      const ACtor=(window.AudioContext|| (window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext)
      ac=new ACtor()
      const dest=ac.createMediaStreamDestination()
      const master=ac.createGain(); master.gain.value=0.0001
      const filt=ac.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=850
      filt.connect(master); master.connect(dest)
      ;[110,164.81,220].forEach((f,i)=>{ const o=ac!.createOscillator(); o.type='sine'; o.frequency.value=f; const g=ac!.createGain(); g.gain.value=0.5/(i+1); o.connect(g); g.connect(filt); o.start() })
      const t0=ac.currentTime
      master.gain.setValueAtTime(0.0001,t0)
      master.gain.exponentialRampToValueAtTime(0.05,t0+1.4)
      master.gain.setValueAtTime(0.05,t0+DUR-1.3)
      master.gain.exponentialRampToValueAtTime(0.0001,t0+DUR)
      dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr))
    }catch{ ac=null }

    const chunks:BlobPart[]=[]
    const rec=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond:9_000_000})
    rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data) }
    const stopped=new Promise<void>(res=>{ rec.onstop=()=>res() })

    const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
    const ease=(p:number)=>1-Math.pow(1-clamp(p,0,1),3)
    const appear=(t:number,start:number,dur=0.6)=>{ const e=ease((t-start)/dur); return {a:e, dy:(1-e)*26} }
    const M=70

    function frame(t:number){
      if(!ctx) return
      // bg
      ctx.fillStyle='#050b10'; ctx.fillRect(0,0,S,S)
      const gx=S*0.5+Math.cos(t*0.5)*120, gy=S*0.32+Math.sin(t*0.5)*90
      const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,760); rg.addColorStop(0,vc+'26'); rg.addColorStop(1,'transparent'); ctx.fillStyle=rg; ctx.fillRect(0,0,S,S)
      ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.lineWidth=1
      for(let i=0;i<=S;i+=45){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(S,i); ctx.stroke() }
      const sy=((t*0.16)%1)*S; ctx.fillStyle=vc+'10'; ctx.fillRect(0,sy,S,2)
      ctx.strokeStyle=vc+'55'; ctx.lineWidth=2; roundRect(ctx,18,18,S-36,S-36,22); ctx.stroke()

      // brand (always)
      const b=appear(t,0,0.5); ctx.globalAlpha=b.a
      ctx.fillStyle=vc; roundRect(ctx,M,M-14,40,40,10); ctx.fill()
      ctx.fillStyle='#050b10'; ctx.textAlign='center'; ctx.font='900 18px Inter,system-ui,sans-serif'; ctx.fillText('YN',M+20,M+12)
      ctx.textAlign='left'; ctx.fillStyle='#eaf4fa'; ctx.font='800 22px Inter,system-ui,sans-serif'; ctx.fillText('YN FINANCE',M+52,M+4)
      ctx.fillStyle='#6a8497'; ctx.font='600 12px Inter,system-ui,sans-serif'; ctx.fillText('AI STOCK ANALYSIS',M+52,M+22)
      ctx.globalAlpha=1

      // ticker
      const tk=appear(t,0.4,0.7); ctx.globalAlpha=tk.a
      ctx.fillStyle='#ffffff'; ctx.font='900 128px "SF Mono",ui-monospace,monospace'; ctx.fillText(r.ticker, M, 250+tk.dy)
      ctx.fillStyle='#8aa0b2'; ctx.font='600 26px Inter,system-ui,sans-serif'; ctx.fillText(oneLine(ctx,r.name,S-M*2), M, 296+tk.dy)
      ctx.fillStyle=up>=0?'#00ff88':'#ff2d78'; ctx.font='800 28px "SF Mono",ui-monospace,monospace'; ctx.fillText(`$${r.price.toFixed(2)}`, M, 340+tk.dy)
      ctx.globalAlpha=1

      // verdict
      const vd=appear(t,1.6,0.7); ctx.globalAlpha=vd.a
      ctx.fillStyle='#6a8497'; ctx.font='700 16px Inter,system-ui,sans-serif'; ctx.fillText('AI VERDICT', M, 418)
      ctx.shadowBlur=30+Math.sin(t*4)*12; ctx.shadowColor=vc; ctx.fillStyle=vc; ctx.font='900 92px Inter,system-ui,sans-serif'; ctx.fillText(a2.rating.toUpperCase(), M, 496); ctx.shadowBlur=0
      ctx.globalAlpha=1

      // conviction
      const cv=appear(t,2.6,0.5); ctx.globalAlpha=cv.a
      ctx.fillStyle='#8aa0b2'; ctx.font='700 18px "SF Mono",ui-monospace,monospace'; ctx.fillText(`CONVICTION ${a2.confidence}%`, M, 542)
      const cbW=S-M*2
      ctx.fillStyle='rgba(255,255,255,.08)'; roundRect(ctx,M,556,cbW,12,6); ctx.fill()
      const fill=ease((t-2.7)/1.0)*Math.max(0,Math.min(100,a2.confidence))/100
      ctx.fillStyle=vc; roundRect(ctx,M,556,cbW*fill,12,6); ctx.fill()
      ctx.globalAlpha=1

      // why
      const wh=appear(t,3.9,0.4); ctx.globalAlpha=wh.a
      ctx.fillStyle='#6a8497'; ctx.font='700 16px Inter,system-ui,sans-serif'; ctx.fillText('WHY', M, 632)
      ctx.globalAlpha=1
      why.forEach((reason,i)=>{
        const ln=appear(t,4.2+i*0.7,0.55); if(ln.a<=0.01) return
        ctx.globalAlpha=ln.a
        ctx.fillStyle=vc; ctx.font='800 22px "SF Mono",ui-monospace,monospace'; ctx.fillText(`${i+1}`, M, 678+i*52+ln.dy)
        ctx.fillStyle='#cdd9e3'; ctx.font='500 24px Inter,system-ui,sans-serif'; ctx.fillText(oneLine(ctx,reason,S-M*2-44), M+38, 678+i*52+ln.dy)
        ctx.globalAlpha=1
      })

      // targets
      const tg=appear(t,6.7,0.6); ctx.globalAlpha=tg.a
      const gap=14, tw=(S-M*2-gap*2)/3, ty=854
      ;([['BEAR',a2.price_target_bear,'#ff2d78'],['BASE',a2.price_target,'#00d4ff'],['BULL',a2.price_target_bull,'#00ff88']] as [string,number,string][]).forEach(([lbl,val,clr],i)=>{
        const tx=M+i*(tw+gap)
        ctx.fillStyle=clr+'14'; roundRect(ctx,tx,ty+tg.dy,tw,96,12); ctx.fill()
        ctx.strokeStyle=clr+'45'; ctx.lineWidth=1; roundRect(ctx,tx,ty+tg.dy,tw,96,12); ctx.stroke()
        ctx.fillStyle='#6a8497'; ctx.font='700 13px Inter,system-ui,sans-serif'; ctx.fillText(`${lbl} TARGET`, tx+16, ty+30+tg.dy)
        ctx.fillStyle=clr; ctx.font='900 34px "SF Mono",ui-monospace,monospace'; ctx.fillText(`$${Number(val||0).toFixed(2)}`, tx+16, ty+72+tg.dy)
      })
      ctx.globalAlpha=1

      // outro CTA
      const ou=appear(t,8.2,0.6); ctx.globalAlpha=ou.a
      ctx.textAlign='center'
      ctx.fillStyle=vc; ctx.font='900 26px Inter,system-ui,sans-serif'; ctx.fillText('Analyze any stock free →', S/2, 1004)
      ctx.fillStyle='#6a8497'; ctx.font='700 18px "SF Mono",ui-monospace,monospace'; ctx.fillText('ynfinance.org', S/2, 1034)
      ctx.textAlign='left'; ctx.globalAlpha=1
    }

    rec.start()
    const start=performance.now()
    await new Promise<void>(resolve=>{
      const loop=()=>{ const t=(performance.now()-start)/1000; frame(t); setVidPct(Math.min(99,Math.round(t/DUR*100))); if(t>=DUR){ resolve(); return } requestAnimationFrame(loop) }
      requestAnimationFrame(loop)
    })
    rec.stop(); await stopped
    try{ await ac?.close() }catch{}
    const blob=new Blob(chunks,{type:mime})
    const u=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=u; link.download=`${r.ticker}-yn-analysis.${ext}`; link.click(); URL.revokeObjectURL(u)
  },[result])

  const shareVideo = useCallback(async(mode:'video'|'both')=>{
    if(shareBusy) return
    setShareBusy(mode); setVidPct(0)
    try{ if(mode==='both') await downloadCard(); await recordVideo() }
    finally{ setShareBusy(''); setVidPct(0) }
  },[shareBusy,downloadCard,recordVideo])

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
        @keyframes pricePulse{0%{opacity:.5}100%{opacity:1}}
        /* Staggered cinematic reveal of result panels — feels like the agents stream in */
        .results-stream>*{animation:fadeUp .55s both}
        .results-stream>*:nth-child(1){animation-delay:.04s}
        .results-stream>*:nth-child(2){animation-delay:.12s}
        .results-stream>*:nth-child(3){animation-delay:.20s}
        .results-stream>*:nth-child(4){animation-delay:.28s}
        .results-stream>*:nth-child(5){animation-delay:.36s}
        .results-stream>*:nth-child(6){animation-delay:.44s}
        .results-stream>*:nth-child(7){animation-delay:.52s}
        .results-stream>*:nth-child(8){animation-delay:.60s}
        .results-stream>*:nth-child(9){animation-delay:.68s}
        .results-stream>*:nth-child(10){animation-delay:.76s}
        .results-stream>*:nth-child(n+11){animation-delay:.84s}
        @media(prefers-reduced-motion:reduce){.results-stream>*{animation:none}}
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
          {[['INTEL','/intelligence'],['DAILY','/daily'],['PERFORMANCE','/performance'],['COURSES','/courses'],['TERMINAL','/app']].map(([l,h])=>(
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
              <div className="terminal-row"><span className="t-out">[OK] Gemini 2.5 ready<span style={{animation:'blink 1s infinite'}}>_</span></span></div>
            </div>

            <h1 style={{fontSize:'clamp(38px,6vw,72px)',fontWeight:900,lineHeight:.95,letterSpacing:'-2px',marginBottom:16,animation:'glitch 6s infinite'}}>
              <span style={{color:'#00ff88',textShadow:'0 0 30px #00ff88,0 0 60px #00ff8840',display:'block'}}>AI STOCK</span>
              <span style={{color:'#00d4ff',textShadow:'0 0 30px #00d4ff',display:'block'}}>ANALYZER</span>
            </h1>

            <p style={{fontSize:13,color:'#4a7a6a',lineHeight:1.8,marginBottom:24,maxWidth:480,letterSpacing:'.3px'}}>
              Five specialized agents. One decisive call. Entry zones, stop loss, price targets, options strategy, catalysts. Institutional research in 15 seconds — free.
            </p>

            {/* MODE TOGGLE */}
            <div style={{display:'flex',gap:0,marginBottom:20,background:'rgba(0,20,10,.8)',border:'1px solid #00ff8820',borderRadius:2,overflow:'hidden',width:'fit-content'}}>
              {([['analyze','⚡ ANALYZE ONE'],['scan','🔍 SCAN WATCHLIST']] as const).map(([m,l])=>(
                <button key={m} onClick={()=>setMode(m)}
                  style={{padding:'10px 20px',fontSize:11,fontWeight:900,fontFamily:'monospace',letterSpacing:'1px',cursor:'pointer',border:'none',background:mode===m?'#00ff88':' transparent',color:mode===m?'#030a06':'#4a7a6a',transition:'all .2s'}}>
                  {l}
                </button>
              ))}
            </div>

            {/* SCANNER MODE */}
            {mode === 'scan' && <ScannerPanel isPro={isPro} onSelectTicker={(t)=>{setMode('analyze');analyze(t)}}/>}

            {/* SEARCH BAR + CHIPS (analyze mode only) */}
            {mode === 'analyze' && <>
            <div style={{marginBottom:16,position:'relative'}}>
              <div style={{display:'flex',background:'rgba(0,20,10,.95)',border:`1px solid ${notFound?'#ff2d7860':loading?'#00ff88':'#00ff8840'}`,borderRadius:2,overflow:'hidden',boxShadow:loading?'0 0 40px rgba(0,255,136,.3)':'none',transition:'all .4s'}}>
                <span style={{padding:'16px 16px',fontSize:13,color:'#00ff8860',flexShrink:0,borderRight:'1px solid #00ff8820',letterSpacing:'1px'}}>$</span>
                <input value={input}
                  onChange={e=>onTickerType(e.target.value)}
                  onFocus={()=>{ if(input.trim()&&sug.length) setShowSug(true) }}
                  onBlur={()=>setTimeout(()=>setShowSug(false),150)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!notFound&&input.trim()){ setShowSug(false); analyze(input) } if(e.key==='Escape') setShowSug(false) }}
                  placeholder="ENTER TICKER..." autoComplete="off" style={{flex:1,background:'transparent',border:'none',padding:'16px 16px',fontSize:16,color:'#00ff88',fontFamily:'inherit',fontWeight:800,letterSpacing:'3px',outline:'none'}}/>
                <button onClick={()=>analyze(input)} disabled={loading||notFound||!input.trim()}
                  style={{background:loading||notFound||!input.trim()?'transparent':'#00ff88',border:'none',borderLeft:'1px solid #00ff8840',padding:'0 24px',cursor:loading||notFound||!input.trim()?'not-allowed':'pointer',color:loading||notFound||!input.trim()?'#1a4a2a':'#030a06',fontWeight:900,fontSize:12,letterSpacing:'1px',fontFamily:'inherit',transition:'all .2s',whiteSpace:'nowrap',boxShadow:loading?'none':'inset 0 0 20px #00000030'}}>
                  {loading?<span style={{color:'#00ff8880'}}>···</span>:'ANALYZE'}
                </button>
              </div>
              {loading && <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00ff88,#00d4ff,#a855f7,#00ff88)',backgroundSize:'200%',animation:'holo .8s linear infinite'}}/>}

              {/* Autocomplete dropdown */}
              {showSug && input.trim() && !loading && (sugLoading || sug.length > 0 || notFound) && (
                <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:50,background:'rgba(2,12,7,.98)',border:'1px solid #00ff8830',borderRadius:2,boxShadow:'0 12px 40px rgba(0,0,0,.6)',overflow:'hidden',backdropFilter:'blur(8px)'}}>
                  {sugLoading && sug.length===0 && !notFound && (
                    <div style={{padding:'12px 16px',fontSize:11,color:'#1a4a2a',letterSpacing:'1px'}}>SEARCHING…</div>
                  )}
                  {notFound && (
                    <div style={{padding:'12px 16px',fontSize:12,color:'#ff2d78',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontWeight:800}}>⚠ Ticker not found</span>
                      <span style={{color:'#4a7a6a',fontSize:11}}>— check the symbol</span>
                    </div>
                  )}
                  {sug.map(s=>(
                    <button key={s.symbol} onMouseDown={e=>{e.preventDefault();pickTicker(s.symbol)}}
                      style={{display:'flex',alignItems:'center',gap:12,width:'100%',textAlign:'left',background:'transparent',border:'none',borderBottom:'1px solid #00ff8810',padding:'10px 16px',cursor:'pointer',transition:'background .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,136,.07)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize:13,fontWeight:800,fontFamily:'monospace',color:'#00ff88',letterSpacing:'1px',minWidth:64}}>{s.symbol}</span>
                      <span style={{fontSize:12,color:'#4a7a6a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
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
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:10,color:'#1a4a2a',letterSpacing:'1px'}}>// ANALYSIS TAKES ~15 SECONDS · GEMINI AI</div>
              {!isPro && (
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{display:'flex',gap:4}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:10,height:10,borderRadius:'50%',background:i<freeUsed?'#00ff88':'#1a4a2a',border:`1px solid ${i<freeUsed?'#00ff88':'#00ff8830'}`,boxShadow:i<freeUsed?'0 0 6px #00ff88':'none',transition:'all .3s'}}/>
                    ))}
                  </div>
                  <span style={{fontSize:10,color:freeUsed>=FREE_LIMIT?'#ff2d78':'#4a7a6a',letterSpacing:'.5px'}}>
                    {freeUsed >= FREE_LIMIT ? 'LIMIT REACHED' : `${FREE_LIMIT - freeUsed} FREE LEFT`}
                  </span>
                  {freeUsed >= FREE_LIMIT && (
                    <button onClick={()=>setShowPaywall(true)} style={{fontSize:10,color:'#00ff88',background:'#00ff8815',border:'1px solid #00ff8840',borderRadius:2,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,letterSpacing:'1px'}}>
                      UPGRADE $19/mo
                    </button>
                  )}
                </div>
              )}
              {isPro && <div style={{fontSize:10,color:'#00ff88',letterSpacing:'.5px'}}>✓ PRO · UNLIMITED</div>}
            </div>
            <Link href="/performance" style={{fontSize:10,color:'#4a7a6a',letterSpacing:'1px',textDecoration:'none',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#00ff88')} onMouseLeave={e=>(e.currentTarget.style.color='#4a7a6a')}>
              → VIEW AI TRACK RECORD
            </Link>
          </>}  {/* end mode=analyze */}
          </div>{/* end LEFT col */}

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
        <div ref={resultsRef} className="results-stream" style={{maxWidth:1060,margin:'0 auto 80px',padding:'0 20px',position:'relative',zIndex:2}}>

          {/* SYSTEM OUTPUT HEADER */}
          <div style={{fontFamily:'monospace',fontSize:11,marginBottom:20,padding:'12px 16px',background:'rgba(3,12,6,.9)',border:'1px solid #00ff8820',borderRadius:2,display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}>
            <div>
              <span style={{color:'#1a4a2a'}}>[ANALYSIS COMPLETE] </span>
              <span style={{color:'#00ff88',fontWeight:900}}>{result.ticker}</span>
              <span style={{color:'#1a4a2a'}}> — {result.name} — {result.industry}</span>
              <span style={{marginLeft:16,color:upDay?'#00ff88':'#ff2d78',fontWeight:700}}>${result.price.toFixed(2)} ({upDay?'+':''}{result.change1d.toFixed(2)}%)</span>
            </div>
            {result.nextEarnings && (
              <div style={{marginLeft:'auto',display:'flex',gap:12,flexWrap:'wrap'}}>
                {(()=>{const dte=daysUntil(result.nextEarnings); const soon=dte!==null&&dte>=0&&dte<=10; const c=soon?'#ff2d78':'#f59e0b'; return (
                <span style={{color:c,background:`${c}1a`,padding:'3px 10px',borderRadius:2,border:`1px solid ${c}4d`}}>
                  📅 EARNINGS {result.nextEarnings}{dte!==null&&dte>=0?` · in ${dte}d`:''}{soon?' ⚠ EVENT RISK':''}
                </span>)})()}
                {result.epsSurprise && (
                  <span style={{color:Number(result.epsSurprise)>0?'#00ff88':'#ff2d78',background:Number(result.epsSurprise)>0?'rgba(0,255,136,.1)':'rgba(255,45,120,.1)',padding:'3px 10px',borderRadius:2,border:`1px solid ${Number(result.epsSurprise)>0?'rgba(0,255,136,.3)':'rgba(255,45,120,.3)'}`}}>
                    Last EPS: {Number(result.epsSurprise)>0?'+':''}{result.epsSurprise}% vs est
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ═══ VERDICT HERO — the punchline up top ═══ */}
          <div className="card" style={{padding:'22px 24px',marginBottom:14,borderColor:`${rCfg.clr}40`,background:`linear-gradient(135deg, ${rCfg.clr}0e, rgba(3,12,6,.92))`,boxShadow:`0 0 44px ${rCfg.glow}`}}>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:20,alignItems:'center'}} className="grid-2">
              {/* Confidence ring */}
              <div style={{position:'relative',width:96,height:96}}>
                <Ring pct={a.confidence} clr={rCfg.clr} size={96}/>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <AnimatedNum value={a.confidence} decimals={0} style={{fontSize:20,fontWeight:900,color:rCfg.clr,fontFamily:'monospace',textShadow:`0 0 12px ${rCfg.clr}`}}/>
                  <span style={{fontSize:7,color:'#4a7a6a',letterSpacing:1}}>CONF%</span>
                </div>
              </div>

              <div>
                <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>// PORTFOLIO MANAGER VERDICT</div>
                <div style={{fontSize:38,fontWeight:900,letterSpacing:'-1px',color:rCfg.clr,textShadow:`0 0 30px ${rCfg.glow},0 0 60px ${rCfg.glow}`,animation:'glitch 8s infinite',lineHeight:1}}>{a.rating}</div>
                <div style={{fontSize:11,color:'#4a7a6a',marginTop:6,letterSpacing:'.5px'}}>{a.time_horizon} · {a.sentiment} sentiment</div>
              </div>

              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>// 12-MONTH TARGET</div>
                <AnimatedNum value={a.price_target} prefix="$" style={{fontSize:34,fontWeight:900,color:'#00d4ff',fontFamily:'monospace',textShadow:'0 0 20px #00d4ff',display:'block'}}/>
                <div style={{fontSize:12,color:((a.price_target-result.price)/result.price*100)>=0?'#00ff88':'#ff2d78',fontWeight:700,marginTop:4}}>
                  {((a.price_target-result.price)/result.price*100)>=0?'+':''}{((a.price_target-result.price)/result.price*100).toFixed(1)}% upside
                </div>
                <button onClick={downloadCard} style={{marginTop:10,background:'transparent',border:`1px solid ${rCfg.clr}50`,color:rCfg.clr,borderRadius:2,padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'1px'}}>📸 SHARE VERDICT</button>
              </div>
            </div>

            {/* Conviction tug-of-war */}
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${rCfg.clr}1f`}}>
              <ConvictionMeter rating={a.rating} confidence={a.confidence} fund={a.fundamentals_score} tech={a.technical_score} sent={a.sentiment_score}/>
            </div>

            {/* Target ladder — bear / base / bull, up top */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:16}}>
              {[
                {label:'BEAR TARGET',val:a.price_target_bear,clr:'#ff2d78'},
                {label:'BASE TARGET',val:a.price_target,     clr:'#00d4ff'},
                {label:'BULL TARGET',val:a.price_target_bull,clr:'#00ff88'},
              ].map(({label,val,clr})=>{
                const up=result.price>0?((val-result.price)/result.price*100):0
                return (
                  <div key={label} style={{background:`${clr}0c`,border:`1px solid ${clr}30`,borderRadius:2,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:8,color:'#4a7a6a',letterSpacing:'1px',marginBottom:4}}>{label}</div>
                    <AnimatedNum value={val??0} prefix="$" style={{fontSize:17,fontWeight:900,fontFamily:'monospace',color:clr,textShadow:`0 0 14px ${clr}80`,display:'block'}}/>
                    <div style={{fontSize:10,color:up>=0?'#00ff88':'#ff2d78',fontWeight:700,marginTop:3}}>{up>=0?'+':''}{up.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ═══ HEAD-TO-HEAD COMPARE ═══ */}
          <div className="card" style={{padding:'14px 18px',marginBottom:14,borderColor:'#a855f730'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{fontSize:11,fontWeight:800,color:'#a855f7',letterSpacing:'1px'}}>⚔ COMPARE {result.ticker} VS</span>
              <input value={cmpInput} onChange={e=>setCmpInput(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g,''))} onKeyDown={e=>e.key==='Enter'&&runCompare(cmpInput)}
                placeholder="TICKER" style={{width:120,background:'rgba(0,20,10,.9)',border:'1px solid #a855f740',borderRadius:2,padding:'8px 12px',color:'#a855f7',fontSize:13,fontFamily:'monospace',fontWeight:800,letterSpacing:'2px',outline:'none'}}/>
              <button onClick={()=>runCompare(cmpInput)} disabled={cmpLoading||!cmpInput.trim()}
                style={{background:cmpLoading||!cmpInput.trim()?'transparent':'#a855f7',border:'1px solid #a855f7',color:cmpLoading||!cmpInput.trim()?'#a855f7':'#fff',borderRadius:2,padding:'8px 16px',fontSize:11,fontWeight:800,cursor:cmpLoading||!cmpInput.trim()?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'1px'}}>
                {cmpLoading?'···':'COMPARE'}
              </button>
              {cmp && <button onClick={()=>{setCmp(null);setCmpInput('')}} style={{background:'transparent',border:'1px solid #4a7a6a40',color:'#4a7a6a',borderRadius:2,padding:'8px 12px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>CLEAR</button>}
            </div>
            {cmp && cmp.analysis && (()=>{
              const b=cmp.analysis
              const upA=(a.price_target-result.price)/result.price*100
              const upB=(b.price_target-cmp.price)/cmp.price*100
              const rows:[string,string|number,string|number,boolean][]=[
                ['RATING',a.rating,b.rating,(RATING_SCORE[a.rating]??0)>=(RATING_SCORE[b.rating]??0)],
                ['CONVICTION',`${a.confidence}%`,`${b.confidence}%`,a.confidence>=b.confidence],
                ['12M UPSIDE',`${upA>=0?'+':''}${upA.toFixed(1)}%`,`${upB>=0?'+':''}${upB.toFixed(1)}%`,upA>=upB],
                ['FUNDAMENTALS',`${a.fundamentals_score}/10`,`${b.fundamentals_score}/10`,a.fundamentals_score>=b.fundamentals_score],
                ['TECHNICALS',`${a.technical_score}/10`,`${b.technical_score}/10`,a.technical_score>=b.technical_score],
                ['SENTIMENT',`${a.sentiment_score}/10`,`${b.sentiment_score}/10`,a.sentiment_score>=b.sentiment_score],
              ]
              const winsA=rows.filter(r=>r[3]).length
              return (
                <div style={{marginTop:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',marginBottom:8}}>
                    <div style={{textAlign:'center',fontSize:18,fontWeight:900,fontFamily:'monospace',color:winsA>=3?'#00ff88':'#4a7a6a'}}>{result.ticker}</div>
                    <div style={{fontSize:11,color:'#4a7a6a',letterSpacing:'1px'}}>{winsA} – {6-winsA}</div>
                    <div style={{textAlign:'center',fontSize:18,fontWeight:900,fontFamily:'monospace',color:winsA<3?'#00ff88':'#4a7a6a'}}>{cmp.ticker}</div>
                  </div>
                  {rows.map(([lbl,va,vb,aWins])=>(
                    <div key={lbl} style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',padding:'7px 0',borderTop:'1px solid #a855f714'}}>
                      <div style={{textAlign:'right',fontSize:12,fontWeight:700,fontFamily:'monospace',color:aWins?'#00ff88':'#4a7a6a'}}>{va}{aWins?' ◀':''}</div>
                      <div style={{fontSize:8,color:'#4a7a6a',letterSpacing:'1px',minWidth:96,textAlign:'center'}}>{lbl}</div>
                      <div style={{textAlign:'left',fontSize:12,fontWeight:700,fontFamily:'monospace',color:!aWins?'#00ff88':'#4a7a6a'}}>{!aWins?'▶ ':''}{vb}</div>
                    </div>
                  ))}
                  <div style={{textAlign:'center',marginTop:10,fontSize:11,color:'#a855f7',letterSpacing:'1px'}}>
                    EDGE: <b style={{color:winsA>=3?'#00ff88':'#00ff88'}}>{winsA>=3?result.ticker:cmp.ticker}</b> wins {Math.max(winsA,6-winsA)} of 6 categories
                  </div>
                </div>
              )
            })()}
          </div>

          {/* AI MEMORY — prior calls on this ticker */}
          {tickerHist && tickerHist.count>0 && (
            <div className="card" style={{padding:'16px 18px',marginBottom:12,borderColor:'#00d4ff30'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:tickerHist.calls.length?10:0}}>
                <span style={{fontSize:11,fontWeight:800,color:'#00d4ff',letterSpacing:'1px'}}>🧠 AI&apos;S MEMORY ON {result.ticker}</span>
                <span style={{fontSize:11,color:'#4a7a6a'}}>{tickerHist.count} prior call{tickerHist.count>1?'s':''} logged</span>
                {tickerHist.hitRate!==null && <span style={{marginLeft:'auto',fontSize:11,fontWeight:800,color:tickerHist.hitRate>=50?'#00ff88':'#ff9500'}}>{tickerHist.hitRate}% went the right way</span>}
              </div>
              {tickerHist.calls.slice(0,5).map(c=>{
                const d=new Date(c.analyzed_at)
                const rc=RATING_CLR[c.rating]??'#a0ffcc'
                return (
                  <div key={c.id} style={{display:'grid',gridTemplateColumns:'78px 1fr auto auto',gap:10,alignItems:'center',padding:'7px 0',borderTop:'1px solid #00ff8410',fontSize:12}}>
                    <span style={{color:'#4a7a6a',fontFamily:'monospace'}}>{d.getMonth()+1}/{d.getDate()}/{String(d.getFullYear()).slice(2)}</span>
                    <span style={{fontWeight:700,color:rc}}>{c.rating} <span style={{color:'#1a4a2a',fontWeight:400}}>@ ${c.price_at_analysis.toFixed(2)}</span></span>
                    <span style={{fontFamily:'monospace',fontWeight:800,color:c.return_pct===null?'#4a7a6a':c.return_pct>=0?'#00ff88':'#ff2d78'}}>{c.return_pct===null?'—':`${c.return_pct>=0?'+':''}${c.return_pct}%`}</span>
                    <span style={{fontSize:11,color:c.correct===null?'#4a7a6a':c.correct?'#00ff88':'#ff2d78'}}>{c.correct===null?'open':c.correct?'✓':'✗'}</span>
                  </div>
                )
              })}
              <div style={{fontSize:9,color:'#1a4a2a',letterSpacing:'.5px',marginTop:8}}>// RETURN MEASURED FROM ENTRY PRICE TO TODAY · <a href="/performance" style={{color:'#4a7a6a'}}>full track record →</a></div>
            </div>
          )}

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

          {/* ═══ THE THESIS ═══ */}
          <div className="card" style={{padding:'22px 24px',marginBottom:8,borderLeft:`2px solid ${rCfg.clr}`,boxShadow:`-4px 0 24px ${rCfg.glow}`}}>
            <div style={{fontSize:11,color:rCfg.clr,letterSpacing:'2px',marginBottom:10,fontWeight:800}}>// THE THESIS</div>
            <p style={{fontSize:14.5,lineHeight:1.8,color:'#cdffe6',letterSpacing:'.2px',marginBottom:14}}>{a.executive_summary}</p>
            <p style={{fontSize:13,lineHeight:1.8,color:'#a0ffcc',letterSpacing:'.2px'}}>{a.investment_thesis}</p>

            {/* Show-your-work — the data behind the call, collapsed by default */}
            <details style={{marginTop:16}}>
              <summary style={{cursor:'pointer',fontSize:10,color:rCfg.clr,letterSpacing:'1px',fontWeight:700,listStyle:'none',userSelect:'none'}}>▸ SHOW THE DATA BEHIND THIS CALL</summary>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:12}}>
                {[
                  ['FUNDAMENTALS',`${a.fundamentals_score}/10`,'#00ff88'],
                  ['TECHNICALS',`${a.technical_score}/10`,'#00d4ff'],
                  ['SENTIMENT',`${a.sentiment_score}/10`,'#a855f7'],
                  ['P/E RATIO',result.pe>0?result.pe.toFixed(1):'N/A','#a0ffcc'],
                  ['VS SECTOR',a.vs_sector,'#a0ffcc'],
                  ['WALL ST.',a.analyst_consensus,'#a0ffcc'],
                  ['52W POSITION',`${result.high52>result.low52?Math.round((result.price-result.low52)/(result.high52-result.low52)*100):50}%`,'#a0ffcc'],
                  ['ANALYSTS',result.analystTotal>0?`${result.analystBuy}B/${result.analystHold}H/${result.analystSell}S`:'N/A','#a0ffcc'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:'rgba(0,20,10,.5)',border:'1px solid #00ff8815',borderRadius:2,padding:'8px 10px'}}>
                    <div style={{fontSize:8,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:c as string}}>{v}</div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* ═══ THE EVIDENCE ═══ */}
          <SectionLabel text="THE EVIDENCE" clr="#00d4ff"/>

          {/* Bull vs Bear debate */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'18px 20px',borderColor:'#00ff8830'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>🐂</span><span style={{fontSize:12,fontWeight:800,color:'#00ff88',letterSpacing:'1px'}}>THE BULL CASE</span>
              </div>
              <p style={{fontSize:13,color:'#a0ffcc',lineHeight:1.7}}>{a.bull_case}</p>
            </div>
            <div className="card" style={{padding:'18px 20px',borderColor:'#ff2d7830'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>🐻</span><span style={{fontSize:12,fontWeight:800,color:'#ff2d78',letterSpacing:'1px'}}>THE BEAR CASE</span>
              </div>
              <p style={{fontSize:13,color:'#a0ffcc',lineHeight:1.7}}>{a.bear_case}</p>
            </div>
          </div>

          {/* Fundamentals / Technicals / Sentiment evidence */}
          <div className="grid-3" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:10,color:'#00ff88',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>FUNDAMENTALS</div>
              <ScoreBar score={a.fundamentals_score} label="SCORE" clr="#00ff88"/>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginTop:8}}>
                {[['P/E',result.pe>0?result.pe.toFixed(1):'N/A'],['MKT CAP',`$${(result.marketCap/1000).toFixed(1)}B`],['BETA',result.beta.toFixed(2)],['VS SECTOR',a.vs_sector]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:10,color:'#4a7a6a'}}>{l}</span>
                    <span style={{fontSize:11,fontWeight:700,fontFamily:'monospace',color:'#a0ffcc'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:10,color:'#00d4ff',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>TECHNICALS</div>
              <ScoreBar score={a.technical_score} label="SCORE" clr="#00d4ff"/>
              <div style={{marginTop:10,marginBottom:6}}>
                <div style={{fontSize:9,color:'#4a7a6a',marginBottom:5,display:'flex',justifyContent:'space-between'}}><span>52W ${result.low52.toFixed(0)}</span><span>${result.high52.toFixed(0)}</span></div>
                <div style={{height:5,background:'#041810',borderRadius:3,position:'relative'}}>
                  <div style={{position:'absolute',top:-2,left:`${result.high52>result.low52?Math.max(0,Math.min(100,(result.price-result.low52)/(result.high52-result.low52)*100)):50}%`,width:9,height:9,borderRadius:'50%',background:'#00d4ff',boxShadow:'0 0 10px #00d4ff',transform:'translateX(-50%)'}}/>
                </div>
              </div>
              {a.key_levels&&([['RESISTANCE',a.key_levels.resistance,'#ff9500'],['SUPPORT',a.key_levels.support,'#00ff88']] as [string,number,string][]).map(([l,v,c])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                  <span style={{fontSize:10,color:'#4a7a6a'}}>{l}</span>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:'monospace',color:c}}>${(v??0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:10,color:'#a855f7',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>SENTIMENT &amp; ANALYSTS</div>
              <ScoreBar score={a.sentiment_score} label="SCORE" clr="#a855f7"/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}><span style={{fontSize:10,color:'#4a7a6a'}}>READ</span><span style={{fontSize:11,fontWeight:700,color:sClr}}>{a.sentiment}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}><span style={{fontSize:10,color:'#4a7a6a'}}>WALL ST.</span><span style={{fontSize:11,fontWeight:700,color:rCfg.clr}}>{a.analyst_consensus}</span></div>
              {result.analystTotal>0 && (
                <div style={{marginTop:10}}>
                  <div style={{fontSize:9,color:'#1a4a2a',marginBottom:4}}>{result.analystBuy}B / {result.analystHold}H / {result.analystSell}S analysts</div>
                  <div style={{height:4,background:'#041810',borderRadius:2,overflow:'hidden',display:'flex'}}>
                    <div style={{background:'#00ff88',width:`${(result.analystBuy/result.analystTotal)*100}%`}}/>
                    <div style={{background:'#ff9500',width:`${(result.analystHold/result.analystTotal)*100}%`}}/>
                    <div style={{background:'#ff2d78',width:`${(result.analystSell/result.analystTotal)*100}%`}}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Catalysts + News */}
          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:10,color:'#00d4ff',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>⚡ WHAT MOVES IT</div>
              {(a.catalysts??[]).map((c,i)=>(
                <div key={i} style={{display:'flex',gap:8,padding:'9px 11px',marginBottom:6,background:'rgba(0,212,255,.06)',border:'1px solid rgba(0,212,255,.2)',borderRadius:2}}>
                  <span style={{color:'#00d4ff',fontSize:10,fontWeight:700,flexShrink:0}}>[{i+1}]</span>
                  <span style={{fontSize:12,color:'#a0ffcc',lineHeight:1.5}}>{c}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:'18px 20px'}}>
              <div style={{fontSize:10,color:'#f59e0b',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>📰 IN THE NEWS</div>
              {(result.news && result.news.length>0) ? result.news.slice(0,5).map((n,i)=>(
                <a key={i} href={n.url||'#'} target="_blank" rel="noreferrer" style={{display:'block',padding:'9px 11px',marginBottom:6,background:'rgba(245,158,11,.05)',border:'1px solid rgba(245,158,11,.15)',borderRadius:2,textDecoration:'none'}}>
                  <div style={{fontSize:12,color:'#cdffe6',lineHeight:1.45,marginBottom:3}}>{n.headline}</div>
                  <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'.5px'}}>{n.source}</div>
                </a>
              )) : <div style={{fontSize:11,color:'#1a4a2a'}}>No recent headlines.</div>}
            </div>
          </div>

          {/* Risks */}
          <div className="card" style={{padding:'18px 20px',marginBottom:8}}>
            <div style={{fontSize:10,color:'#ff2d78',letterSpacing:'1px',marginBottom:12,fontWeight:800}}>⚠ KEY RISKS</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:8}}>
              {(a.risks??[]).map((r,i)=>(
                <div key={i} style={{display:'flex',gap:8,padding:'9px 11px',background:'rgba(255,45,120,.05)',border:'1px solid rgba(255,45,120,.18)',borderRadius:2}}>
                  <span style={{color:'#ff2d78',fontSize:10,fontWeight:700,flexShrink:0}}>[{i+1}]</span>
                  <span style={{fontSize:12,color:'#a0ffcc',lineHeight:1.5}}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ THE OPTIONS DESK ═══ */}
          <SectionLabel text="THE OPTIONS DESK" clr="#a855f7"/>
          <div className="card" style={{padding:'20px 22px',marginBottom:8,borderColor:a.options.type==='CALL'?'#00ff8840':a.options.type==='PUT'?'#ff2d7840':'#00ff8820'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:5}}>// SUGGESTED_PLAY</div>
                <div style={{fontSize:20,fontWeight:900,color:a.options.type==='CALL'?'#00ff88':a.options.type==='PUT'?'#ff2d78':'#ff9500',textShadow:`0 0 20px ${a.options.type==='CALL'?'#00ff88':a.options.type==='PUT'?'#ff2d78':'#ff9500'}`}}>{a.options.strategy}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {liveOpt && <span style={{fontSize:9,fontWeight:800,color:'#00d4ff',background:'#00d4ff12',border:'1px solid #00d4ff40',borderRadius:2,padding:'4px 8px',letterSpacing:'1px'}}>● LIVE CHAIN</span>}
                <div style={{background:a.options.type==='CALL'?'#00ff8815':'#ff2d7815',border:`1px solid ${a.options.type==='CALL'?'#00ff8840':'#ff2d7840'}`,borderRadius:2,padding:'5px 14px',fontSize:12,fontWeight:900,color:a.options.type==='CALL'?'#00ff88':'#ff2d78',fontFamily:'monospace',letterSpacing:'1px'}}>{a.options.type}</div>
              </div>
            </div>

            {/* LIVE OPTIONS CHAIN — real contract from Polygon nearest the AI's suggested strike */}
            {liveOpt && (
              <div style={{background:'rgba(0,212,255,.06)',border:'1px solid #00d4ff40',borderRadius:3,padding:'14px',marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:'#00d4ff',boxShadow:'0 0 8px #00d4ff'}}/>
                  <span style={{fontSize:10,fontWeight:800,color:'#00d4ff',letterSpacing:'1px'}}>LIVE OPTIONS CHAIN · POLYGON</span>
                  <span style={{marginLeft:'auto',fontSize:10,color:'#4a7a6a',fontFamily:'monospace'}}>{liveOpt.type} ${liveOpt.strike} · exp {liveOpt.expiration}{liveOpt.dte!=null?` (${liveOpt.dte}d)`:''}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(88px,1fr))',gap:8}}>
                  {[
                    {l:'MID PREMIUM',v:liveOpt.premium!=null?`$${liveOpt.premium.toFixed(2)}`:'—'},
                    {l:'BID/ASK',v:liveOpt.bid!=null&&liveOpt.ask!=null?`${liveOpt.bid.toFixed(2)}/${liveOpt.ask.toFixed(2)}`:'—'},
                    {l:'IV',v:liveOpt.iv!=null?`${liveOpt.iv}%`:'—'},
                    {l:'DELTA',v:liveOpt.delta!=null?liveOpt.delta.toFixed(2):'—'},
                    {l:'THETA',v:liveOpt.theta!=null?liveOpt.theta.toFixed(2):'—'},
                    {l:'BREAKEVEN',v:liveOpt.breakeven!=null?`$${liveOpt.breakeven.toFixed(2)}`:'—'},
                    {l:'OPEN_INT',v:liveOpt.openInterest!=null?liveOpt.openInterest.toLocaleString():'—'},
                    {l:'VOLUME',v:liveOpt.volume!=null?liveOpt.volume.toLocaleString():'—'},
                  ].map(({l,v})=>(
                    <div key={l} style={{background:'rgba(0,20,10,.6)',border:'1px solid #00d4ff20',borderRadius:2,padding:'8px 10px'}}>
                      <div style={{fontSize:8,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:800,fontFamily:'monospace',color:'#cdf3ff'}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:8,color:'#1a4a2a',letterSpacing:'.5px',marginTop:8}}>// REAL CONTRACT NEAREST THE AI&apos;S TARGET STRIKE · GREEKS &amp; IV FROM POLYGON (≤15min delayed)</div>
              </div>
            )}

            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'1px',marginBottom:6}}>{liveOpt?'// AI’S INTENDED STRUCTURE (model estimate)':''}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:8,marginBottom:12}}>
              {[
                {label:'STRIKE',  val:`$${a.options.strike.toFixed(2)}`},
                {label:'EXPIRY',  val:`${a.options.expiry_days}d`},
                {label:'EST_PREMIUM', val:`$${a.options.est_premium.toFixed(2)}`},
                {label:'BREAKEVEN',  val:`$${(a.options.type==='CALL'?a.options.breakeven_call:a.options.breakeven_put).toFixed(2)}`},
                {label:'MAX_LOSS',val:`$${a.options.max_loss}`},
                {label:'IV_ENV',  val:a.options.iv_environment?.split(/[—-]/)[0]?.trim()||'N/A'},
              ].map(({label,val})=>(
                <div key={label} style={{background:'rgba(0,20,10,.8)',border:'1px solid #00ff8815',borderRadius:2,padding:'10px 12px'}}>
                  <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'.5px',marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:'#a0ffcc'}}>{val}</div>
                </div>
              ))}
            </div>
            {/* Payoff diagram — what options traders actually screenshot */}
            {(a.options.type==='CALL'||a.options.type==='PUT') && (
              <div style={{background:'rgba(0,20,10,.5)',border:'1px solid #a855f725',borderRadius:2,padding:'14px 14px 10px',marginBottom:12}}>
                <div style={{fontSize:9,color:'#a855f7',letterSpacing:'1px',marginBottom:8,fontWeight:700}}>// P/L AT EXPIRY — LONG {a.options.type} {liveOpt?'· LIVE PREMIUM':'· EST. PREMIUM'}</div>
                <OptionsPayoff type={a.options.type} strike={liveOpt?.strike ?? a.options.strike} premium={liveOpt?.premium ?? a.options.est_premium} spot={result.price}/>
              </div>
            )}
            <div style={{background:'rgba(0,20,10,.8)',border:'1px solid #00ff8815',borderRadius:2,padding:'10px 14px',fontSize:12,lineHeight:1.7,letterSpacing:'.2px'}}>
              <span style={{color:'#4a7a6a',fontSize:9,letterSpacing:'1px',display:'block',marginBottom:4}}>// WHY THIS PLAY</span>
              <span style={{color:'#a0ffcc'}}>{a.options.reasoning}</span>
            </div>
          </div>

          {/* ═══ THE TRADE PLAN ═══ */}
          <SectionLabel text="THE TRADE PLAN" clr="#00ff88"/>
          <div className="card" style={{padding:'18px 22px',marginBottom:12}}>
            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:14}}>// ENTRY · EXIT · RISK</div>
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

          <div className="grid-2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
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
            <div className="card" style={{padding:'20px 22px'}}>
              <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'2px',marginBottom:14}}>// TIMEFRAME_OUTLOOK</div>
              {a.timeframes && Object.entries(a.timeframes).map(([tf,val])=>(
                <div key={tf} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #00ff8810'}}>
                  <span style={{fontSize:11,color:'#4a7a6a',letterSpacing:'.5px'}}>{tf.replace('_',' ').toUpperCase()}</span>
                  <span style={{fontSize:11,fontWeight:700,color:TF_CLR[val as string]??'#ff9500',textShadow:`0 0 8px ${TF_CLR[val as string]??'#ff9500'}`,letterSpacing:'1px'}}>{(val as string).toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ FINAL VERDICT ═══ */}
          <div className="card" style={{padding:'24px',marginTop:8,marginBottom:4,textAlign:'center',borderColor:`${rCfg.clr}40`,background:`linear-gradient(180deg, ${rCfg.clr}0c, rgba(0,20,10,.6))`,boxShadow:`0 0 40px ${rCfg.glow}`}}>
            <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'3px',marginBottom:10}}>// FINAL VERDICT</div>
            <div style={{fontSize:30,fontWeight:900,letterSpacing:'-1px',color:rCfg.clr,textShadow:`0 0 28px ${rCfg.glow}`}}>{a.rating}</div>
            <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap',marginTop:12,fontSize:12,color:'#a0ffcc',fontFamily:'monospace'}}>
              <span>CONVICTION <b style={{color:rCfg.clr}}>{a.confidence}%</b></span>
              <span>BASE TARGET <b style={{color:'#00d4ff'}}>${a.price_target.toFixed(2)}</b></span>
              <span>HORIZON <b style={{color:'#a0ffcc'}}>{a.time_horizon}</b></span>
            </div>
            {/* SHARE TOOLKIT — card + cinematic video, the viral loop */}
            <div style={{marginTop:20,paddingTop:18,borderTop:`1px solid ${rCfg.clr}1f`}}>
              <div style={{fontSize:10,color:'#4a7a6a',letterSpacing:'2px',marginBottom:12}}>// SHARE THIS ANALYSIS</div>
              <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={downloadCard} disabled={!!shareBusy}
                  style={{background:'rgba(0,212,255,.1)',border:'1px solid #00d4ff50',color:'#00d4ff',borderRadius:3,padding:'11px 18px',fontSize:12,fontWeight:800,cursor:shareBusy?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'.5px',opacity:shareBusy?.5:1}}>🖼 IMAGE CARD</button>
                <button onClick={()=>shareVideo('video')} disabled={!!shareBusy}
                  style={{background:'rgba(168,85,247,.12)',border:'1px solid #a855f760',color:'#c98bff',borderRadius:3,padding:'11px 18px',fontSize:12,fontWeight:800,cursor:shareBusy?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'.5px',opacity:shareBusy?.5:1}}>🎬 VIDEO (THE WHY)</button>
                <button onClick={()=>shareVideo('both')} disabled={!!shareBusy}
                  style={{background:`${rCfg.clr}18`,border:`1px solid ${rCfg.clr}60`,color:rCfg.clr,borderRadius:3,padding:'11px 18px',fontSize:12,fontWeight:900,cursor:shareBusy?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'.5px',opacity:shareBusy?.5:1}}>⚡ BOTH</button>
                {canShare && <button onClick={shareNative} disabled={!!shareBusy}
                  style={{background:'transparent',border:'1px solid #4a7a6a50',color:'#a0ffcc',borderRadius:3,padding:'11px 18px',fontSize:12,fontWeight:800,cursor:shareBusy?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'.5px',opacity:shareBusy?.5:1}}>↗ SHARE</button>}
              </div>
              {shareBusy ? (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,color:'#c98bff',letterSpacing:'.5px',marginBottom:6}}>Rendering cinematic video… {vidPct}% <span style={{color:'#4a7a6a'}}>(~10s — keep this tab open)</span></div>
                  <div style={{height:4,background:'#041810',borderRadius:2,overflow:'hidden',maxWidth:320,margin:'0 auto'}}>
                    <div style={{height:'100%',width:`${vidPct}%`,background:'linear-gradient(90deg,#a855f7,#00d4ff)',transition:'width .2s'}}/>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:9,color:'#1a4a2a',letterSpacing:'.5px',marginTop:10}}>VIDEO = a ~9s animated breakdown (verdict · conviction · the why · targets) · captioned, muted-friendly for socials</div>
              )}
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

      {/* ══ ONBOARDING ═════════════════════════════════════════════════════════ */}
      {showIntro && (
        <div style={{position:'fixed',inset:0,zIndex:9500,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,10,6,.94)',backdropFilter:'blur(16px)',padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)dismissIntro()}}>
          <div style={{background:'#030a06',border:'1px solid #00ff8840',borderRadius:6,padding:'34px 32px',maxWidth:460,width:'100%',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00ff88,#00d4ff,#a855f7)'}}/>
            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'3px',marginBottom:14}}>// WELCOME</div>
            <h2 style={{fontSize:24,fontWeight:900,color:'#00ff88',textShadow:'0 0 24px #00ff8860',letterSpacing:'-.5px',marginBottom:8}}>The AI Stock Analyzer</h2>
            <p style={{fontSize:13,color:'#4a7a6a',lineHeight:1.6,marginBottom:22}}>Institutional-grade research on any stock, in about 15 seconds. Here&apos;s the flow:</p>
            <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:26}}>
              {[
                ['1','Type any ticker','Search a symbol — we autocomplete and validate it for you.'],
                ['2','Five AI agents go to work','Fundamentals, technicals, sentiment, risk & a portfolio manager return a rating, bull/bear targets, key levels and an options play.'],
                ['3','Share or compare','Export a verdict card or a cinematic video, compare two tickers head-to-head, and check the call against our public track record.'],
              ].map(([n,t,d])=>(
                <div key={n} style={{display:'flex',gap:13,alignItems:'flex-start'}}>
                  <div style={{flexShrink:0,width:24,height:24,borderRadius:5,background:'#00ff8818',border:'1px solid #00ff8840',color:'#00ff88',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:12,fontFamily:'monospace'}}>{n}</div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:800,color:'#cdffe6'}}>{t}</div>
                    <div style={{fontSize:12,color:'#4a7a6a',lineHeight:1.55,marginTop:2}}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={dismissIntro} style={{width:'100%',background:'#00ff88',border:'none',borderRadius:3,padding:'13px',color:'#030a06',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:'inherit',letterSpacing:'1px'}}>START ANALYZING — 3 FREE →</button>
            <div style={{fontSize:10,color:'#1a4a2a',textAlign:'center',marginTop:12,letterSpacing:'.5px'}}>No card required · Not financial advice</div>
          </div>
        </div>
      )}

      {/* ══ PAYWALL MODAL ══════════════════════════════════════════════════════ */}
      {showPaywall && (
        <div style={{position:'fixed',inset:0,zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,10,6,.92)',backdropFilter:'blur(20px)'}}
          onClick={e=>{if(e.target===e.currentTarget)setShowPaywall(false)}}>
          <div style={{background:'#030a06',border:'1px solid #00ff8840',borderRadius:4,padding:'40px',maxWidth:480,width:'90%',position:'relative',overflow:'hidden'}}>
            {/* Top glow bar */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#00ff88,#00d4ff,#a855f7)'}}/>

            <button onClick={()=>setShowPaywall(false)} style={{position:'absolute',top:16,right:16,background:'transparent',border:'none',color:'#4a7a6a',fontSize:18,cursor:'pointer',fontFamily:'inherit'}}>✕</button>

            <div style={{fontSize:9,color:'#4a7a6a',letterSpacing:'3px',marginBottom:16}}>// FREE_LIMIT_REACHED</div>
            <h2 style={{fontSize:28,fontWeight:900,letterSpacing:'-1px',color:'#00ff88',textShadow:'0 0 30px #00ff88',marginBottom:8}}>
              Upgrade to YN Pro
            </h2>
            <p style={{fontSize:13,color:'#4a7a6a',lineHeight:1.7,marginBottom:24}}>
              You&apos;ve used your 3 free analyses this month. Get unlimited AI analyses, the full track record, and every future feature we ship.
            </p>

            {/* Features */}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:28}}>
              {[
                '∞  Unlimited AI stock analyses',
                '📊  Full 5-agent research every time',
                '📈  Candlestick chart with annotated levels',
                '🎯  Options play · position sizing · catalysts',
                '📋  Access to AI track record dashboard',
                '⚡  Every new feature we ship, forever',
              ].map(f=>(
                <div key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'#a0ffcc',letterSpacing:'.3px'}}>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:24}}>
              <span style={{fontSize:40,fontWeight:900,color:'#00ff88',fontFamily:'monospace',textShadow:'0 0 20px #00ff88'}}>$19</span>
              <span style={{fontSize:14,color:'#4a7a6a'}}>/month · cancel anytime</span>
            </div>

            {/* Email + CTA */}
            <div style={{display:'flex',gap:0,marginBottom:12}}>
              <input value={pwEmail} onChange={e=>setPwEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handlePaywall()}
                placeholder="your@email.com" style={{flex:1,background:'rgba(0,20,10,.9)',border:'1px solid #00ff8840',borderRight:'none',borderRadius:'2px 0 0 2px',padding:'13px 16px',color:'#00ff88',fontSize:13,fontFamily:'monospace',outline:'none',letterSpacing:'.5px'}}/>
              <button onClick={handlePaywall} disabled={pwLoading}
                style={{background:pwLoading?'#1a4a2a':'#00ff88',border:'none',borderRadius:'0 2px 2px 0',padding:'13px 22px',color:'#030a06',fontWeight:900,fontSize:12,cursor:pwLoading?'not-allowed':'pointer',fontFamily:'inherit',letterSpacing:'1px',whiteSpace:'nowrap'}}>
                {pwLoading ? '...' : 'GO PRO →'}
              </button>
            </div>
            <div style={{fontSize:10,color:'#1a4a2a',letterSpacing:'.5px',textAlign:'center'}}>
              Secure payment via Stripe · Instant access · No commitment
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
