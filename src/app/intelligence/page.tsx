'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const MODULES = [
  { id:'lockup',      name:'Lock-Up Assassin', icon:'🔫', clr:'#ff2d78', bg:'radial-gradient(ellipse at 30% 50%,rgba(255,45,120,.12),transparent 70%)', tag:'SCHEDULED DESTRUCTION',     classif:'SECRET',     needsInput:true,  placeholder:'Recent IPO ticker...', example:'RDDT', desc:'Insiders are about to dump. You know before they do.', hook:'Every IPO has a 180-day lock-up. When it expires, insiders sell. This is guaranteed, dated, and sized.' },
  { id:'liedetector', name:'Lie Detector',     icon:'🧪', clr:'#f59e0b', bg:'radial-gradient(ellipse at 70% 30%,rgba(245,158,11,.12),transparent 70%)', tag:'FORENSIC EARNINGS ANALYSIS', classif:'SECRET',     needsInput:true,  placeholder:'Ticker to analyze...',   example:'TSLA', desc:'Management is lying. Find the gap before analysts do.', hook:'AI reads the earnings narrative vs the actual numbers. Divergence score 0-100.' },
  { id:'galaxybrain', name:'Galaxy Brain',     icon:'🧠', clr:'#a855f7', bg:'radial-gradient(ellipse at 50% 20%,rgba(168,85,247,.12),transparent 70%)', tag:'MACRO DOMINO TRACER',       classif:'TOP SECRET', needsInput:true,  placeholder:'Enter macro scenario...',  example:'Fed holds rates, dollar weakens', desc:'Trace the 5-step chain. Find trades nobody else sees.', hook:'One macro event triggers a chain. AI finds the non-obvious end of the chain.' },
  { id:'flow',        name:'Forced Flow',      icon:'🌊', clr:'#00d4ff', bg:'radial-gradient(ellipse at 80% 60%,rgba(0,212,255,.12),transparent 70%)', tag:'MECHANICAL MONEY MOVEMENTS', classif:'TOP SECRET', needsInput:false, placeholder:'',                         example:'',   desc:'Guaranteed buying is coming. You know when and where.', hook:'Billions HAVE to move into specific stocks this month. Front-run the mechanical flow.' },
  { id:'signals',     name:'Signal Radar',     icon:'⚡', clr:'#00ff88', bg:'radial-gradient(ellipse at 20% 70%,rgba(0,255,136,.12),transparent 70%)', tag:'CROSS-ASSET CORRELATION',   classif:'SECRET',     needsInput:false, placeholder:'',                         example:'',   desc:'8 correlations. 73-91% hit rates. Live right now.', hook:'Korean Won weakens → Qualcomm drops 72h later. 7/8 times.' },
  { id:'filing',      name:'Filing X-Ray',     icon:'📄', clr:'#ec4899', bg:'radial-gradient(ellipse at 60% 80%,rgba(236,72,153,.12),transparent 70%)', tag:'SEC DOCUMENT INTELLIGENCE',  classif:'TOP SECRET', needsInput:true,  placeholder:'Ticker to X-Ray...',       example:'NVDA', desc:'They buried it on page 47. You found it first.', hook:'AI reads SEC filings the second they drop. Extracts what management buried.' },
]

const VERDICT_CLR: Record<string,string> = {
  HIGH:'#00ff88',MEDIUM:'#f59e0b',LOW:'#6a90a8',
  FIRING:'#ff2d78',APPROACHING:'#f59e0b',COOLING:'#6a90a8',
  BULLISH_HIDDEN:'#00ff88',BEARISH_HIDDEN:'#ff2d78',NEUTRAL:'#f59e0b',
  CONFIRMED_BULLISH:'#00e5a0',CONFIRMED_BEARISH:'#ff2d78',
  CLEAN:'#00ff88',YELLOW_FLAGS:'#f59e0b',RED_FLAGS:'#ff6b35',CRITICAL:'#ff2d78',
  FORCED_BUY:'#00ff88',FORCED_SELL:'#ff2d78',MIXED:'#f59e0b',
}

