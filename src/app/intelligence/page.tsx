'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const MODULES = [
  {
    id: 'lockup',
    code: 'LOCKUP-ASSASSIN',
    name: 'Lock-Up Assassin',
    icon: '🔫',
    clr: '#ff2d78',
    glow: '#ff2d7840',
    tag: 'SCHEDULED DESTRUCTION',
    desc: 'Every IPO has a 180-day lock-up. When it expires, insiders dump. This is guaranteed, dated, and sized. Build the put position 3 weeks early.',
    needsInput: true,
    placeholder: 'Enter recent IPO ticker...',
    example: 'RDDT',
    classif: 'SECRET',
  },
  {
    id: 'liedetector',
    code: 'LIE-DETECTOR',
    name: 'Lie Detector',
    icon: '🧪',
    clr: '#f59e0b',
    glow: '#f59e0b40',
    tag: 'FORENSIC EARNINGS ANALYSIS',
    desc: 'AI reads between the lines of earnings calls and filings. Finds what management buried. Spots the divergence between narrative and numbers before Wall Street does.',
    needsInput: true,
    placeholder: 'Enter ticker to analyze...',
    example: 'TSLA',
    classif: 'SECRET',
  },
  {
    id: 'galaxybrain',
    code: 'GALAXY-BRAIN',
    name: 'Galaxy Brain',
    icon: '🧠',
    clr: '#a855f7',
    glow: '#a855f740',
    tag: 'MACRO DOMINO TRACER',
    desc: 'Enter any macro event. AI traces the full domino chain to specific stocks and options trades — including the 3-step connections nobody else makes.',
    needsInput: true,
    placeholder: 'Enter macro scenario...',
    example: 'Fed holds rates, dollar weakens',
    classif: 'TOP SECRET',
  },
  {
    id: 'flow',
    code: 'FORCED-FLOW',
    name: 'Forced Flow',
    icon: '🌊',
    clr: '#00d4ff',
    glow: '#00d4ff40',
    tag: 'MECHANICAL MONEY MOVEMENTS',
    desc: 'Billions of dollars HAVE to move into specific stocks every month regardless of news. Index rebalancing. Gamma hedging. ETF flows. Front-run guaranteed mechanical buying.',
    needsInput: false,
    placeholder: '',
    example: '',
    classif: 'TOP SECRET',
  },
  {
    id: 'signals',
    code: 'SIGNAL-RADAR',
    name: 'Signal Radar',
    icon: '⚡',
    clr: '#00ff88',
    glow: '#00ff8840',
    tag: 'CROSS-ASSET CORRELATION ENGINE',
    desc: 'Non-obvious correlations that predict stock moves 24-72 hours early. Korean Won weakens → semiconductor stocks follow. Oil spikes → airlines drop 48h later. Fire when trigger hits.',
    needsInput: false,
    placeholder: '',
    example: '',
    classif: 'SECRET',
  },
  {
    id: 'filing',
    code: 'FILING-XRAY',
    name: 'Filing X-Ray',
    icon: '📄',
    clr: '#ec4899',
    glow: '#ec489940',
    tag: 'SEC DOCUMENT INTELLIGENCE',
    desc: 'AI reads SEC filings the second they drop and extracts what management buried on page 47. Finds the $200M write-down, the quiet accounting change, the going-concern footnote before analysts do.',
    needsInput: true,
    placeholder: 'Enter ticker to X-Ray...',
    example: 'NVDA',
    classif: 'TOP SECRET',
  },
]

const VERDICT_CLR: Record<string,string> = {
  HIGH:'#00ff88', MEDIUM:'#f59e0b', LOW:'#6a90a8',
  FIRING:'#ff2d78', APPROACHING:'#f59e0b', COOLING:'#6a90a8',
  BULLISH_HIDDEN:'#00ff88', BEARISH_HIDDEN:'#ff2d78', NEUTRAL:'#f59e0b',
  CONFIRMED_BULLISH:'#00e5a0', CONFIRMED_BEARISH:'#ff2d78',
  CLEAN:'#00ff88', YELLOW_FLAGS:'#f59e0b', RED_FLAGS:'#ff6b35', CRITICAL:'#ff2d78',
  FORCED_BUY:'#00ff88', FORCED_SELL:'#ff2d78', MIXED:'#f59e0b',
}

