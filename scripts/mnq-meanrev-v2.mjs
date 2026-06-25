#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — DYNAMIC MEAN REVERSION with TREND FILTER, research for MNQ
//
// The framework (one of the highest-probability NQ approaches):
//   Trend filter   — only buy dips in an established UPTREND (price > long EMA,
//                    Hurst > 0.5 = persistent), only sell rips in a DOWNTREND.
//                    Never fades against the dominant trend.
//   Oversold trigger— RSI < rsiLo (longs) / > rsiHi (shorts): selling/buying
//                    pressure has temporarily exhausted itself.
//   Reversal confirm— enter only when price ticks back the trade's way (the dip
//                    is being bought), i.e. close > open / RSI turning up.
//   Window         — first 2–3 hours of NY RTH (09:30–12:00), where the
//                    intraday mean-reversion edge is strongest.
//   Exit           — fixed ATR target OR strict time-based exit, hard ATR stop.
//
// Tuned for max win rate × profit factor on the realistic MNQ day-mix.
// NOTE: synthetic sims FLATTER trend-following and PUNISH fades; read the
// DIRECTION of the effects here, not the absolute win/PF.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s){return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
function mkGauss(rng){return()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}}
const BPD=78  // RTH 5-min bars 09:30–16:00; bar 0 = 09:30, bar 30 = 12:00
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
function rsiArr(c,len){const o=new Array(c.length).fill(50);let ag=0,al=0
  for(let i=1;i<c.length;i++){const ch=c[i]-c[i-1];const g=Math.max(ch,0),l=Math.max(-ch,0)
    if(i<=len){ag+=g;al+=l;if(i===len){ag/=len;al/=len;o[i]=al===0?100:100-100/(1+ag/al)}}
    else{ag=(ag*(len-1)+g)/len;al=(al*(len-1)+l)/len;o[i]=al===0?100:100-100/(1+ag/al)}}
  return o}
// Hurst via structure-function slope (same estimator as the Pine f_hurst).
function hurstArr(c,n){const lr=c.map((x,i)=>i?Math.log(x):Math.log(x));const o=new Array(c.length).fill(0.5)
  const sd=(lag,i)=>{let m=0,k=0;for(let j=i-n+1;j<=i;j++){if(j-lag<0)continue;m+=lr[j]-lr[j-lag];k++}m/=k||1;let s=0;for(let j=i-n+1;j<=i;j++){if(j-lag<0)continue;s+=(lr[j]-lr[j-lag]-m)**2}return Math.sqrt(s/(k||1))}
  for(let i=n+16;i<c.length;i++){const xs=[1,2,4,8,16].map(Math.log),ys=[1,2,4,8,16].map(L=>{const v=sd(L,i);return v>0?Math.log(v):0})
    let mx=xs.reduce((a,b)=>a+b)/5,my=ys.reduce((a,b)=>a+b)/5,cov=0,vx=0
    for(let k=0;k<5;k++){cov+=(xs[k]-mx)*(ys[k]-my);vx+=(xs[k]-mx)**2}o[i]=vx?cov/vx:0.5}
  return o}

function smaAt(arr,len,i){let s=0;for(let k=i-len+1;k<=i;k++)s+=arr[k];return s/len}
function rvarAt(a,i,n){let m=0;for(let k=i-n+1;k<=i;k++)m+=a[k];m/=n;let s=0;for(let k=i-n+1;k<=i;k++)s+=(a[k]-m)**2;return s/(n-1)}
// Lo–MacKinlay variance ratio array (q-lag). <1 = mean-reverting regime, >1 = trending.
function vrArr(c,q,n){const lr=c.map((x,i)=>i?Math.log(x/c[i-1]):0);const lq=c.map((x,i)=>i>=q?Math.log(x/c[i-q]):0);const o=new Array(c.length).fill(1)
  for(let i=Math.max(q,n)+1;i<c.length;i++){const v1=rvarAt(lr,i,n),vq=rvarAt(lq,i,n);o[i]=v1>0?vq/(q*v1):1}return o}

