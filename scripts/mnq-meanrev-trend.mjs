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

function backtest(bars,P){
  const {emaLen=200,rsiLen=14,rsiLo=25,rsiHi=75,useHurst=false,hurstMin=0.5,hWin=80,
         winStart=0,winEnd=30,confirm=true,
         stopAtr=1.5,tgtAtr=1.5,maxHold=12,cost=1.5,cooldown=3,shortsOn=true}=P
  const c=bars.map(b=>b.c)
  const e=ema(c,emaLen),a=atr(bars,14),rsi=rsiArr(c,rsiLen),hu=useHurst?hurstArr(c,hWin):null
  const trades=[];let pos=0,entry=0,sl=0,tp=0,eI=0,le=-1e9
  for(let i=Math.max(emaLen,rsiLen)+1;i<bars.length;i++){
    const b=bars[i]
    if(pos!==0){
      let ex=null
      if(pos>0){if(b.l<=sl)ex=sl;else if(b.h>=tp)ex=tp}
      else{if(b.h>=sl)ex=sl;else if(b.l<=tp)ex=tp}
      if(ex===null&&i-eI>=maxHold)ex=b.c                       // strict time-based exit
      if(ex===null&&(i+1>=bars.length||bars[i+1].day!==b.day))ex=b.c
      if(ex!==null){trades.push((pos>0?ex-entry:entry-ex)-cost);pos=0;le=i}
    }
    if(pos===0&&b.bar>=winStart&&b.bar<=winEnd&&i-le>=cooldown&&a[i]>0){
      const up=c[i]>e[i], dn=c[i]<e[i]
      const hOk=!useHurst||(hu[i]>=hurstMin)
      const longTrig = up&&hOk&&rsi[i]<rsiLo&&(!confirm||c[i]>b.o)
      const shortTrig= shortsOn&&dn&&hOk&&rsi[i]>rsiHi&&(!confirm||c[i]<b.o)
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

console.log('\n'+'═'.repeat(120))
console.log('  DYNAMIC MEAN REVERSION + TREND FILTER on MNQ — buy oversold dips in uptrends, fade rips in downtrends (RTH morning)')
console.log('═'.repeat(120)+'\n')
console.log(row('  RSI<30 dip, no trend filter, all day', mc({rsiLo:30,rsiHi:70,emaLen:1,winStart:0,winEnd:77})))
console.log(row('  + 200-EMA trend filter',               mc({rsiLo:30,rsiHi:70,emaLen:200,winStart:0,winEnd:77})))
console.log(row('  + RTH morning window only',            mc({rsiLo:30,rsiHi:70,emaLen:200,winStart:0,winEnd:30})))
console.log(row('  + stricter oversold (RSI<25/>75)',     mc({rsiLo:25,rsiHi:75,emaLen:200,winStart:0,winEnd:30})))
console.log(row('  + reversal confirm + Hurst>0.5',       mc({rsiLo:25,rsiHi:75,emaLen:200,winStart:0,winEnd:30,confirm:true,useHurst:true})))

console.log('\n  Grid → MAX WIN RATE, PF > 1.6, ≥4 trades/mo, streak ≤ 8:')
let bW=null,bP=null,n=0
for(const rsiLo of [20,25,30])
 for(const emaLen of [100,150,200])
  for(const stopAtr of [1.5,2.0,2.5])
   for(const tgtAtr of [1.0,1.5,2.0])
    for(const maxHold of [8,12,18])
     for(const winEnd of [24,30,42])
      for(const useHurst of [false,true]){
        n++
        const P={rsiLo,rsiHi:100-rsiLo,emaLen,stopAtr,tgtAtr,maxHold,winStart:0,winEnd,useHurst,confirm:true}
        const r=mc(P,6)
        if(r.perMonth>=4&&r.pf>1.6&&r.worst<=8){
          if(!bW||r.win>bW.r.win)bW={P,r}
          if(!bP||r.pf>bP.r.pf)bP={P,r}
        }
      }
console.log(`  searched ${n} configs × 6 seeds`)
if(bW){console.log('\n  ✅ HIGHEST WIN RATE:');console.log('  '+JSON.stringify(bW.P));console.log(row('  confirm (20 seeds)',mc(bW.P,20)))}
if(bP){console.log('\n  ✅ HIGHEST PROFIT FACTOR:');console.log('  '+JSON.stringify(bP.P));console.log(row('  confirm (20 seeds)',mc(bP.P,20)))}
if(!bW&&!bP)console.log('  nothing met the constraints')
console.log('')
