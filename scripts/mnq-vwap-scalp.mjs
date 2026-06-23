#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — MNQ 5-min VWAP REVERSION SCALP research
//
// Goal: a HIGH-WIN-RATE 5-min engine (target ≥60% win, PF ≥1.7). Breakouts are
// low-win; the high-win edge intraday is mean reversion to VWAP — price stretches
// from session VWAP and snaps back many times a day. We fade the stretch with a
// QUICK partial target (bank the bounce) and a wider stop, only on ranging tape.
//
// Bands are in σ units of session VWAP (volume-weighted std-dev):
//   entry at |ext|≥entryB, take-profit when it recovers to |ext|≤tgtB, stop at stopB.
//   Closer target (bigger tgtB) ⇒ higher win rate. Ranging filter avoids trend days.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s){return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
function mkGauss(rng){return()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}}
const BPD = 78

// realistic MNQ-ish intraday simulator (trend / range / reversal days, U-vol, clustering, gaps)
function genMNQ(seed, nDays = 252) {
  const rng = mkRng(seed), g = mkGauss(rng); const bars = []
  let price = 18000, garch = 1.0; const baseSig = 9.0
  for (let d = 0; d < nDays; d++) {
    const u = rng()
    const type = u < 0.30 ? 'up' : u < 0.55 ? 'down' : u < 0.82 ? 'range' : 'reversal'
    garch = 0.85 * garch + 0.15 * (0.6 + 1.4 * rng()) + (rng() < 0.05 ? 1.2 : 0)
    const dayVol = baseSig * Math.sqrt(garch)
    price *= Math.exp((rng() - 0.5) * 0.004)
    const dayDrift = type === 'up' ? dayVol * 0.16 : type === 'down' ? -dayVol * 0.16 : 0
    let prevRet = 0, dayMean = price
    for (let b = 0; b < BPD; b++) {
      const ushape = 1.0 + 0.8 * (Math.exp(-b / 8) + Math.exp(-(BPD - b) / 8))
      let sig = dayVol * ushape * 0.5
      if (rng() < 0.03) sig *= 3
      let ret
      if (type === 'range') ret = -0.06 * (price - dayMean) + sig * g()
      else if (type === 'reversal') { const half = b < BPD / 2 ? 1 : -1; ret = half * dayVol * 0.15 + 0.25 * prevRet + sig * g() }
      else ret = dayDrift + 0.30 * prevRet + sig * g()
      prevRet = ret
      const o = price, c = price + ret
      const h = Math.max(o, c) + Math.abs(g()) * sig * 0.7
      const l = Math.min(o, c) - Math.abs(g()) * sig * 0.7
      const v = 1000 * ushape * (0.7 + 0.6 * rng())
      bars.push({ o, h, l, c, v, day: d, bar: b }); price = c; dayMean += (price - dayMean) * 0.02
    }
  }
  return bars
}
function ema(arr, len){const k=2/(len+1);const o=[];let e=arr[0];for(let i=0;i<arr.length;i++){e=i?arr[i]*k+e*(1-k):arr[i];o.push(e)}return o}
function atr(bars,len){const tr=bars.map((b,i)=>i?Math.max(b.h-b.l,Math.abs(b.h-bars[i-1].c),Math.abs(b.l-bars[i-1].c)):b.h-b.l);return ema(tr,len)}
function vwapBands(bars){const vwap=[],sd=[];let pv=0,v=0,pv2=0;for(let i=0;i<bars.length;i++){if(bars[i].bar===0){pv=0;v=0;pv2=0}const tp=(bars[i].h+bars[i].l+bars[i].c)/3;pv+=tp*bars[i].v;v+=bars[i].v;pv2+=tp*tp*bars[i].v;const vw=v?pv/v:tp;const va=v?Math.max(0,pv2/v-vw*vw):0;vwap.push(vw);sd.push(Math.sqrt(va))}return{vwap,sd}}

