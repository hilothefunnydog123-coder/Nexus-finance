#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Adaptive REGIME-SWITCHING research for MNQ
//
// The idea hedge funds use: don't apply one style to every market. Detect whether
// the tape is TRENDING or MEAN-REVERTING right now, then run the matching engine —
// momentum in trends, fade in ranges, stand down when it's ambiguous.
//
// Regime detector: Lo–MacKinlay variance ratio of log returns (+ optional Hurst).
//   VR > 1  ⇒ trending (positive autocorrelation)
//   VR < 1  ⇒ mean-reverting
// Momentum sub-model: pullback-to-fast-EMA in the 200-EMA trend direction.
// Reversion sub-model: fade a stretch from session VWAP back toward it.
// Tune for max profit factor on the realistic trend/range/reversal day mix.
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
function vwapArr(bars){const vw=[];let pv=0,v=0;for(let i=0;i<bars.length;i++){if(bars[i].bar===0){pv=0;v=0}const tp=(bars[i].h+bars[i].l+bars[i].c)/3;pv+=tp*bars[i].v;v+=bars[i].v;vw.push(v?pv/v:tp)}return vw}
function rvar(a,i,n){let m=0;for(let k=i-n+1;k<=i;k++)m+=a[k];m/=n;let s=0;for(let k=i-n+1;k<=i;k++)s+=(a[k]-m)**2;return s/(n-1)}

// regime-switching signal
function sigRegime(bars,P){
  const {fast=20,slow=50,reg=200,vrLag=5,vrLen=60,vrHi=1.1,vrLo=0.9,extAtr=1.5}=P
  const c=bars.map(b=>b.c)
  const eF=ema(c,fast),eS=ema(c,slow),eR=ema(c,reg),a=atr(bars,14),vw=vwapArr(bars)
  const lr=c.map((x,i)=>i?Math.log(x/c[i-1]):0)
  const lrq=c.map((x,i)=>i>=vrLag?Math.log(x/c[i-vrLag]):0)
  const sig=new Array(bars.length).fill(0)
  for(let i=Math.max(reg,vrLen)+vrLag+1;i<bars.length;i++){
    const v1=rvar(lr,i,vrLen), vq=rvar(lrq,i,vrLen)
    const vr=v1>0?vq/(vrLag*v1):1
    const trending=vr>=vrHi, reverting=vr<=vrLo
    // momentum sub-model (trend regime): pullback-and-resume through fast EMA in trend dir
    let s=0
    if(trending){
      const up=c[i]>eR[i]&&eF[i]>eS[i], dn=c[i]<eR[i]&&eF[i]<eS[i]
      if(up&&bars[i].l<=eF[i]&&c[i]>eF[i]&&c[i]>bars[i].o)s=1
      else if(dn&&bars[i].h>=eF[i]&&c[i]<eF[i]&&c[i]<bars[i].o)s=-1
    } else if(reverting){
      const ext=a[i]>0?(c[i]-vw[i])/a[i]:0
      if(ext<=-extAtr&&c[i]>bars[i].o)s=1
      else if(ext>=extAtr&&c[i]<bars[i].o)s=-1
    }
    sig[i]=s
  }
  return sig
}
function runExits(bars,sig,P){
  const {slAtr=1.5,tpR=1.5,beAtR=1.0,useBE=true,cost=1.5,cooldown=4}=P
  const a=atr(bars,14);const trades=[];let pos=0,entry=0,sl=0,tp=0,be=false,eI=0,le=-1e9
  for(let i=0;i<bars.length;i++){
    const b=bars[i]
    if(pos!==0){
      let ex=null
      if(pos>0){if(useBE&&!be&&b.h>=entry+beAtR*a[eI]){be=true;sl=entry}if(b.l<=sl)ex=sl;else if(b.h>=tp)ex=tp}
      else{if(useBE&&!be&&b.l<=entry-beAtR*a[eI]){be=true;sl=entry}if(b.h>=sl)ex=sl;else if(b.l<=tp)ex=tp}
      if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
      if(ex!==null){trades.push((pos>0?ex-entry:entry-ex)-cost);pos=0;be=false;le=i}
    }
    if(pos===0&&sig[i]!==0&&b.bar<BPD-3&&i-le>=cooldown){pos=sig[i];entry=b.c;eI=i;sl=pos>0?entry-slAtr*a[i]:entry+slAtr*a[i];tp=pos>0?entry+tpR*slAtr*a[i]:entry-tpR*slAtr*a[i];be=false}
  }
  return trades
}
function stats(t,nD){const w=t.filter(x=>x>0),l=t.filter(x=>x<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);const m=t.reduce((a,b)=>a+b,0)/(t.length||1);const sd=Math.sqrt(t.reduce((a,b)=>a+(b-m)**2,0)/(t.length||1));let eq=0,pk=0,dd=0,st=0,wo=0;for(const x of t){eq+=x;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(x<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:t.length,win:t.length?w.length/t.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:t.length/(nD/21),sharpe:sd>0?m/sd*Math.sqrt(252*2):0}}
function mc(P,seeds=8,nD=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(runExits(genMNQ(6000+s*19,nD),sigRegime(genMNQ(6000+s*19,nD),P),P));return stats(all,nD*seeds)}

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(36)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts  DD ${r.maxDD.toFixed(0).padStart(5)}  streak ${r.worst}`

console.log('\n'+'═'.repeat(116))
console.log('  ADAPTIVE REGIME-SWITCHING on MNQ — momentum in trends, fade in ranges, stand down when ambiguous')
console.log('═'.repeat(116)+'\n')
console.log(row('  baseline', mc({})))

console.log('\n  Grid search → max profit factor (PF), 6–25 trades/mo, win not awful:')
let best=null,n=0
for(const vrHi of [1.05,1.1,1.2])
 for(const vrLo of [0.8,0.9,0.95])
  for(const extAtr of [1.0,1.5,2.0])
   for(const slAtr of [1.0,1.5,2.0])
    for(const tpR of [1.0,1.5,2.0,2.5])
     for(const cooldown of [3,6]){
       n++
       const P={vrHi,vrLo,extAtr,slAtr,tpR,cooldown,useBE:true}
       const r=mc(P,6)
       if(r.perMonth>=6&&r.perMonth<=30&&r.pf>1.2&&r.worst<=9&&(!best||r.pf*Math.sqrt(r.trades)>best.score)) best={P,r,score:r.pf*Math.sqrt(r.trades)}
     }
console.log(`  searched ${n} configs × 6 seeds`)
if(best){console.log('\n  ✅ BEST:');console.log('  '+JSON.stringify(best.P));console.log(row('  confirm (20 seeds)',mc(best.P,20)))}
else console.log('  nothing beat PF 1.2 at the frequency band')
console.log('')
