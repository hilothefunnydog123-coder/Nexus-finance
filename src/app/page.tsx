'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })

// ── WEAPON MINI-VISUALIZATIONS ────────────────────────────────────────────────
function CrashChart() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!; const W = c.width = 280; const H = c.height = 120
    const pts = [20,18,22,25,23,28,32,30,35,38,36,40,38,42,44,41,45,43,46,42,38,30,22,14,8,4,6,9,12,10]
    let p = 0; let raf: number
    function draw() {
      ctx.clearRect(0,0,W,H)
      ctx.strokeStyle = '#0c1e2e'; ctx.lineWidth = 1
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(0,H/6*i);ctx.lineTo(W,H/6*i);ctx.stroke()}
      const n = Math.min(pts.length, Math.floor(p))
      const grad = ctx.createLinearGradient(0,0,0,H)
      const isBear = n > 19
      const clr = isBear ? '#ff2d78' : '#00d4aa'
      grad.addColorStop(0, isBear ? '#ff2d7830' : '#00d4aa30'); grad.addColorStop(1,'transparent')
      if(n>1){
        ctx.beginPath()
        pts.slice(0,n).forEach((v,i)=>{const x=i/(pts.length-1)*W; const y=H-(v/50)*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
        ctx.lineTo((n-1)/(pts.length-1)*W,H); ctx.lineTo(0,H); ctx.closePath()
        ctx.fillStyle=grad; ctx.fill()
        ctx.beginPath()
        pts.slice(0,n).forEach((v,i)=>{const x=i/(pts.length-1)*W; const y=H-(v/50)*H; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)})
        ctx.strokeStyle=clr; ctx.lineWidth=2; ctx.shadowBlur=10; ctx.shadowColor=clr; ctx.stroke(); ctx.shadowBlur=0
        if(n===pts.length){
          ctx.fillStyle='#ff2d78'; ctx.font='bold 11px monospace'
          ctx.fillText('LOCK-UP EXPIRED →', 155, H-(pts[19]/50)*H-8)
        }
      }
      if(p<pts.length){p+=0.4; raf=requestAnimationFrame(draw)}
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

function LieWave() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const W=c.width=280; const H=c.height=120
    let t=0; let raf: number
    function draw(){
      ctx.clearRect(0,0,W,H)
      // "What they say" - smooth line
      ctx.beginPath()
      for(let x=0;x<W;x++){const y=H/2+Math.sin(x/40+t)*12; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
      ctx.strokeStyle='#6a90a8'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([])
      // "Reality" - diverging chaotic line
      ctx.beginPath()
      for(let x=0;x<W;x++){
        const chaos=x>120?Math.sin(x/20+t*2)*20+Math.sin(x/8)*8:Math.sin(x/40+t)*12
        const y=H/2+chaos+(x>120?(x-120)*0.12:0)
        x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
      }
      ctx.strokeStyle='#ff2d78'; ctx.lineWidth=2; ctx.shadowBlur=8; ctx.shadowColor='#ff2d78'; ctx.stroke(); ctx.shadowBlur=0
      if(t>1){
        ctx.font='9px monospace'; ctx.fillStyle='#6a90a8'; ctx.fillText('NARRATIVE',8,H/2-16)
        ctx.fillStyle='#ff2d78'; ctx.fillText('REALITY',8,H/2+28)
        ctx.fillStyle='#ff2d78'; ctx.font='bold 10px monospace'; ctx.fillText('DIVERGENCE DETECTED',145,20)
      }
      t+=0.02; raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

function NeuralWeb() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const W=c.width=280; const H=c.height=120
    const nodes=[{x:20,y:60,l:'FED'},{x:80,y:30,l:'USD↑'},{x:80,y:90,l:'BONDS'},{x:150,y:20,l:'EM↓'},{x:150,y:60,l:'GOLD'},{x:150,y:100,l:'BANKS'},{x:220,y:40,l:'EEM'},{x:220,y:80,l:'KWEB'},{x:260,y:60,l:'🎯PUT'}]
    const edges=[[0,1],[0,2],[1,3],[1,4],[2,5],[3,6],[3,7],[4,6],[5,8],[6,8],[7,8]]
    let t=0; let raf: number
    function draw(){
      ctx.clearRect(0,0,W,H)
      const visibleEdges=Math.floor((Math.sin(t*0.5)*0.5+0.5)*edges.length)
      edges.slice(0,Math.min(visibleEdges+1,edges.length)).forEach(([a,b],i)=>{
        const fa=Math.max(0,Math.min(1,(visibleEdges-i)*2))
        const na=nodes[a]; const nb=nodes[b]
        ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y)
        ctx.strokeStyle=`rgba(168,85,247,${fa*0.6})`; ctx.lineWidth=1.5
        ctx.shadowBlur=fa*8; ctx.shadowColor='#a855f7'; ctx.stroke(); ctx.shadowBlur=0
      })
      nodes.forEach((n,i)=>{
        const visible=i<=visibleEdges
        ctx.beginPath(); ctx.arc(n.x,n.y,visible?5:3,0,Math.PI*2)
        ctx.fillStyle=visible?'#a855f7':'#2a2a3a'
        ctx.shadowBlur=visible?14:0; ctx.shadowColor='#a855f7'; ctx.fill(); ctx.shadowBlur=0
        if(visible){ctx.font='8px monospace'; ctx.fillStyle='#a855f7'; ctx.fillText(n.l,n.x-12,n.y-8)}
      })
      t+=0.03; if(t>Math.PI*2)t=0; raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

function FlowStream() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const W=c.width=280; const H=c.height=120
    const particles: {x:number;y:number;speed:number;label:string;opacity:number}[]=[]
    const labels=['$340M','$128M','$89M','$215M','$67M','$180M']
    let t=0; let raf: number
    setInterval(()=>{particles.push({x:-10,y:20+Math.random()*80,speed:1.5+Math.random(),label:labels[Math.floor(Math.random()*labels.length)],opacity:1})},600)
    function draw(){
      ctx.clearRect(0,0,W,H)
      // Channel
      ctx.strokeStyle='#00d4ff15'; ctx.lineWidth=40
      ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke()
      // Flow lines
      for(let i=0;i<3;i++){
        ctx.beginPath()
        for(let x=0;x<W;x++){const y=H/2+Math.sin(x/30+t+i)*8; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
        ctx.strokeStyle=`rgba(0,212,255,${0.15-i*0.04})`; ctx.lineWidth=1; ctx.stroke()
      }
      // Target tickers
      ['MSFT','AAPL','SPY'].forEach((tk,i)=>{
        const x=60+i*80; ctx.fillStyle='#00d4ff20'; ctx.fillRect(x-20,H/2-12,40,24)
        ctx.strokeStyle='#00d4ff40'; ctx.strokeRect(x-20,H/2-12,40,24)
        ctx.font='bold 9px monospace'; ctx.fillStyle='#00d4ff'; ctx.textAlign='center'; ctx.fillText(tk,x,H/2+4)
      })
      ctx.textAlign='left'
      // Particles
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i]
        ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2)
        ctx.fillStyle=`rgba(0,212,255,${p.opacity})`; ctx.shadowBlur=12; ctx.shadowColor='#00d4ff'; ctx.fill(); ctx.shadowBlur=0
        ctx.font='8px monospace'; ctx.fillStyle=`rgba(0,212,255,${p.opacity})`; ctx.fillText(p.label,p.x+6,p.y+3)
        p.x+=p.speed; if(p.x>W+40)particles.splice(i,1)
      }
      t+=0.04; raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

function MiniRadar() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const S=120; c.width=S; c.height=S
    const cx=S/2; const cy=S/2; const r=S/2-6
    let angle=0; let raf: number
    const blips=[{a:0.8,d:0.5,clr:'#ff2d78'},{a:2.1,d:0.7,clr:'#f59e0b'},{a:3.9,d:0.4,clr:'#00ff88'},{a:5.2,d:0.65,clr:'#ff2d78'}]
    function draw(){
      ctx.clearRect(0,0,S,S)
      for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,r*i/4,0,Math.PI*2);ctx.strokeStyle='rgba(0,255,136,0.08)';ctx.lineWidth=1;ctx.stroke()}
      ctx.strokeStyle='rgba(0,255,136,0.08)';['',1,2,3].forEach((_,i)=>{ctx.beginPath();const a=i*Math.PI/2;ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.lineTo(cx-Math.cos(a)*r,cy-Math.sin(a)*r);ctx.stroke()})
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle)
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r,-0.5,0.1); ctx.closePath()
      ctx.fillStyle='rgba(0,255,136,0.12)'; ctx.fill(); ctx.restore()
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle='rgba(0,255,136,0.5)'; ctx.lineWidth=1.5; ctx.stroke()
      blips.forEach(b=>{
        const bx=cx+Math.cos(b.a)*r*b.d; const by=cy+Math.sin(b.a)*r*b.d
        const fade=Math.max(0,Math.cos(angle-b.a)*0.7+0.3)
        ctx.beginPath(); ctx.arc(bx,by,4,0,Math.PI*2)
        ctx.fillStyle=b.clr+Math.floor(fade*255).toString(16).padStart(2,'0')
        ctx.shadowBlur=10; ctx.shadowColor=b.clr; ctx.fill(); ctx.shadowBlur=0
      })
      angle=(angle+0.03)%(Math.PI*2); raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:120,height:120,display:'block'}}/>
}

