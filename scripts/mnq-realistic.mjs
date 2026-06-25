#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — REALISTIC MNQ 5-min simulator + exit optimizer.
//
// Two real calibration points now exist:
//   • Mean-reversion: sim 42% win ≈ real 42.9%  (sim was accurate)
//   • Momentum break: sim 72% win vs real 44%   (sim WILDLY overstated)
// The old generator's trend days were too clean — no false breakouts, no whipsaw.
// Here we add a mean-reversion "pullback" pressure + bigger wicks so breakouts
// FAIL realistically, calibrate until the SHIPPED config reproduces ~44% / PF~1.07,
// then optimize the EXIT (partial / trail / breakeven / target) on that honest tape.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s){return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
function mkGauss(rng){return()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}}
const BPD=78
// REALISM knobs: kRevert = pullback pressure toward a fast mean (fades breakouts),
//                wick    = wick size multiplier (fakes out the extension filter),
//                auto    = trend-day return autocorrelation (lower = weaker momentum).
function genMNQ(seed,nDays,R){
  const {kRevert=0.0,wick=0.7,auto=0.30}=R
  const rng=mkRng(seed),g=mkGauss(rng);const bars=[];let price=18000,garch=1.0;const baseSig=9.0
  for(let d=0;d<nDays;d++){
    const u=rng();const type=u<0.30?'up':u<0.55?'down':u<0.82?'range':'reversal'
    garch=0.85*garch+0.15*(0.6+1.4*rng())+(rng()<0.05?1.2:0);const dayVol=baseSig*Math.sqrt(garch)
    price*=Math.exp((rng()-0.5)*0.004)
    const dayDrift=type==='up'?dayVol*0.16:type==='down'?-dayVol*0.16:0
    let prevRet=0,dayMean=price,fastMean=price
    for(let b=0;b<BPD;b++){
      const ushape=1.0+0.8*(Math.exp(-b/8)+Math.exp(-(BPD-b)/8));let sig=dayVol*ushape*0.5;if(rng()<0.03)sig*=3
      let ret
      if(type==='range')ret=-0.06*(price-dayMean)+sig*g()
      else if(type==='reversal'){const half=b<BPD/2?1:-1;ret=half*dayVol*0.15+0.25*prevRet+sig*g()}
      else ret=dayDrift*(R.driftMult??1.0)+auto*prevRet+sig*g()
      // REALISM: pull price back toward the fast mean — this is what makes breakouts fail.
      ret-=kRevert*(price-fastMean)
      prevRet=ret;const o=price,c=price+ret
      const wlo=Math.abs(g())*sig*wick, whi=Math.abs(g())*sig*wick
      bars.push({o,c,h:Math.max(o,c)+whi,l:Math.min(o,c)-wlo,v:1000*ushape*(0.7+0.6*rng()),bar:b,day:d})
      price=c;dayMean+=(price-dayMean)*0.02;fastMean+=(price-fastMean)*0.18
    }
  }
  return bars
}
function ema(arr,len){const k=2/(len+1);const o=[];let e=arr[0];for(let i=0;i<arr.length;i++){e=i?arr[i]*k+e*(1-k):arr[i];o.push(e)}return o}
function atr(bars,len){const tr=bars.map((b,i)=>i?Math.max(b.h-b.l,Math.abs(b.h-bars[i-1].c),Math.abs(b.l-bars[i-1].c)):b.h-b.l);return ema(tr,len)}
function rvarAt(a,i,n){let m=0;for(let k=i-n+1;k<=i;k++)m+=a[k];m/=n;let s=0;for(let k=i-n+1;k<=i;k++)s+=(a[k]-m)**2;return s/(n-1)}
function vrArr(c,q,n){const lr=c.map((x,i)=>i?Math.log(x/c[i-1]):0);const lq=c.map((x,i)=>i>=q?Math.log(x/c[i-q]):0);const o=new Array(c.length).fill(1)
  for(let i=Math.max(q,n)+1;i<c.length;i++){const v1=rvarAt(lr,i,n),vq=rvarAt(lq,i,n);o[i]=v1>0?vq/(q*v1):1}return o}

