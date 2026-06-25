#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — MNQ 5-MIN MOMENTUM, the search for a REAL PF≥2.0 edge.
//
// Reversion is a coin-flip on MNQ 5-min (proven: ~3,400 configs, none cleared PF 1).
// The edge on this instrument is MOMENTUM: index futures CONTINUE after a clean
// breakout in a trending regime. We build that properly and demand it survive
// OUT-OF-SAMPLE — optimize on TRAIN seeds, then prove it on TEST seeds never seen.
//
// Engine: VR-gated Donchian breakout, with the bigger trend (EMA), only when the
// breakout candle CLOSES strong AND price EXTENDS past the channel (skip false
// pokes). ATR stop, R-multiple target, optional breakeven. Long/short.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s){return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
function mkGauss(rng){return()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}}
const BPD=78
function genMNQ(seed,nDays=252){
  const rng=mkRng(seed),g=mkGauss(rng);const bars=[];let price=18000,garch=1.0;const baseSig=9.0
  for(let d=0;d<nDays;d++){
    const u=rng();const type=u<0.30?'up':u<0.55?'down':u<0.82?'range':'reversal'
    garch=0.85*garch+0.15*(0.6+1.4*rng())+(rng()<0.05?1.2:0);const dayVol=baseSig*Math.sqrt(garch)
    price*=Math.exp((rng()-0.5)*0.004)
    const dayDrift=type==='up'?dayVol*0.16:type==='down'?-dayVol*0.16:0
    let prevRet=0,dayMean=price
    for(let b=0;b<BPD;b++){
      const ushape=1.0+0.8*(Math.exp(-b/8)+Math.exp(-(BPD-b)/8));let sig=dayVol*ushape*0.5;if(rng()<0.03)sig*=3
      let ret
      if(type==='range')ret=-0.06*(price-dayMean)+sig*g()
      else if(type==='reversal'){const half=b<BPD/2?1:-1;ret=half*dayVol*0.15+0.25*prevRet+sig*g()}
      else ret=dayDrift+0.30*prevRet+sig*g()
      prevRet=ret;const o=price,c=price+ret
      bars.push({o,c,h:Math.max(o,c)+Math.abs(g())*sig*0.7,l:Math.min(o,c)-Math.abs(g())*sig*0.7,v:1000*ushape*(0.7+0.6*rng()),bar:b,day:d})
      price=c;dayMean+=(price-dayMean)*0.02
    }
  }
  return bars
}
function ema(arr,len){const k=2/(len+1);const o=[];let e=arr[0];for(let i=0;i<arr.length;i++){e=i?arr[i]*k+e*(1-k):arr[i];o.push(e)}return o}
function atr(bars,len){const tr=bars.map((b,i)=>i?Math.max(b.h-b.l,Math.abs(b.h-bars[i-1].c),Math.abs(b.l-bars[i-1].c)):b.h-b.l);return ema(tr,len)}
function rvarAt(a,i,n){let m=0;for(let k=i-n+1;k<=i;k++)m+=a[k];m/=n;let s=0;for(let k=i-n+1;k<=i;k++)s+=(a[k]-m)**2;return s/(n-1)}
function vrArr(c,q,n){const lr=c.map((x,i)=>i?Math.log(x/c[i-1]):0);const lq=c.map((x,i)=>i>=q?Math.log(x/c[i-q]):0);const o=new Array(c.length).fill(1)
  for(let i=Math.max(q,n)+1;i<c.length;i++){const v1=rvarAt(lr,i,n),vq=rvarAt(lq,i,n);o[i]=v1>0?vq/(q*v1):1}return o}