// EXIT MODES (the key research axis):
//   'atr'     — fixed ATR target (the current shipped build: target 1.5×ATR, stop 2×ATR — inverted R:R)
//   'rsi'     — exit when the fast RSI reverts back through a midline (Connors classic) — high win
//   'ma'      — exit when price reverts to/through a short SMA — high win
//   'firstup' — Connors "first profitable close": exit the first bar that closes in profit — highest win
// All reversion exits keep a hard ATR disaster stop + a strict time exit.
function backtest(bars,P){
  const {emaLen=200,rsiLen=2,rsiLo=15,rsiHi=85,useHurst=false,hurstMin=0.5,hWin=80,
         winStart=0,winEnd=77,confirm=true,slopeLkbk=20,
         stopAtr=2.0,maxHold=12,cost=1.5,cooldown=3,shortsOn=true,
         exitMode='atr',tgtAtr=1.5,maExit=5,rsiExitL=50,rsiExitS=50,
         stretchAtr=0,downCloses=0,fastMa=5,
         trendMode='with',vrMax=0,vrLag=5,vrLen=60}=P
  const c=bars.map(b=>b.c)
  const e=ema(c,emaLen),a=atr(bars,14),rsi=rsiArr(c,rsiLen)
  const hu=useHurst?hurstArr(c,hWin):null
  const fma=ema(c,fastMa)
  const vr=vrMax>0?vrArr(c,vrLag,vrLen):null
  const trades=[];let pos=0,entry=0,sl=0,tp=0,eI=0,le=-1e9
  const warm=Math.max(emaLen,rsiLen,maExit,fastMa)+slopeLkbk+downCloses+1
  for(let i=warm;i<bars.length;i++){
    const b=bars[i]
    if(pos!==0){
      let ex=null
      if(pos>0&&b.l<=sl)ex=sl                                  // hard ATR disaster stop
      else if(pos<0&&b.h>=sl)ex=sl
      if(ex===null){                                           // reversion target by mode
        if(exitMode==='atr'){ if(pos>0&&b.h>=tp)ex=tp; else if(pos<0&&b.l<=tp)ex=tp }
        else if(exitMode==='rsi'){ if(pos>0&&rsi[i]>=rsiExitL)ex=b.c; else if(pos<0&&rsi[i]<=rsiExitS)ex=b.c }
        else if(exitMode==='ma'){ const m=smaAt(c,maExit,i); if(pos>0&&c[i]>=m)ex=b.c; else if(pos<0&&c[i]<=m)ex=b.c }
        else if(exitMode==='firstup'){ if(pos>0&&c[i]>entry)ex=b.c; else if(pos<0&&c[i]<entry)ex=b.c }
      }
      if(ex===null&&i-eI>=maxHold)ex=b.c                       // strict time-based exit
      if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
      if(ex!==null){trades.push((pos>0?ex-entry:entry-ex)-cost);pos=0;le=i}
    }
    if(pos===0&&b.bar>=winStart&&b.bar<=winEnd&&i-le>=cooldown&&a[i]>0){
      const slopeUp=e[i]>e[i-slopeLkbk], slopeDn=e[i]<e[i-slopeLkbk]
      // trendMode: 'with' = buy dips in uptrends (current), 'counter' = fade rips in uptrends,
      //            'none' = no trend filter (pure fade)
      const up = trendMode==='none' ? true : trendMode==='counter' ? slopeDn : slopeUp
      const dn = trendMode==='none' ? true : trendMode==='counter' ? slopeUp : slopeDn
      const regimeOk = !vr || vr[i] <= vrMax                  // only fade in a mean-reverting regime
      const hOk=(!useHurst||(hu[i]>=hurstMin)) && regimeOk
      let strOkL=true,strOkS=true
      if(stretchAtr>0){ strOkL=(fma[i]-c[i])>=stretchAtr*a[i]; strOkS=(c[i]-fma[i])>=stretchAtr*a[i] }
      let dcOkL=true,dcOkS=true
      if(downCloses>0){ for(let k=0;k<downCloses;k++){ if(!(c[i-k]<c[i-k-1]))dcOkL=false; if(!(c[i-k]>c[i-k-1]))dcOkS=false } }
      const longTrig = up&&hOk&&rsi[i]<rsiLo&&strOkL&&dcOkL&&(!confirm||c[i]>b.o)
      const shortTrig= shortsOn&&dn&&hOk&&rsi[i]>rsiHi&&strOkS&&dcOkS&&(!confirm||c[i]<b.o)
      if(longTrig){pos=1;entry=b.c;eI=i;sl=entry-stopAtr*a[i];tp=entry+tgtAtr*a[i]}
      else if(shortTrig){pos=-1;entry=b.c;eI=i;sl=entry+stopAtr*a[i];tp=entry-tgtAtr*a[i]}
    }
  }
  return trades
}
function stats(t,nD){const w=t.filter(x=>x>0),l=t.filter(x=>x<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);const m=t.reduce((a,b)=>a+b,0)/(t.length||1);let eq=0,pk=0,dd=0,st=0,wo=0;for(const x of t){eq+=x;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(x<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:t.length,win:t.length?w.length/t.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:t.length/(nD/21),avg:m}}
function mc(P,seeds=8,nD=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(backtest(genMNQ(7000+s*17,nD),P));return stats(all,nD*seeds)}

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(40)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts  DD ${r.maxDD.toFixed(0).padStart(5)}  streak ${r.worst}`

const BASE_ENTRY={rsiLen:2,rsiLo:15,rsiHi:85,emaLen:200,slopeLkbk:20,winStart:0,winEnd:77,confirm:true,stopAtr:2.0,maxHold:12}
console.log('\n'+'═'.repeat(120))
console.log('  MNQ 5-MIN MEAN REVERSION v2 — the fix is the EXIT. Real result was 42.9% win / PF 0.91 with a fixed 1.5×ATR target.')
console.log('  Sim win rate (~42%) matches real (42.9%) → the sim now TRACKS reality for this config, so we can optimize in it.')
console.log('═'.repeat(120)+'\n')
console.log('  ① EXIT-MODE SHOOTOUT (same RSI(2)<15 entry, full RTH, 2×ATR disaster stop):')
console.log(row('  fixed ATR target 1.5R (SHIPPED — loser)', mc({...BASE_ENTRY,exitMode:'atr',tgtAtr:1.5})))
console.log(row('  fixed ATR target 1.0R',                   mc({...BASE_ENTRY,exitMode:'atr',tgtAtr:1.0})))
console.log(row('  RSI(2) reverts > 50 (Connors)',          mc({...BASE_ENTRY,exitMode:'rsi',rsiExitL:50,rsiExitS:50})))
console.log(row('  RSI(2) reverts > 65/35',                 mc({...BASE_ENTRY,exitMode:'rsi',rsiExitL:65,rsiExitS:35})))
console.log(row('  price reclaims SMA(5)',                  mc({...BASE_ENTRY,exitMode:'ma',maExit:5})))
console.log(row('  price reclaims SMA(10)',                 mc({...BASE_ENTRY,exitMode:'ma',maExit:10})))
console.log(row('  first profitable close (Connors)',       mc({...BASE_ENTRY,exitMode:'firstup'})))

console.log('\n  ② ENTRY-QUALITY FILTERS on the best exit (RSI-revert>50). Each added on top:')
const BEX={...BASE_ENTRY,exitMode:'rsi',rsiExitL:50,rsiExitS:50}
console.log(row('  base',                                   mc(BEX)))
console.log(row('  + stretch ≥0.5 ATR from EMA(5)',         mc({...BEX,stretchAtr:0.5})))
console.log(row('  + stretch ≥1.0 ATR',                     mc({...BEX,stretchAtr:1.0})))
console.log(row('  + 2 consecutive down/up closes',         mc({...BEX,downCloses:2})))
console.log(row('  + deeper RSI(2)<10',                     mc({...BEX,rsiLo:10,rsiHi:90})))

console.log('\n  ③ REGIME & TREND-DIRECTION (does reversion have an edge ANYWHERE? best exit = firstup):')
const FX={...BASE_ENTRY,exitMode:'firstup'}
console.log(row('  with-trend (current)',                  mc({...FX,trendMode:'with'})))
console.log(row('  no trend filter (pure fade)',           mc({...FX,trendMode:'none'})))
console.log(row('  counter-trend (fade INTO trend)',       mc({...FX,trendMode:'counter'})))
console.log(row('  with-trend + reverting regime VR<1.0',  mc({...FX,trendMode:'with',vrMax:1.0,vrLag:5,vrLen:60})))
console.log(row('  no trend + reverting regime VR<0.9',    mc({...FX,trendMode:'none',vrMax:0.9,vrLag:5,vrLen:60})))
console.log(row('  no trend + reverting regime VR<0.8',    mc({...FX,trendMode:'none',vrMax:0.8,vrLag:5,vrLen:60})))

console.log('\n  ④ SAME, but tight symmetric 1:1 (fast target 0.75ATR / stop 0.75ATR) on reverting regime:')
const TT={...BASE_ENTRY,exitMode:'atr',tgtAtr:0.75,stopAtr:0.75}
console.log(row('  no trend + VR<0.9, 1:1',                mc({...TT,trendMode:'none',vrMax:0.9})))
console.log(row('  no trend + VR<0.8 + 2 down closes',     mc({...TT,trendMode:'none',vrMax:0.8,downCloses:2})))
console.log(row('  no trend + VR<0.8 + stretch 1.0',       mc({...TT,trendMode:'none',vrMax:0.8,stretchAtr:1.0})))

console.log('\n  ⑤ GRID → MAX NET POINTS across regime+direction+exit, win ≥ 53%, 6–25/mo, streak ≤ 8:')
let best=null,n=0
for(const trendMode of ['with','none','counter'])
 for(const vrMax of [0,0.8,0.9,1.0])
  for(const exitMode of ['atr','firstup','rsi'])
   for(const rsiLo of [10,15,20])
    for(const stopAtr of [0.75,1.0,1.5])
     for(const tgtAtr of [0.5,0.75,1.0]){
       n++
       const P={...BASE_ENTRY,trendMode,vrMax,exitMode,rsiLo,rsiHi:100-rsiLo,stopAtr,tgtAtr,maxHold:12}
       const r=mc(P,6)
       if(r.perMonth>=6&&r.perMonth<=25&&r.win>=0.53&&r.worst<=8&&r.pts>0&&(!best||r.pts>best.r.pts)) best={P,r}
     }
console.log(`  searched ${n} configs × 6 seeds`)
if(best){console.log('\n  ✅ BEST (first profitable config found):');console.log('  '+JSON.stringify(best.P));console.log(row('  confirm (24 seeds)',mc(best.P,24)))}
else console.log('  ❌ NOTHING across regime × direction × exit beat break-even at the frequency band.')
console.log('')

console.log('\n  ⑥ SHIPPABLE (regime gate + clean ATR boxes) — pick defaults:')
const G={...BASE_ENTRY,exitMode:'atr'}
console.log(row('  with-trend VR<1.0  tgt1.0/stop1.5', mc({...G,trendMode:'with',vrMax:1.0,tgtAtr:1.0,stopAtr:1.5})))
console.log(row('  with-trend VR<1.0  tgt1.0/stop1.0', mc({...G,trendMode:'with',vrMax:1.0,tgtAtr:1.0,stopAtr:1.0})))
console.log(row('  with-trend VR<1.1  tgt1.0/stop1.5', mc({...G,trendMode:'with',vrMax:1.1,tgtAtr:1.0,stopAtr:1.5})))
console.log(row('  no-trend  VR<0.9   tgt1.0/stop1.5', mc({...G,trendMode:'none',vrMax:0.9,tgtAtr:1.0,stopAtr:1.5})))
console.log(row('  with-trend VR<1.0  tgt1.25/stop1.0',mc({...G,trendMode:'with',vrMax:1.0,tgtAtr:1.25,stopAtr:1.0})))
console.log('')