function SeverityBadge({ level, label }: { level: string; label?: string }) {
  const clr = VERDICT_CLR[level] ?? '#6a90a8'
  return (
    <span style={{ fontSize:9, fontWeight:800, color:clr, background:`${clr}18`, border:`1px solid ${clr}40`, borderRadius:3, padding:'2px 8px', letterSpacing:'1px' }}>
      {label ?? level}
    </span>
  )
}

function LoadingScreen({ mod }: { mod: typeof MODULES[0] }) {
  const [dots, setDots] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const msgs = [
    `[INIT] Activating ${mod.code}...`,
    '[CONN] Establishing secure data channel...',
    '[AUTH] Clearance level verified',
    '[SCAN] Pulling market intelligence...',
    '[AI]   Deploying Gemini analysis engine...',
    '[PROC] Cross-referencing signal database...',
    '[DONE] Intelligence report compiling...',
  ]
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i < msgs.length) { setLines(prev => [...prev, msgs[i]]); i++ }
      else clearInterval(t)
    }, 340)
    const d = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 400)
    return () => { clearInterval(t); clearInterval(d) }
  }, [])
  return (
    <div style={{ padding:'32px', background:'#000', border:`1px solid ${mod.clr}30`, borderRadius:4 }}>
      <div style={{ fontFamily:'monospace', fontSize:11, display:'flex', flexDirection:'column', gap:6 }}>
        {lines.map((l,i) => (
          <div key={i} style={{ color: i === lines.length-1 ? mod.clr : '#1a4a2a', transition:'color .3s' }}>
            {l}{i === lines.length-1 ? dots : ' ✓'}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultCard({ title, value, clr, sub }: { title:string; value:string|number; clr:string; sub?:string }) {
  return (
    <div style={{ background:`${clr}08`, border:`1px solid ${clr}25`, borderRadius:4, padding:'16px 18px' }}>
      <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'2px', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:20, fontWeight:900, color:clr, fontFamily:'monospace', textShadow:`0 0 16px ${clr}`, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#6a90a8', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── RESULT RENDERERS ─────────────────────────────────────────────────────────

function LockupResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const trade = data.trade as Record<string,string> ?? {}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        <ResultCard title="LOCK-UP DATE" value={String(data.lockup_date ?? 'ESTIMATING')} clr={clr}/>
        <ResultCard title="DAYS UNTIL" value={data.days_until ? `${data.days_until}d` : 'TBD'} clr={clr}/>
        <ResultCard title="SETUP QUALITY" value={String(data.setup_quality ?? '?')} clr={VERDICT_CLR[String(data.setup_quality)] ?? clr}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <ResultCard title="SHARES UNLOCKING" value={String(data.estimated_unlock_shares ?? '?')} clr='#f59e0b'/>
        <ResultCard title="HISTORICAL AVG DROP" value={String(data.historical_avg_drop ?? '?')} clr='#ff2d78'/>
      </div>
      <div style={{ background:'#050505', border:`1px solid ${clr}20`, borderRadius:4, padding:'18px' }}>
        <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'2px', marginBottom:10 }}>THESIS</div>
        <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.75 }}>{String(data.thesis ?? '')}</p>
      </div>
      <div style={{ background:'#0a0005', border:`1px solid ${clr}30`, borderRadius:4, padding:'18px' }}>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:12 }}>THE TRADE</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[['TYPE',trade.type],['ENTRY TIMING',trade.entry_timing],['EXPIRY',trade.expiry]].map(([l,v])=>(
            <div key={l} style={{ background:'#0a0005', border:'1px solid #1a0010', borderRadius:3, padding:'10px 12px' }}>
              <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'1px', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:12, fontWeight:800, color:clr, fontFamily:'monospace' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:10, fontSize:12, color:'#6a90a8', lineHeight:1.6 }}>
          <span style={{ color:'#ff2d78', fontWeight:700 }}>EXIT: </span>{trade.exit}
        </div>
        <div style={{ marginTop:6, fontSize:12, color:'#f59e0b', lineHeight:1.6 }}>
          <span style={{ fontWeight:700 }}>RISK: </span>{trade.risk}
        </div>
      </div>
      {Array.isArray(data.red_flags) && data.red_flags.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'2px', marginBottom:8 }}>RED FLAGS</div>
          {(data.red_flags as string[]).map((f,i) => (
            <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', marginBottom:6, background:'rgba(255,45,120,.06)', border:'1px solid rgba(255,45,120,.2)', borderRadius:3 }}>
              <span style={{ color:'#ff2d78', fontWeight:700 }}>{i+1}.</span>
              <span style={{ fontSize:12, color:'#d0e8d8' }}>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LieDetectorResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const verdictClr = VERDICT_CLR[String(data.verdict)] ?? clr
  const div = data.narrative_vs_reality as Record<string,string> ?? {}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        <ResultCard title="VERDICT" value={String(data.verdict ?? '?').replace('_',' ')} clr={verdictClr}/>
        <ResultCard title="CONFIDENCE" value={`${data.confidence ?? 0}%`} clr={verdictClr}/>
        <ResultCard title="DIVERGENCE SCORE" value={`${data.divergence_score ?? 0}/100`} clr='#f59e0b' sub="narrative vs reality"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ background:'rgba(0,20,10,.6)', border:'1px solid rgba(0,255,136,.15)', borderRadius:4, padding:'16px' }}>
          <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'2px', marginBottom:8 }}>WHAT THEY WANT YOU TO THINK</div>
          <p style={{ fontSize:13, color:'#6a90a8', lineHeight:1.65, fontStyle:'italic' }}>{div.what_they_want_you_to_think}</p>
        </div>
        <div style={{ background:'rgba(255,45,120,.06)', border:'1px solid rgba(255,45,120,.25)', borderRadius:4, padding:'16px' }}>
          <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'2px', marginBottom:8 }}>HIDDEN TRUTH</div>
          <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.65, fontWeight:500 }}>{String(data.hidden_truth ?? '')}</p>
        </div>
      </div>
      {Array.isArray(data.red_flags) && (
        <div>
          <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'2px', marginBottom:8 }}>SIGNALS DETECTED</div>
          {(data.red_flags as Record<string,string>[]).map((f,i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, padding:'10px 14px', marginBottom:6, background:'rgba(0,0,0,.4)', border:'1px solid #1a1a1a', borderRadius:3 }}>
              <SeverityBadge level={f.severity}/>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#d0e8d8', marginBottom:2 }}>{f.signal}</div>
                <div style={{ fontSize:11, color:'#6a90a8' }}>{f.implication}</div>
              </div>
              <SeverityBadge level={f.severity === 'HIGH' ? 'BEARISH_HIDDEN' : 'NEUTRAL'} label={f.severity === 'HIGH' ? '↓ BEARISH' : 'WATCH'}/>
            </div>
          ))}
        </div>
      )}
      <div style={{ background:'#050505', border:`1px solid ${clr}25`, borderRadius:4, padding:'18px' }}>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:10 }}>THE TRADE</div>
        <p style={{ fontSize:14, color:'#d0e8d8', lineHeight:1.7, fontWeight:500 }}>{String(data.the_trade ?? '')}</p>
        <div style={{ marginTop:10, display:'flex', gap:16 }}>
          <div style={{ fontSize:11, color:'#6a90a8' }}>Catalyst: <span style={{ color:'#f59e0b' }}>{String(data.catalyst ?? '')}</span></div>
          <div style={{ fontSize:11, color:'#6a90a8' }}>Timeline: <span style={{ color:'#f59e0b' }}>{String(data.timeline ?? '')}</span></div>
        </div>
      </div>
    </div>
  )
}

function GalaxyBrainResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const dominoes = (data.domino_chain as Record<string,unknown>[] ?? [])
  const nonObvious = (data.non_obvious_trades as Record<string,unknown>[] ?? [])
  const obvious = (data.obvious_trades as Record<string,unknown>[] ?? [])
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <ResultCard title="DIRECTION" value={String(data.primary_direction ?? '?').replace('_',' ')} clr={clr}/>
        <ResultCard title="SCENARIO CLARITY" value={`${data.scenario_clarity ?? 0}/100`} clr={clr} sub="how tradeable this is"/>
      </div>

      {/* Domino chain */}
      <div>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:10 }}>DOMINO CHAIN</div>
        {dominoes.map((d,i) => (
          <div key={i} style={{ display:'flex', gap:0, marginBottom:0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginRight:14 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:`${clr}20`, border:`2px solid ${clr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:clr, flexShrink:0 }}>{i+1}</div>
              {i < dominoes.length-1 && <div style={{ width:2, height:28, background:`${clr}30` }}/>}
            </div>
            <div style={{ background:'#050505', border:`1px solid ${clr}15`, borderRadius:4, padding:'12px 14px', flex:1, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#d0e8d8', marginBottom:4 }}>{String(d.what_happens)}</div>
              <div style={{ display:'flex', gap:16, fontSize:10, color:'#6a90a8' }}>
                <span>Moves: <span style={{ color:clr }}>{String(d.who_moves_first)}</span></span>
                <span>Size: <span style={{ color:'#f59e0b' }}>{String(d.magnitude)}</span></span>
                <span>Timing: <span style={{ color:'#d0e8d8' }}>{String(d.timing)}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Non-obvious trades */}
      {nonObvious.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'2px', marginBottom:10 }}>🔥 NON-OBVIOUS TRADES — THE CONNECTIONS RETAIL MISSES</div>
          {nonObvious.map((t,i) => (
            <div key={i} style={{ background:'rgba(255,45,120,.05)', border:'1px solid rgba(255,45,120,.2)', borderRadius:4, padding:'14px 16px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <span style={{ fontSize:16, fontWeight:900, fontFamily:'monospace', color: t.direction === 'LONG' ? '#00ff88' : '#ff2d78' }}>{String(t.ticker)}</span>
                <SeverityBadge level={t.direction === 'LONG' ? 'BULLISH_HIDDEN' : 'BEARISH_HIDDEN'} label={String(t.direction)}/>
                <SeverityBadge level={String(t.conviction)} label={`${t.conviction} CONVICTION`}/>
              </div>
              <div style={{ fontSize:12, color:'#d0e8d8', marginBottom:6, lineHeight:1.6 }}>
                <span style={{ color:'#a855f7', fontWeight:700 }}>CONNECTION: </span>{String(t.connection)}
              </div>
              <div style={{ fontSize:11, color:'#f59e0b' }}>Options: {String(t.options_play)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:'#050505', border:`1px solid ${clr}20`, borderRadius:4, padding:'16px' }}>
        <div style={{ fontSize:9, color:'#ff2d78', letterSpacing:'2px', marginBottom:8 }}>WHAT BREAKS THE THESIS</div>
        <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.65 }}>{String(data.what_breaks_the_thesis ?? '')}</p>
      </div>
    </div>
  )
}

function FlowResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const events = (data.events as Record<string,unknown>[] ?? [])
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        <ResultCard title="NEXT OPEX" value={String(data.opex_date ?? '?')} clr={clr}/>
        <ResultCard title="DAYS TO OPEX" value={`${data.days_to_opex ?? '?'}d`} clr={clr}/>
        <ResultCard title="MAX PAIN SPY" value={`$${data.max_pain_levels ? String((data.max_pain_levels as Record<string,number>).SPY ?? '?') : '?'}`} clr='#f59e0b'/>
      </div>
      <div style={{ background:`${clr}08`, border:`1px solid ${clr}25`, borderRadius:4, padding:'16px' }}>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:8 }}>🔥 BIGGEST EDGE THIS MONTH</div>
        <p style={{ fontSize:14, color:'#d0e8d8', lineHeight:1.7, fontWeight:600 }}>{String(data.biggest_edge ?? '')}</p>
      </div>
      <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:0 }}>FORCED FLOW EVENTS</div>
      {events.map((ev,i) => (
        <div key={i} style={{ background:'#050505', border:`1px solid ${VERDICT_CLR[String(ev.direction)] ?? clr}25`, borderRadius:4, padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <SeverityBadge level={String(ev.direction)} label={String(ev.direction).replace('_',' ')}/>
            <span style={{ fontSize:13, fontWeight:700, color:'#d0e8d8' }}>{String(ev.event_type)}</span>
            <span style={{ marginLeft:'auto', fontSize:11, color:'#6a90a8' }}>{String(ev.date)}</span>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:11, color:'#6a90a8', marginBottom:8 }}>
            <span>Size: <span style={{ color:'#f59e0b' }}>{String(ev.magnitude)}</span></span>
            <span>Confidence: <span style={{ color:clr }}>{String(ev.confidence)}%</span></span>
            <span>Window: <span style={{ color:'#d0e8d8' }}>{String(ev.window)}</span></span>
          </div>
          {Array.isArray(ev.affected_tickers) && (
            <div style={{ display:'flex', gap:6, marginBottom:8 }}>
              {(ev.affected_tickers as string[]).map(t=>(
                <span key={t} style={{ fontSize:11, fontWeight:700, color:clr, background:`${clr}12`, border:`1px solid ${clr}30`, borderRadius:3, padding:'2px 8px', fontFamily:'monospace' }}>{t}</span>
              ))}
            </div>
          )}
          <div style={{ fontSize:12, color:'#d0e8d8', lineHeight:1.6 }}><span style={{ color:clr, fontWeight:700 }}>EDGE: </span>{String(ev.edge)}</div>
        </div>
      ))}
    </div>
  )
}

function SignalRadarResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const signals = (data.active_signals as Record<string,unknown>[] ?? [])
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background:`${clr}08`, border:`1px solid ${clr}25`, borderRadius:4, padding:'16px' }}>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:8 }}>🔥 MOST ACTIONABLE SIGNAL NOW</div>
        <p style={{ fontSize:14, fontWeight:700, color:'#d0e8d8', lineHeight:1.65 }}>{String(data.most_actionable ?? '')}</p>
      </div>
      <div style={{ background:'#050505', border:'1px solid #1a1a1a', borderRadius:4, padding:'14px' }}>
        <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'2px', marginBottom:6 }}>MARKET REGIME</div>
        <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.65 }}>{String(data.market_regime ?? '')}</p>
      </div>
      {signals.map((s,i) => {
        const statusClr = VERDICT_CLR[String(s.status)] ?? clr
        return (
          <div key={i} style={{ background:'#050505', border:`1px solid ${statusClr}30`, borderRadius:4, padding:'16px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: s.status === 'FIRING' ? `linear-gradient(90deg,${statusClr},transparent)` : 'transparent' }}/>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:statusClr, boxShadow:`0 0 8px ${statusClr}`, animation: s.status === 'FIRING' ? 'none' : 'none', flexShrink:0 }}/>
              <SeverityBadge level={String(s.status)}/>
              <span style={{ fontSize:13, fontWeight:700, color:'#d0e8d8' }}>{String(s.correlation)}</span>
              <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:statusClr, fontFamily:'monospace' }}>{String(s.historical_hit_rate)}</span>
            </div>
            <div style={{ fontSize:12, color:'#6a90a8', marginBottom:8, lineHeight:1.6 }}>
              <span style={{ color:'#d0e8d8' }}>Trigger: </span>{String(s.current_trigger)}
            </div>
            <div style={{ display:'flex', gap:16, fontSize:11, color:'#6a90a8', marginBottom:8 }}>
              <span>Implied: <span style={{ color:statusClr }}>{String(s.implied_move)} {String(s.magnitude)}</span></span>
              <span>Timing: <span style={{ color:'#d0e8d8' }}>{String(s.timing)}</span></span>
              <span>Conviction: <span style={{ color:statusClr }}>{String(s.conviction)}</span></span>
            </div>
            <div style={{ fontSize:12, color:'#d0e8d8', lineHeight:1.6 }}>
              <span style={{ color:clr, fontWeight:700 }}>TRADE: </span>{String(s.trade)}
            </div>
          </div>
        )
      })}
      <div style={{ background:'rgba(168,85,247,.05)', border:'1px solid rgba(168,85,247,.2)', borderRadius:4, padding:'14px' }}>
        <div style={{ fontSize:9, color:'#a855f7', letterSpacing:'2px', marginBottom:6 }}>CONTRARIAN READ</div>
        <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.65 }}>{String(data.contrarian_read ?? '')}</p>
      </div>
    </div>
  )
}

function FilingXRayResult({ data, clr }: { data: Record<string,unknown>; clr:string }) {
  const verdictClr = VERDICT_CLR[String(data.xray_verdict)] ?? clr
  const buried = (data.buried_signals as Record<string,string>[] ?? [])
  const nvr    = data.narrative_vs_reality as Record<string,string> ?? {}
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <ResultCard title="X-RAY VERDICT" value={String(data.xray_verdict ?? '?').replace('_',' ')} clr={verdictClr}/>
        <ResultCard title="CONFIDENCE" value={`${data.confidence ?? 0}%`} clr={verdictClr}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div style={{ background:'rgba(0,0,0,.5)', border:'1px solid #1a1a1a', borderRadius:4, padding:'14px' }}>
          <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'2px', marginBottom:6 }}>WHAT THEY WANT YOU TO SEE</div>
          <p style={{ fontSize:12, color:'#6a90a8', fontStyle:'italic', lineHeight:1.65 }}>{nvr.what_they_want_you_to_think}</p>
        </div>
        <div style={{ background:`${verdictClr}08`, border:`1px solid ${verdictClr}25`, borderRadius:4, padding:'14px' }}>
          <div style={{ fontSize:9, color:verdictClr, letterSpacing:'2px', marginBottom:6 }}>WHAT THE NUMBERS SAY</div>
          <p style={{ fontSize:12, color:'#d0e8d8', lineHeight:1.65, fontWeight:500 }}>{nvr.what_the_numbers_actually_say}</p>
        </div>
      </div>
      {buried.length > 0 && (
        <div>
          <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:10 }}>BURIED SIGNALS</div>
          {buried.map((s,i) => (
            <div key={i} style={{ border:`1px solid ${VERDICT_CLR[s.market_impact] ?? '#1a1a1a'}25`, borderRadius:4, padding:'12px 14px', marginBottom:8, background:'#030303' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                <SeverityBadge level={s.severity}/>
                <SeverityBadge level={s.market_impact} label={s.market_impact}/>
                <span style={{ fontSize:10, color:'#6a90a8', marginLeft:'auto' }}>Found: {s.location}</span>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'#d0e8d8', marginBottom:4 }}>{s.what_it_says}</div>
              <div style={{ fontSize:11, color:'#6a90a8', lineHeight:1.6 }}>{s.what_it_means}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ background:`${clr}08`, border:`1px solid ${clr}25`, borderRadius:4, padding:'16px' }}>
        <div style={{ fontSize:9, color:clr, letterSpacing:'2px', marginBottom:8 }}>THE TRADE</div>
        <p style={{ fontSize:13, color:'#d0e8d8', lineHeight:1.7 }}>{String(data.the_trade ?? '')}</p>
        <div style={{ marginTop:10, display:'flex', gap:20 }}>
          <div style={{ fontSize:11, color:'#6a90a8' }}>Timeline: <span style={{ color:'#f59e0b' }}>{String(data.timeline ?? '')}</span></div>
          <div style={{ fontSize:11, color:'#6a90a8' }}>Watch: <span style={{ color:clr }}>{String(data.key_metric_to_watch ?? '')}</span></div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  const [active,   setActive]   = useState(MODULES[0])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<Record<string,unknown>|null>(null)
  const [error,    setError]    = useState('')
  const [cursorX,  setCursorX]  = useState(-100)
  const [cursorY,  setCursorY]  = useState(-100)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ax=-100, ay=-100, tx=-100, ty=-100, raf: number
    const onMove = (e: MouseEvent) => { tx=e.clientX; ty=e.clientY }
    const loop   = () => { ax+=(tx-ax)*.1; ay+=(ty-ay)*.1; setCursorX(ax); setCursorY(ay); raf=requestAnimationFrame(loop) }
    window.addEventListener('mousemove', onMove); raf=requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove',onMove); cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    setResult(null); setError(''); setInput(active.example || '')
  }, [active])

  async function runIntel() {
    setLoading(true); setResult(null); setError('')
    try {
      const r = await fetch('/api/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: active.id, input: input || active.example }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setError(d.error || 'Analysis failed'); return }
      setResult(d.result ?? {})
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100)
    } catch { setError('Network error. Retry.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background:'#020408', color:'#c8d8e0', fontFamily:'"Inter",system-ui,sans-serif', minHeight:'100vh', display:'flex', flexDirection:'column', cursor:'none' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes scan{0%{top:-4px}100%{top:100%}}
        @keyframes border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes glow-shift{0%,100%{filter:blur(60px);opacity:.5}50%{filter:blur(90px);opacity:.9}}
        @keyframes glitch{0%,100%{transform:none}94%{transform:skew(-1deg)}96%{transform:skew(1deg)}}
        body{background:#020408}
        .mod-btn{width:100%;text-align:left;background:transparent;border:none;cursor:pointer;padding:14px 16px;border-radius:4px;transition:all .2s;position:relative;overflow:hidden}
        .mod-btn:hover{background:rgba(255,255,255,.03)}
        .mod-btn.active{background:rgba(255,255,255,.04)}
        .run-btn{border:none;border-radius:4px;padding:14px 28px;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:.5px;transition:all .2s;font-family:inherit}
        .run-btn:hover{opacity:.9;transform:translateY(-1px)}
        .run-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .inp{background:#000;border:1px solid #1a1a1a;border-radius:4px;padding:14px 16px;color:#c8d8e0;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s}
        .inp:focus{border-color:var(--active-clr)}
        .nav-link{color:#4a6a78;text-decoration:none;font-size:12px;transition:color .2s;letter-spacing:.3px}
        .nav-link:hover{color:#c8d8e0}
        ::selection{background:#00ff8830}
        @media(max-width:768px){.sidebar{display:none!important}}
      `}</style>

      {/* Cursor */}
      <div style={{ position:'fixed', zIndex:9999, pointerEvents:'none', left:cursorX-5, top:cursorY-5, width:10, height:10, borderRadius:'50%', background:active.clr, mixBlendMode:'difference', transition:'background .3s' }}/>
      <div style={{ position:'fixed', zIndex:9998, pointerEvents:'none', left:cursorX-18, top:cursorY-18, width:36, height:36, borderRadius:'50%', border:`1px solid ${active.clr}50`, transition:'left .08s,top .08s,border-color .3s' }}/>

      {/* Ambient glow */}
      <div style={{ position:'fixed', top:'20%', left:'30%', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle,${active.glow},transparent 70%)`, pointerEvents:'none', animation:'glow-shift 4s ease-in-out infinite', transition:'background .5s', zIndex:0 }}/>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:52, display:'flex', alignItems:'center', padding:'0 0 0 300px', gap:24, background:'rgba(2,4,8,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
        <Link href="/" style={{ position:'absolute', left:20, display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:9, color:'#000' }}>YN</div>
        </Link>
        <div style={{ display:'flex', gap:20 }}>
          <Link href="/ai-stocks"    className="nav-link">AI Analyzer</Link>
          <Link href="/daily"        className="nav-link">Daily Intel</Link>
          <Link href="/performance"  className="nav-link">Performance</Link>
          <Link href="/courses"      className="nav-link">Courses</Link>
          <Link href="/app"          className="nav-link">Terminal</Link>
        </div>
        <div style={{ marginLeft:'auto', marginRight:20, display:'flex', alignItems:'center', gap:8, fontSize:11, color:active.clr, fontWeight:700, letterSpacing:'.5px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:active.clr, display:'inline-block', animation:'pulse 1.5s infinite' }}/>
          {active.code} ACTIVE
        </div>
      </nav>

      <div style={{ display:'flex', flex:1, paddingTop:52 }}>

        {/* SIDEBAR */}
        <div className="sidebar" style={{ width:300, flexShrink:0, position:'fixed', top:52, left:0, bottom:0, background:'#000', borderRight:'1px solid rgba(255,255,255,.05)', overflowY:'auto', zIndex:90, display:'flex', flexDirection:'column' }}>
          {/* Header */}
          <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize:9, color:'#4a6a78', letterSpacing:'3px', marginBottom:6 }}>YN INTELLIGENCE SUITE</div>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:'-0.5px', color:'#c8d8e0', animation:'glitch 8s infinite' }}>OPS CENTER</div>
            <div style={{ fontSize:10, color:'#4a6a78', marginTop:4 }}>6 weapons. 1 platform. Unlimited edge.</div>
          </div>

          {/* Module list */}
          <div style={{ padding:'8px', flex:1 }}>
            {MODULES.map(m => (
              <button key={m.id} className={`mod-btn${active.id===m.id?' active':''}`} onClick={()=>setActive(m)}
                style={{ '--active-clr': m.clr } as React.CSSProperties}>
                {active.id === m.id && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:m.clr, boxShadow:`0 0 12px ${m.clr}` }}/>}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:8 }}>
                  <span style={{ fontSize:18, filter: active.id===m.id ? `drop-shadow(0 0 6px ${m.clr})` : 'none', transition:'filter .3s' }}>{m.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color: active.id===m.id ? m.clr : '#8a9aaa', transition:'color .2s' }}>{m.name}</div>
                    <div style={{ fontSize:9, color:'#4a6a78', letterSpacing:'.5px' }}>{m.tag}</div>
                  </div>
                  <div style={{ fontSize:8, color: active.id===m.id ? m.clr : '#2a3a48', background: active.id===m.id ? `${m.clr}15` : '#0a0a0a', border:`1px solid ${active.id===m.id ? m.clr+'40' : '#1a1a1a'}`, borderRadius:2, padding:'2px 6px', letterSpacing:'.5px', fontWeight:700 }}>
                    {m.classif}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,.04)', fontSize:9, color:'#2a3a48', letterSpacing:'.5px' }}>
            NOT FINANCIAL ADVICE · EDUCATIONAL ONLY
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ marginLeft:300, flex:1, minHeight:'100vh', position:'relative', zIndex:1 }}>

          {/* Scanline */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${active.clr}40,transparent)`, animation:'scan 6s linear infinite', pointerEvents:'none' }}/>

          {/* Module header */}
          <div style={{ padding:'40px 40px 32px', borderBottom:'1px solid rgba(255,255,255,.04)', background:'linear-gradient(180deg,rgba(0,0,0,.4),transparent)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:32, filter:`drop-shadow(0 0 12px ${active.clr})` }}>{active.icon}</span>
                  <div>
                    <div style={{ fontSize:9, color:'#4a6a78', letterSpacing:'3px', marginBottom:2 }}>{active.tag}</div>
                    <h1 style={{ fontSize:'clamp(24px,3.5vw,44px)', fontWeight:900, letterSpacing:'-1.5px', color:active.clr, textShadow:`0 0 40px ${active.glow}`, animation:'glitch 10s infinite' }}>
                      {active.name.toUpperCase()}
                    </h1>
                  </div>
                </div>
                <p style={{ fontSize:14, color:'#6a8a98', lineHeight:1.7, maxWidth:580 }}>{active.desc}</p>
              </div>
              <div style={{ fontSize:10, color:active.clr, background:`${active.clr}15`, border:`1px solid ${active.clr}30`, borderRadius:3, padding:'6px 16px', letterSpacing:'1px', fontWeight:700, flexShrink:0 }}>
                {active.classif} ▸ CLEARANCE REQUIRED
              </div>
            </div>
          </div>

          {/* Input + Run */}
          <div style={{ padding:'28px 40px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
            <div style={{ display:'flex', gap:12, maxWidth:600, '--active-clr': active.clr } as React.CSSProperties}>
              {active.needsInput && (
                <input className="inp" value={input} onChange={e => setInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && !loading && runIntel()}
                  placeholder={active.placeholder}
                  style={{ flex:1 }}/>
              )}
              {!active.needsInput && (
                <div style={{ flex:1, background:'#000', border:'1px solid #1a1a1a', borderRadius:4, padding:'14px 16px', fontSize:13, color:'#4a6a78' }}>
                  Auto-detects from live market data — no input needed
                </div>
              )}
              <button className="run-btn" onClick={runIntel} disabled={loading}
                style={{ background: loading ? '#0a0a0a' : `linear-gradient(135deg,${active.clr},${active.clr}cc)`, color: loading ? active.clr : '#000', boxShadow: loading ? 'none' : `0 0 30px ${active.glow}` }}>
                {loading ? 'SCANNING...' : `RUN ${active.code.split('-')[0]} →`}
              </button>
            </div>
          </div>

          {/* Content area */}
          <div style={{ padding:'32px 40px', minHeight:'60vh' }}>
            {!loading && !result && !error && (
              <div style={{ textAlign:'center', paddingTop:60 }}>
                <div style={{ fontSize:64, marginBottom:20, filter:`drop-shadow(0 0 20px ${active.clr})` }}>{active.icon}</div>
                <div style={{ fontSize:14, color:'#4a6a78', marginBottom:8 }}>{active.name} is ready.</div>
                <div style={{ fontSize:12, color:'#2a3a48' }}>
                  {active.needsInput ? `Enter a ticker or use the example: ${active.example}` : 'Hit RUN to generate live intelligence.'}
                </div>
              </div>
            )}

            {loading && <LoadingScreen mod={active}/>}

            {error && (
              <div style={{ background:'rgba(255,45,120,.08)', border:'1px solid rgba(255,45,120,.25)', borderRadius:4, padding:'16px', color:'#ff2d78', fontSize:13, fontFamily:'monospace' }}>
                [ERROR] {error}
              </div>
            )}

            {result && !loading && (
              <div ref={resultRef} style={{ animation:'fadeUp .5s ease' }}>
                {/* Result header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, padding:'12px 16px', background:'#000', border:`1px solid ${active.clr}25`, borderRadius:4 }}>
                  <span style={{ fontSize:16 }}>{active.icon}</span>
                  <span style={{ fontSize:11, fontFamily:'monospace', color:active.clr, fontWeight:700, letterSpacing:'1px' }}>[INTELLIGENCE REPORT] {active.code}</span>
                  <span style={{ fontSize:10, color:'#4a6a78', marginLeft:'auto' }}>Generated {new Date().toLocaleTimeString()}</span>
                </div>

                {active.id === 'lockup'      && <LockupResult      data={result} clr={active.clr}/>}
                {active.id === 'liedetector' && <LieDetectorResult data={result} clr={active.clr}/>}
                {active.id === 'galaxybrain' && <GalaxyBrainResult data={result} clr={active.clr}/>}
                {active.id === 'flow'        && <FlowResult        data={result} clr={active.clr}/>}
                {active.id === 'signals'     && <SignalRadarResult data={result} clr={active.clr}/>}
                {active.id === 'filing'      && <FilingXRayResult  data={result} clr={active.clr}/>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