// VWAP reversion scalp: σ-band entry/target, HARD ATR stop (caps tail risk), ranging filter
function backtest(bars, P) {
  const { entryB = 2.0, tgtB = 1.0, stopAtr = 1.5, slopeFlat = 0.15, slopeBars = 12,
          startBar = 6, endBar = 66, cooldown = 3, cost = 1.5, needTick = true } = P
  const { vwap, sd } = vwapBands(bars)
  const a = atr(bars, 14)
  const trades = []
  let pos = 0, entryPx = 0, slPx = 0, lastExit = -1e9
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]
    const s = sd[i] > 0 ? sd[i] : 1e-9
    const ext = (b.c - vwap[i]) / s
    const vwSlope = i >= slopeBars ? Math.abs(vwap[i] - vwap[i - slopeBars]) / s : 0
    const ranging = vwSlope <= slopeFlat
    if (pos !== 0) {
      let exitPx = null
      if (pos > 0) {
        if (b.l <= slPx) exitPx = slPx                 // hard ATR stop (intrabar) — caps the loss
        else if (ext >= -tgtB) exitPx = b.c            // reverted toward VWAP → bank it
      } else {
        if (b.h >= slPx) exitPx = slPx
        else if (ext <= tgtB) exitPx = b.c
      }
      if (exitPx === null && b.bar >= BPD - 1) exitPx = b.c     // EOD flat
      if (exitPx !== null) { trades.push((pos > 0 ? exitPx - entryPx : entryPx - exitPx) - cost); pos = 0; lastExit = i }
    }
    if (pos === 0 && ranging && b.bar >= startBar && b.bar <= endBar && i - lastExit >= cooldown) {
      const tickUp = !needTick || b.c > b.o, tickDn = !needTick || b.c < b.o
      if (ext <= -entryB && tickUp) { pos = 1; entryPx = b.c; slPx = b.c - stopAtr * a[i] }
      else if (ext >= entryB && tickDn) { pos = -1; entryPx = b.c; slPx = b.c + stopAtr * a[i] }
    }
  }
  return trades
}
function stats(trades, nDays){const w=trades.filter(t=>t>0),l=trades.filter(t=>t<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);let eq=0,pk=0,dd=0,st=0,wo=0;for(const t of trades){eq+=t;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(t<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:trades.length,win:trades.length?w.length/trades.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:trades.length/(nDays/21)}}
function mc(P, seeds=10, nDays=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(backtest(genMNQ(4000+s*37,nDays),P));return stats(all,nDays*seeds)}

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(34)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts  DD ${r.maxDD.toFixed(0).padStart(5)}  streak ${r.worst}`

console.log('\n'+'═'.repeat(116))
console.log('  MNQ 5-MIN VWAP REVERSION SCALP — hunting ≥60% win / ≥1.7 PF')
console.log('═'.repeat(116)+'\n')
console.log(row('  baseline (e2.0 t1.0 s3.0 flat.15)', mc({})))

console.log('\n  Grid search → win ≥ 60% AND PF ≥ 1.7 (then max PF):')
let best=null,n=0,feasible=0
for(const entryB of [1.5,2.0,2.5])
 for(const tgtB of [0.5,1.0,1.25,1.5])
  for(const stopAtr of [0.75,1.0,1.5,2.0,2.5])
   for(const slopeFlat of [0.1,0.15,0.25,0.4])
    for(const cooldown of [2,4])
     for(const needTick of [true,false]){
       if(tgtB>=entryB) continue
       n++
       const P={entryB,tgtB,stopAtr,slopeFlat,cooldown,needTick}
       const r=mc(P,8)
       if(r.perMonth>=4 && r.win>=0.60 && r.pf>=1.7 && r.worst<=8){feasible++; if(!best||r.pf>best.r.pf) best={P,r}}
     }
console.log(`  searched ${n} configs × 8 seeds · feasible (win≥60% & PF≥1.7): ${feasible}`)
if(best){
  console.log('\n  ✅ WINNER:')
  console.log('  '+JSON.stringify(best.P))
  console.log(row('  confirm (20 seeds)', mc(best.P,20)))
} else {
  console.log('\n  ❌ none hit 60%/1.7 simultaneously. Best win-rate and best-PF feasible-ish:')
  // report best by win and best by pf among PF>1.3
  let bw=null,bp=null
  for(const entryB of [1.5,2.0,2.5])for(const tgtB of [0.5,1.0,1.5])for(const stopAtr of [0.75,1.0,1.5,2.0,2.5])for(const slopeFlat of [0.1,0.2,0.4])for(const needTick of [true,false]){
    if(tgtB>=entryB)continue; const P={entryB,tgtB,stopAtr,slopeFlat,cooldown:3,needTick}; const r=mc(P,8)
    if(r.perMonth>=4&&r.worst<=10){ if(r.pf>=1.3&&(!bw||r.win>bw.r.win))bw={P,r}; if(!bp||r.pf>bp.r.pf)bp={P,r} }
  }
  if(bw){console.log(row('  highest win (PF≥1.3)',bw.r));console.log('     '+JSON.stringify(bw.P))}
  if(bp){console.log(row('  highest PF',bp.r));console.log('     '+JSON.stringify(bp.P))}
}
console.log('')