function XRayDoc() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const W=c.width=280; const H=c.height=120
    const lines=['Revenue grew 12% YoY.........', 'Gross margins expanded 200bps.', 'Operating leverage improving..', 'Strong demand environment......', 'DEFERRED REV DOWN 31% QoQ....', 'WARRANTY RESERVES +$800M.....', 'REGULATORY CREDITS → ZERO Q3.', 'FREE CASH FLOW MISS $400M....']
    const hidden=[false,false,false,false,true,true,true,true]
    let reveal=0; let raf: number
    function draw(){
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='#050505'; ctx.fillRect(0,0,W,H)
      lines.forEach((line,i)=>{
        const y=12+i*14; const isHidden=hidden[i]; const isRevealed=isHidden&&reveal>(i-4)*0.3
        if(isHidden&&!isRevealed){
          // Redacted bar
          ctx.fillStyle='#1a1a1a'; ctx.fillRect(8,y-8,W-16,11)
          ctx.fillStyle='#2a2a2a'; ctx.fillRect(8,y-8,Math.random()*50+20,11)
        } else {
          ctx.font=`${isHidden?'bold ':''}9px monospace`
          ctx.fillStyle=isHidden?'#ff2d78':'#4a6a78'
          if(isHidden){ ctx.shadowBlur=8; ctx.shadowColor='#ff2d78' }
          ctx.fillText(line,8,y); ctx.shadowBlur=0
        }
      })
      if(reveal<1.5){ reveal+=0.015; raf=requestAnimationFrame(draw) }
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

const FOUNDERS = [
  {
    name: 'Neil Gilani', role: 'CEO & Co-Founder', clr: '#00d4aa',
    grad: 'linear-gradient(135deg,#00d4aa,#3b8eea)', init: 'NG',
    quote: '"The edge isn\'t the chart. It\'s knowing what to look for before the open."',
    bio: 'Built every line of the YN Finance platform from scratch — the AI pipeline, real-time data infrastructure, Daily Intelligence product, and the multi-agent stock analyzer. If it runs, Neil built it.',
    focus: 'AI Systems · Market Data · Full-Stack Engineering',
    tags: ['Next.js', 'Gemini AI', 'Finnhub', 'Supabase', 'Three.js'],
    skills: [{ label:'AI/ML Engineering', pct:96 },{ label:'Full-Stack Dev', pct:94 },{ label:'Market Data Systems', pct:90 }],
    stat1: { n:'13', label:'AI features shipped' },
    stat2: { n:'100K+', label:'Lines of code written' },
    twitter: 'https://twitter.com',
  },
  {
    name: 'Yannai Richter', role: 'CTO & Co-Founder', clr: '#1e90ff',
    grad: 'linear-gradient(135deg,#1e90ff,#a855f7)', init: 'YR',
    quote: '"Every serious investor spends 2 hours on research before 9:30. We built a platform that does it in 15 seconds."',
    bio: 'Co-architected the YN tech stack and leads growth strategy — from paid acquisition and creator partnerships to the brand identity behind ynfinance.org. Bridges product vision with real-world distribution.',
    focus: 'Growth Strategy · Brand · Platform Architecture',
    tags: ['Growth', 'TypeScript', 'Branding', 'Stripe', 'Analytics'],
    skills: [{ label:'Growth Engineering', pct:93 },{ label:'Platform Architecture', pct:88 },{ label:'Brand Strategy', pct:91 }],
    stat1: { n:'3x', label:'User growth this quarter' },
    stat2: { n:'$0', label:'Paid acquisition spend' },
    twitter: 'https://twitter.com',
  },
  {
    name: 'Arjun Bhattula', role: 'COO & Co-Founder', clr: '#a855f7',
    grad: 'linear-gradient(135deg,#a855f7,#ec4899)', init: 'AB',
    quote: '"Wall Street has always had this data and these tools. We decided Main Street deserves them too."',
    bio: 'Runs every partnership, instructor relationship, and business operation at YN Finance. Personally recruited nine world-class educators — Ross Cameron, ICT, Anton Kreil and six more — and structured every deal.',
    focus: 'Partnerships · Operations · Business Development',
    tags: ['Partnerships', 'Ross Cameron', 'ICT', 'Anton Kreil', 'Operations'],
    skills: [{ label:'Business Development', pct:97 },{ label:'Partnership Management', pct:95 },{ label:'Operations', pct:89 }],
    stat1: { n:'9', label:'World-class instructors' },
    stat2: { n:'$49+', label:'Revenue per user' },
    twitter: 'https://twitter.com',
  },
]

const POWERS = [
  { icon: '🧠', name: 'Gemini 2.0',  label: 'AI Engine',    desc: '5-agent reasoning across fundamentals, technicals, sentiment, risk, and options simultaneously.', clr: '#00d4aa' },
  { icon: '📡', name: 'Finnhub',     label: 'Live Data',    desc: 'Real-time quotes, analyst ratings, earnings, company news — streamed live to every tool.', clr: '#3b8eea' },
  { icon: '⚡', name: 'Supabase',    label: 'Real-time DB', desc: 'Live leaderboards, tournament state, chat, and portfolio sync — in milliseconds.', clr: '#22c55e' },
  { icon: '📊', name: 'TradingView', label: 'Pro Charts',   desc: 'Institutional-grade charting with 100+ indicators, live from the same feed as Bloomberg.', clr: '#f59e0b' },
  { icon: '💳', name: 'Stripe',      label: 'Payments',     desc: 'Secure tournament entry, course purchases, and prop challenges — globally instant.', clr: '#a855f7' },
  { icon: '🌐', name: 'Netlify Edge',label: 'Deploy',       desc: 'Sub-100ms globally with edge functions and instant CI/CD so the platform never sleeps.', clr: '#ec4899' },
]

const AGENT_STEPS = [
  { icon: '📊', name: 'Fundamentals Agent', clr: '#00d4aa', delay: 0,    task: 'Analyzing P/E, EPS, ROE, revenue growth...' },
  { icon: '📈', name: 'Technical Agent',    clr: '#3b8eea', delay: 0.8,  task: 'Scanning 52W range, SMA, trend, momentum...' },
  { icon: '📰', name: 'Sentiment Agent',    clr: '#a855f7', delay: 1.5,  task: 'Processing 6 news headlines, social signals...' },
  { icon: '🛡️', name: 'Risk Agent',         clr: '#f59e0b', delay: 2.2,  task: 'Identifying 3 specific risk factors...' },
  { icon: '🎯', name: 'Portfolio Manager',  clr: '#ec4899', delay: 3.0,  task: 'Synthesizing final verdict + options play...' },
]

const CHART_POINTS = [42,45,43,48,52,50,55,58,54,60,63,61,67,65,70,68,72,75,71,78,82,79,85,88,84,90]

// ── HERO HUD OVERLAY ──────────────────────────────────────────────────────────
function HeroHUD() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width = window.innerWidth
    let H = c.height = window.innerHeight
    let raf: number, t = 0

    // Floating data markers
    const markers: { x: number; y: number; vy: number; label: string; alpha: number; clr: string }[] = []
    const LABELS = ['+0.47%','$184.20','VOL 2.3M','RSI 67','MACD ↑','$0.0032','73%','SIGNAL','12.4K','ENTRY','Δ+0.8σ']
    const MCLRS  = ['#00d4aa','#3b8eea','#a855f7','#f59e0b','#00ff88']
    const spawnMarker = () => {
      if (markers.length < 18) {
        markers.push({
          x: 60 + Math.random() * (W - 120),
          y: H * 0.3 + Math.random() * H * 0.4,
          vy: -0.18 - Math.random() * 0.25,
          label: LABELS[Math.floor(Math.random()*LABELS.length)],
          alpha: 0,
          clr: MCLRS[Math.floor(Math.random()*MCLRS.length)],
        })
      }
    }
    const mi = setInterval(spawnMarker, 600)

    // Corner bracket size
    const B = 28

    let scanY = -20

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ── CORNER BRACKETS ──────────────────────────────────────
      const brackets = [[20,20,1,1],[W-20,20,-1,1],[20,H-20,1,-1],[W-20,H-20,-1,-1]]
      brackets.forEach(([x,y,sx,sy]) => {
        ctx.strokeStyle = 'rgba(0,212,170,0.45)'
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 8; ctx.shadowColor = '#00d4aa'
        ctx.beginPath(); ctx.moveTo(x+sx*B,y); ctx.lineTo(x,y); ctx.lineTo(x,y+sy*B); ctx.stroke()
        ctx.shadowBlur = 0
      })

      // ── HORIZONTAL SCAN LINE ──────────────────────────────────
      scanY += 0.8
      if (scanY > H + 20) scanY = -20
      const scanGrad = ctx.createLinearGradient(0, scanY-6, 0, scanY+6)
      scanGrad.addColorStop(0, 'rgba(0,212,170,0)')
      scanGrad.addColorStop(0.5, 'rgba(0,212,170,0.18)')
      scanGrad.addColorStop(1, 'rgba(0,212,170,0)')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 6, W, 12)

      // ── CROSSHAIR at center ───────────────────────────────────
      const cx = W/2, cy = H/2
      const crossAlpha = 0.06 + Math.sin(t*2)*0.02
      ctx.strokeStyle = `rgba(0,212,170,${crossAlpha})`
      ctx.lineWidth = 1
      ctx.setLineDash([4,8])
      ctx.beginPath(); ctx.moveTo(cx-60, cy); ctx.lineTo(cx+60, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy-60); ctx.lineTo(cx, cy+60); ctx.stroke()
      ctx.setLineDash([])
      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2)
      ctx.fillStyle = `rgba(0,212,170,${crossAlpha*4})`; ctx.fill()

      // ── HUD LABELS ────────────────────────────────────────────
      const hudLabels = [
        { x:32, y:H-36, text:'SIGNAL ACTIVE', clr:'rgba(0,212,170,0.35)' },
        { x:W-32, y:H-36, text:'AI ONLINE', clr:'rgba(0,212,170,0.35)', right:true },
        { x:32, y:60, text:'YN INTELLIGENCE', clr:'rgba(0,212,170,0.2)' },
        { x:W-32, y:60, text:`${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} EST`, clr:'rgba(0,212,170,0.2)', right:true },
      ]
      ctx.font = '9px monospace'
      ctx.letterSpacing = '2px'
      hudLabels.forEach(l => {
        ctx.fillStyle = l.clr
        ctx.textAlign = l.right ? 'right' : 'left'
        ctx.fillText(l.text, l.x, l.y)
      })
      ctx.textAlign = 'left'

      // ── FLOATING DATA MARKERS ─────────────────────────────────
      for (let i = markers.length-1; i >= 0; i--) {
        const m = markers[i]
        m.y += m.vy
        m.alpha = m.alpha < 1 ? m.alpha + 0.04 : Math.max(0, m.alpha - 0.008)
        if (m.alpha <= 0 || m.y < 80) { markers.splice(i, 1); continue }
        ctx.font = '9px monospace'
        ctx.fillStyle = m.clr.replace(')', `,${m.alpha*0.5})`).replace('rgb','rgba').replace('#','rgba(').replace('00d4aa','0,212,170,').replace('3b8eea','59,142,234,').replace('a855f7','168,85,247,').replace('f59e0b','245,158,11,').replace('00ff88','0,255,136,')
        // simpler: use direct rgba
        const alpha = m.alpha * 0.45
        ctx.fillStyle = `rgba(0,212,170,${alpha})`
        if (m.clr === '#3b8eea') ctx.fillStyle = `rgba(59,142,234,${alpha})`
        if (m.clr === '#a855f7') ctx.fillStyle = `rgba(168,85,247,${alpha})`
        if (m.clr === '#f59e0b') ctx.fillStyle = `rgba(245,158,11,${alpha})`
        if (m.clr === '#00ff88') ctx.fillStyle = `rgba(0,255,136,${alpha})`
        ctx.fillText(m.label, m.x, m.y)
      }

      // ── SIDE PROGRESS BARS ────────────────────────────────────
      const barH = 80, barW = 2
      const bars = [
        { x:18, y:H/2-barH/2, fill:(Math.sin(t*0.8)+1)/2 },
        { x:W-20, y:H/2-barH/2, fill:(Math.cos(t*0.6)+1)/2 },
      ]
      bars.forEach(b => {
        ctx.fillStyle = 'rgba(0,212,170,0.08)'
        ctx.fillRect(b.x, b.y, barW, barH)
        ctx.fillStyle = 'rgba(0,212,170,0.4)'
        ctx.fillRect(b.x, b.y + barH*(1-b.fill), barW, barH*b.fill)
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); clearInterval(mi); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas ref={ref} style={{
      position:'fixed', inset:0, zIndex:2, pointerEvents:'none',
      width:'100%', height:'100%'
    }}/>
  )
}

