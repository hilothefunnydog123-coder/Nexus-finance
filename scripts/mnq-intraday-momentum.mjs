#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — MARKET INTRADAY MOMENTUM research (Gao, Han, Li & Zhou, JFE 2018)
//
// The published edge: the FIRST half-hour return of the day positively predicts
// the LAST half-hour return on equity-index ETFs/futures (SPY/ES, QQQ/NQ). One
// trade per day: at the start of the last 30 min, go long if the first-30-min
// return (optionally combined with the most recent 30-min return) was positive,
// short if negative; exit at the close. Robust, low-parameter, once-daily.
//
// We test it on the realistic MNQ simulator: predictor variants, a strength
// threshold, and exit timing — reporting win rate, profit factor, trades/mo, and
// a daily Sharpe.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s){return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e6)/1e6}}
function mkGauss(rng){return()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}}
const BPD = 78  // RTH 5-min bars (09:30–16:00); bar 0 = 09:30

function genMNQ(seed, nDays=252){
  const rng=mkRng(seed),g=mkGauss(rng);const bars=[];let price=18000,garch=1.0;const baseSig=9.0
  for(let d=0;d<nDays;d++){
    const u=rng();const type=u<0.30?'up':u<0.55?'down':u<0.82?'range':'reversal'
    garch=0.85*garch+0.15*(0.6+1.4*rng())+(rng()<0.05?1.2:0);const dayVol=baseSig*Math.sqrt(garch)
    price*=Math.exp((rng()-0.5)*0.004)
    const dayDrift=type==='up'?dayVol*0.16:type==='down'?-dayVol*0.16:0
    let prevRet=0,dayMean=price
    const day=[]
    for(let b=0;b<BPD;b++){
      const ushape=1.0+0.8*(Math.exp(-b/8)+Math.exp(-(BPD-b)/8));let sig=dayVol*ushape*0.5;if(rng()<0.03)sig*=3
      let ret
      if(type==='range')ret=-0.06*(price-dayMean)+sig*g()
      else if(type==='reversal'){const half=b<BPD/2?1:-1;ret=half*dayVol*0.15+0.25*prevRet+sig*g()}
      else ret=dayDrift+0.30*prevRet+sig*g()
      prevRet=ret;const o=price,c=price+ret
      day.push({o,c,h:Math.max(o,c)+Math.abs(g())*sig*0.7,l:Math.min(o,c)-Math.abs(g())*sig*0.7,bar:b,day:d})
      price=c;dayMean+=(price-dayMean)*0.02
    }
    bars.push(day)
  }
  return bars
}

// Intraday-momentum daily trade. firstEnd = bars in the first window (6 = 30 min).
// entryBar = start of the trade window; exitBar = close. predictor = w1·r_first + w2·r_recent.
function backtest(days, P){
  const { firstEnd=6, entryBar=72, exitBar=77, w1=1.0, w2=0.0, thresh=0.0, cost=1.5, trendFilter=false } = P
  const trades=[]
  for(const day of days){
    if(day.length<=exitBar) continue
    const open0=day[0].o
    const rFirst=day[firstEnd-1].c/open0-1                    // first 30-min return
    const rRecent=day[entryBar-1].c/day[entryBar-7].c-1       // the 30 min just before entry
    const pred=w1*rFirst+w2*rRecent
    // optional day-trend agreement (price vs the day's running mean at entry)
    if(trendFilter){
      const midRet=day[entryBar-1].c/open0-1
      if(Math.sign(midRet)!==Math.sign(pred)) continue        // skip when day trend disagrees
    }
    if(Math.abs(pred)<thresh) continue
    const dir=pred>0?1:pred<0?-1:0
    if(dir===0) continue
    const entry=day[entryBar-1].c, exit=day[exitBar].c
    trades.push(dir*(exit-entry)-cost)
  }
  return trades
}
function stats(trades,nDays){const w=trades.filter(t=>t>0),l=trades.filter(t=>t<=0);const gW=w.reduce((a,b)=>a+b,0),gL=-l.reduce((a,b)=>a+b,0);const mean=trades.reduce((a,b)=>a+b,0)/(trades.length||1);const sd=Math.sqrt(trades.reduce((a,b)=>a+(b-mean)**2,0)/(trades.length||1));let eq=0,pk=0,dd=0,st=0,wo=0;for(const t of trades){eq+=t;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(t<=0){st++;wo=Math.max(wo,st)}else st=0}return{trades:trades.length,win:trades.length?w.length/trades.length:0,pf:gL>0?gW/gL:(gW>0?Infinity:0),pts:eq,maxDD:dd,worst:wo,perMonth:trades.length/(nDays/21),sharpe:sd>0?mean/sd*Math.sqrt(252):0,avgPts:mean}}
function mc(P,seeds=12,nDays=252){let all=[];for(let s=0;s<seeds;s++)all=all.concat(backtest(genMNQ(5000+s*23,nDays),P));return stats(all,nDays*seeds)}

const pct=x=>(x*100).toFixed(1)+'%',f2=x=>x.toFixed(2)
const row=(n,r)=>`  ${n.padEnd(40)} ${String(r.trades).padStart(5)}t  ${r.perMonth.toFixed(1).padStart(5)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  Sharpe ${f2(r.sharpe).padStart(5)}  ${r.pts.toFixed(0).padStart(7)}pts  streak ${r.worst}`

console.log('\n'+'═'.repeat(120))
console.log('  MARKET INTRADAY MOMENTUM on MNQ (Gao–Han–Li–Zhou 2018) — does the first 30-min predict the last 30-min?')
console.log('═'.repeat(120)+'\n')
console.log(row('  r_first only (classic)', mc({ w1:1, w2:0 })))
console.log(row('  r_first + r_recent', mc({ w1:1, w2:1 })))
console.log(row('  r_first + r_recent + trend filter', mc({ w1:1, w2:1, trendFilter:true })))
console.log(row('  + strength threshold (0.15%)', mc({ w1:1, w2:1, trendFilter:true, thresh:0.0015 })))

console.log('\n  Tune (predictor weights, threshold, entry time) → max profit factor with PF>1.2:')
let best=null,n=0
for(const w1 of [0.5,1.0,1.5])
 for(const w2 of [0.0,0.5,1.0,1.5])
  for(const entryBar of [66,72])     // 15:00 or 15:30 start of trade window
   for(const thresh of [0,0.001,0.002,0.003])
    for(const trendFilter of [true,false]){
      n++
      const P={w1,w2,entryBar,exitBar:77,thresh,trendFilter}
      const r=mc(P,10)
      if(r.trades>=120 && r.pf>1.2 && (!best||r.pf>best.r.pf)) best={P,r}
    }
console.log(`  searched ${n} configs × 10 seeds`)
if(best){ console.log('\n  ✅ BEST:'); console.log('  '+JSON.stringify(best.P)); console.log(row('  confirm (24 seeds)', mc(best.P,24))) }
else console.log('  nothing beat PF 1.2')
console.log('')