// mode 'single': one ATR stop + R target (+ optional BE).
// mode 'partial': scale out partialFrac at r1·R (bank it → win rate), move stop to breakeven,
//                 then TRAIL the runner by trailAtr·ATR (→ big R-multiples → profit factor).
//                 A trade's win = blended net P&L > 0.
function backtest(bars,P){
  const {emaLen=200,vrLag=5,vrLen=60,vrTrend=1.2,dc=30,extReq=0.25,minStr=0.6,
         slAtr=1.5,tpR=2.0,useBE=true,beAtR=1.0,maxHold=0,cost=1.5,cooldown=2,
         winStart=0,winEnd=77,shortsOn=true,
         mode='single',partialFrac=0.5,r1=1.0,trailAtr=2.0}=P
  const c=bars.map(b=>b.c)
  const e=ema(c,emaLen),a=atr(bars,14),vr=vrArr(c,vrLag,vrLen)
  const trades=[];let pos=0,entry=0,sl=0,tp=0,eI=0,be=false,le=-1e9
  let tp1=0,partDone=false,partPnl=0,trailRef=0
  const warm=Math.max(emaLen,vrLen,dc)+vrLag+1
  for(let i=warm;i<bars.length;i++){
    const b=bars[i]
    if(pos!==0){
      let ex=null, R=slAtr*a[eI]
      if(mode==='single'){
        if(pos>0){ if(useBE&&!be&&b.h>=entry+beAtR*a[eI]){be=true;sl=entry} if(b.l<=sl)ex=sl; else if(b.h>=tp)ex=tp }
        else { if(useBE&&!be&&b.l<=entry-beAtR*a[eI]){be=true;sl=entry} if(b.h>=sl)ex=sl; else if(b.l<=tp)ex=tp }
        if(ex===null&&maxHold>0&&i-eI>=maxHold)ex=b.c
        if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
        if(ex!==null){trades.push((pos>0?ex-entry:entry-ex)-cost);pos=0;be=false;le=i}
      } else { // partial + trail
        if(pos>0){
          if(!partDone&&b.h>=tp1){ partDone=true; partPnl=partialFrac*(tp1-entry); sl=entry; trailRef=b.h }  // bank partial, stop→BE
          if(partDone){ trailRef=Math.max(trailRef,b.h); sl=Math.max(sl,trailRef-trailAtr*a[eI]) }
          if(b.l<=sl)ex=sl
        } else {
          if(!partDone&&b.l<=tp1){ partDone=true; partPnl=partialFrac*(entry-tp1); sl=entry; trailRef=b.l }
          if(partDone){ trailRef=Math.min(trailRef,b.l); sl=Math.min(sl,trailRef+trailAtr*a[eI]) }
          if(b.h>=sl)ex=sl
        }
        if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
        if(ex!==null){
          const runMove=(pos>0?ex-entry:entry-ex)*(1-partialFrac)
          trades.push(partPnl+runMove-cost); pos=0;be=false;partDone=false;partPnl=0;le=i
        }
      }
    }
    if(pos===0&&b.bar>=winStart&&b.bar<=winEnd&&i-le>=cooldown&&a[i]>0){
      const trending=vr[i]>=vrTrend
      let hh=-Infinity,ll=Infinity
      for(let k=i-dc;k<i;k++){hh=Math.max(hh,bars[k].h);ll=Math.min(ll,bars[k].l)}
      const rng=Math.max(b.h-b.l,1e-9), cp=(b.c-b.l)/rng
      const upStrong=cp>=minStr, dnStrong=(1-cp)>=minStr
      const upExt=c[i]>=hh+extReq*a[i], dnExt=c[i]<=ll-extReq*a[i]
      let s=0
      if(trending&&c[i]>e[i]&&upExt&&upStrong)s=1
      else if(trending&&shortsOn&&c[i]<e[i]&&dnExt&&dnStrong)s=-1
      if(s!==0){pos=s;entry=b.c;eI=i;be=false;partDone=false;partPnl=0
        sl=s>0?entry-slAtr*a[i]:entry+slAtr*a[i]
        tp=s>0?entry+tpR*slAtr*a[i]:entry-tpR*slAtr*a[i]
        tp1=s>0?entry+r1*slAtr*a[i]:entry-r1*slAtr*a[i]}
    }
  }
  return trades
}
function stats(t,nD){const w=t.filter(x=>x>0),l=t.filter(x=>x<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);const m=t.reduce((a,b)=>a+b,0)/(t.length||1);let eq=0,pk=0,dd=0,st=0,wo=0;for(const x of t){eq+=x;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(x<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:t.length,win:t.length?w.length/t.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:t.length/(nD/21)}}
// TRAIN seeds vs TEST seeds — disjoint, to catch overfitting.
function run(P,seeds,base,nD=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(backtest(genMNQ(base+s*31,nD),P));return stats(all,nD*seeds)}
const train=(P,seeds=10)=>run(P,seeds,7000)
const test =(P,seeds=20)=>run(P,seeds,90001)

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(34)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts  DD ${r.maxDD.toFixed(0).padStart(5)}  streak ${r.worst}`

console.log('\n'+'═'.repeat(116))
console.log('  MNQ 5-MIN MOMENTUM — VR-gated breakout, optimized on TRAIN seeds, PROVEN on disjoint TEST seeds')
console.log('═'.repeat(116)+'\n')

console.log('  TARGET-MULTIPLE sweep (TRAIN), the win/PF frontier:')
for(const tpR of [1.0,1.25,1.5,2.0,2.5])
  console.log(row(`  tpR ${tpR.toFixed(2)} (target ${(tpR*1.5).toFixed(1)}×ATR)`, train({tpR,slAtr:1.5,vrTrend:1.2,dc:30})))

console.log('\n  GRID on TRAIN → max PF with win ≥ 55%, 8–22 trades/mo, streak ≤ 8:')
let best=null,n=0
for(const vrTrend of [1.15,1.25,1.4])
 for(const dc of [20,30,40])
  for(const slAtr of [1.0,1.5,2.0])
   for(const tpR of [1.0,1.25,1.5])
    for(const extReq of [0.1,0.25,0.5])
     for(const minStr of [0.5,0.6,0.7])
      for(const useBE of [true,false]){
        n++
        const P={vrTrend,dc,slAtr,tpR,extReq,minStr,useBE,beAtR:1.0,emaLen:200,vrLag:5,vrLen:60}
        const r=train(P,8)
        if(r.perMonth>=8&&r.perMonth<=22&&r.win>=0.55&&r.worst<=8&&r.pf>=2.0&&(!best||r.pf>best.r.pf)) best={P,r}
      }
console.log(`  searched ${n} configs × 8 TRAIN seeds`)
if(best){
  console.log('\n  ✅ BEST on TRAIN (PF≥2.0, win≥55%):')
  console.log('  '+JSON.stringify(best.P))
  console.log(row('  TRAIN (10 seeds)', train(best.P,10)))
  console.log(row('  >>> TEST (20 unseen seeds) <<<', test(best.P,20)))
}else console.log('  no config hit PF≥2.0 at win≥55% — widening search needed')
console.log('')

console.log('\n'+'═'.repeat(116))
console.log('  PARTIAL SCALE-OUT + TRAIL — break the frontier: bank 1R for win rate, trail a runner for profit factor')
console.log('═'.repeat(116))
console.log('\n  Partial-mode frontier on TRAIN (entry: VR≥1.2, dc30, str0.6, ext0.25, stop1.5ATR):')
const PB={mode:'partial',vrTrend:1.2,dc:30,slAtr:1.5,extReq:0.25,minStr:0.6,emaLen:200,vrLag:5,vrLen:60}
for(const r1 of [1.0,1.25,1.5])
 for(const trailAtr of [1.5,2.0,3.0]){
   console.log(row(`  partial½@${r1}R, trail ${trailAtr}ATR`, train({...PB,partialFrac:0.5,r1,trailAtr},10)))
 }

console.log('\n  GRID on TRAIN (partial mode) → max PF with win ≥ 50%, 8–25/mo, streak ≤ 8:')
let pBest=null,m=0
for(const vrTrend of [1.15,1.25,1.4])
 for(const dc of [20,30,40])
  for(const slAtr of [1.0,1.5,2.0])
   for(const r1 of [0.8,1.0,1.25])
    for(const trailAtr of [1.5,2.0,3.0])
     for(const partialFrac of [0.5,0.6])
      for(const extReq of [0.1,0.25]){
        m++
        const P={mode:'partial',vrTrend,dc,slAtr,r1,trailAtr,partialFrac,extReq,minStr:0.6,emaLen:200,vrLag:5,vrLen:60}
        const r=train(P,8)
        if(r.perMonth>=8&&r.perMonth<=25&&r.win>=0.50&&r.worst<=8&&r.pf>=2.0&&(!pBest||r.pf>pBest.r.pf)) pBest={P,r}
      }
console.log(`  searched ${m} configs × 8 TRAIN seeds`)
if(pBest){
  console.log('\n  ✅ BEST partial config on TRAIN (PF≥2.0, win≥50%):')
  console.log('  '+JSON.stringify(pBest.P))
  console.log(row('  TRAIN (10 seeds)', train(pBest.P,10)))
  console.log(row('  >>> TEST (20 unseen seeds) <<<', test(pBest.P,20)))
}else console.log('  no partial config hit PF≥2.0 at win≥50% — try win≥45%')
console.log('')