// ── COSMIC SELECTION CANVAS ───────────────────────────────────────────────────
function CosmicCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x:-1000, y:-1000 })
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width = window.innerWidth
    let H = c.height = window.innerHeight
    let raf: number, t = 0

    // Stars with depth
    const stars = Array.from({ length:200 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      z: 0.1 + Math.random()*.9,
      phase: Math.random()*Math.PI*2,
      clr: Math.random()>.8 ? '#a855f7' : Math.random()>.6 ? '#1e90ff' : '#00d4aa',
    }))

    // Constellation connections
    const constellations: [number,number][] = []
    for (let i=0; i<stars.length; i++) {
      for (let j=i+1; j<stars.length; j++) {
        if (constellations.length > 180) break
        const dx=stars[i].x-stars[j].x, dy=stars[i].y-stars[j].y
        const d=Math.sqrt(dx*dx+dy*dy)
        if (d<110 && Math.random()>.65) constellations.push([i,j])
      }
    }

    // Shooting stars
    const shoots: { x:number; y:number; vx:number; vy:number; life:number; maxLife:number }[] = []
    const spawnShoot = () => {
      if (shoots.length < 3) {
        shoots.push({ x:Math.random()*W, y:0, vx:3+Math.random()*4, vy:1+Math.random()*2, life:0, maxLife:60+Math.random()*40 })
      }
    }
    const si = setInterval(spawnShoot, 3500)

    const draw = () => {
      ctx.clearRect(0,0,W,H)

      // Constellation lines
      constellations.forEach(([a,b]) => {
        const s1=stars[a], s2=stars[b]
        const alpha = ((s1.z+s2.z)/2)*0.06
        ctx.beginPath(); ctx.moveTo(s1.x,s1.y); ctx.lineTo(s2.x,s2.y)
        ctx.strokeStyle=`rgba(168,85,247,${alpha})`; ctx.lineWidth=0.5; ctx.stroke()
      })

      // Stars — mouse creates gravity lens
      stars.forEach(s => {
        const dx=mouse.current.x-s.x, dy=mouse.current.y-s.y
        const d=Math.sqrt(dx*dx+dy*dy)
        const shift = d<200 ? (1-d/200)*3*s.z : 0
        const sx = s.x + (dx/Math.max(d,1))*shift
        const sy = s.y + (dy/Math.max(d,1))*shift
        const pulse = 0.6+Math.sin(t*.04+s.phase)*.4
        const sz = (0.8+s.z*2)*pulse
        ctx.beginPath(); ctx.arc(sx,sy,sz,0,Math.PI*2)
        ctx.fillStyle=`${s.clr}${Math.floor((0.3+s.z*.6)*255).toString(16).padStart(2,'0')}`
        if (s.z>.8) { ctx.shadowBlur=6; ctx.shadowColor=s.clr }
        ctx.fill(); ctx.shadowBlur=0
      })

      // Shooting stars
      for (let i=shoots.length-1; i>=0; i--) {
        const sh=shoots[i]
        const progress=sh.life/sh.maxLife
        const alpha=(1-progress)*0.8
        const len=20+progress*40
        ctx.beginPath()
        ctx.moveTo(sh.x,sh.y)
        ctx.lineTo(sh.x-sh.vx/Math.sqrt(sh.vx*sh.vx+sh.vy*sh.vy)*len, sh.y-sh.vy/Math.sqrt(sh.vx*sh.vx+sh.vy*sh.vy)*len)
        const g=ctx.createLinearGradient(sh.x,sh.y,sh.x-sh.vx*len*.2,sh.y-sh.vy*len*.2)
        g.addColorStop(0,`rgba(255,255,255,${alpha})`); g.addColorStop(1,'rgba(255,255,255,0)')
        ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke()
        sh.x+=sh.vx; sh.y+=sh.vy; sh.life++
        if (sh.life>=sh.maxLife||sh.x>W||sh.y>H) shoots.splice(i,1)
      }

      // Radial glow from center
      const g2=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.6)
      g2.addColorStop(0,'rgba(168,85,247,.04)'); g2.addColorStop(.5,'rgba(0,212,170,.02)'); g2.addColorStop(1,'transparent')
      ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)

      t++; raf=requestAnimationFrame(draw)
    }
    draw()

    const onMouse=(e:MouseEvent)=>{mouse.current={x:e.clientX,y:e.clientY}}
    const resize=()=>{W=c.width=window.innerWidth;H=c.height=window.innerHeight}
    window.addEventListener('mousemove',onMouse)
    window.addEventListener('resize',resize)
    return ()=>{cancelAnimationFrame(raf);clearInterval(si);window.removeEventListener('mousemove',onMouse);window.removeEventListener('resize',resize)}
  },[])
  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.75}}/>
}

