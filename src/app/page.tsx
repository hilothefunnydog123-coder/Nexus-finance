'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { YNMark } from '@/components/YNLogo'

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })
import AdsterraBanner from '@/components/ads/AdsterraBanner'
import NativeAd from '@/components/ads/NativeAd'

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

// ── NEW INTELLIGENCE FEATURE CANVASES ─────────────────────────────────────────

function CongressCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; const W=c.width=320; const H=c.height=160
    const trades=[
      {name:'PELOSI N.',  ticker:'NVDA', type:'BUY',  score:94, party:'D'},
      {name:'TUBERVILLE', ticker:'TSLA', type:'BUY',  score:82, party:'R'},
      {name:'SCHIFF A.',  ticker:'MSFT', type:'BUY',  score:97, party:'D'},
      {name:'MCCARTHY K.',ticker:'AAPL', type:'SELL', score:31, party:'R'},
      {name:'GREENE M.',  ticker:'META', type:'BUY',  score:61, party:'R'},
      {name:'OCASIO C.',  ticker:'AMZN', type:'BUY',  score:79, party:'D'},
      {name:'TRUMP D.',   ticker:'COIN', type:'BUY',  score:88, party:'R'},
      {name:'WARREN E.',  ticker:'GOOGL', type:'SELL',score:24, party:'D'},
    ]
    let offset=0; let raf:number; let t=0
    function draw(){
      ctx.fillStyle='#030a10'; ctx.fillRect(0,0,W,H)
      // header
      ctx.fillStyle='rgba(0,212,170,.08)'; ctx.fillRect(0,0,W,16)
      ctx.font='bold 8px monospace'; ctx.fillStyle='#1a3550'
      ctx.fillText('MEMBER',8,11); ctx.fillText('TICKER',130,11); ctx.fillText('TYPE',185,11); ctx.fillText('SCORE',240,11); ctx.fillText('PARTY',290,11)
      // rows
      const rowH=19; const startY=22
      trades.forEach((tr,i)=>{
        const y=startY+(i*rowH)-offset%rowH+((offset/rowH|0)*rowH)
        const visY=(y-startY+H)%((trades.length)*rowH)
        const ry=startY+visY
        if(ry<16||ry>H+10) return
        const idx=(i+Math.floor(offset/rowH))%trades.length
        const d=trades[idx]
        if(!d) return
        const alpha=Math.min(1,Math.min(ry-16,H-ry)/20)
        // row bg
        if(d.score>70){ctx.fillStyle=`rgba(255,45,120,${alpha*.06})`;ctx.fillRect(0,ry-13,W,rowH)}
        // name
        ctx.font=`10px monospace`; ctx.fillStyle=`rgba(180,200,210,${alpha})`
        ctx.fillText(d.name,8,ry)
        // ticker
        ctx.fillStyle=`rgba(0,212,170,${alpha})`; ctx.font='bold 10px monospace'
        ctx.fillText(d.ticker,130,ry)
        // type badge
        const tc=d.type==='BUY'?`rgba(0,255,136,${alpha})`:`rgba(255,45,120,${alpha})`
        ctx.fillStyle=tc; ctx.font='bold 9px monospace'; ctx.fillText(d.type,185,ry)
        // score bar
        const bw=40; const bx=240
        ctx.fillStyle=`rgba(255,255,255,.05)`; ctx.fillRect(bx,ry-8,bw,5)
        const sc=d.score/100; const sclr=sc>0.7?`rgba(255,45,120,${alpha})`:sc>0.4?`rgba(245,158,11,${alpha})`:`rgba(0,212,170,${alpha})`
        ctx.fillStyle=sclr; ctx.fillRect(bx,ry-8,bw*sc,5)
        // party
        ctx.fillStyle=d.party==='D'?`rgba(59,142,234,${alpha})`:`rgba(255,45,120,${alpha})`
        ctx.font='bold 9px monospace'; ctx.fillText(d.party,300,ry)
      })
      // scan line
      const sy=(t*60)%H
      const sg=ctx.createLinearGradient(0,sy-6,0,sy+6)
      sg.addColorStop(0,'rgba(0,212,170,0)');sg.addColorStop(.5,'rgba(0,212,170,.12)');sg.addColorStop(1,'rgba(0,212,170,0)')
      ctx.fillStyle=sg; ctx.fillRect(0,sy-6,W,12)
      offset+=0.3; t+=0.016
      raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:160,display:'block'}}/>
}

function IntelCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; c.width=280; c.height=120
    const W=280; const H=120
    const signals=[
      {label:'NVDA',type:'INSIDER BUY',strength:3,clr:'#00ff88',x:40,y:38},
      {label:'TSLA',type:'UNUSUAL OPTS',strength:2,clr:'#f59e0b',x:40,y:68},
      {label:'COIN',type:'INSIDER BUY',strength:3,clr:'#00ff88',x:40,y:98},
    ]
    let t=0; let raf:number
    function draw(){
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='rgba(3,10,16,1)'; ctx.fillRect(0,0,W,H)
      signals.forEach(s=>{
        // signal strength bars
        for(let b=0;b<3;b++){
          const filled=b<s.strength
          const bh=6+b*4; const bw=5
          const bx=s.x+b*8; const by=s.y-bh
          const alpha=filled?(0.6+Math.sin(t*3+b)*.3):0.15
          ctx.fillStyle=filled?`${s.clr}${Math.floor(alpha*255).toString(16).padStart(2,'0')}`:'rgba(255,255,255,.1)'
          ctx.fillRect(bx,by,bw,bh)
          if(filled&&s.strength===3){ctx.shadowBlur=6;ctx.shadowColor=s.clr}
          ctx.shadowBlur=0
        }
        // label
        ctx.font='bold 9px monospace'; ctx.fillStyle=s.clr
        ctx.fillText(s.label,s.x+28,s.y)
        ctx.font='8px monospace'; ctx.fillStyle='rgba(100,140,160,.8)'
        ctx.fillText(s.type,s.x+52,s.y)
        // converging badge
        if(s.strength===3){
          const p=Math.sin(t*3)*.5+.5
          ctx.fillStyle=`rgba(255,45,120,${p*.5})`; ctx.fillRect(W-68,s.y-10,64,13)
          ctx.fillStyle='#ff2d78'; ctx.font='bold 7px monospace'
          ctx.fillText('⚡CONVERGING',W-66,s.y)
        }
      })
      // right side: live price ticker
      ctx.fillStyle='rgba(0,212,170,.05)'; ctx.fillRect(W-10,0,10,H)
      t+=0.02; raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

function EarningsGauge() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c=ref.current; if(!c) return
    const ctx=c.getContext('2d')!; c.width=280; c.height=120
    const W=280; const H=120
    const gauges=[
      {label:'NVDA',score:78,x:55, y:65},
      {label:'TSLA',score:31,x:140,y:65},
      {label:'AAPL',score:87,x:225,y:65},
    ]
    let t=0; let raf:number
    const animScores=[0,0,0]
    function draw(){
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle='#030a10'; ctx.fillRect(0,0,W,H)
      gauges.forEach((g,i)=>{
        if(animScores[i]<g.score) animScores[i]=Math.min(g.score,animScores[i]+1.2)
        const score=animScores[i]
        const clr=score>65?'#00ff88':score>35?'#f59e0b':'#ff2d78'
        const r=28; const cx=g.x; const cy=g.y
        // bg arc
        ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI*.8,Math.PI*.8,false)
        ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=4; ctx.stroke()
        // value arc
        const end=-Math.PI*.8+(Math.PI*1.6)*(score/100)
        ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI*.8,end,false)
        ctx.strokeStyle=clr; ctx.lineWidth=4
        ctx.shadowBlur=10; ctx.shadowColor=clr; ctx.stroke(); ctx.shadowBlur=0
        // score text
        ctx.fillStyle=clr; ctx.font='bold 13px monospace'
        ctx.textAlign='center'; ctx.fillText(`${Math.floor(score)}`,cx,cy+5)
        ctx.font='7px monospace'; ctx.fillStyle='rgba(100,140,160,.7)'
        ctx.fillText('TRUTH',cx,cy+16)
        // ticker label
        ctx.fillStyle='rgba(200,220,230,.8)'; ctx.font='bold 9px monospace'
        ctx.fillText(g.label,cx,cy-r-6)
        ctx.textAlign='left'
      })
      t+=0.016; raf=requestAnimationFrame(draw)
    }
    draw(); return ()=>cancelAnimationFrame(raf)
  },[])
  return <canvas ref={ref} style={{width:'100%',height:120,display:'block'}}/>
}