function useInView(th = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect() } }, { threshold: th })
    o.observe(el); return () => o.disconnect()
  }, [th])
  return { ref, v }
}

function AnimChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')!
    const W = c.width = c.offsetWidth, H = c.height = c.offsetHeight
    let prog = 0, raf: number
    const pts = CHART_POINTS
    const minV = Math.min(...pts), maxV = Math.max(...pts)
    const px = (i: number) => (i / (pts.length - 1)) * W
    const py = (v: number) => H - ((v - minV) / (maxV - minV)) * H * 0.8 - H * 0.1

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const n = Math.max(2, Math.floor(prog * pts.length))

      // Gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#00d4aa30')
      grad.addColorStop(1, '#00d4aa00')
      ctx.beginPath()
      ctx.moveTo(px(0), py(pts[0]))
      for (let i = 1; i < n; i++) ctx.lineTo(px(i), py(pts[i]))
      ctx.lineTo(px(n - 1), H)
      ctx.lineTo(px(0), H)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Line
      ctx.beginPath()
      ctx.moveTo(px(0), py(pts[0]))
      for (let i = 1; i < n; i++) ctx.lineTo(px(i), py(pts[i]))
      ctx.strokeStyle = '#00d4aa'
      ctx.lineWidth = 2.5
      ctx.shadowBlur = 16; ctx.shadowColor = '#00d4aa'
      ctx.stroke()
      ctx.shadowBlur = 0

      // Glow dot at tip
      if (n > 1) {
        const tipX = px(n - 1), tipY = py(pts[n - 1])
        ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#00d4aa'; ctx.shadowBlur = 20; ctx.shadowColor = '#00d4aa'; ctx.fill()
        ctx.shadowBlur = 0
      }

      if (prog < 1) { prog = Math.min(1, prog + 0.012); raf = requestAnimationFrame(draw) }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    let start = 0, raf: number
    const step = () => {
      start = Math.min(to, start + to / 60)
      el.textContent = Math.floor(start).toLocaleString() + suffix
      if (start < to) raf = requestAnimationFrame(step)
    }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { step(); obs.disconnect() } }, { threshold: 0.5 })
    obs.observe(el)
    return () => { cancelAnimationFrame(raf); obs.disconnect() }
  }, [to, suffix])
  return <span ref={ref}>0{suffix}</span>
}

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [cursorBig, setCursorBig] = useState(false)
  const [agentStep, setAgentStep] = useState(-1)
  const analyzerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let animX = -100, animY = -100, targetX = -100, targetY = -100, raf: number
    const onMove = (e: MouseEvent) => { targetX = e.clientX; targetY = e.clientY }
    const loop = () => {
      animX += (targetX - animX) * 0.12
      animY += (targetY - animY) * 0.12
      setCursorX(animX); setCursorY(animY)
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  // Analyzer demo animation
  useEffect(() => {
    const el = analyzerRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let i = 0
        const run = () => {
          setAgentStep(i)
          if (i < AGENT_STEPS.length) { i++; setTimeout(run, 900) }
        }
        run(); obs.disconnect()
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const powers   = useInView()
  const analyzer = useInView()
  const founders = useInView()
  const stats    = useInView()
  const intel    = useInView(0.05)

  const heroOp    = Math.max(0, 1 - scrollY / 600)
  const heroTrans = `translateY(${scrollY * 0.3}px)`

  return (
    <div style={{ background: '#030a10', color: '#dce8f0', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden', cursor: 'none' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp    {from{opacity:0;transform:translateY(40px) rotateX(-15deg)}to{opacity:1;transform:translateY(0) rotateX(0)}}
        @keyframes fadeLeft  {from{opacity:0;transform:translateX(-60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeRight {from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scaleIn   {from{opacity:0;transform:scale(.7) rotateY(20deg)}to{opacity:1;transform:scale(1) rotateY(0)}}
        @keyframes glitch1   {0%,100%{clip-path:inset(0 0 95% 0);transform:translateX(-4px)}50%{clip-path:inset(10% 0 80% 0);transform:translateX(4px)}}
        @keyframes glitch2   {0%,100%{clip-path:inset(80% 0 0 0);transform:translateX(4px)}50%{clip-path:inset(60% 0 20% 0);transform:translateX(-4px)}}
        @keyframes pulse-dot {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.8);opacity:.6}}
        @keyframes ticker3d  {0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes holo      {0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes float3d   {0%,100%{transform:translateY(0) rotateX(0)}50%{transform:translateY(-14px) rotateX(4deg)}}
        @keyframes glow-anim {0%,100%{box-shadow:0 0 30px var(--clr),0 0 60px var(--clr)40}50%{box-shadow:0 0 50px var(--clr),0 0 100px var(--clr)60}}
        @keyframes border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes spin-halo {to{transform:rotate(360deg)}}
        @keyframes scanline  {0%{top:-10%}100%{top:110%}}
        @keyframes chromaR   {0%,100%{transform:none;opacity:0}10%{transform:translateX(3px);opacity:.5}12%{transform:none;opacity:0}50%{transform:translateX(-2px);opacity:.4}52%{transform:none;opacity:0}}
        @keyframes chromaB   {0%,100%{transform:none;opacity:0}10%{transform:translateX(-3px);opacity:.4}12%{transform:none;opacity:0}50%{transform:translateX(2px);opacity:.35}52%{transform:none;opacity:0}}
        @keyframes revealWord{from{opacity:0;transform:translateY(30px) skewY(4deg)}to{opacity:1;transform:none}}
        @keyframes zoomPulse {0%,100%{transform:scale(1)}50%{transform:scale(1.008)}}
        @keyframes dataStream{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(-60px);opacity:0}}

        .hero-title-wrap{position:relative;display:inline-block}
        .hero-title-wrap::before{content:attr(data-text);position:absolute;inset:0;background:linear-gradient(135deg,#00d4aa 0%,#3b8eea 40%,#a855f7 70%,#f59e0b 100%);WebkitBackgroundClip:text;WebkitTextFillColor:transparent;backgroundSize:'200% 200%';animation:chromaR 4s ease-in-out infinite;zIndex:-1;pointerEvents:none}
        .glitch-word{display:inline-block;animation:revealWord .9s cubic-bezier(.22,1,.36,1) both}
        .nav-link{color:#6a90a8;text-decoration:none;font-size:13px;transition:color .2s}
        .nav-link:hover{color:#00d4aa}
        .section{max-width:1100px;margin:0 auto;padding:0 24px}
        .vis .item{opacity:0;transform:translateY(40px)}
        .vis.show .item{animation:fadeUp .8s cubic-bezier(.22,1,.36,1) both}
        .vis.show .i0{animation-delay:0s}  .vis.show .i1{animation-delay:.1s}
        .vis.show .i2{animation-delay:.18s}.vis.show .i3{animation-delay:.26s}
        .vis.show .i4{animation-delay:.34s}.vis.show .i5{animation-delay:.42s}
        .power-card{background:#060d14;border:1px solid #0c1e2e;border-radius:18px;padding:30px 24px;transition:all .4s cubic-bezier(.22,1,.36,1);cursor:default;position:relative;overflow:hidden}
        .power-card::before{content:'';position:absolute;inset:-1px;background:linear-gradient(135deg,var(--clr),transparent 60%);opacity:0;border-radius:19px;transition:opacity .3s;z-index:0}
        .power-card:hover::before{opacity:.15}
        .power-card:hover{transform:translateY(-10px) scale(1.03) rotateX(-4deg);box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 60px var(--clr,#00d4aa)20;border-color:var(--clr)}
        .power-inner{position:relative;z-index:1}
        .founder-card{background:#060d14;border-radius:22px;padding:36px 28px;position:relative;overflow:hidden;transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s;transform-style:preserve-3d;cursor:default}
        .founder-card:hover{box-shadow:0 40px 100px rgba(0,0,0,.6);transform:perspective(600px) rotateY(4deg) rotateX(-4deg) translateY(-8px)}
        .holo-border{position:relative;border-radius:20px;padding:1px;background:linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7,#f59e0b,#00d4aa);background-size:300% 300%;animation:border-flow 4s linear infinite}
        .holo-inner{border-radius:19px;background:#060d14;padding:28px 24px;height:100%}
        .mag-btn{position:relative;transition:transform .2s;display:inline-block}
        @media(max-width:768px){.hide-sm{display:none!important}.g3{grid-template-columns:1fr!important}.g2{grid-template-columns:1fr!important}}
        ::selection{background:#00d4aa30}
      `}</style>

      {/* CUSTOM CURSOR */}
      <div style={{ position:'fixed', zIndex:9999, pointerEvents:'none', left:cursorX - 6, top:cursorY - 6, width:12, height:12, borderRadius:'50%', background:'#00d4aa', transition:'width .15s,height .15s,margin .15s', mixBlendMode:'difference' }} />
      <div style={{ position:'fixed', zIndex:9998, pointerEvents:'none', left:cursorX - 20, top:cursorY - 20, width:40, height:40, borderRadius:'50%', border:'1px solid #00d4aa60', transition:'left .08s,top .08s', background:'transparent' }} />

      {/* THREE.JS BACKGROUND */}
      <ThreeScene scrollY={scrollY} />

      {/* HUD OVERLAY */}
      <HeroHUD />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:58, display:'flex', alignItems:'center', padding:'0 28px', gap:28, background:'rgba(3,10,16,0.7)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={() => setCursorBig(true)} onMouseLeave={() => setCursorBig(false)}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, color:'#030a10', letterSpacing:'-0.5px', boxShadow:'0 0 20px #00d4aa40' }}>YN</div>
          <span style={{ fontWeight:900, fontSize:15, letterSpacing:'-0.5px' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:24 }}>
          {[['AI Analyzer','/ai-stocks'],['Intelligence','/intelligence'],['Daily Intel','/daily'],['Performance','/performance'],['Courses','/courses'],['Terminal','/app']].map(([l,h])=>(
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#a855f7,#3b8eea)', color:'#fff', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 20px #a855f740' }}>AI Analyzer</Link>
          <Link href="/app"       style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:900, textDecoration:'none', boxShadow:'0 0 20px #00d4aa40' }}>Launch →</Link>
        </div>
      </nav>

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, paddingTop:58 }}>
        <div style={{ textAlign:'center', padding:'0 24px', maxWidth:900, opacity: heroOp, transform: heroTrans }}>

          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,0.1)', border:'1px solid rgba(0,212,170,0.25)', borderRadius:24, padding:'7px 20px', marginBottom:32, fontSize:11, color:'#00d4aa', fontWeight:700, letterSpacing:'1px' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
            MULTI-AGENT AI · REAL-TIME DATA · FREE
          </div>

          {/* Glitch title */}
          <div style={{ position:'relative', marginBottom:24 }}>
            {/* Chromatic aberration red layer */}
            <h1 aria-hidden="true" style={{ fontSize:'clamp(48px,9vw,100px)', fontWeight:900, lineHeight:.95, letterSpacing:'-4px', color:'#ff2d78', position:'absolute', inset:0, animation:'chromaR 4s ease-in-out infinite', pointerEvents:'none', opacity:0, zIndex:-1 }}>
              The Smartest <span style={{ display:'block' }}>Trading AI</span> Ever Built.
            </h1>
            {/* Chromatic aberration blue layer */}
            <h1 aria-hidden="true" style={{ fontSize:'clamp(48px,9vw,100px)', fontWeight:900, lineHeight:.95, letterSpacing:'-4px', color:'#3b8eea', position:'absolute', inset:0, animation:'chromaB 4s ease-in-out infinite', pointerEvents:'none', opacity:0, zIndex:-1 }}>
              The Smartest <span style={{ display:'block' }}>Trading AI</span> Ever Built.
            </h1>
            <h1 style={{ fontSize:'clamp(48px,9vw,100px)', fontWeight:900, lineHeight:.95, letterSpacing:'-4px', color:'#dce8f0', animation:'zoomPulse 6s ease-in-out infinite' }}>
              <span className="glitch-word" style={{ animationDelay:'.1s' }}>The </span>
              <span className="glitch-word" style={{ animationDelay:'.22s' }}>Smartest</span>{' '}
              <span style={{ display:'block', background:'linear-gradient(135deg,#00d4aa 0%,#3b8eea 40%,#a855f7 70%,#f59e0b 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200% 200%', animation:'holo 4s linear infinite' }}>
                <span className="glitch-word" style={{ animationDelay:'.38s' }}>Trading</span>{' '}
                <span className="glitch-word" style={{ animationDelay:'.5s' }}>AI</span>
              </span>
              <span className="glitch-word" style={{ animationDelay:'.65s' }}>Ever </span>
              <span className="glitch-word" style={{ animationDelay:'.78s' }}>Built.</span>
            </h1>
          </div>

          <p style={{ fontSize:'clamp(16px,2.2vw,21px)', color:'#6a90a8', lineHeight:1.65, marginBottom:48, maxWidth:640, margin:'0 auto 48px' }}>
            5 AI agents analyze any stock in seconds. Entry zones. Stop loss. Price targets. Options strategy. Catalysts. The research that took analysts 4 hours — done before your coffee.
          </p>

          {/* Mini chart preview */}
          <div style={{ maxWidth:500, margin:'0 auto 40px', height:80, background:'rgba(6,13,20,0.7)', border:'1px solid rgba(0,212,170,0.15)', borderRadius:16, overflow:'hidden', backdropFilter:'blur(10px)', padding:'8px' }}>
            <AnimChart />
          </div>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/ai-stocks" className="mag-btn" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:900, textDecoration:'none', boxShadow:'0 0 60px #00d4aa50,0 20px 40px rgba(0,0,0,.4)', letterSpacing:'-.3px', display:'inline-block' }}>
              Analyze Any Stock Free →
            </Link>
            <Link href="/intelligence" style={{ background:'linear-gradient(135deg,rgba(255,45,120,.15),rgba(168,85,247,.15))', border:'1px solid rgba(168,85,247,.3)', color:'#dce8f0', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(12px)' }}>
              🔫 Intelligence Suite
            </Link>
          </div>

          <div style={{ marginTop:32, display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap' }}>
            {[['3,000+','Active Traders'],['$0','To Start'],['15s','Analysis Time'],['5','AI Agents']].map(([n,l])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#00d4aa', fontFamily:'monospace' }}>{n}</div>
                <div style={{ fontSize:11, color:'#6a90a8', letterSpacing:'.5px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8, opacity:.35, zIndex:2 }}>
          <span style={{ fontSize:9, letterSpacing:'3px', color:'#6a90a8' }}>SCROLL</span>
          <div style={{ width:1, height:44, background:'linear-gradient(#00d4aa,transparent)', animation:'float3d 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)', height:38, overflow:'hidden', position:'relative', zIndex:1, background:'rgba(4,10,16,.8)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'inline-flex', animation:'ticker3d 28s linear infinite', whiteSpace:'nowrap', height:'100%', alignItems:'center' }}>
          {[...Array(2)].flatMap(() => ['🤖 AI Stock Analyzer — 5 agents, 15 seconds','🔫 Lock-Up Assassin — Predict the dump','🧪 Lie Detector — Find what they buried','🧠 Galaxy Brain — Trace the domino chain','🌊 Forced Flow — Front-run guaranteed money','⚡ Signal Radar — 73-91% hit rates','📄 Filing X-Ray — Read SEC before analysts','📰 Daily Intelligence — Free every morning'].map((t,i)=>(
            <span key={t+i} style={{ padding:'0 28px', fontSize:11, fontWeight:700, letterSpacing:'.5px', color:['#00d4aa','#3b8eea','#a855f7','#f59e0b','#ec4899'][i%5] }}>
              {t} <span style={{ opacity:.2, marginLeft:12 }}>✦</span>
            </span>
          )))}
        </div>
      </div>

      {/* ══ ANALYZER PITCH ══════════════════════════════════════════════════════ */}
      <section style={{ padding:'130px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={analyzerRef} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }} className="g2">

            {/* Left: pitch */}
            <div ref={analyzer.ref} className={`vis${analyzer.v?' show':''}`}>
              <div className="item i0" style={{ fontSize:11, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, marginBottom:16 }}>THE ANALYZER</div>
              <h2 className="item i1" style={{ fontSize:'clamp(30px,4vw,52px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.1, marginBottom:20 }}>
                Five Agents.<br />
                <span style={{ background:'linear-gradient(135deg,#00d4aa,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>One Decision.</span><br />
                15 Seconds.
              </h2>
              <p className="item i2" style={{ fontSize:16, color:'#6a90a8', lineHeight:1.7, marginBottom:28 }}>
                Type any ticker. Our AI deploys five specialized agents simultaneously — each an expert in their domain — then the Portfolio Manager synthesizes it all into a single, decisive, actionable recommendation.
              </p>
              <div className="item i3" style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:32 }}>
                {['Entry zone with specific price range','Stop loss + two profit targets','Options strategy with strike, expiry & breakeven','Multi-timeframe outlook (1W/1M/3M/6M)','Position sizing calculator built in','Upcoming catalysts & key risks'].map(f=>(
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#b8d0e0' }}>
                    <span style={{ color:'#00d4aa', fontSize:16, flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <div className="item i4">
                <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'15px 32px', borderRadius:12, fontSize:15, fontWeight:900, textDecoration:'none', boxShadow:'0 0 40px #00d4aa40', display:'inline-block' }}>
                  Try It Now — It&apos;s Free →
                </Link>
              </div>
            </div>

            {/* Right: live agent demo */}
            <div style={{ background:'rgba(6,13,20,0.85)', border:'1px solid rgba(0,212,170,0.15)', borderRadius:20, padding:28, backdropFilter:'blur(16px)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00d4aa,transparent)', animation:'scanline 2s linear infinite' }} />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                <div style={{ display:'flex', gap:6 }}>
                  {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
                </div>
                <span style={{ fontFamily:'monospace', fontSize:12, color:'#6a90a8' }}>YN Analyzer — NVDA</span>
                <div style={{ marginLeft:'auto', fontSize:11, color:'#00d4aa', background:'#00d4aa15', padding:'3px 10px', borderRadius:8, fontWeight:700 }}>LIVE</div>
              </div>
              <div style={{ fontFamily:'monospace', fontSize:12, marginBottom:20 }}>
                <span style={{ color:'#6a90a8' }}>$ </span>
                <span style={{ color:'#00d4aa' }}>analyze</span>
                <span style={{ color:'#dce8f0' }}> NVDA</span>
              </div>
              {AGENT_STEPS.map((a, i) => (
                <div key={a.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, marginBottom:6, background: agentStep >= i ? `${a.clr}10` : 'transparent', border:`1px solid ${agentStep >= i ? a.clr + '30' : 'transparent'}`, transition:'all .4s' }}>
                  <span style={{ fontSize:18 }}>{a.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color: agentStep >= i ? a.clr : '#2a4a62', transition:'color .4s' }}>{a.name}</div>
                    <div style={{ fontSize:10, color: agentStep >= i ? '#6a90a8' : '#1a3550', transition:'color .4s', fontFamily:'monospace', marginTop:2 }}>{agentStep >= i ? a.task : '...'}</div>
                  </div>
                  {agentStep > i  && <span style={{ color: a.clr, fontSize:14 }}>✓</span>}
                  {agentStep === i && <div style={{ width:8, height:8, borderRadius:'50%', background: a.clr, animation:'pulse-dot .8s infinite' }} />}
                  {agentStep < i  && <div style={{ width:8, height:8, borderRadius:'50%', background:'#0c1e2e' }} />}
                </div>
              ))}
              {agentStep >= AGENT_STEPS.length - 1 && (
                <div style={{ marginTop:16, padding:'14px 18px', background:'linear-gradient(135deg,#00d4aa15,#3b8eea10)', border:'1px solid #00d4aa30', borderRadius:12 }}>
                  <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:8 }}>AI VERDICT</div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:22, fontWeight:900, color:'#00d4aa' }}>Strong Buy</div>
                    <div style={{ fontFamily:'monospace', fontSize:13, color:'#dce8f0' }}>Target: $185.40 · Stop: $138.20</div>
                  </div>
                  <div style={{ fontSize:11, color:'#6a90a8', marginTop:6 }}>Buy Calls · $145 strike · 45 days · Breakeven: $148.30</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)', background:'rgba(6,13,20,.6)', backdropFilter:'blur(12px)' }}>
        <div ref={stats.ref} className={`section vis${stats.v?' show':''}`} style={{ padding:'60px 24px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }} >
          {[
            { label:'Active Traders',  n: 3247,  suf: '+' },
            { label:'Analyses Run',    n: 28000, suf: '+' },
            { label:'AI Agents',       n: 5,     suf: '' },
            { label:'Data Points/Run', n: 120,   suf: '+' },
          ].map(({ label, n, suf }) => (
            <div key={label} className="item" style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:900, color:'#00d4aa', fontFamily:'monospace', letterSpacing:'-2px' }}>
                <Counter to={n} suffix={suf} />
              </div>
              <div style={{ fontSize:12, color:'#6a90a8', marginTop:6, letterSpacing:'.5px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ INTELLIGENCE SUITE — CINEMATIC ═══════════════════════════════════════ */}
      <section style={{ position:'relative', zIndex:1, overflow:'hidden', background:'#000' }}>
        {/* Grid + multi-glow bg */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,45,120,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,45,120,.025) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#ff2d78,#a855f7,#00d4ff,transparent)' }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#00d4ff,#a855f7,#ff2d78,transparent)' }}/>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,45,120,.06),transparent 70%)', top:'5%', left:'5%', pointerEvents:'none', animation:'glow-anim 4s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,.07),transparent 70%)', top:'40%', right:'0%', pointerEvents:'none', animation:'glow-anim 5s ease-in-out infinite .8s' }}/>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,255,.05),transparent 70%)', top:'70%', left:'30%', pointerEvents:'none', animation:'glow-anim 6s ease-in-out infinite 1.6s' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,255,136,.04),transparent 70%)', top:'20%', left:'50%', pointerEvents:'none', animation:'glow-anim 7s ease-in-out infinite 2.4s' }}/>


        <div ref={intel.ref} className={`vis${intel.v?' show':''}`} style={{ padding:'120px 0 0' }}>

          {/* ── INTRO HEADER ─────────────────────────────────────────────── */}
          <div className="section item i0" style={{ textAlign:'center', marginBottom:100 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,45,120,.1)', border:'1px solid rgba(255,45,120,.3)', borderRadius:20, padding:'8px 20px', marginBottom:24, fontSize:11, color:'#ff2d78', fontWeight:700, letterSpacing:'1.5px' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff2d78', display:'inline-block', animation:'pulse-dot 1s infinite' }}/>
              CLASSIFIED · INTELLIGENCE SUITE · CLEARANCE REQUIRED
            </div>
            <h2 style={{ fontSize:'clamp(44px,7.5vw,96px)', fontWeight:900, lineHeight:.88, letterSpacing:'-4px', color:'#fff', marginBottom:24 }}>
              Six Weapons.<br/>
              <span style={{ background:'linear-gradient(135deg,#ff2d78 0%,#a855f7 40%,#00d4ff 80%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 4s linear infinite' }}>
                Unprecedented.
              </span>
            </h2>
            <p style={{ fontSize:'clamp(16px,2vw,22px)', color:'#5a7a88', lineHeight:1.6, maxWidth:680, margin:'0 auto' }}>
              The intelligence hedge funds pay analysts $500K/year to produce. We automated all six. In one ops center. Free.
            </p>
          </div>

          {/* ── WEAPON 1: LOCK-UP ASSASSIN ───────────────────────────────── */}
          <div className="item i1" style={{ marginBottom:2, background:'rgba(255,45,120,.03)', borderTop:'1px solid rgba(255,45,120,.12)', borderBottom:'1px solid rgba(255,45,120,.08)' }}>
            <div className="section" style={{ padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }} >
              <div>
                <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'3px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#ff2d78', display:'inline-block' }}/> WEAPON 01 · SCHEDULED DESTRUCTION
                </div>
                <h3 style={{ fontSize:'clamp(32px,4vw,54px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:16, lineHeight:1 }}>
                  🔫 Lock-Up<br/>Assassin
                </h3>
                <p style={{ fontSize:16, color:'#5a7a88', lineHeight:1.75, marginBottom:20 }}>
                  Every IPO has a 180-day lock-up. When it expires, insiders sell. This is <em style={{ color:'#ff2d78' }}>guaranteed, dated, and sized</em>. Build the put position 3 weeks before everyone else knows it&apos;s coming.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
                  {['Lock-up expiry date calculated from SEC S-1','Insider float size and sell probability modeled','Exact put position: strike, expiry, entry window','Historical drop analysis for comparable IPOs'].map(f=>(
                    <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:'#8a9aaa' }}>
                      <span style={{ color:'#ff2d78', flexShrink:0 }}>→</span>{f}
                    </div>
                  ))}
                </div>
                <Link href="/intelligence" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ff2d78', color:'#fff', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(255,45,120,.4)' }}>
                  Deploy Lock-Up Assassin →
                </Link>
              </div>
              <div style={{ background:'rgba(0,0,0,.6)', border:'1px solid rgba(255,45,120,.2)', borderRadius:12, overflow:'hidden', backdropFilter:'blur(12px)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,45,120,.1)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#5a7a88' }}>lockup_assassin.exe — RDDT</span>
                  <span style={{ marginLeft:'auto', fontSize:10, color:'#ff2d78', fontWeight:700 }}>SECRET</span>
                </div>
                <div style={{ padding:'6px' }}><CrashChart/></div>
                <div style={{ padding:'14px 18px', borderTop:'1px solid rgba(255,45,120,.1)', fontFamily:'monospace', fontSize:11 }}>
                  <div style={{ color:'#5a7a88' }}>Lock-up expiry: <span style={{ color:'#ff2d78' }}>DAY 180 → JUNE 14</span></div>
                  <div style={{ color:'#5a7a88', marginTop:4 }}>Unlock shares: <span style={{ color:'#ff2d78' }}>84.2M (3.1× daily volume)</span></div>
                  <div style={{ color:'#5a7a88', marginTop:4 }}>Historical drop: <span style={{ color:'#ff2d78' }}>-21% avg, starts -6 days</span></div>
                  <div style={{ color:'#00ff88', marginTop:8, fontWeight:700 }}>→ BUY PUTS · Entry June 8 · $10P Jun 21</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── WEAPON 2: LIE DETECTOR ──────────────────────────────────── */}
          <div className="item i2" style={{ marginBottom:2, background:'rgba(245,158,11,.03)', borderTop:'1px solid rgba(245,158,11,.12)', borderBottom:'1px solid rgba(245,158,11,.08)' }}>
            <div className="section" style={{ padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
              <div style={{ background:'rgba(0,0,0,.6)', border:'1px solid rgba(245,158,11,.2)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(245,158,11,.1)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>)}</div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#5a7a88' }}>lie_detector.exe — TSLA</span>
                </div>
                <div style={{ padding:'6px' }}><LieWave/></div>
                <div style={{ padding:'14px 18px', borderTop:'1px solid rgba(245,158,11,.1)', fontFamily:'monospace', fontSize:11 }}>
                  <div style={{ color:'#f59e0b', fontWeight:700 }}>DIVERGENCE SCORE: 84/100</div>
                  <div style={{ color:'#5a7a88', marginTop:4 }}>Narrative: <span style={{ color:'#6a90a8' }}>Record deliveries, strong demand</span></div>
                  <div style={{ color:'#5a7a88', marginTop:4 }}>Reality: <span style={{ color:'#f59e0b' }}>FCF miss $400M · Warranty +$800M</span></div>
                  <div style={{ color:'#00ff88', marginTop:8, fontWeight:700 }}>→ HIGH DIVERGENCE · Fade the narrative</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:'#f59e0b', letterSpacing:'3px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }}/> WEAPON 02 · FORENSIC EARNINGS ANALYSIS
                </div>
                <h3 style={{ fontSize:'clamp(32px,4vw,54px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:16, lineHeight:1 }}>
                  🧪 Lie<br/>Detector
                </h3>
                <p style={{ fontSize:16, color:'#5a7a88', lineHeight:1.75, marginBottom:20 }}>
                  Management has a story. The numbers have a completely different one. AI reads the earnings narrative, cross-references the actual data, and scores the <em style={{ color:'#f59e0b' }}>divergence 0-100</em> before analysts publish.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
                  {['What management is deflecting from — and why','Deferred revenue, warranty reserve, and FCF manipulation','Divergence score between narrative and actual numbers','The specific hidden signal and how to trade it'].map(f=>(
                    <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:'#8a9aaa' }}>
                      <span style={{ color:'#f59e0b', flexShrink:0 }}>→</span>{f}
                    </div>
                  ))}
                </div>
                <Link href="/intelligence" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#f59e0b', color:'#000', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(245,158,11,.4)' }}>
                  Run Lie Detector →
                </Link>
              </div>
            </div>
          </div>

          {/* ── WEAPON 3: GALAXY BRAIN — FULL WIDTH ─────────────────────── */}
          <div className="item i3" style={{ marginBottom:2, background:'rgba(168,85,247,.03)', borderTop:'1px solid rgba(168,85,247,.12)', borderBottom:'1px solid rgba(168,85,247,.08)', padding:'80px 0' }}>
            <div className="section" style={{ textAlign:'center', marginBottom:40 }}>
              <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'3px', marginBottom:10 }}>WEAPON 03 · MACRO DOMINO TRACER</div>
              <h3 style={{ fontSize:'clamp(36px,5vw,64px)', fontWeight:900, letterSpacing:'-2.5px', color:'#fff', marginBottom:16 }}>
                🧠 Galaxy Brain
              </h3>
              <p style={{ fontSize:17, color:'#5a7a88', lineHeight:1.7, maxWidth:620, margin:'0 auto 32px' }}>
                Type any macro event. AI traces the full domino chain — 5 steps deep — including the <em style={{ color:'#a855f7' }}>non-obvious connections retail traders would never make</em>.
              </p>
            </div>
            <div className="section" style={{ display:'grid', gridTemplateColumns:'1fr 300px 1fr', gap:24, alignItems:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {['Fed holds rates', 'Dollar weakens', 'EM currencies strengthen', 'EM fund inflows'].map((step,i)=>(
                  <div key={step} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(168,85,247,.2)', border:'1px solid #a855f7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#a855f7', flexShrink:0 }}>{i+1}</div>
                    <div style={{ background:'rgba(0,0,0,.5)', border:'1px solid rgba(168,85,247,.2)', borderRadius:8, padding:'10px 14px', flex:1, fontSize:13, color:'#8a9aaa' }}>{step}</div>
                    {i<3 && <div style={{ fontSize:16, color:'rgba(168,85,247,.5)' }}>↓</div>}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'center' }}><NeuralWeb/></div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {['EM stocks surge','Tech rotation begins','⚡ KWEB calls (nobody sees this)','⚡ EEM calls + DXY puts'].map((step,i)=>(
                  <div key={step} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: step.includes('⚡')?'rgba(168,85,247,.4)':'rgba(168,85,247,.2)', border:`1px solid ${step.includes('⚡')?'#a855f7':'rgba(168,85,247,.4)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#a855f7', flexShrink:0, boxShadow:step.includes('⚡')?'0 0 12px #a855f7':'none' }}>{i+5}</div>
                    <div style={{ background: step.includes('⚡')?'rgba(168,85,247,.12)':'rgba(0,0,0,.5)', border:`1px solid ${step.includes('⚡')?'rgba(168,85,247,.5)':'rgba(168,85,247,.2)'}`, borderRadius:8, padding:'10px 14px', flex:1, fontSize:13, color: step.includes('⚡')?'#a855f7':'#8a9aaa', fontWeight:step.includes('⚡')?700:400 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'center', marginTop:40 }}>
              <Link href="/intelligence" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#a855f7', color:'#fff', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(168,85,247,.4)' }}>
                Trace Any Macro Scenario →
              </Link>
            </div>
          </div>

          {/* ── WEAPONS 4-6: THREE CARDS SIDE BY SIDE ────────────────────── */}
          <div className="item i4" style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
            <div className="section" style={{ padding:'80px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }} className="g3">

                {/* Forced Flow */}
                <div style={{ background:'rgba(0,0,0,.7)', border:'1px solid rgba(0,212,255,.2)', borderRadius:12, overflow:'hidden', transition:'all .3s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,.5)';e.currentTarget.style.transform='translateY(-8px)';e.currentTarget.style.boxShadow='0 30px 60px rgba(0,0,0,.5),0 0 40px rgba(0,212,255,.15)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,.2)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{ padding:'24px', borderBottom:'1px solid rgba(0,212,255,.12)' }}>
                    <div style={{ fontSize:9, color:'#00d4ff', letterSpacing:'2px', marginBottom:8 }}>WEAPON 04 · MECHANICAL FLOWS</div>
                    <div style={{ fontSize:24, fontWeight:900, color:'#fff', marginBottom:10 }}>🌊 Forced Flow</div>
                    <p style={{ fontSize:12.5, color:'#5a7a88', lineHeight:1.65 }}>Billions HAVE to move into specific stocks every month. Index rebalancing. Gamma hedging. ETF creations. Front-run guaranteed mechanical buying.</p>
                  </div>
                  <div style={{ padding:'4px' }}><FlowStream/></div>
                  <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(0,212,255,.1)' }}>
                    <Link href="/intelligence" style={{ display:'block', textAlign:'center', background:'rgba(0,212,255,.15)', border:'1px solid rgba(0,212,255,.3)', color:'#00d4ff', padding:'10px', borderRadius:6, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      See This Month&apos;s Flows →
                    </Link>
                  </div>
                </div>

                {/* Signal Radar */}
                <div style={{ background:'rgba(0,0,0,.7)', border:'1px solid rgba(0,255,136,.2)', borderRadius:12, overflow:'hidden', transition:'all .3s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,255,136,.5)';e.currentTarget.style.transform='translateY(-8px)';e.currentTarget.style.boxShadow='0 30px 60px rgba(0,0,0,.5),0 0 40px rgba(0,255,136,.15)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,255,136,.2)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{ padding:'24px', borderBottom:'1px solid rgba(0,255,136,.12)' }}>
                    <div style={{ fontSize:9, color:'#00ff88', letterSpacing:'2px', marginBottom:8 }}>WEAPON 05 · CROSS-ASSET CORRELATIONS</div>
                    <div style={{ fontSize:24, fontWeight:900, color:'#fff', marginBottom:10 }}>⚡ Signal Radar</div>
                    <p style={{ fontSize:12.5, color:'#5a7a88', lineHeight:1.65 }}>Korean Won weakens → Qualcomm drops 72h later. 7/8 times. We track 8 of these correlations live and alert you the second one fires.</p>
                  </div>
                  <div style={{ display:'flex', justifyContent:'center', padding:'8px 0', background:'rgba(0,10,5,.5)' }}><MiniRadar/></div>
                  <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(0,255,136,.1)' }}>
                    <Link href="/intelligence" style={{ display:'block', textAlign:'center', background:'rgba(0,255,136,.15)', border:'1px solid rgba(0,255,136,.3)', color:'#00ff88', padding:'10px', borderRadius:6, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      Check Active Signals →
                    </Link>
                  </div>
                </div>

                {/* Filing X-Ray */}
                <div style={{ background:'rgba(0,0,0,.7)', border:'1px solid rgba(236,72,153,.2)', borderRadius:12, overflow:'hidden', transition:'all .3s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(236,72,153,.5)';e.currentTarget.style.transform='translateY(-8px)';e.currentTarget.style.boxShadow='0 30px 60px rgba(0,0,0,.5),0 0 40px rgba(236,72,153,.15)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(236,72,153,.2)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
                  <div style={{ padding:'24px', borderBottom:'1px solid rgba(236,72,153,.12)' }}>
                    <div style={{ fontSize:9, color:'#ec4899', letterSpacing:'2px', marginBottom:8 }}>WEAPON 06 · SEC DOCUMENT INTELLIGENCE</div>
                    <div style={{ fontSize:24, fontWeight:900, color:'#fff', marginBottom:10 }}>📄 Filing X-Ray</div>
                    <p style={{ fontSize:12.5, color:'#5a7a88', lineHeight:1.65 }}>Companies bury the bad news on page 47. AI reads SEC filings the second they drop and finds the $200M write-down before any analyst opens the document.</p>
                  </div>
                  <div style={{ padding:'4px', background:'rgba(0,0,0,.3)' }}><XRayDoc/></div>
                  <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(236,72,153,.1)' }}>
                    <Link href="/intelligence" style={{ display:'block', textAlign:'center', background:'rgba(236,72,153,.15)', border:'1px solid rgba(236,72,153,.3)', color:'#ec4899', padding:'10px', borderRadius:6, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      X-Ray a Filing →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MASTER CTA ──────────────────────────────────────────────── */}
          <div className="item i5" style={{ textAlign:'center', padding:'80px 24px 120px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize:11, color:'#4a6a78', letterSpacing:'2px', marginBottom:20 }}>ALL SIX WEAPONS · ONE OPS CENTER · FREE TO ACCESS</div>
            <h3 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:20 }}>
              Enter the Intelligence Suite
            </h3>
            <p style={{ fontSize:16, color:'#5a7a88', marginBottom:36, maxWidth:480, margin:'0 auto 36px' }}>
              The tools that don&apos;t exist anywhere else. The edge that only institutions have had. Until now.
            </p>
            <Link href="/intelligence" style={{ display:'inline-flex', alignItems:'center', gap:12, background:'linear-gradient(135deg,#ff2d78,#a855f7,#00d4ff)', backgroundSize:'200%', animation:'holo 3s linear infinite', color:'#fff', padding:'20px 56px', borderRadius:12, fontSize:17, fontWeight:900, textDecoration:'none', boxShadow:'0 0 80px rgba(168,85,247,.4),0 24px 60px rgba(0,0,0,.6)', letterSpacing:'-.5px' }}>
              <span style={{ fontSize:20 }}>🎯</span> Access Intelligence Suite — Free
            </Link>
            <div style={{ marginTop:24, display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
              {[['🔫','Lock-Up Assassin'],['🧪','Lie Detector'],['🧠','Galaxy Brain'],['🌊','Forced Flow'],['⚡','Signal Radar'],['📄','Filing X-Ray']].map(([icon,name])=>(
                <div key={name} style={{ fontSize:12, color:'#3a5a68' }}>{icon} {name}</div>
              ))}
            </div>
          </div>

        </div>
      </section>


      {/* ══ POWERED BY ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'130px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={powers.ref} className={`vis${powers.v?' show':''}`}>
            <div className="item i0" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#3b8eea', letterSpacing:'2px', fontWeight:700, marginBottom:14 }}>THE STACK</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.05 }}>
                Powered by the World&apos;s{' '}
                <span style={{ background:'linear-gradient(135deg,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Best Tech</span>
              </h2>
            </div>
            <div className="g3 item i1" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {POWERS.map((p,i) => (
                <div key={p.name} className={`power-card i${i+1}`} style={{ '--clr': p.clr } as React.CSSProperties}>
                  <div className="power-inner">
                    <div style={{ fontSize:40, marginBottom:16 }}>{p.icon}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:17, fontWeight:900 }}>{p.name}</span>
                      <span style={{ fontSize:9, color: p.clr, background:`${p.clr}18`, border:`1px solid ${p.clr}30`, borderRadius:6, padding:'2px 8px', fontWeight:800, letterSpacing:'.5px' }}>{p.label}</span>
                    </div>
                    <p style={{ fontSize:13, color:'#6a90a8', lineHeight:1.65 }}>{p.desc}</p>
                    <div style={{ marginTop:18, height:2, background:`linear-gradient(90deg,${p.clr},transparent)`, borderRadius:1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOUNDERS ════════════════════════════════════════════════════════════ */}
      <section style={{ padding:'140px 0', position:'relative', zIndex:1 }}>
        {/* bg decoration */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent,rgba(6,13,20,.6),transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)', width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,.04) 0%,transparent 70%)', pointerEvents:'none' }}/>

        <div className="section">
          <div ref={founders.ref} className={`vis${founders.v?' show':''}`}>

            {/* Header */}
            <div className="item i0" style={{ textAlign:'center', marginBottom:80 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:20, padding:'6px 18px', marginBottom:20, fontSize:11, color:'#f59e0b', fontWeight:700, letterSpacing:'1px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }}/>
                THE FOUNDING TEAM
              </div>
              <h2 style={{ fontSize:'clamp(36px,5.5vw,66px)', fontWeight:900, letterSpacing:'-2.5px', lineHeight:1.0, marginBottom:16 }}>
                Built by{' '}
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>obsessed</span>
                {' '}builders.
              </h2>
              <p style={{ fontSize:18, color:'#6a90a8', maxWidth:520, margin:'0 auto', lineHeight:1.6 }}>
                Three co-founders. One mission — give every retail trader the same intelligence Wall Street has kept to itself.
              </p>
            </div>

            {/* Cards */}
            {FOUNDERS.map((f, i) => (
              <div key={f.name} className="item" style={{ marginBottom: i < FOUNDERS.length-1 ? 28 : 0, animationDelay:`${i*.12}s` }}>
                <div style={{ background:'rgba(6,13,20,.85)', border:`1px solid ${f.clr}20`, borderRadius:24, overflow:'hidden', backdropFilter:'blur(16px)', transition:'border-color .3s', position:'relative' }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor=f.clr+'50')}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor=f.clr+'20')}>

                  {/* Top gradient bar */}
                  <div style={{ height:3, background: f.grad, width:'100%' }}/>

                  {/* Glow corner */}
                  <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:`radial-gradient(circle,${f.clr}10,transparent 70%)`, pointerEvents:'none' }}/>

                  <div style={{ display:'grid', gridTemplateColumns:i===1?'1fr 260px 320px':'260px 1fr 320px', gap:0, minHeight:280 }}>

                    {/* Panel A — Identity */}
                    <div style={{ padding:'36px 32px', borderRight:`1px solid ${f.clr}12`, display:'flex', flexDirection:'column', justifyContent:'space-between', order: i===1?2:1 }}>
                      <div>
                        {/* Avatar */}
                        <div style={{ width:80, height:80, borderRadius:22, background: f.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:900, color:'#030a10', marginBottom:20, boxShadow:`0 0 50px ${f.clr}50, 0 0 100px ${f.clr}20`, animation:'float3d 4s ease-in-out infinite', animationDelay:`${i*.7}s` }}>
                          {f.init}
                        </div>
                        <div style={{ fontSize:24, fontWeight:900, letterSpacing:'-.5px', marginBottom:4 }}>{f.name}</div>
                        <div style={{ fontSize:13, color: f.clr, fontWeight:700, letterSpacing:'.3px', marginBottom:16 }}>{f.role}</div>
                        <div style={{ fontSize:11, color:'#6a90a8', letterSpacing:'.3px', lineHeight:1.6, marginBottom:20 }}>{f.focus}</div>
                        {/* Tags */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {f.tags.map(t=>(
                            <span key={t} style={{ fontSize:10, color: f.clr, background:`${f.clr}12`, border:`1px solid ${f.clr}25`, borderRadius:6, padding:'3px 10px', fontWeight:700, letterSpacing:'.3px' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      {/* Stats */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:24 }}>
                        {[f.stat1, f.stat2].map(s=>(
                          <div key={s.label} style={{ background:`${f.clr}08`, border:`1px solid ${f.clr}18`, borderRadius:12, padding:'14px 16px' }}>
                            <div style={{ fontSize:22, fontWeight:900, color: f.clr, fontFamily:'monospace', letterSpacing:'-.5px', textShadow:`0 0 20px ${f.clr}` }}>{s.n}</div>
                            <div style={{ fontSize:10, color:'#6a90a8', marginTop:3, letterSpacing:'.3px' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Panel B — Quote + Bio */}
                    <div style={{ padding:'36px 32px', display:'flex', flexDirection:'column', justifyContent:'center', order: i===1?1:2 }}>
                      {/* Pull quote */}
                      <div style={{ position:'relative', marginBottom:28 }}>
                        <div style={{ fontSize:64, color: f.clr, lineHeight:.7, fontFamily:'Georgia,serif', opacity:.3, position:'absolute', top:-8, left:-8 }}>"</div>
                        <blockquote style={{ fontSize:'clamp(15px,1.8vw,18px)', color:'#dce8f0', lineHeight:1.65, fontStyle:'italic', fontWeight:500, paddingLeft:20, borderLeft:`3px solid ${f.clr}`, textShadow:`0 0 30px ${f.clr}20` }}>
                          {f.quote.replace(/^"|"$/g,'')}
                        </blockquote>
                      </div>
                      <p style={{ fontSize:14, color:'#6a90a8', lineHeight:1.8 }}>{f.bio}</p>
                    </div>

                    {/* Panel C — Skills */}
                    <div style={{ padding:'36px 32px', borderLeft:`1px solid ${f.clr}12`, display:'flex', flexDirection:'column', justifyContent:'center', order:3 }}>
                      <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'1px', marginBottom:20 }}>EXPERTISE</div>
                      {f.skills.map(s=>(
                        <div key={s.label} style={{ marginBottom:20 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <span style={{ fontSize:12, color:'#b8d0e0', fontWeight:600 }}>{s.label}</span>
                            <span style={{ fontSize:12, color: f.clr, fontWeight:800, fontFamily:'monospace' }}>{s.pct}%</span>
                          </div>
                          <div style={{ height:6, background:'rgba(255,255,255,.04)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${s.pct}%`, background: f.grad, borderRadius:3, boxShadow:`0 0 12px ${f.clr}60`, transition:'width 1.4s cubic-bezier(.22,1,.36,1)' }}/>
                          </div>
                        </div>
                      ))}
                      {/* CTA */}
                      <div style={{ marginTop:8, paddingTop:20, borderTop:`1px solid ${f.clr}12` }}>
                        <a href={f.twitter} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:12, color: f.clr, textDecoration:'none', fontWeight:700, transition:'opacity .2s' }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity='.7')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Follow on X
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Team stat strip */}
            <div className="item" style={{ marginTop:48, background:'rgba(6,13,20,.7)', border:'1px solid rgba(255,255,255,.04)', borderRadius:16, padding:'28px 40px', backdropFilter:'blur(12px)', display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:20 }}>
              {[
                { n:'3', label:'Co-Founders', sub:'100% equity-held' },
                { n:'1', label:'Mission', sub:'Democratize trading intel' },
                { n:'∞', label:'Ambition', sub:'Built to last' },
                { n:'2026', label:'Founded', sub:'YN Finance Corp.' },
              ].map(({ n, label, sub }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-1px', background:'linear-gradient(135deg,#00d4aa,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{n}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#dce8f0', marginTop:4 }}>{label}</div>
                  <div style={{ fontSize:11, color:'#6a90a8', marginTop:2 }}>{sub}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'150px 0', position:'relative', zIndex:1, textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(0,212,170,.06) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div className="section" style={{ position:'relative' }}>
          <div style={{ fontSize:11, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, marginBottom:20 }}>START FREE · NO CREDIT CARD</div>
          <h2 style={{ fontSize:'clamp(40px,7vw,88px)', fontWeight:900, letterSpacing:'-3px', lineHeight:.95, marginBottom:28 }}>
            The Edge Is{' '}
            <span style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 3s linear infinite' }}>
              Yours
            </span>
          </h2>
          <p style={{ fontSize:20, color:'#6a90a8', lineHeight:1.6, marginBottom:52, maxWidth:500, margin:'0 auto 52px' }}>
            Join thousands of traders using AI to find better entries, tighter stops, and bigger wins.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:40 }}>
            <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:900, textDecoration:'none', boxShadow:'0 0 60px #00d4aa40,0 20px 40px rgba(0,0,0,.5)', letterSpacing:'-.3px', display:'inline-block' }}>
              AI Analyzer →
            </Link>
            <Link href="/intelligence" style={{ background:'linear-gradient(135deg,rgba(255,45,120,.2),rgba(168,85,247,.2))', border:'1px solid rgba(168,85,247,.4)', color:'#dce8f0', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(16px)', boxShadow:'0 0 40px rgba(168,85,247,.2)' }}>
              Intelligence Suite →
            </Link>
            <Link href="/daily" style={{ background:'rgba(6,13,20,.9)', border:'1px solid rgba(255,255,255,.08)', color:'#dce8f0', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(16px)' }}>
              Daily Intel
            </Link>
          </div>
          <div style={{ display:'flex', gap:36, justifyContent:'center', flexWrap:'wrap' }}>
            {['Always free to start','Real market data','AI that actually works','No hype — just edge'].map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#6a90a8' }}>
                <span style={{ color:'#00d4aa', fontSize:16 }}>✦</span> {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.04)', padding:'36px 24px', position:'relative', zIndex:1, background:'rgba(3,10,16,.9)', backdropFilter:'blur(20px)' }}>
        <div className="section" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:10, color:'#030a10' }}>YN</div>
            <span style={{ fontWeight:800, fontSize:14 }}>YN Finance</span>
            <span style={{ fontSize:11, color:'#1a3550', marginLeft:8 }}>© 2026</span>
          </div>
          <div style={{ display:'flex', gap:22 }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['AI Analyzer','/ai-stocks'],['Intelligence','/intelligence'],['Daily Intel','/daily'],['Performance','/performance'],['Courses','/courses']].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:12, color:'#2a4a62', textDecoration:'none', transition:'color .2s' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:11, color:'#1a3550' }}>Not financial advice. Educational purposes only.</div>
        </div>
      </footer>
    </div>
  )
}