// ── WEAPON CANVAS BACKGROUNDS ─────────────────────────────────────────────────
function WeaponCanvas({ moduleId, clr }: { moduleId:string; clr:string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight
    let raf: number, t = 0

    if (moduleId==='lockup') {
      const drops=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H-H,speed:1+Math.random()*3,len:20+Math.random()*60,alpha:0.1+Math.random()*0.4}))
      const draw=()=>{ctx.clearRect(0,0,W,H);drops.forEach(d=>{ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x,d.y+d.len);ctx.strokeStyle=`rgba(255,45,120,${d.alpha})`;ctx.lineWidth=1;ctx.stroke();d.y+=d.speed;if(d.y>H)d.y=-100});t++;raf=requestAnimationFrame(draw)};draw()
    } else if (moduleId==='liedetector') {
      const draw=()=>{ctx.fillStyle='rgba(3,10,16,0.08)';ctx.fillRect(0,0,W,H);for(let row=0;row<4;row++){const yBase=H*0.2+row*(H*0.2);ctx.beginPath();for(let x=0;x<W;x++){const chaos=row===2?Math.sin(x/30+t*0.08)*30+Math.sin(x/10)*15:Math.sin(x/40+t*0.04)*15;const y=yBase+chaos+(row===2&&x>W/2?(x-W/2)*0.08:0);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=row===2?`rgba(245,158,11,0.3)`:`rgba(245,158,11,0.08)`;ctx.lineWidth=row===2?1.5:0.5;ctx.stroke()}t++;raf=requestAnimationFrame(draw)};draw()
    } else if (moduleId==='galaxybrain') {
      const nodes=Array.from({length:30},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*0.3,vy:(Math.random()-.5)*0.3}))
      const draw=()=>{ctx.fillStyle='rgba(3,10,16,0.06)';ctx.fillRect(0,0,W,H);nodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1});nodes.forEach((a,i)=>nodes.forEach((b,j)=>{if(i>=j)return;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<200){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(168,85,247,${(1-d/200)*0.15})`;ctx.stroke()}}));nodes.forEach(n=>{ctx.beginPath();ctx.arc(n.x,n.y,2,0,Math.PI*2);ctx.fillStyle='rgba(168,85,247,0.4)';ctx.fill()});raf=requestAnimationFrame(draw)};draw()
    } else if (moduleId==='flow') {
      const streams=Array.from({length:12},(_,i)=>({y:H*(i+0.5)/12,particles:Array.from({length:8},()=>({x:Math.random()*W,speed:2+Math.random()*3}))}))
      const draw=()=>{ctx.fillStyle='rgba(3,10,16,0.07)';ctx.fillRect(0,0,W,H);streams.forEach(s=>{ctx.strokeStyle='rgba(0,212,255,0.06)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,s.y);ctx.lineTo(W,s.y);ctx.stroke();s.particles.forEach(p=>{ctx.beginPath();ctx.arc(p.x,s.y,3,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,0.5)';ctx.shadowBlur=8;ctx.shadowColor='#00d4ff';ctx.fill();ctx.shadowBlur=0;p.x+=p.speed;if(p.x>W)p.x=-20})});raf=requestAnimationFrame(draw)};draw()
    } else if (moduleId==='signals') {
      const cx=W/2,cy=H/2,r=Math.max(W,H)*0.8
      const draw=()=>{ctx.fillStyle='rgba(3,10,16,0.05)';ctx.fillRect(0,0,W,H);for(let i=1;i<=5;i++){ctx.beginPath();ctx.arc(cx,cy,r*i/5,0,Math.PI*2);ctx.strokeStyle='rgba(0,255,136,0.04)';ctx.stroke()}ctx.save();ctx.translate(cx,cy);ctx.rotate(t*0.015);const grad=ctx.createRadialGradient(0,0,0,0,0,r/3);grad.addColorStop(0,'rgba(0,255,136,0.08)');grad.addColorStop(1,'rgba(0,255,136,0)');ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,-0.6,0);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.restore();t++;raf=requestAnimationFrame(draw)};draw()
    } else {
      const docs=Array.from({length:6},()=>({x:Math.random()*W,y:Math.random()*H-H,speed:0.4+Math.random()*0.8,width:100+Math.random()*200,lines:5+Math.floor(Math.random()*6)}))
      const draw=()=>{ctx.fillStyle='rgba(3,10,16,0.04)';ctx.fillRect(0,0,W,H);docs.forEach(d=>{ctx.fillStyle='rgba(236,72,153,0.04)';ctx.fillRect(d.x,d.y,d.width,d.lines*12+16);ctx.strokeStyle='rgba(236,72,153,0.12)';ctx.lineWidth=0.5;ctx.strokeRect(d.x,d.y,d.width,d.lines*12+16);for(let i=0;i<d.lines;i++){ctx.fillStyle=`rgba(236,72,153,${Math.random()>0.7?0.5:0.1})`;ctx.fillRect(d.x+8,d.y+8+i*12,(d.width-16)*(0.4+Math.random()*0.6),4)}d.y+=d.speed;if(d.y>H+100)d.y=-200});t++;raf=requestAnimationFrame(draw)};draw()
    }

    const resize=()=>{W=c.width=window.innerWidth;H=c.height=window.innerHeight}
    window.addEventListener('resize',resize)
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize)}
  },[moduleId,clr])
  return <canvas ref={ref} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',opacity:.6}}/>
}

// ── RESULT COMPONENTS ─────────────────────────────────────────────────────────
function Chip({ label, clr }: { label:string; clr:string }) {
  return <span style={{fontSize:9,fontWeight:800,color:clr,background:`${clr}18`,border:`1px solid ${clr}35`,borderRadius:3,padding:'2px 8px',letterSpacing:'1px'}}>{label}</span>
}
function ScoreBar({ score, label, clr }: { score:number; label:string; clr:string }) {
  const c=clr||(score>=7?'#00ff88':score>=5?'#f59e0b':'#ff2d78')
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:11,color:'#6a8a98'}}>{label}</span>
        <span style={{fontSize:11,fontWeight:800,color:c,fontFamily:'monospace'}}>{score}/10</span>
      </div>
      <div style={{height:3,background:'rgba(255,255,255,.06)',borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${score*10}%`,background:c,borderRadius:2,boxShadow:`0 0 8px ${c}`,transition:'width 1.2s cubic-bezier(.22,1,.36,1)'}}/>
      </div>
    </div>
  )
}
function InfoBlock({ title, content, clr }: { title:string; content:string; clr:string }) {
  return (
    <div style={{background:'rgba(255,255,255,.03)',border:`1px solid ${clr}20`,borderRadius:6,padding:'14px 16px'}}>
      <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1.5px',marginBottom:8}}>{title}</div>
      <p style={{fontSize:13,color:'#c8d8e0',lineHeight:1.7}}>{content}</p>
    </div>
  )
}
function TradeBox({ trade, clr }: { trade:string; clr:string }) {
  return (
    <div style={{background:`${clr}10`,border:`1px solid ${clr}35`,borderRadius:6,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${clr},transparent)`}}/>
      <div style={{fontSize:9,color:clr,letterSpacing:'1.5px',marginBottom:8}}>THE TRADE</div>
      <p style={{fontSize:14,fontWeight:600,color:'#dce8f0',lineHeight:1.65}}>{trade}</p>
    </div>
  )
}

function ResultRenderer({ mode, data, clr }: { mode:string; data:Record<string,unknown>; clr:string }) {
  if (mode==='lockup') {
    const trade=(data.trade as Record<string,string>)??{}
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[['LOCK-UP DATE',String(data.lockup_date??'?')],['DAYS UNTIL',data.days_until?`${data.days_until}d`:'TBD'],['SETUP',String(data.setup_quality??'?')]].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:6}}>{l}</div>
              <div style={{fontSize:17,fontWeight:900,color:clr,fontFamily:'monospace',textShadow:`0 0 12px ${clr}`}}>{v}</div>
            </div>
          ))}
        </div>
        <InfoBlock title="THESIS" content={String(data.thesis??'')} clr={clr}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[['UNLOCK SHARES',String(data.estimated_unlock_shares??'?'),'#f59e0b'],['HISTORICAL DROP',String(data.historical_avg_drop??'?'),'#ff2d78']].map(([l,v,c])=>(
            <div key={l} style={{background:'rgba(255,255,255,.03)',border:`1px solid ${c}25`,borderRadius:6,padding:'12px 14px'}}>
              <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:6}}>{l}</div>
              <div style={{fontSize:18,fontWeight:900,color:c,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {[['TYPE',trade.type],['ENTRY TIMING',trade.entry_timing],['EXPIRY',trade.expiry]].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6,padding:'10px 12px'}}>
              <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:4}}>{l}</div>
              <div style={{fontSize:12,fontWeight:700,color:clr,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <TradeBox trade={`${trade.exit} | Risk: ${trade.risk}`} clr={clr}/>
        {Array.isArray(data.red_flags)&&(data.red_flags as string[]).map((f,i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'10px 14px',background:'rgba(255,45,120,.06)',border:'1px solid rgba(255,45,120,.2)',borderRadius:6}}>
            <span style={{color:'#ff2d78',fontWeight:700,flexShrink:0}}>{i+1}.</span>
            <span style={{fontSize:12,color:'#c8d8e0',lineHeight:1.5}}>{f}</span>
          </div>
        ))}
      </div>
    )
  }
  if (mode==='liedetector') {
    const verdClr2=VERDICT_CLR[String(data.verdict)]??clr
    const nvr=(data.narrative_vs_reality as Record<string,string>)??{}
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[['VERDICT',String(data.verdict??'?').replace('_',' '),verdClr2],['CONFIDENCE',`${data.confidence??0}%`,verdClr2],['DIVERGENCE',`${data.divergence_score??0}/100`,'#f59e0b']].map(([l,v,c])=>(
            <div key={l} style={{background:'rgba(255,255,255,.04)',border:`1px solid ${c}30`,borderRadius:6,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:6}}>{l}</div>
              <div style={{fontSize:16,fontWeight:900,color:c,fontFamily:'monospace',textShadow:`0 0 12px ${c}`}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <InfoBlock title="OFFICIAL NARRATIVE" content={nvr.what_they_want_you_to_think} clr="#6a8a98"/>
          <InfoBlock title="HIDDEN TRUTH" content={String(data.hidden_truth??'')} clr={verdClr2}/>
        </div>
        {Array.isArray(data.red_flags)&&(data.red_flags as Record<string,string>[]).map((f,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6}}>
            <Chip label={f.severity} clr={f.severity==='HIGH'?'#ff2d78':f.severity==='MEDIUM'?'#f59e0b':'#6a8a98'}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:'#dce8f0',marginBottom:3}}>{f.signal}</div>
              <div style={{fontSize:11,color:'#6a8a98'}}>{f.implication}</div>
            </div>
          </div>
        ))}
        <TradeBox trade={`${data.the_trade} · ${data.catalyst} · ${data.timeline}`} clr={clr}/>
      </div>
    )
  }
  if (mode==='galaxybrain') {
    const dominoes=(data.domino_chain as Record<string,unknown>[])??[]
    const nonOb=(data.non_obvious_trades as Record<string,unknown>[])??[]
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <InfoBlock title="DIRECTION" content={String(data.primary_direction??'?').replace('_',' ')} clr={clr}/>
          <InfoBlock title="SCENARIO CLARITY" content={`${data.scenario_clarity??0}/100 — ${data.timeline??''}`} clr={clr}/>
        </div>
        <div>
          <div style={{fontSize:9,color:clr,letterSpacing:'1.5px',marginBottom:10}}>DOMINO CHAIN</div>
          {dominoes.map((d,i)=>(
            <div key={i} style={{display:'flex',gap:12,marginBottom:8,alignItems:'flex-start'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:`${clr}20`,border:`1px solid ${clr}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:clr,flexShrink:0,marginTop:2}}>{i+1}</div>
              <div style={{background:'rgba(255,255,255,.03)',border:`1px solid ${clr}15`,borderRadius:6,padding:'10px 14px',flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'#dce8f0',marginBottom:3}}>{String(d.what_happens)}</div>
                <div style={{fontSize:10,color:'#6a8a98'}}>{String(d.who_moves_first)} · {String(d.magnitude)} · {String(d.timing)}</div>
              </div>
            </div>
          ))}
        </div>
        {nonOb.length>0&&(
          <div>
            <div style={{fontSize:9,color:'#ff2d78',letterSpacing:'1.5px',marginBottom:10}}>🔥 NON-OBVIOUS — WHAT RETAIL MISSES</div>
            {nonOb.map((tr,i)=>(
              <div key={i} style={{display:'flex',gap:12,padding:'12px 14px',background:'rgba(255,45,120,.05)',border:'1px solid rgba(255,45,120,.2)',borderRadius:6,marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:900,fontFamily:'monospace',color:tr.direction==='LONG'?'#00ff88':'#ff2d78'}}>{String(tr.ticker)}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:'#c8d8e0',marginBottom:4,lineHeight:1.5}}><span style={{color:'#a855f7',fontWeight:700}}>Connection: </span>{String(tr.connection)}</div>
                  <div style={{fontSize:11,color:'#f59e0b'}}>{String(tr.options_play)}</div>
                </div>
                <Chip label={String(tr.conviction)} clr={clr}/>
              </div>
            ))}
          </div>
        )}
        <InfoBlock title="WHAT BREAKS THE THESIS" content={String(data.what_breaks_the_thesis??'')} clr="#ff2d78"/>
      </div>
    )
  }
  if (mode==='flow') {
    const events=(data.events as Record<string,unknown>[])??[]
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[['NEXT OPEX',String(data.opex_date??'?')],['DAYS AWAY',`${data.days_to_opex??'?'}d`],['REGIME',String(data.regime??'?').slice(0,30)]].map(([l,v])=>(
            <div key={l} style={{background:'rgba(255,255,255,.04)',border:`1px solid ${clr}25`,borderRadius:6,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:6}}>{l}</div>
              <div style={{fontSize:14,fontWeight:900,color:clr,fontFamily:'monospace'}}>{v}</div>
            </div>
          ))}
        </div>
        <TradeBox trade={String(data.biggest_edge??'')} clr={clr}/>
        {events.map((ev,i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.03)',border:`1px solid ${VERDICT_CLR[String(ev.direction)]??clr}25`,borderRadius:6,padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <Chip label={String(ev.direction).replace('_',' ')} clr={VERDICT_CLR[String(ev.direction)]??clr}/>
              <span style={{fontSize:12,fontWeight:700,color:'#dce8f0'}}>{String(ev.event_type)}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#6a8a98'}}>{String(ev.date)}</span>
            </div>
            <div style={{fontSize:12,color:'#6a8a98',marginBottom:8}}>{String(ev.magnitude)} · {String(ev.confidence)}% confidence · {String(ev.window)}</div>
            {Array.isArray(ev.affected_tickers)&&<div style={{display:'flex',gap:6,marginBottom:8}}>{(ev.affected_tickers as string[]).map(tk=><span key={tk} style={{fontSize:11,fontWeight:700,color:clr,background:`${clr}12`,border:`1px solid ${clr}30`,borderRadius:3,padding:'2px 8px',fontFamily:'monospace'}}>{tk}</span>)}</div>}
            <div style={{fontSize:12,color:'#dce8f0'}}><span style={{color:clr,fontWeight:700}}>Edge: </span>{String(ev.edge)}</div>
          </div>
        ))}
      </div>
    )
  }
  if (mode==='signals') {
    const signals=(data.active_signals as Record<string,unknown>[])??[]
    return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <TradeBox trade={String(data.most_actionable??'')} clr={clr}/>
        <InfoBlock title="CURRENT REGIME" content={String(data.market_regime??'')} clr={clr}/>
        {signals.map((s,i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.03)',border:`1px solid ${VERDICT_CLR[String(s.status)]??clr}30`,borderRadius:6,padding:'14px 16px',position:'relative'}}>
            {s.status==='FIRING'&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${clr},transparent)`}}/>}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:VERDICT_CLR[String(s.status)]??clr,boxShadow:`0 0 8px ${VERDICT_CLR[String(s.status)]??clr}`,flexShrink:0}}/>
              <Chip label={String(s.status)} clr={VERDICT_CLR[String(s.status)]??clr}/>
              <span style={{fontSize:12,fontWeight:700,color:'#dce8f0'}}>{String(s.correlation)}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:VERDICT_CLR[String(s.status)]??clr,fontFamily:'monospace',fontWeight:700}}>{String(s.historical_hit_rate)}</span>
            </div>
            <div style={{fontSize:11,color:'#6a8a98',marginBottom:8}}>{String(s.current_trigger)} · {String(s.timing)} · {String(s.magnitude)}</div>
            <div style={{fontSize:12,color:'#dce8f0'}}><span style={{color:clr,fontWeight:700}}>Trade: </span>{String(s.trade)}</div>
          </div>
        ))}
        <InfoBlock title="CONTRARIAN READ" content={String(data.contrarian_read??'')} clr="#a855f7"/>
      </div>
    )
  }
  // filing
  const buried=(data.buried_signals as Record<string,string>[])??[]
  const nvr2=(data.narrative_vs_reality as Record<string,string>)??{}
  const verdClr3=VERDICT_CLR[String(data.xray_verdict)]??clr
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div style={{background:'rgba(255,255,255,.04)',border:`1px solid ${verdClr3}30`,borderRadius:6,padding:'16px',textAlign:'center'}}>
          <div style={{fontSize:9,color:'#6a8a98',letterSpacing:'1px',marginBottom:6}}>X-RAY VERDICT</div>
          <div style={{fontSize:20,fontWeight:900,color:verdClr3,textShadow:`0 0 16px ${verdClr3}`}}>{String(data.xray_verdict??'?').replace('_',' ')}</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          <InfoBlock title="WHAT THEY SAY" content={(nvr2.what_they_want_you_to_think?.slice(0,80)+'...')||''} clr="#6a8a98"/>
          <InfoBlock title="REALITY" content={(nvr2.what_the_numbers_actually_say?.slice(0,80)+'...')||''} clr={verdClr3}/>
        </div>
      </div>
      {buried.map((s,i)=>(
        <div key={i} style={{display:'flex',gap:12,padding:'12px 14px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:6}}>
          <Chip label={s.severity} clr={s.severity==='CRITICAL'?'#ff2d78':s.severity==='HIGH'?'#ff6b35':s.severity==='MEDIUM'?'#f59e0b':'#6a8a98'}/>
          <Chip label={s.market_impact} clr={s.market_impact==='BEARISH'?'#ff2d78':s.market_impact==='BULLISH'?'#00ff88':'#f59e0b'}/>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:'#dce8f0',marginBottom:3}}>{s.what_it_says}</div>
            <div style={{fontSize:11,color:'#6a8a98'}}>{s.what_it_means}</div>
          </div>
        </div>
      ))}
      <TradeBox trade={`${data.the_trade} · ${data.timeline} · Watch: ${data.key_metric_to_watch}`} clr={clr}/>
    </div>
  )
}

// ── WEAPON CARD with 3D tilt ──────────────────────────────────────────────────
function WeaponCard({ mod, onClick, delay }: { mod:typeof MODULES[0]; onClick:()=>void; delay:number }) {
  const [tilt, setTilt] = useState({ x:0, y:0 })
  const [hov, setHov] = useState(false)

  const onMove = (e:React.MouseEvent) => {
    const r=e.currentTarget.getBoundingClientRect()
    const cx=r.width/2, cy=r.height/2
    setTilt({ x:-(e.clientY-r.top-cy)/cy*12, y:(e.clientX-r.left-cx)/cx*12 })
  }

  return (
    <div onClick={onClick}
      onMouseMove={onMove}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>{setHov(false);setTilt({x:0,y:0})}}
      style={{
        background:'rgba(6,13,20,.88)',
        border:`1px solid ${mod.clr}${hov?'55':'1e'}`,
        backdropFilter:'blur(16px)',
        padding:'28px 24px',
        borderRadius:12,
        cursor:'pointer',
        position:'relative',
        overflow:'hidden',
        transform:`perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hov?1.03:1})`,
        transition:hov?'transform .1s ease,border-color .2s,box-shadow .2s':'transform .35s ease,border-color .25s,box-shadow .25s',
        boxShadow:hov?`0 28px 72px rgba(0,0,0,.55),0 0 50px ${mod.clr}14`:'0 8px 32px rgba(0,0,0,.3)',
        animation:'fadeUp .7s ease both',
        animationDelay:`${delay}s`,
        willChange:'transform',
      }}>
      {/* Top accent bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${mod.clr},transparent 65%)`}}/>
      {/* Inner glow follows tilt */}
      <div style={{position:'absolute',inset:0,borderRadius:12,background:`radial-gradient(circle at ${50+tilt.y*3}% ${50-tilt.x*3}%,${mod.clr}12,transparent 60%)`,pointerEvents:'none',transition:'background .1s'}}/>
      {/* Holographic shimmer on hover */}
      {hov&&<div style={{position:'absolute',inset:0,borderRadius:12,background:'linear-gradient(135deg,rgba(255,255,255,.03),transparent 50%,rgba(255,255,255,.02))',pointerEvents:'none'}}/>}
      {/* Corner scan */}
      {hov&&<div style={{position:'absolute',top:0,right:0,width:60,height:1,background:`linear-gradient(90deg,transparent,${mod.clr}60)`,transition:'opacity .3s'}}/>}

      <div style={{position:'relative',zIndex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <span style={{fontSize:34,filter:`drop-shadow(0 0 16px ${mod.clr})`,display:'inline-block',animation:hov?'float 2s ease-in-out infinite':'none'}}>{mod.icon}</span>
          <span style={{fontSize:'8px',color:mod.clr,background:`${mod.clr}14`,border:`1px solid ${mod.clr}30`,borderRadius:3,padding:'3px 8px',fontWeight:800,letterSpacing:'1.2px'}}>{mod.classif}</span>
        </div>
        <div style={{fontSize:'8px',color:'#2a4050',letterSpacing:'1.5px',marginBottom:6,fontFamily:'monospace'}}>{mod.tag}</div>
        <h3 style={{fontSize:20,fontWeight:900,letterSpacing:'-.4px',color:'#fff',marginBottom:10}}>{mod.name}</h3>
        <p style={{fontSize:13,color:'#3a5a6a',lineHeight:1.65,marginBottom:16}}>{mod.hook}</p>
        <p style={{fontSize:12,color:mod.clr,lineHeight:1.6,marginBottom:20,opacity:.8}}>{mod.desc}</p>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:14,borderTop:`1px solid ${mod.clr}14`}}>
          <span style={{fontSize:10,color:'#1a3040',fontFamily:'monospace'}}>{mod.needsInput?'Requires input':'Auto-detects live data'}</span>
          <span style={{fontSize:12,color:mod.clr,fontWeight:700,letterSpacing:'.5px'}}>DEPLOY →</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  const [active, setActive] = useState<typeof MODULES[0]|null>(null)
  const [activating, setActivating] = useState<typeof MODULES[0]|null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string,unknown>|null>(null)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'select'|'activate'|'input'|'analyzing'|'result'>('select')
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [logLines, setLogLines] = useState<string[]>([])
  const resultRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => {
    let ax=-100,ay=-100,tx=-100,ty=-100,raf:number
    const m=(e:MouseEvent)=>{tx=e.clientX;ty=e.clientY}
    const l=()=>{ax+=(tx-ax)*.1;ay+=(ty-ay)*.1;setCursorX(ax);setCursorY(ay);raf=requestAnimationFrame(l)}
    window.addEventListener('mousemove',m); raf=requestAnimationFrame(l)
    return ()=>{window.removeEventListener('mousemove',m);cancelAnimationFrame(raf)}
  },[])

  const activateWeapon = useCallback((mod:typeof MODULES[0]) => {
    setActivating(mod); setPhase('activate'); setResult(null); setError('')
    setInput(mod.example||'')
    setTimeout(()=>{setActive(mod);setActivating(null);setPhase(mod.needsInput?'input':'analyzing');if(!mod.needsInput)runAnalysis(mod,'')},1900)
  },[])

  const runAnalysis = useCallback(async (mod:typeof MODULES[0], inp:string) => {
    setPhase('analyzing'); setResult(null); setError(''); setLogLines([])
    const logs=[`[INIT] Deploying ${mod.name}...`,'[CONN] Secure channel established','[DATA] Fetching live market intelligence...','[AI]   Gemini analysis engine active','[PROC] Cross-referencing signal database...','[DONE] Compiling intelligence report...']
    let i=0
    logRef.current=setInterval(()=>{if(i<logs.length){setLogLines(p=>[...p,logs[i]]);i++}else clearInterval(logRef.current!)},400)
    try {
      const r=await fetch('/api/intelligence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:mod.id,input:inp||mod.example})})
      const d=await r.json()
      if(!r.ok||d.error){setError(d.error||'Analysis failed');setPhase('input');return}
      setResult(d.result??{}); setPhase('result')
      setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    } catch {setError('Network error');setPhase('input')}
    finally{if(logRef.current)clearInterval(logRef.current)}
  },[])

  const handleRun = () => {if(active)runAnalysis(active,input)}
  const handleBack = () => {setPhase('select');setActive(null);setResult(null);setError('');setLogLines([])}

  const acl = active?.clr??'#00d4aa'

  return (
    <div style={{background:'#030a10',color:'#dce8f0',fontFamily:'"Inter",system-ui,sans-serif',minHeight:'100vh',overflowX:'hidden',cursor:'none',position:'relative'}}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes glitch{0%,92%,100%{transform:none}95%{transform:skew(-2deg);filter:blur(.4px)}97%{transform:skew(2deg) scaleX(1.02)}}
        @keyframes holo{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes scan{0%{top:-4px}100%{top:100%}}
        @keyframes scanPage{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes pulse-w{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes activateFlash{0%{opacity:0;transform:scale(.92)}25%{opacity:1;transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes borderPulse{0%,100%{opacity:.3}50%{opacity:.8}}
        @keyframes textReveal{from{opacity:0;letter-spacing:6px}to{opacity:1;letter-spacing:normal}}

        .nav-link{color:#4a6a78;text-decoration:none;font-size:13px;transition:color .2s}
        .nav-link:hover{color:#00d4aa}
        ::selection{background:#00d4aa25}
        @media(max-width:900px){.wg3{grid-template-columns:1fr 1fr!important}}
        @media(max-width:580px){.wg3{grid-template-columns:1fr!important}}
      `}</style>

      {/* Custom cursor */}
      <div style={{position:'fixed',zIndex:9999,pointerEvents:'none',left:cursorX-5,top:cursorY-5,width:10,height:10,borderRadius:'50%',background:acl,mixBlendMode:'difference',transition:'background .4s'}}/>
      <div style={{position:'fixed',zIndex:9998,pointerEvents:'none',left:cursorX-18,top:cursorY-18,width:36,height:36,borderRadius:'50%',border:`1px solid ${acl}45`,transition:'left .08s,top .08s,border-color .4s'}}/>

      {/* Cosmic canvas (selection) / Weapon canvas (active) */}
      {phase==='select' ? <CosmicCanvas/> : (active&&<WeaponCanvas moduleId={active.id} clr={active.clr}/>)}

      {/* Page-wide scan line (selection only) */}
      {phase==='select'&&(
        <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',overflow:'hidden'}}>
          <div style={{position:'absolute',left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(0,212,170,.25),transparent)',animation:'scanPage 8s linear infinite',top:0}}/>
        </div>
      )}

      {/* Base ambient glow */}
      <div style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}}>
        <div style={{position:'absolute',top:'20%',left:'20%',width:700,height:700,borderRadius:'50%',background:`radial-gradient(circle,${acl}07,transparent 70%)`,transition:'background 1s',animation:'pulse-w 5s ease-in-out infinite'}}/>
        <div style={{position:'absolute',bottom:'20%',right:'20%',width:500,height:500,borderRadius:'50%',background:`radial-gradient(circle,${acl}05,transparent 70%)`,transition:'background 1s',animation:'pulse-w 6s ease-in-out infinite 1s'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${acl}03 1px,transparent 1px),linear-gradient(90deg,${acl}03 1px,transparent 1px)`,backgroundSize:'60px 60px',transition:'background 1s'}}/>
      </div>

      {/* ACTIVATION OVERLAY */}
      {phase==='activate'&&activating&&(
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(3,10,16,.96)',backdropFilter:'blur(24px)',animation:'fadeIn .12s ease'}}>
          {/* Rotating ring */}
          <div style={{position:'absolute',width:300,height:300,borderRadius:'50%',border:`1px solid ${activating.clr}20`,animation:'spinSlow 8s linear infinite'}}/>
          <div style={{position:'absolute',width:200,height:200,borderRadius:'50%',border:`1px solid ${activating.clr}15`,animation:'spinSlow 5s linear infinite reverse'}}/>
          <div style={{textAlign:'center',animation:'activateFlash .9s cubic-bezier(.22,1,.36,1)',position:'relative',zIndex:1}}>
            <div style={{fontSize:90,marginBottom:20,filter:`drop-shadow(0 0 40px ${activating.clr})`,display:'inline-block',animation:'float 1.5s ease-in-out infinite'}}>{activating.icon}</div>
            <div style={{fontSize:'8px',color:activating.clr,letterSpacing:'5px',marginBottom:14,animation:'textReveal .6s ease .3s both'}}>{activating.classif} · CLEARANCE GRANTED</div>
            <h2 style={{fontSize:'clamp(36px,6vw,76px)',fontWeight:900,letterSpacing:'-2.5px',color:activating.clr,textShadow:`0 0 80px ${activating.clr}`,animation:'glitch 2s infinite'}}>{activating.name.toUpperCase()}</h2>
            <div style={{fontSize:13,color:'#3a5a6a',marginTop:10,fontFamily:'monospace',letterSpacing:'.5px'}}>{activating.tag}</div>
            <div style={{marginTop:24,display:'flex',justifyContent:'center',gap:8}}>
              {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:activating.clr,animation:`pulse-w 1s infinite ${i*.2}s`}}/>)}
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:56,display:'flex',alignItems:'center',padding:'0 28px',gap:24,background:'rgba(3,10,16,.88)',backdropFilter:'blur(24px)',borderBottom:`1px solid ${acl}12`,transition:'border-color .4s'}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#00d4aa,#1e90ff)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:10,color:'#030a10',boxShadow:'0 0 16px #00d4aa35'}}>YN</div>
          <span style={{fontWeight:900,fontSize:14,letterSpacing:'-.3px'}}>YN Finance</span>
        </Link>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:acl,fontWeight:700,letterSpacing:'.8px',transition:'color .4s'}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:acl,display:'inline-block',animation:'pulse-w 1.4s infinite',transition:'background .4s'}}/>
          INTELLIGENCE SUITE
          {active&&<span style={{color:'#2a4050',fontWeight:400}}> · {active.name}</span>}
        </div>
        <div style={{display:'flex',gap:20,marginLeft:'auto'}}>
          <Link href="/analyzer" className="nav-link">Trade Analyzer</Link>
          <Link href="/app"      className="nav-link">Terminal</Link>
        </div>
        {active&&(
          <button onClick={handleBack} style={{marginLeft:8,background:'transparent',border:`1px solid ${acl}35`,color:acl,padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',letterSpacing:'.8px',transition:'all .2s'}}>
            ← WEAPONS
          </button>
        )}
      </nav>

      <div style={{paddingTop:56,minHeight:'100vh',position:'relative',zIndex:2}}>

        {/* ── SELECTION PHASE ──────────────────────────────────────────────── */}
        {phase==='select'&&(
          <div style={{maxWidth:1120,margin:'0 auto',padding:'64px 24px'}}>

            {/* Header */}
            <div style={{textAlign:'center',marginBottom:72,animation:'fadeUp .7s ease'}}>
              {/* Decorative top element */}
              <div style={{display:'flex',alignItems:'center',gap:16,maxWidth:320,margin:'0 auto 24px'}}>
                <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(255,45,120,.3))'}}/>
                <div style={{width:5,height:5,borderRadius:'50%',background:'#ff2d78',boxShadow:'0 0 12px #ff2d78',animation:'pulse-w 1.5s infinite'}}/>
                <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(255,45,120,.3),transparent)'}}/>
              </div>

              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,45,120,.08)',border:'1px solid rgba(255,45,120,.2)',borderRadius:20,padding:'6px 18px',marginBottom:22,fontSize:'8px',color:'#ff2d78',fontWeight:700,letterSpacing:'2px'}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#ff2d78',display:'inline-block',animation:'pulse-w 1.5s infinite'}}/>
                SIX WEAPONS · SELECT YOUR MISSION
              </div>

              <h1 style={{fontSize:'clamp(44px,8vw,88px)',fontWeight:900,letterSpacing:'-4px',lineHeight:.88,marginBottom:18}}>
                Intelligence<br/>
                <span style={{background:'linear-gradient(135deg,#ff2d78 0%,#a855f7 50%,#00d4ff 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundSize:'200%',animation:'holo 4s linear infinite'}}>Suite</span>
              </h1>

              <p style={{fontSize:16,color:'#2a4050',lineHeight:1.7,maxWidth:500,margin:'0 auto',fontFamily:'monospace',letterSpacing:'.2px'}}>
                Six tools that don&apos;t exist anywhere else.<br/>Select your weapon.
              </p>

              {/* Stats row */}
              <div style={{display:'flex',justifyContent:'center',gap:32,marginTop:28,flexWrap:'wrap'}}>
                {[['6','Weapons'],['73–91%','Hit Rates'],['∞','Free to Use']].map(([val,label])=>(
                  <div key={label} style={{textAlign:'center'}}>
                    <div style={{fontFamily:'monospace',fontSize:20,fontWeight:900,color:'#00d4aa',marginBottom:3}}>{val}</div>
                    <div style={{fontFamily:'monospace',fontSize:'9px',color:'#1a3040',letterSpacing:'1.5px'}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weapon grid — 3D perspective container */}
            <div style={{perspective:'1200px'}}>
              <div className="wg3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {MODULES.map((mod,i)=>(
                  <WeaponCard key={mod.id} mod={mod} onClick={()=>activateWeapon(mod)} delay={i*.08}/>
                ))}
              </div>
            </div>

            <div style={{textAlign:'center',marginTop:44,fontFamily:'monospace',fontSize:'9px',color:'#0a1a22',letterSpacing:'1.5px'}}>
              FREE TO USE · POWERED BY GEMINI AI + LIVE FINNHUB DATA · CLICK ANY WEAPON TO DEPLOY
            </div>
          </div>
        )}

        {/* ── ACTIVE WEAPON PHASE ──────────────────────────────────────────── */}
        {active&&phase!=='select'&&phase!=='activate'&&(
          <div style={{maxWidth:920,margin:'0 auto',padding:'44px 24px',animation:'fadeUp .5s ease'}}>

            {/* Weapon header */}
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:36,padding:'22px 26px',background:'rgba(0,0,0,.5)',border:`1px solid ${acl}20`,borderRadius:12,backdropFilter:'blur(16px)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${acl},transparent 60%)`}}/>
              <div style={{position:'absolute',bottom:0,right:0,width:'35%',height:1,background:`linear-gradient(90deg,transparent,${acl}35)`}}/>
              {/* Radial glow */}
              <div style={{position:'absolute',top:'50%',left:0,transform:'translateY(-50%)',width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${acl}08,transparent 70%)`,pointerEvents:'none'}}/>
              <span style={{fontSize:40,filter:`drop-shadow(0 0 20px ${acl})`,position:'relative'}}>{active.icon}</span>
              <div style={{flex:1,position:'relative'}}>
                <div style={{fontSize:'8px',color:'#2a4050',letterSpacing:'2.5px',marginBottom:5,fontFamily:'monospace'}}>{active.classif} · {active.tag}</div>
                <h2 style={{fontSize:'clamp(24px,3.5vw,44px)',fontWeight:900,letterSpacing:'-1.5px',color:acl,textShadow:`0 0 40px ${acl}50`,animation:'glitch 9s infinite'}}>{active.name}</h2>
              </div>
              <div style={{fontSize:12,color:'#2a4050',maxWidth:260,lineHeight:1.65,textAlign:'right'}}>{active.hook}</div>
            </div>

            {/* Input */}
            {(phase==='input'||phase==='result')&&active.needsInput&&(
              <div style={{marginBottom:24}}>
                <div style={{display:'flex',gap:0,background:'rgba(0,0,0,.65)',border:`1px solid ${acl}38`,borderRadius:9,overflow:'hidden',backdropFilter:'blur(16px)',boxShadow:loading?`0 0 50px ${acl}18`:'none',transition:'box-shadow .3s'}}>
                  <span style={{padding:'16px 16px',fontSize:13,color:`${acl}60`,flexShrink:0,borderRight:`1px solid ${acl}18`,letterSpacing:'1px',fontFamily:'monospace'}}>$</span>
                  <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!loading&&handleRun()}
                    placeholder={active.placeholder}
                    style={{flex:1,background:'transparent',border:'none',padding:'16px 16px',fontSize:15,color:acl,fontFamily:'monospace',fontWeight:700,outline:'none',letterSpacing:'.5px'}}/>
                  <button onClick={handleRun} disabled={loading} style={{background:loading?'transparent':acl,border:'none',borderLeft:`1px solid ${acl}35`,padding:'0 28px',cursor:loading?'not-allowed':'pointer',color:'#000',fontWeight:900,fontSize:11,fontFamily:'inherit',letterSpacing:'1.5px',transition:'all .2s',whiteSpace:'nowrap',minWidth:110}}>
                    {loading?<span style={{color:acl,animation:'pulse-w .8s infinite'}}>···</span>:'ANALYZE →'}
                  </button>
                </div>
              </div>
            )}

            {/* Analyzing */}
            {phase==='analyzing'&&(
              <div style={{background:'rgba(0,0,0,.75)',border:`1px solid ${acl}22`,borderRadius:9,padding:'24px',marginBottom:24,backdropFilter:'blur(20px)',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${acl},transparent)`,animation:'scan 1.4s linear infinite'}}/>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${acl}12`}}>
                  <div style={{display:'flex',gap:5}}>{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}/>)}</div>
                  <span style={{fontFamily:'monospace',fontSize:10,color:'#2a4050'}}>{active.id}.exe · {active.needsInput?input:'live data'}</span>
                  <div style={{marginLeft:'auto',fontSize:'9px',color:acl,fontWeight:700,animation:'pulse-w .8s infinite',letterSpacing:'1.5px'}}>● RUNNING</div>
                </div>
                {logLines.map((line,i)=>(
                  <div key={i} style={{fontFamily:'monospace',fontSize:12,color:i===logLines.length-1?acl:'#1a3040',marginBottom:6,transition:'color .3s',animation:'fadeUp .2s ease',letterSpacing:'.4px'}}>
                    {line}{i===logLines.length-1&&<span style={{animation:'pulse-w .8s infinite'}}>▋</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error&&(
              <div style={{background:'rgba(255,45,120,.07)',border:'1px solid rgba(255,45,120,.28)',borderRadius:8,padding:'14px 18px',color:'#ff2d78',fontSize:12,fontFamily:'monospace',marginBottom:24,letterSpacing:'.3px'}}>
                [ERROR] {error}
              </div>
            )}

            {/* Results */}
            {result&&phase==='result'&&(
              <div ref={resultRef} style={{animation:'fadeUp .5s ease'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'12px 16px',background:'rgba(0,0,0,.55)',border:`1px solid ${acl}22`,borderRadius:7,fontFamily:'monospace',fontSize:10}}>
                  <span style={{color:acl,fontWeight:700,fontSize:14}}>✓</span>
                  <span style={{color:acl,letterSpacing:'.8px'}}>INTELLIGENCE REPORT READY</span>
                  <span style={{color:'#1a3040',marginLeft:'auto',letterSpacing:'.5px'}}>{active.id} · {new Date().toLocaleTimeString()}</span>
                  {active.needsInput&&(
                    <button onClick={handleRun} style={{background:'transparent',border:`1px solid ${acl}35`,color:acl,padding:'4px 12px',borderRadius:4,fontSize:'9px',cursor:'pointer',fontFamily:'inherit',fontWeight:700,letterSpacing:'1px'}}>
                      RE-RUN
                    </button>
                  )}
                </div>
                <ResultRenderer mode={active.id} data={result} clr={acl}/>
                <div style={{marginTop:28,textAlign:'center'}}>
                  <button onClick={handleBack} style={{background:'transparent',border:`1px solid ${acl}28`,color:'#2a4050',padding:'11px 32px',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:600,transition:'all .2s'}}
                    onMouseEnter={e=>(e.currentTarget.style.color=acl)} onMouseLeave={e=>(e.currentTarget.style.color='#2a4050')}>
                    ← Deploy Another Weapon
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