// VR-gated breakout (the shipped engine) + tunable EXIT.
//   exit 'fixed'   : ATR stop + R target (+ optional BE).
//   exit 'partial' : scale partialFrac at r1·R, stop→BE, trail runner by trailAtr·ATR.
function backtest(D,P){
  const {vrTrend=1.3,dc=30,extReq=0.2,minStr=0.55,slAtr=2.0,tpR=2.0,
         useBE=false,beR=1.0,cost=1.5,cooldown=2,
         exit='fixed',partialFrac=0.5,r1=1.0,trailAtr=2.0}=P
  const {bars,c,e,a,vr}=D
  const trades=[];let pos=0,entry=0,sl=0,tp=0,eI=0,be=false,le=-1e9
  let tp1=0,partDone=false,partPnl=0,trailRef=0
  const warm=Math.max(200,60,dc)+6
  for(let i=warm;i<bars.length;i++){
    const b=bars[i]
    if(pos!==0){
      const Rd=slAtr*a[eI]
      let ex=null
      if(exit==='fixed'){
        if(pos>0){ if(useBE&&!be&&b.h>=entry+beR*Rd){be=true;sl=entry} if(b.l<=sl)ex=sl; else if(b.h>=tp)ex=tp }
        else { if(useBE&&!be&&b.l<=entry-beR*Rd){be=true;sl=entry} if(b.h>=sl)ex=sl; else if(b.l<=tp)ex=tp }
        if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
        if(ex!==null){trades.push((pos>0?ex-entry:entry-ex)-cost);pos=0;be=false;le=i}
      } else {
        if(pos>0){
          if(!partDone&&b.h>=tp1){partDone=true;partPnl=partialFrac*(tp1-entry);sl=entry;trailRef=b.h}
          if(partDone){trailRef=Math.max(trailRef,b.h);sl=Math.max(sl,trailRef-trailAtr*a[eI])}
          if(b.l<=sl)ex=sl
        }else{
          if(!partDone&&b.l<=tp1){partDone=true;partPnl=partialFrac*(entry-tp1);sl=entry;trailRef=b.l}
          if(partDone){trailRef=Math.min(trailRef,b.l);sl=Math.min(sl,trailRef+trailAtr*a[eI])}
          if(b.h>=sl)ex=sl
        }
        if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
        if(ex!==null){const run=(pos>0?ex-entry:entry-ex)*(1-partialFrac);trades.push(partPnl+run-cost);pos=0;partDone=false;partPnl=0;le=i}
      }
    }
    if(pos===0&&i-le>=cooldown&&a[i]>0){
      const trending=vr[i]>=vrTrend
      let hh=-Infinity,ll=Infinity
      for(let k=i-dc;k<i;k++){hh=Math.max(hh,bars[k].h);ll=Math.min(ll,bars[k].l)}
      const rg=Math.max(b.h-b.l,1e-9),cp=(b.c-b.l)/rg
      const upS=cp>=minStr,dnS=(1-cp)>=minStr
      const upE=c[i]>=hh+extReq*a[i],dnE=c[i]<=ll-extReq*a[i]
      let s=0
      if(trending&&c[i]>e[i]&&upE&&upS)s=1
      else if(trending&&c[i]<e[i]&&dnE&&dnS)s=-1
      if(s!==0){pos=s;entry=b.c;eI=i;be=false;partDone=false;partPnl=0
        sl=s>0?entry-slAtr*a[i]:entry+slAtr*a[i]
        tp=s>0?entry+tpR*slAtr*a[i]:entry-tpR*slAtr*a[i]
        tp1=s>0?entry+r1*slAtr*a[i]:entry-r1*slAtr*a[i]}
    }
  }
  return trades
}
function stats(t,nD){const w=t.filter(x=>x>0),l=t.filter(x=>x<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);const m=t.reduce((a,b)=>a+b,0)/(t.length||1);let eq=0,pk=0,dd=0,st=0,wo=0;for(const x of t){eq+=x;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(x<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:t.length,win:t.length?w.length/t.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:t.length/(nD/21),avgWin:w.length?gW/w.length:0,avgLoss:l.length?gL/l.length:0}}
const _c=new Map()
function derive(base,seed,nD,R){const key=base+':'+seed+':'+JSON.stringify(R);if(_c.has(key))return _c.get(key)
  const bars=genMNQ(base+seed*31,nD,R),c=bars.map(b=>b.c);const D={bars,c,e:ema(c,200),a:atr(bars,14),vr:vrArr(c,5,60)};_c.set(key,D);return D}
function run(P,seeds,base,R,nD=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(backtest(derive(base,s,nD,R),P));return stats(all,nD*seeds)}
const train=(P,R,seeds=10)=>run(P,seeds,7000,R)
const test =(P,R,seeds=20)=>run(P,seeds,90001,R)

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(32)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  W/L ${f2(r.avgWin).padStart(5)}/${f2(r.avgLoss).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts`

const SHIP={vrTrend:1.3,dc:30,extReq:0.2,minStr:0.55,slAtr:2.0,tpR:2.0,exit:'fixed'}
console.log('\n'+'═'.repeat(118))
console.log('  STEP 1 — CALIBRATE the sim: find realism so the SHIPPED config reproduces real ~44% win / PF ~1.07')
console.log('═'.repeat(118)+'\n')
// Negative autocorrelation = breakouts get faded after entry, but keep firing (high freq, low win).
for(const auto of [0.10,0.0,-0.10,-0.20,-0.30])
 for(const driftMult of [1.0,0.5]){
   const R={kRevert:0,wick:0.9,auto,driftMult}
   console.log(row(`  auto ${auto.toFixed(2)} drift× ${driftMult}`, train(SHIP,R,12)))
 }
console.log('\n  Target: win ≈ 44%, PF ≈ 1.07 at decent frequency (~18-24/mo sim). Pick the realism that matches.')
console.log('')