const FOUNDERS = [
  {
    name: 'Neil Gilani',
    role: 'CEO & Co-Founder',
    clr: '#00d4aa',
    grad: 'linear-gradient(135deg,#00d4aa,#3b8eea)',
    init: 'NG',
    quote: 'Every serious trader spends two hours on research before the open. I got tired of doing it manually at 13 — so I built the machine.',
    origin: 'Started building Discord bots at 11 because he wanted to automate things that bored him. By 12 he was pulling live stock data into spreadsheets just to see if he could. At 13, built a pre-market gap scanner that flagged setups before the open — it worked consistently enough his dad started using it. He posted a walkthrough on Reddit and woke up the next morning to 40,000 upvotes and an inbox he still hasn\'t fully cleared. He\'s 14 now. He spent the past year building YN Finance alone between school and weekends — the entire Gemini AI pipeline, real-time data infrastructure, the Intelligence Suite, the voice portal, and every line of code on ynfinance.org. Not one line was outsourced. No adult co-developer. Just 14 and completely obsessed with building something real.',
    mission: 'Give every retail trader the research infrastructure that institutional desks take for granted.',
    focus: 'AI Systems · Market Data Infrastructure · Full-Stack Engineering',
    tags: ['Gemini AI', 'Next.js 15', 'Finnhub', 'Supabase', 'Three.js', 'Stripe'],
    skills: [{ label:'AI/ML Engineering', pct:96 },{ label:'Full-Stack Development', pct:94 },{ label:'Market Data Systems', pct:91 }],
    stats: [
      { n:'13', label:'AI features shipped' },
      { n:'14mo', label:'Solo build time' },
      { n:'100K+', label:'Lines of code' },
      { n:'$0', label:'Engineering costs' },
    ],
    twitter: 'https://twitter.com',
  },
  {
    name: 'Yannai Richter',
    role: 'CTO & Co-Founder',
    clr: '#1e90ff',
    grad: 'linear-gradient(135deg,#1e90ff,#a855f7)',
    init: 'YR',
    quote: 'The information gap between institutional and retail traders isn\'t about intelligence — it\'s about access. We\'re closing it.',
    origin: 'Started paper trading at 12 on a simulator and made every mistake in the book — overleveraged, chased momentum, blew up the account twice. The third attempt was different: he studied institutional order flow obsessively, built a liquidity sweep strategy from scratch, and turned a simulated $500 into $31,000 in 11 months. At 13, posted a thread on X walking through a TSLA short setup three days before the stock dropped 19%. It reached 2.1 million people. 40,000 DMs landed that week, every single one asking the same question: how do you know what to look for? He found Neil through a mutual Discord server and joined as co-founder the same week. Then used that reputation to cold-email Ross Cameron 47 times before getting a reply — that first yes led to eight more. In four months while in middle school, he signed nine of the most recognized names in retail trading education on 70% revenue-share deals no ed-tech platform had ever offered.',
    mission: 'Make the market intelligence that moves institutional money visible and actionable for every retail trader on the planet.',
    focus: 'Growth · Instructor Partnerships · Platform Architecture · Brand Strategy',
    tags: ['TypeScript', 'Growth', 'System Design', 'Branding', 'Partnerships', 'Distribution'],
    skills: [{ label:'Growth Engineering', pct:93 },{ label:'Instructor Partnerships', pct:95 },{ label:'Brand Strategy', pct:92 }],
    stats: [
      { n:'$500→$31K', label:'Personal trading run' },
      { n:'2.1M', label:'Impressions, first call' },
      { n:'9', label:'World-class instructors signed' },
      { n:'70%', label:'Instructor revenue share' },
    ],
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
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:62, display:'flex', alignItems:'center', padding:'0 32px', gap:32, background:'rgba(2,6,10,.88)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(255,255,255,.05)' }}
        onMouseEnter={() => setCursorBig(true)} onMouseLeave={() => setCursorBig(false)}>
        {/* Bottom accent line */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(0,212,170,.25),rgba(168,85,247,.15),transparent)', pointerEvents:'none' }}/>

        {/* Logo */}
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <YNMark size={32}/>
          <div>
            <div style={{ fontWeight:900, fontSize:15, letterSpacing:'-.3px', lineHeight:1.1 }}>YN Finance</div>
            <div style={{ fontSize:8, color:'#00d4aa', letterSpacing:'2px', opacity:.6 }}>LEARN TO TRADE</div>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hide-sm" style={{ display:'flex', gap:4, marginLeft:8 }}>
          {([['Analyze','/ai-stocks','#a855f7'],['Intelligence','/intelligence','#ff2d78'],['Agents','/agents','#ff2d78'],['Research','/research','#00d4aa'],['Courses','/courses',null],['Arena','/arena','#ffa502'],['Developers','/developers','#3b8eea'],['Company','/company',null]] as [string,string,string|null][]).map(([l,h,badge])=>(
            <Link key={l} href={h} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, fontSize:12, color:'#4a6a78', textDecoration:'none', fontWeight:600, transition:'all .2s', letterSpacing:'-.1px' }}
              onMouseEnter={e=>{e.currentTarget.style.color='#dce8f0';e.currentTarget.style.background='rgba(255,255,255,.05)'}}
              onMouseLeave={e=>{e.currentTarget.style.color='#4a6a78';e.currentTarget.style.background='transparent'}}>
              {l}
              {badge && <span style={{ fontSize:7, fontWeight:800, color:badge, background:`${badge}18`, border:`1px solid ${badge}30`, borderRadius:3, padding:'1px 5px', letterSpacing:'1px' }}>
                {l==='Analyze'?'AI':l==='Agents'?'LIVE':l==='Arena'?'LIVE':''}
              </span>}
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <Link href="/intelligence" style={{ display:'none' }} className="hide-sm"/>
          <Link href="/app" style={{ background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.2)', color:'#00d4aa', padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', transition:'all .2s', letterSpacing:'-.1px' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,212,170,.15)';e.currentTarget.style.borderColor='rgba(0,212,170,.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,212,170,.08)';e.currentTarget.style.borderColor='rgba(0,212,170,.2)'}}>
            Terminal
          </Link>
          <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:900, textDecoration:'none', boxShadow:'0 0 24px #00d4aa35', letterSpacing:'-.2px' }}>
            Try Free →
          </Link>
        </div>
      </nav>

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, paddingTop:58 }}>
        <div style={{ textAlign:'center', padding:'0 24px', maxWidth:960, opacity: heroOp, transform: heroTrans }}>

          {/* Founder badge — the hook */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.25)', borderRadius:24, padding:'7px 20px', marginBottom:20, fontSize:11, color:'#f59e0b', fontWeight:700, letterSpacing:'1px' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#f59e0b', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
            NEIL GILANI & YANNAI RICHTER · CO-FOUNDERS · YNFINANCE.ORG
          </div>

          {/* The setup — what exists */}
          <p style={{ fontSize:'clamp(13px,1.4vw,16px)', color:'#2a4a62', fontFamily:'monospace', letterSpacing:'.5px', marginBottom:20, lineHeight:1.8 }}>
            Bloomberg Terminal: <span style={{ color:'#ff2d78' }}>$25,000/year</span> &nbsp;·&nbsp;
            Goldman analyst: <span style={{ color:'#ff2d78' }}>$500,000/year</span> &nbsp;·&nbsp;
            Congressional intel: <span style={{ color:'#ff2d78' }}>private</span> &nbsp;·&nbsp;
            Institutional AI: <span style={{ color:'#ff2d78' }}>invite only</span>
          </p>

          {/* Main headline */}
          <div style={{ position:'relative', marginBottom:28 }}>
            <h1 aria-hidden="true" style={{ fontSize:'clamp(52px,9.5vw,108px)', fontWeight:900, lineHeight:.9, letterSpacing:'-5px', color:'#ff2d78', position:'absolute', inset:0, animation:'chromaR 4s ease-in-out infinite', pointerEvents:'none', opacity:0, zIndex:-1 }}>
              We automated<br/>all of it.<br/>For free.
            </h1>
            <h1 aria-hidden="true" style={{ fontSize:'clamp(52px,9.5vw,108px)', fontWeight:900, lineHeight:.9, letterSpacing:'-5px', color:'#3b8eea', position:'absolute', inset:0, animation:'chromaB 4s ease-in-out infinite', pointerEvents:'none', opacity:0, zIndex:-1 }}>
              We automated<br/>all of it.<br/>For free.
            </h1>
            <h1 style={{ fontSize:'clamp(52px,9.5vw,108px)', fontWeight:900, lineHeight:.9, letterSpacing:'-5px', color:'#dce8f0', animation:'zoomPulse 8s ease-in-out infinite' }}>
              <span className="glitch-word" style={{ animationDelay:'.05s' }}>We </span>
              <span className="glitch-word" style={{ animationDelay:'.15s' }}>automated</span>
              <br/>
              <span style={{ background:'linear-gradient(135deg,#00d4aa 0%,#1e90ff 45%,#a855f7 80%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 4s linear infinite' }}>
                <span className="glitch-word" style={{ animationDelay:'.3s' }}>all of it.</span>
              </span>
              <br/>
              <span className="glitch-word" style={{ animationDelay:'.5s', color:'#dce8f0' }}>For </span>
              <span className="glitch-word" style={{ animationDelay:'.62s', color:'#00ff88' }}>free.</span>
            </h1>
          </div>

          {/* The pitch */}
          <p style={{ fontSize:'clamp(17px,2vw,22px)', color:'#4a6a78', lineHeight:1.7, marginBottom:44, maxWidth:700, margin:'0 auto 44px' }}>
            AI stock analysis. Congressional trade tracking. Smart money detection. Earnings forensics. The exact intelligence that hedge funds pay analysts half a million dollars a year to produce.{' '}
            <strong style={{ color:'#dce8f0', fontWeight:700 }}>Free. For every trader. Starting now.</strong>
          </p>

          {/* CTAs */}
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:32 }}>
            <Link href="/ai-stocks" className="mag-btn" style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'20px 44px', borderRadius:14, fontSize:16, fontWeight:900, textDecoration:'none', boxShadow:'0 0 70px #00d4aa50,0 24px 48px rgba(0,0,0,.5)', letterSpacing:'-.3px', display:'inline-block' }}>
              Start for Free →
            </Link>
            <Link href="/congress" style={{ background:'rgba(255,45,120,.12)', border:'1px solid rgba(255,45,120,.35)', color:'#ff6b9d', padding:'20px 44px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(12px)' }}>
              🏛 Congress Tracker
            </Link>
            <Link href="/intel" style={{ background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.22)', color:'#00d4aa', padding:'20px 44px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(12px)' }}>
              💰 Smart Money
            </Link>
          </div>

          {/* The proof strip */}
          <div style={{ display:'flex', gap:0, justifyContent:'center', border:'1px solid rgba(255,255,255,.05)', borderRadius:14, overflow:'hidden', backdropFilter:'blur(16px)', background:'rgba(4,10,18,.7)', maxWidth:720, margin:'0 auto 32px' }}>
            {([
              ['9','World-Class Instructors','#f59e0b'],
              ['$0.99','Courses from','#00d4aa'],
              ['3,247+','Active Traders','#3b8eea'],
              ['9','Intelligence Tools','#a855f7'],
              ['$0','To Start','#00ff88'],
            ] as [string,string,string][]).map(([n,l,clr],i,arr)=>(
              <div key={l} style={{ flex:1, padding:'16px 12px', textAlign:'center', borderRight:i<arr.length-1?'1px solid rgba(255,255,255,.04)':'none' }}>
                <div style={{ fontSize:'clamp(16px,2vw,22px)', fontWeight:900, color:clr, fontFamily:'"SF Mono",ui-monospace,monospace', letterSpacing:'-1px', textShadow:`0 0 16px ${clr}40` }}>{n}</div>
                <div style={{ fontSize:9, color:'#1a3040', letterSpacing:'1px', marginTop:3, fontWeight:600 }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div style={{ maxWidth:500, margin:'0 auto', height:72, background:'rgba(6,13,20,0.7)', border:'1px solid rgba(0,212,170,0.12)', borderRadius:14, overflow:'hidden', backdropFilter:'blur(10px)', padding:'6px' }}>
            <AnimChart />
          </div>
        </div>

        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8, opacity:.3, zIndex:2 }}>
          <span style={{ fontSize:9, letterSpacing:'3px', color:'#6a90a8' }}>SCROLL</span>
          <div style={{ width:1, height:44, background:'linear-gradient(#00d4aa,transparent)', animation:'float3d 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ══ THE PROBLEM ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'100px 24px 80px', background:'rgba(2,4,8,1)', borderTop:'1px solid rgba(255,255,255,.04)', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#ff2d78', fontFamily:'monospace', marginBottom:20 }}>THE PROBLEM EVERY TRADER FACES</div>
            <h2 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.05, color:'#e8f4f8', marginBottom:24 }}>
              You&apos;re trading against people<br/>with an unfair advantage.
            </h2>
            <p style={{ fontSize:18, color:'#4a6a78', lineHeight:1.75, maxWidth:660, margin:'0 auto' }}>
              A Goldman analyst has a team doing your research. A senator legally trades on information you can&apos;t access. Institutions see order flow that never hits your screen. This isn&apos;t a talent gap — it&apos;s an information gap. Neil and Yannai built YN Finance to close it.
            </p>
          </div>

          {/* Problem → Solution grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:72 }}>
            {([
              { problem:'2+ hours of research before every open', solution:'9 agents monitor everything 24/7, surfaces only what matters', icon:'⏱', clr:'#ff2d78' },
              { problem:'Congressional trades you find out about weeks later', solution:'Congress Agent flags every buy the day it\'s filed', icon:'🏛', clr:'#f59e0b' },
              { problem:'Earnings calls full of spin you can\'t decode', solution:'Lie Detector scores management honesty in real time', icon:'📊', clr:'#a855f7' },
              { problem:'Smart money moves before news hits your feed', solution:'Dark Pool + Options agents track institutional footprints', icon:'💰', clr:'#00d4aa' },
              { problem:'No time to study while also trying to trade', solution:'World-class courses for $0.99 — finish in one sitting', icon:'🎓', clr:'#1e90ff' },
              { problem:'No way to know if your strategy actually works', solution:'YN Arena: compete live against real traders, real stakes', icon:'⚡', clr:'#ec4899' },
            ] as {problem:string;solution:string;icon:string;clr:string}[]).map((item,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'28px 24px' }}>
                <div style={{ fontSize:28, marginBottom:16 }}>{item.icon}</div>
                <div style={{ fontSize:9, fontWeight:800, color:'#ff2d78', fontFamily:'monospace', letterSpacing:'0.14em', marginBottom:8 }}>THE PROBLEM</div>
                <p style={{ fontSize:14, color:'#3a5a6a', lineHeight:1.6, marginBottom:18 }}>{item.problem}</p>
                <div style={{ height:1, background:`${item.clr}25`, marginBottom:18 }}/>
                <div style={{ fontSize:9, fontWeight:800, color:item.clr, fontFamily:'monospace', letterSpacing:'0.14em', marginBottom:8 }}>THE SOLUTION</div>
                <p style={{ fontSize:14, color:'#c8dce8', lineHeight:1.6, fontWeight:600 }}>{item.solution}</p>
              </div>
            ))}
          </div>

          {/* How to use the site — step guide */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#00d4aa', fontFamily:'monospace' }}>YOUR PATH THROUGH YN FINANCE</div>
          </div>
          <div style={{ display:'flex', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, overflow:'hidden' }}>
            {([
              { step:'01', label:'Learn',   desc:'Pick a course from Ross Cameron, ICT, or 7 other world-class traders. $0.99.',   href:'/courses', clr:'#00d4aa' },
              { step:'02', label:'Analyze', desc:'Run any ticker through the Intelligence Suite or AI Analyzer before you trade.',   href:'/ai-stocks', clr:'#1e90ff' },
              { step:'03', label:'Monitor', desc:'Check the Agent Network daily for live insider, congress, and macro signals.',     href:'/agents', clr:'#a855f7' },
              { step:'04', label:'Practice',desc:'Trade the simulator with real market data. Build a track record risk-free.',      href:'/app', clr:'#f59e0b' },
              { step:'05', label:'Compete', desc:'Enter YN Arena tournaments. Prove your edge. Win from real prize pools.',        href:'/arena', clr:'#ec4899' },
            ] as {step:string;label:string;desc:string;href:string;clr:string}[]).map((s,i,arr)=>(
              <Link key={i} href={s.href} style={{ flex:1, padding:'28px 20px', textDecoration:'none', borderRight:i<arr.length-1?'1px solid rgba(255,255,255,.05)':'none', transition:'background .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=`${s.clr}09`)}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
              >
                <div style={{ fontSize:11, fontWeight:800, color:s.clr, fontFamily:'monospace', letterSpacing:'0.12em', marginBottom:10 }}>{s.step} · {s.label.toUpperCase()}</div>
                <p style={{ fontSize:13, color:'#4a6a78', lineHeight:1.6 }}>{s.desc}</p>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,.04)', borderBottom:'1px solid rgba(255,255,255,.04)', height:38, overflow:'hidden', position:'relative', zIndex:1, background:'rgba(4,10,16,.8)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'inline-flex', animation:'ticker3d 28s linear infinite', whiteSpace:'nowrap', height:'100%', alignItems:'center' }}>
          {[...Array(2)].flatMap(() => ['🏛 Congress Tracker — They trade on inside knowledge. You can see every move.','💰 Smart Money — $4.2M in calls just hit NVDA. Who knows something?','📊 Earnings Decoder — Management\'s honesty score: 31/100. Fade the narrative.','🔫 Lock-Up Assassin — 84M shares unlock in 14 days. Buy the put now.','🧪 Lie Detector — FCF miss $400M. They buried it. AI found it first.','🧠 Galaxy Brain — Fed holds → Dollar weakens → KWEB calls. Follow the chain.','⚡ Signal Radar — Korean Won weakened. Qualcomm drops 72h later. 7/8 times.','🤖 AI Analyzer — 5 agents. 15 seconds. Entry, stop, target, options play.'].map((t,i)=>(
            <span key={t+i} style={{ padding:'0 28px', fontSize:11, fontWeight:700, letterSpacing:'.5px', color:['#00d4aa','#3b8eea','#a855f7','#f59e0b','#ec4899'][i%5] }}>
              {t} <span style={{ opacity:.2, marginLeft:12 }}>✦</span>
            </span>
          )))}
        </div>
      </div>

      {/* ══ TRUST STRIP ══════════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', zIndex:1, background:'rgba(3,8,14,.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>

        {/* Row 1 — Infrastructure logos */}
        <div className="section" style={{ padding:'18px 24px 14px', display:'flex', alignItems:'center', gap:0, flexWrap:'wrap', rowGap:10 }}>
          <div style={{ fontSize:8, color:'#1a3040', letterSpacing:'2.5px', fontWeight:700, marginRight:24, whiteSpace:'nowrap', fontFamily:'monospace' }}>BUILT ON</div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flex:1 }}>
            {([
              ['Stripe',       '#635bff', 'Payments'],
              ['Google Gemini','#4285f4', 'AI Engine'],
              ['TradingView',  '#2196f3', 'Charts'],
              ['Finnhub',      '#f59e0b', 'Live Data'],
              ['Supabase',     '#3ecf8e', 'Database'],
              ['Netlify Edge', '#00ad9f', 'CDN'],
            ] as [string,string,string][]).map(([name,clr,tag])=>(
              <div key={name} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 11px', border:`1px solid ${clr}1a`, borderRadius:6, background:`${clr}08`, transition:'border-color .2s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=`${clr}40`}
                onMouseLeave={e=>e.currentTarget.style.borderColor=`${clr}1a`}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:clr, flexShrink:0, boxShadow:`0 0 6px ${clr}` }}/>
                <span style={{ fontSize:11, fontWeight:700, color:'#4a6a78', letterSpacing:'-.2px' }}>{name}</span>
                <span style={{ fontSize:8, color:`${clr}99`, borderLeft:`1px solid ${clr}25`, paddingLeft:7, letterSpacing:'.5px', fontFamily:'monospace' }}>{tag}</span>
              </div>
            ))}
          </div>
          {/* Verified badges */}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto', paddingLeft:20 }}>
            {[
              { icon:'🔒', label:'Stripe Secured' },
              { icon:'✓', label:'SSL / TLS' },
              { icon:'⚡', label:'99.9% Uptime' },
            ].map(b=>(
              <div key={b.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#2a4050', fontWeight:600, padding:'4px 10px', border:'1px solid rgba(255,255,255,.04)', borderRadius:5, background:'rgba(255,255,255,.02)', whiteSpace:'nowrap' }}>
                <span style={{ fontSize:9 }}>{b.icon}</span>{b.label}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent)', margin:'0 24px' }}/>

        {/* Row 2 — Instructor authority bar */}
        <div className="section" style={{ padding:'13px 24px 16px', display:'flex', alignItems:'center', gap:0, flexWrap:'wrap', rowGap:8 }}>
          <div style={{ fontSize:8, color:'#1a3040', letterSpacing:'2.5px', fontWeight:700, marginRight:24, whiteSpace:'nowrap', fontFamily:'monospace' }}>9 VERIFIED INSTRUCTORS</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', flex:1 }}>
            {([
              ['Ross Cameron',    '#00d4aa', 'Warrior Trading'],
              ['ICT',            '#f59e0b', 'Inner Circle Trader'],
              ['Rayner Teo',     '#3b8eea', 'TradingwithRayner'],
              ['Graham Stephan', '#a855f7', '5M+ Subscribers'],
              ['Anton Kreil',    '#ec4899', 'ITPM'],
              ['Kevin O\'Leary', '#00ff88', 'Shark Tank'],
              ['Wall St. Trapper','#ff2d78','NYSE Floor'],
              ['Humbled Trader',  '#f59e0b', 'Day Trader'],
              ['InTheMoney Adam', '#00d4ff', 'Options Expert'],
            ] as [string,string,string][]).map(([name,clr,cred])=>(
              <div key={name} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', border:`1px solid rgba(255,255,255,.05)`, borderRadius:5, background:'rgba(255,255,255,.02)', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=`${clr}30`;e.currentTarget.style.background=`${clr}06`}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.05)';e.currentTarget.style.background='rgba(255,255,255,.02)'}}>
                <span style={{ width:14, height:14, borderRadius:'50%', background:`linear-gradient(135deg,${clr},${clr}80)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:900, color:'#030a10', flexShrink:0 }}>✓</span>
                <span style={{ fontSize:11, fontWeight:700, color:'#4a6a78', letterSpacing:'-.2px' }}>{name}</span>
                <span style={{ fontSize:8, color:'#1a3040', borderLeft:'1px solid rgba(255,255,255,.06)', paddingLeft:7, letterSpacing:'.3px', whiteSpace:'nowrap' }}>{cred}</span>
              </div>
            ))}
          </div>
          <div style={{ marginLeft:'auto', paddingLeft:20, display:'flex', alignItems:'center', gap:6, fontSize:10, color:'#00d4aa', fontWeight:700, whiteSpace:'nowrap' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', animation:'pulse-dot 1.5s infinite' }}/>
            70% instructor revenue share
          </div>
        </div>
      </div>

      {/* Ad — between trust strip and platform map */}
      <div style={{ display:'flex', justifyContent:'center', padding:'28px 24px', background:'rgba(3,6,12,1)', borderTop:'1px solid rgba(255,255,255,.03)' }}>
        <AdsterraBanner size="728x90" />
      </div>

      {/* ══ PLATFORM MAP ═════════════════════════════════════════════════════════ */}
      <section style={{ padding:'80px 0 90px', position:'relative', zIndex:1, background:'rgba(3,6,12,1)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,212,170,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,.016) 1px,transparent 1px)', backgroundSize:'56px 56px', pointerEvents:'none' }}/>
        <div className="section" style={{ position:'relative' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ fontSize:9, color:'#1a3040', letterSpacing:'3px', fontFamily:'monospace', marginBottom:14 }}>THE COMPLETE PLATFORM</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:900, letterSpacing:'-2px', color:'#dce8f0', marginBottom:12 }}>
              Everything lives here. This is how it fits together.
            </h2>
            <p style={{ fontSize:16, color:'#2a4050', maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>
              YN Finance is one platform with three layers. Use one, use all three — each makes the next more powerful.
            </p>
          </div>

          {/* Three pillars */}
          <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, borderRadius:16, overflow:'hidden', border:'1px solid rgba(255,255,255,.05)' }}>

            {/* PILLAR 1 — ANALYZE */}
            <div style={{ background:'rgba(5,12,20,.9)', padding:'36px 32px', position:'relative', backdropFilter:'blur(16px)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
              <div style={{ fontSize:9, color:'#00d4aa', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>LAYER 01 · ANALYZE</div>
              <div style={{ fontSize:26, marginBottom:12 }}>🔬</div>
              <h3 style={{ fontSize:20, fontWeight:900, letterSpacing:'-.4px', color:'#dce8f0', marginBottom:10 }}>The Intelligence Layer</h3>
              <p style={{ fontSize:13, color:'#2a4050', lineHeight:1.7, marginBottom:24 }}>
                Nine tools that find what the market doesn&apos;t know yet — before you place a trade.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:28 }}>
                {[
                  ['🤖','AI Stock Analyzer','5 agents, 15 seconds'],
                  ['🔫','Intelligence Suite','6 classified weapons'],
                  ['🏛','Congress Tracker','Live trade disclosures'],
                  ['💰','Smart Money Alerts','Insider + options flow'],
                  ['📊','Earnings Decoder','Management truth score'],
                  ['📰','Daily Intel','AI market briefing'],
                ].map(([icon,name,desc])=>(
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#7a9aaa' }}>{name}</div>
                      <div style={{ fontSize:10, color:'#1a3040' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/ai-stocks" style={{ display:'block', textAlign:'center', background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.25)', color:'#00d4aa', padding:'10px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,212,170,.18)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(0,212,170,.1)'}}>
                Start Analyzing →
              </Link>
            </div>

            {/* PILLAR 2 — LEARN */}
            <div style={{ background:'rgba(6,10,18,.95)', padding:'36px 32px', position:'relative', backdropFilter:'blur(16px)', borderLeft:'1px solid rgba(255,255,255,.04)', borderRight:'1px solid rgba(255,255,255,.04)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#f59e0b,#ec4899)' }}/>
              <div style={{ fontSize:9, color:'#f59e0b', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>LAYER 02 · LEARN</div>
              <div style={{ fontSize:26, marginBottom:12 }}>🎓</div>
              <h3 style={{ fontSize:20, fontWeight:900, letterSpacing:'-.4px', color:'#dce8f0', marginBottom:10 }}>The Education Layer</h3>
              <p style={{ fontSize:13, color:'#2a4050', lineHeight:1.7, marginBottom:24 }}>
                Nine of the most followed trading educators in the world. Their exact methods. From $0.99.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:28 }}>
                {[
                  ['🔴','Ross Cameron','Gap & Go, small-cap momentum'],
                  ['🟡','ICT','Smart money concepts'],
                  ['🔵','Rayner Teo','Technical analysis'],
                  ['🟣','Graham Stephan','Investing & wealth'],
                  ['🌹','Anton Kreil','Professional trading (ITPM)'],
                  ['🟢','+4 more instructors','Kevin O\'Leary, Wall St. Trapper...'],
                ].map(([icon,name,desc])=>(
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#7a9aaa' }}>{name}</div>
                      <div style={{ fontSize:10, color:'#1a3040' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/courses" style={{ display:'block', textAlign:'center', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', color:'#f59e0b', padding:'10px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,158,11,.18)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(245,158,11,.1)'}}>
                Browse Courses →
              </Link>
            </div>

            {/* PILLAR 3 — TRADE */}
            <div style={{ background:'rgba(5,12,20,.9)', padding:'36px 32px', position:'relative', backdropFilter:'blur(16px)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#a855f7,#ff2d78)' }}/>
              <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:16 }}>LAYER 03 · COMPETE</div>
              <div style={{ fontSize:26, marginBottom:12 }}>⚔️</div>
              <h3 style={{ fontSize:20, fontWeight:900, letterSpacing:'-.4px', color:'#dce8f0', marginBottom:10 }}>The Execution Layer</h3>
              <p style={{ fontSize:13, color:'#2a4050', lineHeight:1.7, marginBottom:24 }}>
                Apply what you analyzed and learned. Paper trade, take a prop challenge, compete in live tournaments.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:28 }}>
                {[
                  ['📈','Paper Trading Terminal','$100K sim account, real data'],
                  ['🏆','YN Capital Challenges','$49–$299 prop firm sim'],
                  ['🎯','YN Arena Tournaments','DraftKings-style trading contests'],
                  ['🤖','AI Voice Assistant','Your co-pilot, floats next to charts'],
                  ['📜','Certificates','Printable on challenge pass'],
                  ['🎖️','16 Achievement Badges','Track your progression'],
                ].map(([icon,name,desc])=>(
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#7a9aaa' }}>{name}</div>
                      <div style={{ fontSize:10, color:'#1a3040' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/app" style={{ display:'block', textAlign:'center', background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.25)', color:'#a855f7', padding:'10px', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(168,85,247,.18)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(168,85,247,.1)'}}>
                Open Terminal →
              </Link>
            </div>
          </div>

          {/* Flow connector */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginTop:24 }}>
            {['Analyze the market','→ Learn from legends','→ Compete with edge'].map((s,i)=>(
              <div key={s} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 20px', background:i===1?'rgba(245,158,11,.06)':'rgba(0,212,170,.05)', borderRadius:20, marginRight:i<2?8:0 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:i===0?'#00d4aa':i===1?'#f59e0b':'#a855f7', flexShrink:0 }}/>
                <span style={{ fontSize:11, color:'#2a4050', fontWeight:600 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(0,212,170,.12),rgba(30,144,255,.12),transparent)', position:'relative', zIndex:1 }}/>

      {/* ══ ANALYZER PITCH ══════════════════════════════════════════════════════ */}
      <section style={{ padding:'130px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={analyzerRef} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }} className="g2">

            {/* Left: pitch */}
            <div ref={analyzer.ref} className={`vis${analyzer.v?' show':''}`}>
              <div className="item i0" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:9, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.18)', borderRadius:4, padding:'3px 9px', fontFamily:'monospace' }}>LAYER 01 · ANALYZE</span>
                <span style={{ fontSize:9, color:'#1a3040', letterSpacing:'1px', fontFamily:'monospace' }}>AI STOCK ANALYZER</span>
              </div>
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

      {/* ══ AI WIDGET PROMO ═════════════════════════════════════════════════════ */}
      <section style={{ padding:'100px 0', position:'relative', zIndex:1, overflow:'hidden', background:'linear-gradient(180deg,#030a10,#020810,#030a10)' }}>
        {/* Ambient */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:900, height:900, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,170,.04),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,212,170,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,.018) 1px,transparent 1px)', backgroundSize:'52px 52px', pointerEvents:'none' }}/>

        <div className="section" style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'center' }} >

          {/* LEFT — copy */}
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.22)', borderRadius:20, padding:'6px 16px', marginBottom:22, fontSize:10, color:'#00d4aa', fontWeight:700, letterSpacing:'1.5px' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-dot 1.4s infinite' }}/>
              ALL NEW · AI TRADING WIDGET
            </div>
            <h2 style={{ fontSize:'clamp(30px,4.5vw,54px)', fontWeight:900, letterSpacing:'-2.5px', lineHeight:1.05, marginBottom:18 }}>
              Your AI co-pilot.<br/>
              <span style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Floating.</span>{' '}
              <span style={{ background:'linear-gradient(135deg,#a855f7,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Always on.</span>
            </h2>
            <p style={{ fontSize:16, color:'#3a5a6a', lineHeight:1.75, marginBottom:32, maxWidth:440 }}>
              Open the AI Widget alongside your charts. Ask anything — live levels, setup analysis, R:R calculations, strategy questions. Voice or type. It remembers the conversation. No tab-switching, no losing context.
            </p>

            {/* Feature chips */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:36 }}>
              {[
                { icon:'🎙', title:'Voice-Activated', desc:'Ask out loud — it transcribes and answers in seconds' },
                { icon:'💬', title:'Conversational Memory', desc:'Remembers what you asked 3 questions ago — full context' },
                { icon:'🖥', title:'Floats Next to Your Charts', desc:'Opens as a native popup — drag it anywhere on screen' },
                { icon:'⚡', title:'Real-Time Trading Intelligence', desc:'Powered by Gemini 2.0 with a trading-specialist system prompt' },
              ].map(f => (
                <div key={f.title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#dce8f0', marginBottom:1 }}>{f.title}</div>
                    <div style={{ fontSize:12, color:'#2a4050' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const w = 390, h = 620
                const left = window.screen.width - w - 24
                const top  = Math.max(0, window.screen.height - h - 60)
                window.open('/widget','yn-ai-widget',`width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes,location=no,status=no`)
              }}
              style={{ display:'inline-flex', alignItems:'center', gap:10, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', border:'none', color:'#030a10', padding:'16px 36px', borderRadius:12, fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit', letterSpacing:'-.2px', boxShadow:'0 0 50px rgba(0,212,170,.3),0 16px 40px rgba(0,0,0,.4)', transition:'all .3s' }}
              onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 0 70px rgba(0,212,170,.45),0 20px 50px rgba(0,0,0,.5)')}
              onMouseLeave={e=>(e.currentTarget.style.boxShadow='0 0 50px rgba(0,212,170,.3),0 16px 40px rgba(0,0,0,.4)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              Launch AI Widget →
            </button>
          </div>

          {/* RIGHT — widget mockup */}
          <div style={{ position:'relative', display:'flex', justifyContent:'center' }}>
            {/* Glow behind widget */}
            <div style={{ position:'absolute', width:320, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,170,.12),transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}/>

            {/* Widget mock window */}
            <div style={{ width:340, background:'rgba(3,10,16,.98)', border:'1px solid rgba(0,212,170,.22)', borderRadius:14, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.6),0 0 60px rgba(0,212,170,.1)', position:'relative', zIndex:1 }}>
              {/* Title bar */}
              <div style={{ height:44, background:'rgba(4,12,20,.98)', borderBottom:'1px solid #0d2030', display:'flex', alignItems:'center', padding:'0 14px', gap:8 }}>
                <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>)}</div>
                <div style={{ flex:1, fontSize:11, fontWeight:700, color:'#dce8f0', letterSpacing:'-.2px' }}>YN AI Assistant</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:8, color:'#00d4aa', fontFamily:'monospace' }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-dot 1.5s infinite' }}/>LIVE
                </div>
              </div>

              {/* Mock messages */}
              <div style={{ padding:'14px 12px', display:'flex', flexDirection:'column', gap:10 }}>
                {/* AI greeting */}
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:5, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#030a10' }}>YN</div>
                  <div style={{ fontSize:11, color:'#8aaabb', background:'rgba(13,30,44,.9)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'8px 8px 8px 2px', padding:'8px 10px', maxWidth:220, lineHeight:1.6 }}>
                    What&apos;s up — ask me anything about markets, setups, levels.
                  </div>
                </div>

                {/* User message */}
                <div style={{ display:'flex', flexDirection:'row-reverse', gap:6 }}>
                  <div style={{ fontSize:11, color:'#030a10', background:'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius:'8px 8px 2px 8px', padding:'8px 10px', maxWidth:200, fontWeight:600, lineHeight:1.6 }}>
                    Is NQ setting up for a breakout above 19,500?
                  </div>
                </div>

                {/* AI response */}
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:5, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#030a10' }}>YN</div>
                  <div style={{ fontSize:11, color:'#8aaabb', background:'rgba(13,30,44,.9)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'8px 8px 8px 2px', padding:'8px 10px', maxWidth:240, lineHeight:1.6 }}>
                    NQ&apos;s been compressing under 19,500 for three sessions — that&apos;s a classic coil. Watch for a volume spike above with a clean close on the 15M...
                  </div>
                </div>

                {/* User voice message */}
                <div style={{ display:'flex', flexDirection:'row-reverse', gap:6, alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#030a10', background:'linear-gradient(135deg,#a855f7,#1e90ff)', borderRadius:'8px 8px 2px 8px', padding:'8px 10px', fontWeight:600 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/></svg>
                    What&apos;s the R:R if I enter at 19,480?
                  </div>
                </div>

                {/* Typing dots */}
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:5, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'#030a10' }}>YN</div>
                  <div style={{ background:'rgba(13,30,44,.9)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'8px 8px 8px 2px', padding:'10px 12px', display:'flex', gap:3, alignItems:'center' }}>
                    {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:`dot 1.4s ease-in-out ${i*.16}s infinite` }}/>)}
                  </div>
                </div>
              </div>

              {/* Input bar mock */}
              <div style={{ padding:'10px 12px', borderTop:'1px solid #0d2030', background:'rgba(4,12,20,.98)', display:'flex', gap:7, alignItems:'center' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                </div>
                <div style={{ flex:1, height:30, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:8, padding:'0 10px', display:'flex', alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'#1a3050' }}>Ask about any trade, ticker, or setup...</span>
                </div>
                <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#030a10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
              </div>
            </div>

            {/* Floating label */}
            <div style={{ position:'absolute', top:-16, right:20, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', fontSize:10, fontWeight:900, padding:'4px 12px', borderRadius:20, letterSpacing:'.5px', zIndex:2 }}>
              DRAG ANYWHERE
            </div>
          </div>
        </div>
      </section>

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
              LAYER 01 · ANALYZE — INTELLIGENCE SUITE
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


      {/* Section divider */}
      <div style={{ position:'relative', zIndex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(0,212,170,.15),rgba(168,85,247,.15),transparent)' }}/>

      {/* ══ THREE NEW INTEL FEATURES ═══════════════════════════════════════════ */}
      <section style={{ position:'relative', zIndex:1, overflow:'hidden', background:'rgba(2,5,10,1)' }}>
        {/* bg grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,212,170,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,.018) 1px,transparent 1px)', backgroundSize:'52px 52px', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,#ff2d78,#a855f7,#00d4aa,transparent)' }}/>
        {/* ambient glows */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,45,120,.05),transparent 70%)', top:'10%', left:'0%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,170,.04),transparent 70%)', top:'50%', right:'0%', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,.04),transparent 70%)', bottom:'0%', left:'30%', pointerEvents:'none' }}/>

        <div style={{ padding:'120px 0 0' }}>
          {/* Section header */}
          <div className="section" style={{ textAlign:'center', marginBottom:100 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,45,120,.1)', border:'1px solid rgba(255,45,120,.3)', borderRadius:20, padding:'8px 20px', marginBottom:24, fontSize:11, color:'#ff2d78', fontWeight:700, letterSpacing:'1.5px' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff2d78', display:'inline-block', animation:'pulse-dot 1s infinite' }}/>
              LAYER 01 · ANALYZE — LIVE INTELLIGENCE TOOLS
            </div>
            <h2 style={{ fontSize:'clamp(40px,7vw,90px)', fontWeight:900, lineHeight:.9, letterSpacing:'-4px', color:'#fff', marginBottom:24 }}>
              The intel they<br/>
              <span style={{ background:'linear-gradient(135deg,#ff2d78 0%,#a855f7 40%,#00d4aa 80%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 4s linear infinite' }}>
                charge $50K for.
              </span>
            </h2>
            <p style={{ fontSize:'clamp(16px,2vw,21px)', color:'#3a5a6a', lineHeight:1.65, maxWidth:640, margin:'0 auto' }}>
              Congressional trade tracking. Smart money signal detection. Earnings forensics. All of it, free, in real time, with AI reading every signal the moment it fires.
            </p>
          </div>

          {/* ── FEATURE 1: CONGRESS TRACKER ──────────────────────────────────── */}
          <div style={{ marginBottom:2, background:'rgba(255,45,120,.025)', borderTop:'1px solid rgba(255,45,120,.1)', borderBottom:'1px solid rgba(255,45,120,.07)' }}>
            <div className="section" style={{ padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'3px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#ff2d78' }}/> FEATURE 01 · CONGRESSIONAL INTELLIGENCE
                </div>
                <h3 style={{ fontSize:'clamp(30px,4vw,52px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:16, lineHeight:1 }}>
                  🏛 Congress<br/>Tracker
                </h3>
                <p style={{ fontSize:16, color:'#3a5a6a', lineHeight:1.75, marginBottom:20 }}>
                  Members of Congress are <em style={{ color:'#ff2d78' }}>legally required to disclose every stock trade within 45 days</em>. We read every disclosure the moment it lands. AI scores each trade 0-100 for suspicion based on size, timing, and committee assignments.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
                  {['Live feed of every congressional trade disclosure','Suspicion score: size + timing + committee overlap','AI analysis: why this trade looks like inside knowledge','Leaderboard: most active traders in Congress'].map(f=>(
                    <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:'#6a8898' }}>
                      <span style={{ color:'#ff2d78', flexShrink:0 }}>→</span>{f}
                    </div>
                  ))}
                </div>
                <Link href="/congress" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#ff2d78', color:'#fff', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(255,45,120,.4)' }}>
                  Open Congress Tracker →
                </Link>
              </div>
              <div style={{ background:'rgba(0,0,0,.6)', border:'1px solid rgba(255,45,120,.2)', borderRadius:12, overflow:'hidden', backdropFilter:'blur(12px)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,45,120,.1)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(clr=><div key={clr} style={{ width:9,height:9,borderRadius:'50%',background:clr }}/>)}</div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#3a5a6a' }}>congress_tracker.exe — LIVE DISCLOSURES</span>
                  <span style={{ marginLeft:'auto', fontSize:9, color:'#ff2d78', fontWeight:700 }}>● LIVE</span>
                </div>
                <CongressCanvas/>
                <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(255,45,120,.1)', fontFamily:'monospace', fontSize:11 }}>
                  <div style={{ color:'#ff2d78', fontWeight:700 }}>SUSPICION SCORE LEGEND</div>
                  <div style={{ display:'flex', gap:16, marginTop:6 }}>
                    {[['0–40','Low','#00ff88'],['41–70','Watch','#f59e0b'],['71–100','FLAGGED','#ff2d78']].map(([r,l,clr])=>(
                      <div key={r} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:clr }}/>
                        <span style={{ color:clr }}>{r}</span>
                        <span style={{ color:'#2a4050' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FEATURE 2: SMART MONEY ALERTS ───────────────────────────────────── */}
          <div style={{ marginBottom:2, background:'rgba(0,212,170,.025)', borderTop:'1px solid rgba(0,212,170,.1)', borderBottom:'1px solid rgba(0,212,170,.07)' }}>
            <div className="section" style={{ padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
              <div style={{ background:'rgba(0,0,0,.6)', border:'1px solid rgba(0,212,170,.2)', borderRadius:12, overflow:'hidden', backdropFilter:'blur(12px)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(0,212,170,.1)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(clr=><div key={clr} style={{ width:9,height:9,borderRadius:'50%',background:clr }}/>)}</div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#3a5a6a' }}>smart_money.exe — SIGNAL DETECTION</span>
                  <span style={{ marginLeft:'auto', fontSize:9, color:'#00d4aa', fontWeight:700, animation:'pulse-dot 1.5s infinite' }}>● SCANNING</span>
                </div>
                <IntelCanvas/>
                <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(0,212,170,.1)', fontFamily:'monospace', fontSize:11 }}>
                  <div style={{ color:'#00d4aa', fontWeight:700 }}>SIGNAL STRENGTH</div>
                  <div style={{ display:'flex', gap:16, marginTop:6 }}>
                    {[['1 bar','Notable','#6a90a8'],['2 bars','Significant','#f59e0b'],['3 bars ⚡','CONVERGING','#ff2d78']].map(([r,l,clr])=>(
                      <div key={r} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ color:clr, fontSize:10, fontWeight:700 }}>{r}</span>
                        <span style={{ color:'#2a4050', fontSize:10 }}>→ {l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:9, color:'#00d4aa', letterSpacing:'3px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa' }}/> FEATURE 02 · SMART MONEY DETECTION
                </div>
                <h3 style={{ fontSize:'clamp(30px,4vw,52px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:16, lineHeight:1 }}>
                  💰 Smart Money<br/>Alerts
                </h3>
                <p style={{ fontSize:16, color:'#3a5a6a', lineHeight:1.75, marginBottom:20 }}>
                  Hedge fund quant desks run 15 algorithms to detect institutional accumulation. We do it with AI, for free, <em style={{ color:'#00d4aa' }}>and fire an alert when signals converge</em>. Real insider Form 4 filings, unusual options flow, and signal convergence scoring.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
                  {['Real insider purchase transactions (SEC Form 4, live)','Unusual options flow detection with AI context','Signal convergence: when 3 signals hit the same stock','⚡ Converging alert fires before the market reacts'].map(f=>(
                    <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:'#6a8898' }}>
                      <span style={{ color:'#00d4aa', flexShrink:0 }}>→</span>{f}
                    </div>
                  ))}
                </div>
                <Link href="/intel" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#00d4aa', color:'#030a10', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(0,212,170,.4)' }}>
                  Open Smart Money Alerts →
                </Link>
              </div>
            </div>
          </div>

          {/* ── FEATURE 3: EARNINGS DECODER ─────────────────────────────────────── */}
          <div style={{ marginBottom:2, background:'rgba(245,158,11,.025)', borderTop:'1px solid rgba(245,158,11,.1)', borderBottom:'1px solid rgba(245,158,11,.07)' }}>
            <div className="section" style={{ padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9, color:'#f59e0b', letterSpacing:'3px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#f59e0b' }}/> FEATURE 03 · EARNINGS FORENSICS
                </div>
                <h3 style={{ fontSize:'clamp(30px,4vw,52px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:16, lineHeight:1 }}>
                  📊 Earnings<br/>Decoder
                </h3>
                <p style={{ fontSize:16, color:'#3a5a6a', lineHeight:1.75, marginBottom:20 }}>
                  Management has a story. The numbers have another. AI scores every company's earnings pattern with a <em style={{ color:'#f59e0b' }}>Truth Score (0-100)</em> — measuring the divergence between what they say and what actually happened across 4 quarters.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
                  {['Truth Score: 0-100 management honesty rating per company','4-quarter beat/miss pattern for every public company','AI reads the earnings narrative vs actual numbers','Upcoming earnings calendar with pre-game AI analysis'].map(f=>(
                    <div key={f} style={{ display:'flex', gap:10, fontSize:13, color:'#6a8898' }}>
                      <span style={{ color:'#f59e0b', flexShrink:0 }}>→</span>{f}
                    </div>
                  ))}
                </div>
                <Link href="/earnings" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#f59e0b', color:'#000', padding:'13px 28px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 0 30px rgba(245,158,11,.4)' }}>
                  Open Earnings Decoder →
                </Link>
              </div>
              <div style={{ background:'rgba(0,0,0,.6)', border:'1px solid rgba(245,158,11,.2)', borderRadius:12, overflow:'hidden', backdropFilter:'blur(12px)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(245,158,11,.1)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:5 }}>{['#ff5f57','#febc2e','#28c840'].map(clr=><div key={clr} style={{ width:9,height:9,borderRadius:'50%',background:clr }}/>)}</div>
                  <span style={{ fontFamily:'monospace', fontSize:11, color:'#3a5a6a' }}>earnings_decoder.exe — TRUTH ANALYSIS</span>
                </div>
                <div style={{ padding:'12px 8px', background:'rgba(0,0,0,.3)' }}><EarningsGauge/></div>
                <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(245,158,11,.1)', fontFamily:'monospace', fontSize:11 }}>
                  <div style={{ color:'#f59e0b', fontWeight:700 }}>TRUTH SCORE LEGEND</div>
                  <div style={{ display:'flex', gap:16, marginTop:6 }}>
                    {[['65–100','Honest mgmt','#00ff88'],['35–64','Watch closely','#f59e0b'],['0–34','HIGH DIVERGENCE','#ff2d78']].map(([r,l,clr])=>(
                      <div key={r} style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ color:clr, fontSize:9, fontWeight:700 }}>{r}</span>
                        <span style={{ color:'#2a4050', fontSize:9 }}>→ {l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MASTER CTA ──────────────────────────────────────────────────────── */}
          <div style={{ textAlign:'center', padding:'80px 24px 120px', borderTop:'1px solid rgba(255,255,255,.04)' }}>
            <div style={{ fontSize:11, color:'#4a6a78', letterSpacing:'2px', marginBottom:20 }}>THREE NEW WEAPONS · REAL DATA · FREE TO ACCESS</div>
            <h3 style={{ fontSize:'clamp(26px,4vw,50px)', fontWeight:900, letterSpacing:'-2px', color:'#fff', marginBottom:20 }}>
              Everything Wall Street pays analysts for.<br/>
              <span style={{ background:'linear-gradient(135deg,#ff2d78,#a855f7,#00d4aa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 3s linear infinite' }}>Free. Automated. AI-powered.</span>
            </h3>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginTop:32 }}>
              {[['🏛 Congress Tracker','/congress','#ff2d78'],['💰 Smart Money Alerts','/intel','#00d4aa'],['📊 Earnings Decoder','/earnings','#f59e0b']].map(([label,href,clr])=>(
                <Link key={href} href={href} style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${clr}15`, border:`1px solid ${clr}40`, color:clr, padding:'14px 28px', borderRadius:10, fontSize:14, fontWeight:800, textDecoration:'none', boxShadow:`0 0 30px ${clr}25`, transition:'all .2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${clr}25`;e.currentTarget.style.boxShadow=`0 0 50px ${clr}40`}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${clr}15`;e.currentTarget.style.boxShadow=`0 0 30px ${clr}25`}}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ position:'relative', zIndex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(0,212,170,.12),rgba(168,85,247,.12),transparent)' }}/>

      {/* ══ COURSES ═════════════════════════════════════════════════════════════ */}
      <section style={{ padding:'100px 0', position:'relative', zIndex:1 }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent,rgba(6,13,20,.5),transparent)', pointerEvents:'none' }}/>
        <div className="section" style={{ position:'relative' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.2)', borderRadius:20, padding:'6px 18px', marginBottom:18, fontSize:10, color:'#00d4aa', fontWeight:700, letterSpacing:'1.5px' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-dot 1.5s infinite' }}/>
              LAYER 02 · LEARN — 9 VERIFIED INSTRUCTORS · FROM $0.99
            </div>
            <h2 style={{ fontSize:'clamp(32px,5vw,60px)', fontWeight:900, letterSpacing:'-2.5px', lineHeight:1.05, marginBottom:14 }}>
              Learn from{' '}
              <span style={{ background:'linear-gradient(135deg,#00d4aa,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>legends.</span>
            </h2>
            <p style={{ fontSize:17, color:'#3a5a6a', maxWidth:520, margin:'0 auto', lineHeight:1.65 }}>
              The same educators with millions of students online — now teaching directly inside YN Finance. One platform, every style.
            </p>
          </div>

          {/* Instructor cards */}
          <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:48 }}>
            {([
              { name:'Ross Cameron',    init:'RC', grad:'linear-gradient(135deg,#00d4aa,#3b8eea)', spec:'Day Trading', tag:'Warrior Trading Founder',   courses:4, price:'$2.99', clr:'#00d4aa' },
              { name:'ICT',             init:'IC', grad:'linear-gradient(135deg,#f59e0b,#ff2d78)', spec:'Smart Money Concepts', tag:'Inner Circle Trader',courses:6, price:'$1.99', clr:'#f59e0b' },
              { name:'Rayner Teo',      init:'RT', grad:'linear-gradient(135deg,#3b8eea,#a855f7)', spec:'Technical Analysis', tag:'TradingwithRayner',    courses:3, price:'$0.99', clr:'#3b8eea' },
              { name:'Graham Stephan', init:'GS', grad:'linear-gradient(135deg,#a855f7,#ec4899)', spec:'Investing & Wealth', tag:'5M+ Subscribers',        courses:3, price:'$1.99', clr:'#a855f7' },
              { name:'Anton Kreil',    init:'AK', grad:'linear-gradient(135deg,#ec4899,#ff2d78)', spec:'Professional Trading', tag:'ITPM · Ex-Goldman',   courses:5, price:'$4.99', clr:'#ec4899' },
              { name:'Kevin O\'Leary', init:'KO', grad:'linear-gradient(135deg,#00ff88,#00d4aa)', spec:'Business & Finance', tag:'Shark Tank Investor',   courses:2, price:'$2.99', clr:'#00ff88' },
            ] as {name:string;init:string;grad:string;spec:string;tag:string;courses:number;price:string;clr:string}[]).map(ins=>(
              <div key={ins.name}
                style={{ background:'rgba(6,13,20,.85)', border:`1px solid ${ins.clr}18`, borderRadius:14, padding:'24px', backdropFilter:'blur(12px)', transition:'all .3s cubic-bezier(.22,1,.36,1)', position:'relative', overflow:'hidden' }}
                onMouseEnter={e=>{const el=e.currentTarget;el.style.transform='translateY(-6px)';el.style.borderColor=`${ins.clr}45`;el.style.boxShadow=`0 24px 60px rgba(0,0,0,.4),0 0 40px ${ins.clr}12`}}
                onMouseLeave={e=>{const el=e.currentTarget;el.style.transform='none';el.style.borderColor=`${ins.clr}18`;el.style.boxShadow='none'}}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:ins.grad }}/>
                <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:`radial-gradient(circle,${ins.clr}08,transparent 70%)`, pointerEvents:'none' }}/>

                <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                  {/* Avatar */}
                  <div style={{ width:48, height:48, borderRadius:13, background:ins.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#030a10', flexShrink:0, boxShadow:`0 0 20px ${ins.clr}35` }}>
                    {ins.init}
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:'#dce8f0', letterSpacing:'-.2px' }}>{ins.name}</span>
                      <span style={{ fontSize:'7px', color:'#00d4aa', background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.2)', borderRadius:3, padding:'1px 6px', fontWeight:800, letterSpacing:'1px' }}>VERIFIED</span>
                    </div>
                    <div style={{ fontSize:10, color:ins.clr, fontWeight:700, letterSpacing:'.3px' }}>{ins.spec}</div>
                    <div style={{ fontSize:10, color:'#1a3040', marginTop:1 }}>{ins.tag}</div>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:8, marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'#2a4050' }}>{ins.courses} courses available</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                    <span style={{ fontSize:11, color:'#1a3040' }}>from</span>
                    <span style={{ fontSize:18, fontWeight:900, color:ins.clr, fontFamily:'monospace', letterSpacing:'-1px' }}>{ins.price}</span>
                  </div>
                </div>

                <Link href="/courses" style={{ display:'block', textAlign:'center', background:`${ins.clr}12`, border:`1px solid ${ins.clr}28`, color:ins.clr, padding:'9px', borderRadius:7, fontSize:12, fontWeight:700, textDecoration:'none', transition:'all .2s', letterSpacing:'.3px' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${ins.clr}22`}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${ins.clr}12`}}>
                  Browse Courses →
                </Link>
              </div>
            ))}
          </div>

          {/* Bottom strip */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 36px', background:'rgba(6,13,20,.7)', border:'1px solid rgba(255,255,255,.05)', borderRadius:14, backdropFilter:'blur(12px)', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:'#dce8f0', letterSpacing:'-.5px', marginBottom:4 }}>9 world-class instructors. Every trading style.</div>
              <div style={{ fontSize:13, color:'#2a4a62' }}>Ross Cameron · ICT · Rayner Teo · Graham Stephan · Anton Kreil · Kevin O&apos;Leary · Wall St. Trapper · Humbled Trader · InTheMoney Adam</div>
            </div>
            <Link href="/courses" style={{ flexShrink:0, background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'14px 32px', borderRadius:10, fontSize:14, fontWeight:900, textDecoration:'none', boxShadow:'0 0 30px #00d4aa30', letterSpacing:'-.2px', whiteSpace:'nowrap' }}>
              Browse All Courses →
            </Link>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ position:'relative', zIndex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(59,142,234,.12),rgba(168,85,247,.12),transparent)' }}/>

      {/* ══ POWERED BY ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'100px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={powers.ref} className={`vis${powers.v?' show':''}`}>
            <div className="item i0" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#3b8eea', letterSpacing:'2px', fontWeight:700, marginBottom:14 }}>LAYER 03 · COMPETE — THE TECH STACK BEHIND IT</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,58px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.05 }}>
                Powered by the World&apos;s{' '}
                <span style={{ background:'linear-gradient(135deg,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Best Tech</span>
              </h2>
            </div>
            <div className="g3 item i1" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {POWERS.map((p,i) => (
                <div key={p.name} className={`power-card i${i+1}`} style={{ '--clr': p.clr } as React.CSSProperties}>
                  <div className="power-inner">
                    {/* Brand logo block */}
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', background:`${p.clr}10`, border:`1px solid ${p.clr}25`, borderRadius:9, marginBottom:18 }}>
                      <span style={{ fontSize:18 }}>{p.icon}</span>
                      <span style={{ fontSize:15, fontWeight:900, color:p.clr, letterSpacing:'-.3px' }}>{p.name}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <span style={{ fontSize:9, color:p.clr, background:`${p.clr}18`, border:`1px solid ${p.clr}30`, borderRadius:4, padding:'2px 8px', fontWeight:800, letterSpacing:'1.5px', fontFamily:'monospace' }}>{p.label.toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize:13, color:'#6a90a8', lineHeight:1.7 }}>{p.desc}</p>
                    <div style={{ marginTop:18, height:1, background:`linear-gradient(90deg,${p.clr}60,transparent)`, borderRadius:1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div style={{ position:'relative', zIndex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(245,158,11,.15),rgba(236,72,153,.15),transparent)' }}/>

      {/* ══ FOUNDERS ════════════════════════════════════════════════════════════ */}
      <section style={{ padding:'110px 0', position:'relative', zIndex:1 }}>
        {/* bg decoration */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,transparent,rgba(6,13,20,.6),transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)', width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,.04) 0%,transparent 70%)', pointerEvents:'none' }}/>

        <div className="section">
          <div ref={founders.ref} className={`vis${founders.v?' show':''}`}>

            {/* Header */}
            <div className="item i0" style={{ textAlign:'center', marginBottom:80 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:20, padding:'6px 18px', marginBottom:20, fontSize:11, color:'#f59e0b', fontWeight:700, letterSpacing:'1px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }}/>
                THE FOUNDERS
              </div>
              <h2 style={{ fontSize:'clamp(36px,5.5vw,68px)', fontWeight:900, letterSpacing:'-3px', lineHeight:.96, marginBottom:18 }}>
                Neil Gilani &amp;{' '}
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Yannai Richter.</span>
              </h2>
              <p style={{ fontSize:18, color:'#3a5a6a', maxWidth:600, margin:'0 auto', lineHeight:1.7 }}>
                Neil built the machine — a full-stack AI trading platform, solo, at 13. Yannai went viral with a TSLA short call that reached 2.1M people, then cold-emailed Ross Cameron 47 times to sign the first instructor. They founded YN Finance together to give every retail trader the edge that institutions take for granted.
              </p>
            </div>

            {/* Cards — magazine profile style */}
            {FOUNDERS.map((f, i) => (
              <div key={f.name} className="item" style={{ marginBottom: i < FOUNDERS.length-1 ? 36 : 0, animationDelay:`${i*.14}s` }}>
                <div style={{ background:'rgba(5,11,18,.9)', border:`1px solid ${f.clr}1a`, borderRadius:22, overflow:'hidden', backdropFilter:'blur(20px)', position:'relative', transition:'border-color .35s,box-shadow .35s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${f.clr}45`; e.currentTarget.style.boxShadow=`0 32px 80px rgba(0,0,0,.5),0 0 60px ${f.clr}08` }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=`${f.clr}1a`; e.currentTarget.style.boxShadow='none' }}>

                  {/* Top gradient bar */}
                  <div style={{ height:3, background:f.grad }}/>

                  {/* Corner ambient glow */}
                  <div style={{ position:'absolute', top:-100, [i===1?'left':'right']:'-100px', width:350, height:350, borderRadius:'50%', background:`radial-gradient(circle,${f.clr}07,transparent 70%)`, pointerEvents:'none' }}/>

                  {/* 2-col: identity | story (alternates) */}
                  <div style={{ display:'grid', gridTemplateColumns: i===1 ? '1fr 320px' : '320px 1fr' }}>

                    {/* ── IDENTITY COLUMN ─────────────────────────────────── */}
                    <div style={{ padding:'44px 40px', borderRight: i===1 ? 'none' : `1px solid ${f.clr}0e`, borderLeft: i===1 ? `1px solid ${f.clr}0e` : 'none', display:'flex', flexDirection:'column', justifyContent:'space-between', background:`${f.clr}03`, order: i===1 ? 2 : 1 }}>
                      <div>
                        {/* Avatar with orbital ring */}
                        <div style={{ position:'relative', width:92, height:92, marginBottom:26 }}>
                          <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`1px solid ${f.clr}20`, animation:'spin-halo 12s linear infinite' }}/>
                          <div style={{ position:'absolute', inset:-20, borderRadius:'50%', border:`1px solid ${f.clr}0c` }}/>
                          <div style={{ width:92, height:92, borderRadius:24, background:f.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:900, color:'#030a10', boxShadow:`0 0 60px ${f.clr}45,0 0 120px ${f.clr}18`, position:'relative', zIndex:1, animation:'float3d 5s ease-in-out infinite', animationDelay:`${i*.6}s` }}>
                            {f.init}
                          </div>
                        </div>

                        <div style={{ fontSize:26, fontWeight:900, letterSpacing:'-.6px', marginBottom:3, color:'#fff' }}>{f.name}</div>
                        <div style={{ fontSize:13, color:f.clr, fontWeight:700, letterSpacing:'.3px', marginBottom:8 }}>{f.role}</div>
                        <div style={{ fontSize:11, color:'#2a4a62', letterSpacing:'.3px', lineHeight:1.6, marginBottom:22 }}>{f.focus}</div>

                        {/* Tech / skill tags */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:32 }}>
                          {f.tags.map(t => (
                            <span key={t} style={{ fontSize:10, color:f.clr, background:`${f.clr}10`, border:`1px solid ${f.clr}22`, borderRadius:5, padding:'3px 9px', fontWeight:700 }}>{t}</span>
                          ))}
                        </div>
                      </div>

                      {/* 4-stat achievement grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {f.stats.map(s => (
                          <div key={s.label} style={{ background:`${f.clr}07`, border:`1px solid ${f.clr}18`, borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,${f.clr}40,transparent)` }}/>
                            <div style={{ fontSize:18, fontWeight:900, color:f.clr, fontFamily:'monospace', letterSpacing:'-1px', textShadow:`0 0 18px ${f.clr}50`, marginBottom:4, lineHeight:1 }}>{s.n}</div>
                            <div style={{ fontSize:9.5, color:'#2a4050', letterSpacing:'.3px', lineHeight:1.45 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── STORY COLUMN ────────────────────────────────────── */}
                    <div style={{ padding:'44px 44px', display:'flex', flexDirection:'column', order: i===1 ? 1 : 2 }}>

                      {/* Number badge */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:`${f.clr}15`, border:`1px solid ${f.clr}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:f.clr, fontFamily:'monospace', flexShrink:0 }}>0{i+1}</div>
                        <div style={{ fontSize:9, color:'#1a3040', letterSpacing:'2.5px', fontFamily:'monospace' }}>FOUNDING STORY</div>
                        <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${f.clr}20,transparent)` }}/>
                      </div>

                      {/* Pull quote */}
                      <div style={{ position:'relative', marginBottom:30 }}>
                        <div style={{ fontSize:72, color:f.clr, lineHeight:.65, fontFamily:'Georgia,serif', opacity:.18, position:'absolute', top:0, left:-6, userSelect:'none' }}>"</div>
                        <blockquote style={{ fontSize:'clamp(16px,1.7vw,20px)', color:'#dce8f0', lineHeight:1.65, fontStyle:'italic', fontWeight:500, paddingLeft:22, borderLeft:`3px solid ${f.clr}`, textShadow:`0 0 40px ${f.clr}12` }}>
                          {f.quote}
                        </blockquote>
                      </div>

                      {/* Origin story */}
                      <div style={{ marginBottom:24 }}>
                        <div style={{ fontSize:8, color:f.clr, letterSpacing:'2.5px', fontFamily:'monospace', fontWeight:700, marginBottom:12 }}>THE ORIGIN</div>
                        <p style={{ fontSize:13.5, color:'#6a8898', lineHeight:1.9 }}>{f.origin}</p>
                      </div>

                      {/* Mission callout */}
                      <div style={{ padding:'16px 20px', background:`${f.clr}06`, border:`1px solid ${f.clr}18`, borderRadius:10, marginBottom:28, position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, left:0, width:40, height:2, background:f.clr }}/>
                        <div style={{ fontSize:8, color:f.clr, letterSpacing:'2px', fontFamily:'monospace', fontWeight:700, marginBottom:8 }}>THE MISSION</div>
                        <p style={{ fontSize:13, color:'#9ab0bc', lineHeight:1.65, fontStyle:'italic' }}>{f.mission}</p>
                      </div>

                      {/* Skill bars */}
                      <div style={{ marginBottom:20 }}>
                        {f.skills.map(s => (
                          <div key={s.label} style={{ marginBottom:14 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                              <span style={{ fontSize:11, color:'#7a9aaa', fontWeight:600 }}>{s.label}</span>
                              <span style={{ fontSize:11, color:f.clr, fontWeight:800, fontFamily:'monospace' }}>{s.pct}%</span>
                            </div>
                            <div style={{ height:3, background:'rgba(255,255,255,.04)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${s.pct}%`, background:f.grad, borderRadius:2, boxShadow:`0 0 8px ${f.clr}50`, transition:'width 1.4s cubic-bezier(.22,1,.36,1)' }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Follow link */}
                      <div style={{ paddingTop:16, borderTop:`1px solid ${f.clr}0e` }}>
                        <a href={f.twitter} target="_blank" rel="noreferrer"
                          style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:12, color:f.clr, textDecoration:'none', fontWeight:700, transition:'opacity .2s' }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity='.6')}
                          onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          Follow {f.name.split(' ')[0]} on X
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

      {/* Section divider */}
      <div style={{ position:'relative', zIndex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(0,212,170,.2),transparent)' }}/>

      {/* Ad — between founders and final CTA */}
      <div style={{ maxWidth:680, margin:'0 auto', padding:'0 24px 64px' }}>
        <NativeAd variant="prop-firm" size="md" />
      </div>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'120px 0', position:'relative', zIndex:1, textAlign:'center' }}>
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
            <Link href="/agents" style={{ background:'linear-gradient(135deg,rgba(255,45,120,.15),rgba(255,45,120,.05))', border:'1px solid rgba(255,45,120,.35)', color:'#ff2d78', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(16px)', boxShadow:'0 0 40px rgba(255,45,120,.15)' }}>
              🎯 Agent Network →
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
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.05)', position:'relative', zIndex:1, background:'rgba(2,6,10,.97)', backdropFilter:'blur(24px)' }}>
        {/* Top accent line */}
        <div style={{ height:1, background:'linear-gradient(90deg,transparent,#00d4aa,#a855f7,#1e90ff,transparent)' }}/>

        {/* Main grid */}
        <div className="section" style={{ padding:'72px 24px 48px', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48 }}>

          {/* Brand column */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <YNMark size={34}/>
              <div>
                <div style={{ fontWeight:900, fontSize:16, letterSpacing:'-.3px' }}>YN Finance</div>
                <div style={{ fontSize:10, color:'#1a3550', letterSpacing:'1px' }}>LEARN TO TRADE</div>
              </div>
            </div>
            <p style={{ fontSize:13, color:'#2a4a62', lineHeight:1.75, marginBottom:24, maxWidth:300 }}>
              The intelligence that hedge funds pay analysts $500K/year to produce. We automated all of it. Free for every retail trader.
            </p>
            {/* Social links */}
            <div style={{ display:'flex', gap:10 }}>
              {[
                { href:'https://twitter.com', label:'X / Twitter', svg:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { href:'https://github.com/hilothefunnydog123-coder/Nexus-finance', label:'GitHub', svg:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg> },
              ].map(s=>(
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  style={{ width:34, height:34, borderRadius:8, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.03)', display:'flex', alignItems:'center', justifyContent:'center', color:'#2a4a62', textDecoration:'none', transition:'all .2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,170,.3)';e.currentTarget.style.color='#00d4aa';e.currentTarget.style.background='rgba(0,212,170,.06)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.color='#2a4a62';e.currentTarget.style.background='rgba(255,255,255,.03)'}}>
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          {/* Products column */}
          <div>
            <div style={{ fontSize:9, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, marginBottom:20 }}>PRODUCTS</div>
            {[
              ['AI Analyzer','/ai-stocks'],
              ['Intelligence Suite','/intelligence'],
              ['Daily Intel','/daily'],
              ['YN Arena','/arena'],
              ['Courses','/courses'],
              ['Performance','/performance'],
              ['Trade Terminal','/app'],
            ].map(([l,h])=>(
              <Link key={l} href={h} style={{ display:'block', fontSize:13, color:'#3a5a6a', textDecoration:'none', marginBottom:11, transition:'color .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.color='#dce8f0')}
                onMouseLeave={e=>(e.currentTarget.style.color='#3a5a6a')}>{l}</Link>
            ))}
          </div>

          {/* Resources column */}
          <div>
            <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'2px', fontWeight:700, marginBottom:20 }}>RESOURCES</div>
            {[
              ['Trade Analyzer','/analyzer'],
              ['Trading Quiz','/quiz'],
              ['Verify Certificate','/verify/demo'],
              ['Referral Program','/ref/demo'],
              ['Prop Challenge','/app'],
              ['AI Newspaper','/app'],
            ].map(([l,h])=>(
              <Link key={l} href={h} style={{ display:'block', fontSize:13, color:'#3a5a6a', textDecoration:'none', marginBottom:11, transition:'color .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.color='#dce8f0')}
                onMouseLeave={e=>(e.currentTarget.style.color='#3a5a6a')}>{l}</Link>
            ))}
          </div>

          {/* Legal column */}
          <div>
            <div style={{ fontSize:9, color:'#3b8eea', letterSpacing:'2px', fontWeight:700, marginBottom:20 }}>LEGAL</div>
            {[
              ['Privacy Policy','/privacy'],
              ['Terms of Service','/terms'],
            ].map(([l,h])=>(
              <Link key={l} href={h} style={{ display:'block', fontSize:13, color:'#3a5a6a', textDecoration:'none', marginBottom:11, transition:'color .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.color='#dce8f0')}
                onMouseLeave={e=>(e.currentTarget.style.color='#3a5a6a')}>{l}</Link>
            ))}

            <div style={{ marginTop:28, padding:'16px', background:'rgba(0,212,170,.04)', border:'1px solid rgba(0,212,170,.12)', borderRadius:10 }}>
              <div style={{ fontSize:10, color:'#00d4aa', fontWeight:700, letterSpacing:'1px', marginBottom:8 }}>START FREE</div>
              <Link href="/app" style={{ display:'block', background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'10px 16px', borderRadius:7, fontSize:12, fontWeight:900, textDecoration:'none', textAlign:'center', boxShadow:'0 0 20px #00d4aa25' }}>
                Launch Terminal →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
          <div className="section" style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:11, color:'#0f2030' }}>© 2026 YN Finance Corp. All rights reserved.</div>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              {['Not financial advice','Educational purposes only','Past performance ≠ future results'].map(d=>(
                <span key={d} style={{ fontSize:10, color:'#0f2030' }}>{d}</span>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#0f2030', fontFamily:'monospace' }}>v2.6 · Built with ♥ in NYC</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
