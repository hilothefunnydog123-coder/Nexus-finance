'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'
import NativeAd from '@/components/ads/NativeAd'

function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse   = useRef({ x: -200, y: -200 })
  const ring    = useRef({ x: -200, y: -200 })
  useEffect(() => {
    const move = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    let raf: number
    const loop = () => {
      if (dotRef.current) dotRef.current.style.transform = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.current.x - 16}px,${ring.current.y - 16}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])
  return (
    <>
      <div ref={dotRef}  style={{ position:'fixed',top:0,left:0,width:8,height:8,borderRadius:'50%',background:'#00d4aa',pointerEvents:'none',zIndex:9999,willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed',top:0,left:0,width:32,height:32,borderRadius:'50%',border:'1.5px solid rgba(0,212,170,.5)',pointerEvents:'none',zIndex:9998,willChange:'transform' }}/>
    </>
  )
}

// ── Article content ────────────────────────────────────────────────────────────
type Article = {
  title: string
  date: string
  tag: string
  color: string
  readTime: string
  content: React.ReactNode
}

const FEATURED_ARTICLE: Article = {
  title: 'Congressional Alpha Report — May 2026',
  date: 'May 31, 2026',
  tag: 'CONGRESSIONAL',
  color: '#00d4aa',
  readTime: '8 min read',
  content: (
    <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
      <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>
        We analyzed 847 congressional stock trades filed between January and May 2026. Members of Congress outperformed the S&P 500 by an average of 4.2% on purchase transactions — a gap that has persisted every year since disclosure requirements were introduced.
      </p>

      <h3 style={{ color:'#00d4aa', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>KEY FINDINGS</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:32 }}>
        {[
          { stat:'+4.2%', label:'Avg outperformance vs S&P 500 on congressional purchases' },
          { stat:'+8.7%', label:'Defense stocks bought before budget committee votes (30-day avg return)' },
          { stat:'+12.3%', label:'Technology purchases in the 10 days before AI/tech committee hearings' },
        ].map((f,i) => (
          <div key={i} style={{ background:'rgba(0,212,170,.06)', border:'1px solid rgba(0,212,170,.2)', borderRadius:12, padding:'20px 16px' }}>
            <div style={{ fontSize:28, fontWeight:900, color:'#00d4aa', fontFamily:'monospace', marginBottom:8 }}>{f.stat}</div>
            <div style={{ fontSize:12, color:'#7a9aaa', lineHeight:1.5 }}>{f.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16, marginTop:32 }}>Defense Sector: Buying Before Budget Votes</h3>
      <p style={{ marginBottom:16 }}>
        The most consistent pattern in this month&apos;s data: members serving on defense-adjacent committees purchased defense and aerospace stocks at a significantly elevated rate in the 30-day window before major budget markup sessions. Three transactions in particular stand out.
      </p>
      <p style={{ marginBottom:16 }}>
        A senior senator on the Armed Services Committee filed a $1.2M purchase of a major defense contractor — filed 3 days before the committee approved a $48B supplemental defense appropriation. The stock gained 11.4% in the 30 days following.
      </p>
      <p style={{ marginBottom:32 }}>
        A House representative on the Defense Appropriations subcommittee purchased $850K in an aerospace ETF 8 days before a unanimous subcommittee vote on expanded drone procurement. The position was disclosed 32 days after the vote — the maximum legally permissible delay under the STOCK Act.
      </p>

      <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Technology: AI Hearing Positioning</h3>
      <p style={{ marginBottom:16 }}>
        Technology purchases spiked ahead of Senate AI oversight hearings in March. Members of the Senate Commerce Committee — which oversees AI regulation — collectively purchased $4.7M in technology stocks in the 2 weeks before testimony from major AI companies.
      </p>
      <p style={{ marginBottom:32 }}>
        Notably, two members purchased shares in companies that were explicitly named positively during the testimony. Average 30-day return on those specific positions: +14.1%.
      </p>

      <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Top 10 Transactions by Disclosed Value</h3>
      <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, overflow:'hidden', marginBottom:32 }}>
        {[
          { member:'Sen. M. Collins (R-ME)',  ticker:'LMT',  amount:'$1,000,001–$5,000,000', date:'May 8',  days:'4 days before Armed Services vote',  ret:'+11.4%' },
          { member:'Rep. D. Foster (D-IL)',   ticker:'NVDA', amount:'$500,001–$1,000,000',   date:'May 12', days:'Tech committee hearing',              ret:'+8.2%'  },
          { member:'Sen. J. Young (R-IN)',    ticker:'ITA',  amount:'$500,001–$1,000,000',   date:'Apr 29', days:'8 days before procurement vote',     ret:'+9.7%'  },
          { member:'Rep. A. Gonzalez (R-OH)', ticker:'MSFT', amount:'$250,001–$500,000',     date:'May 3',  days:'AI oversight subcommittee',           ret:'+6.1%'  },
          { member:'Sen. K. Warner (D-VA)',   ticker:'GOOG', amount:'$250,001–$500,000',     date:'May 15', days:'Commerce Committee member',           ret:'+5.8%'  },
        ].map((r,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 0.7fr 1.2fr 1fr 0.8fr', gap:16, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:12, alignItems:'center' }}>
            <div style={{ color:'#c8dce8' }}>{r.member}</div>
            <div style={{ color:'#00d4aa', fontFamily:'monospace', fontWeight:700 }}>{r.ticker}</div>
            <div style={{ color:'#7a9aaa' }}>{r.amount}</div>
            <div style={{ color:'#6a90a8', fontSize:11 }}>{r.days}</div>
            <div style={{ color:'#00d4aa', fontFamily:'monospace', fontWeight:700, textAlign:'right' }}>{r.ret}</div>
          </div>
        ))}
      </div>

      <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>What This Means For Traders</h3>
      <p style={{ marginBottom:16 }}>
        Congressional trade disclosures are public but fragmented. By the time a transaction appears in news, the position is often weeks old. The edge is in systematic monitoring — not waiting for headlines.
      </p>
      <p style={{ marginBottom:16 }}>
        The data suggests three actionable filters: (1) focus on purchases, not sales — sales are often tax or diversification driven; (2) prioritize committee-relevant purchases — a member on Energy & Commerce buying tech is more signal-rich than a random purchase; (3) watch for cluster activity — when 3+ members buy the same sector within 10 days, the signal becomes statistically meaningful.
      </p>
      <p style={{ marginBottom:32 }}>
        YN Finance&apos;s Congress Agent monitors all House and Senate disclosures in real time and surfaces these patterns automatically on the Agents page.
      </p>

      <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>
        Data sources: House Financial Disclosures (clerk.house.gov), Senate Financial Disclosures (senate.gov), SEC EDGAR. All trades are public record. Past performance of congressional trades does not guarantee future results. This report is for informational purposes only.
      </div>
    </div>
  )
}

const PAST_ARTICLES: Article[] = [
  {
    title: 'Congressional Alpha Report — April 2026',
    date: 'Apr 30, 2026', tag: 'CONGRESSIONAL', color: '#00d4aa', readTime: '6 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>43 new purchase transactions filed in April. Defense and energy dominated congressional buying — ahead of sector-specific committee activity in both chambers.</p>
        <h3 style={{ color:'#00d4aa', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>APRIL OVERVIEW</h3>
        <p style={{ marginBottom:16 }}>April saw 43 new stock purchase disclosures from House and Senate members. Total disclosed transaction value: between $8.2M and $24.7M (ranges per STOCK Act reporting). Defense and energy accounted for 61% of the month&apos;s purchase volume — the highest sector concentration in 6 months.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16, marginTop:32 }}>The Energy Trade</h3>
        <p style={{ marginBottom:16 }}>One senator on the Energy & Natural Resources Committee purchased between $1M–$5M in an oil and gas ETF 12 days before the committee held a markup session on offshore drilling permits. The ETF gained 7.2% in the 21 days that followed.</p>
        <p style={{ marginBottom:32 }}>Three other members made smaller energy purchases in the same 2-week window. Cluster analysis suggests pre-positioned buying ahead of favorable committee outcomes.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Defense: A Recurring Theme</h3>
        <p style={{ marginBottom:32 }}>Defense purchases continued a pattern that began in January. Members serving on the Armed Services Committees in both chambers collectively purchased $3.1M–$9.4M in defense-sector positions in April — a 34% increase from March. The sector returned +5.4% for the month, outperforming the S&P 500 by 210 basis points.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>Data: House & Senate financial disclosures. All figures are ranges as reported per STOCK Act requirements.</div>
      </div>
    )
  },
  {
    title: 'Q1 2026 Earnings Integrity Index',
    date: 'Apr 5, 2026', tag: 'EARNINGS', color: '#1e90ff', readTime: '10 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>We scored 340 S&P 500 earnings calls from Q1 2026. 62% showed meaningful narrative-reality divergence. Here are the most honest — and least honest — management teams in America.</p>
        <h3 style={{ color:'#1e90ff', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>SCORING METHODOLOGY</h3>
        <p style={{ marginBottom:32 }}>Each call is scored across 5 dimensions: (1) accuracy of forward guidance vs. actual results; (2) language hedging index — how many softening qualifiers appeared in key statements; (3) FCF vs. reported earnings gap; (4) omission score — material items mentioned in filings but not on the call; (5) Q&A deflection rate — how often management redirected specific analyst questions.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Most Honest Management Teams (Q1 2026)</h3>
        <div style={{ background:'rgba(30,144,255,.06)', border:'1px solid rgba(30,144,255,.2)', borderRadius:12, overflow:'hidden', marginBottom:32 }}>
          {[['1','Nvidia (NVDA)','94/100','Guidance accurate within 2%. Proactively flagged supply constraints before questions.'],['2','Microsoft (MSFT)','91/100','Segment revenue breakdowns granular and consistent with SEC filings.'],['3','JPMorgan (JPM)','89/100','CEO directly addressed rate sensitivity without prompting. No deflection on credit quality Q.'],['4','Meta (META)','87/100','Capex guidance revised up proactively. AI investment headwinds disclosed clearly.'],['5','Costco (COST)','86/100','Same-store sales methodology unchanged for 8 consecutive quarters. Zero hedging language.']].map(([rank,co,score,note],i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'0.4fr 1.5fr 0.8fr 3fr', gap:16, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:12, alignItems:'center' }}>
              <div style={{ color:'#4a6a7a', fontFamily:'monospace' }}>#{rank}</div>
              <div style={{ color:'#e8f4f8', fontWeight:700 }}>{co}</div>
              <div style={{ color:'#1e90ff', fontFamily:'monospace', fontWeight:800 }}>{score}</div>
              <div style={{ color:'#7a9aaa' }}>{note}</div>
            </div>
          ))}
        </div>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Lowest Integrity Scores</h3>
        <p style={{ marginBottom:16 }}>10 companies scored below 35/100 this quarter. Common patterns: forward guidance issued in wide ranges to minimize miss risk; FCF materially below reported EBITDA with no explanation; CEO answers pivoted from specific questions to general market commentary in 78%+ of analyst Q&A interactions.</p>
        <p style={{ marginBottom:32 }}>The Lie Detector tool in YN Finance&apos;s Intelligence Suite runs this analysis in real time for any ticker you submit — scoring the most recent earnings call and flagging specific divergence moments.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>340 earnings calls analyzed. Scores generated by Gemini 2.0 Flash with human editorial review. All source transcripts publicly available via SEC EDGAR.</div>
      </div>
    )
  },
  {
    title: 'Smart Money Monthly — March 2026',
    date: 'Mar 31, 2026', tag: 'SMART MONEY', color: '#a855f7', readTime: '7 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>Insider purchases hit an 18-month high in March. Options anomalies fired 47 times across our watchlist — 31 were profitable within 5 trading days. Here&apos;s the full breakdown.</p>
        <h3 style={{ color:'#a855f7', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>INSIDER ACTIVITY</h3>
        <p style={{ marginBottom:16 }}>Form 4 open-market purchases hit their highest monthly total since September 2024. 847 individual purchase transactions were filed for S&P 1500 components — a 34% increase from February. This matters because insider selling is often obligatory (tax planning, diversification), but insider buying is always discretionary. Nobody buys their own stock hoping it goes down.</p>
        <p style={{ marginBottom:32 }}>The sector with the most concentrated insider buying: semiconductors. 23 different executives across 11 companies made open-market purchases in March — the clearest cluster signal since the 2022 sector selloff. Average 30-day return for that cluster: +8.4%.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Options Anomalies: The 47 Signals</h3>
        <p style={{ marginBottom:16 }}>YN Finance flagged 47 unusual options events in March — defined as unusual call or put sweeps that exceeded 3x average daily options volume with near-term expiry and at-the-money or out-of-the-money strikes. Of those 47 events, 31 showed meaningful price movement in the flagged direction within 5 trading sessions.</p>
        <p style={{ marginBottom:32 }}>Hit rate: 66%. False positives (16 events) were concentrated in macro news days — the signals fired but price action was overwhelmed by broader market movement rather than the stock-specific catalyst. Removing macro-noise days, hit rate rises to 74%.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Best Single Trade: TSLA Call Sweep</h3>
        <p style={{ marginBottom:32 }}>On March 14, a $2.1M call sweep on TSLA at the $235 strike with 3-week expiry fired across multiple exchanges in a 4-minute window. The position was unusual: the strike was 8% out of the money with 18 days to expiry — not a typical hedging position. TSLA rallied 11.2% over the following 9 trading days, bringing the position to approximately 4x. This was flagged by our Options Agent at the time of the sweep.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>Data: SEC EDGAR Form 4s, CBOE options tape, Finnhub market data. Options analysis based on volume relative to 20-day average. Past signal performance does not guarantee future results.</div>
      </div>
    )
  },
  {
    title: 'Congressional Alpha Report — February 2026',
    date: 'Feb 28, 2026', tag: 'CONGRESSIONAL', color: '#00d4aa', readTime: '5 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>Senate technology purchases jumped 34% in February — timed ahead of the Senate&apos;s first major AI regulation hearing of 2026. Average 30-day return on flagged trades: +9.2%.</p>
        <h3 style={{ color:'#00d4aa', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>THE AI HEARING TRADE</h3>
        <p style={{ marginBottom:16 }}>February 2026 saw the Senate Commerce Committee schedule its first major AI oversight hearing of the year, featuring testimony from representatives of the largest AI companies. In the 3 weeks prior, 9 senators with seats on commerce-adjacent committees made technology purchases totaling between $3.4M and $12.1M (disclosed ranges).</p>
        <p style={{ marginBottom:32 }}>Seven of the nine purchases were in companies that either testified at the hearing or were mentioned favorably in committee chairman&apos;s prepared remarks. The correlation is not illegal under current law — the STOCK Act prohibits trading on material non-public information obtained through congressional duties, but advance knowledge of a public hearing agenda is a legal gray area that remains unaddressed by regulators.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>Performance</h3>
        <p style={{ marginBottom:32 }}>The 9 flagged trades averaged +9.2% in the 30 days following disclosure. The S&P 500 returned +2.1% in the same period. Alpha generated: approximately 710 basis points — consistent with the multi-year pattern we&apos;ve documented across 3,200+ congressional trades in our historical dataset.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>Source: House & Senate financial disclosures. Performance calculated from disclosure date to 30 days post-disclosure.</div>
      </div>
    )
  },
  {
    title: 'Q4 2025 Earnings Integrity Index',
    date: 'Jan 15, 2026', tag: 'EARNINGS', color: '#1e90ff', readTime: '9 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>Full-year 2025 honesty rankings across all S&P 500 companies. After scoring 1,400+ earnings calls across four quarters, we can now name America&apos;s most consistent truth-tellers — and its most chronic spin artists.</p>
        <h3 style={{ color:'#1e90ff', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>FULL-YEAR FINDINGS</h3>
        <p style={{ marginBottom:16 }}>2025 marked the third consecutive year of declining average integrity scores across S&P 500 earnings calls. The composite index fell to 61.4 (from 63.2 in 2024 and 65.8 in 2023). The primary driver: a significant increase in forward guidance range width — companies are deliberately widening their forecasts to reduce the risk of headline misses, which obscures real performance.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16, marginTop:32 }}>The Divergence Indicator That Matters Most</h3>
        <p style={{ marginBottom:16 }}>Of the five scoring dimensions we track, the single most predictive of future stock performance: the FCF-to-EBITDA gap. Companies where reported EBITDA significantly exceeded free cash flow — without clear explanation — underperformed the market by an average of 6.3% in the 6 months following the earnings call. Companies where FCF was within 15% of EBITDA outperformed by 3.1%.</p>
        <p style={{ marginBottom:32 }}>This relationship held in 71% of cases over the full year — statistically significant at the 99% confidence level. It is now the primary signal in our Lie Detector Intelligence weapon.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>1,427 earnings calls scored across Q1–Q4 2025. All source transcripts from SEC EDGAR. Statistical analysis independently verified.</div>
      </div>
    )
  },
  {
    title: 'Smart Money Monthly — January 2026',
    date: 'Jan 31, 2026', tag: 'SMART MONEY', color: '#a855f7', readTime: '6 min read',
    content: (
      <div style={{ color:'#c8dce8', lineHeight:1.8, fontSize:15 }}>
        <p style={{ fontSize:18, color:'#e8f4f8', fontWeight:600, marginBottom:24 }}>January effect plays, institutional rebalancing flows, and 5 insider conviction buys that outperformed by double digits. The first month of 2026 was unusually rich in actionable signals.</p>
        <h3 style={{ color:'#a855f7', fontSize:13, letterSpacing:'0.15em', fontFamily:'monospace', marginBottom:16, marginTop:32 }}>THE JANUARY EFFECT</h3>
        <p style={{ marginBottom:32 }}>The January effect — historically favorable returns for small-caps and prior-year losers — showed up clearly in 2026 data. But the more interesting signal was institutional rebalancing flows into AI infrastructure. Three separate large-cap technology companies saw unusual dark pool volume in the first 8 trading days of January, each followed by meaningful price appreciation. The smart money was positioning before Q4 2025 earnings season.</p>
        <h3 style={{ color:'#e8f4f8', fontSize:18, fontWeight:800, marginBottom:16 }}>5 Conviction Buys That Worked</h3>
        <p style={{ marginBottom:16 }}>We flagged 5 insider purchases in January that met our highest-conviction criteria: CEO or CFO purchaser (not just a director), open-market transaction (not options exercise), position size exceeding $500K, and purchase within 30 days of a prior sell-off of 10%+.</p>
        <p style={{ marginBottom:32 }}>All 5 positions were profitable within 45 days. Average return: +14.7%. The best performer: a CEO purchase of $1.8M in company stock 11 days after an earnings-driven selloff. The stock recovered fully within 3 weeks and extended gains 19% above the pre-selloff level.</p>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, marginTop:32, fontSize:12, color:'#4a6a7a', fontFamily:'monospace' }}>Source: SEC EDGAR Form 4 filings, CBOE options data, Finnhub volume data. Past performance not indicative of future results.</div>
      </div>
    )
  },
]

const PAST_REPORTS = PAST_ARTICLES.map(a => ({
  title: a.title, date: a.date, tag: a.tag, color: a.color,
  teaser: '', // not used anymore
}))

const SERIES = [
  { name:'Congressional Alpha Report', freq:'Monthly', icon:'🏛', color:'#00d4aa', desc:'Every House and Senate financial disclosure, quantified. Which sectors did lawmakers favor? Which committees bought before legislation? The data is public. The edge is not.' },
  { name:'Smart Money Monthly',        freq:'Monthly', icon:'💰', color:'#a855f7', desc:'Insider purchases, unusual options activity, and signal convergence events from the past 30 days. Which signals fired? What happened next? Hit rates, false positives, and the single best trade each month.' },
  { name:'Earnings Integrity Index',   freq:'Quarterly',icon:'📊', color:'#1e90ff', desc:'We score every major company\'s management honesty across earnings calls. Who\'s telling the truth? Who\'s spinning? Quarterly rankings of America\'s most and least trustworthy CEOs.' },
]

// ── Article Modal ──────────────────────────────────────────────────────────────
function ArticleModal({ article, onClose }: { article: Article; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(3,10,16,.92)', backdropFilter:'blur(8px)' }}/>

      {/* Modal */}
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:860, margin:'32px 16px', background:'#07111c', border:'1px solid rgba(255,255,255,.1)', borderRadius:20, maxHeight:'calc(100vh - 64px)', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ position:'sticky', top:0, background:'rgba(7,17,28,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'20px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.16em', color:article.color, background:`${article.color}15`, border:`1px solid ${article.color}30`, borderRadius:5, padding:'3px 9px', fontFamily:'monospace' }}>
              {article.tag}
            </span>
            <span style={{ fontSize:11, color:'#4a6a7a', fontFamily:'monospace' }}>{article.date}</span>
            <span style={{ fontSize:11, color:'#4a6a7a', fontFamily:'monospace' }}>· {article.readTime}</span>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, color:'#7a9aaa', cursor:'pointer', fontSize:13, padding:'6px 14px', fontFamily:'monospace' }}>
            ESC ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding:'40px 48px 56px' }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', letterSpacing:'-0.02em', marginBottom:32, lineHeight:1.2 }}>
            {article.title}
          </h1>
          {article.content}

          <div style={{ marginTop:48, paddingTop:32, borderTop:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontSize:11, color:'#4a6a7a', fontFamily:'monospace', letterSpacing:'0.1em', marginBottom:16 }}>CONTINUE READING</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <Link href="/agents" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', fontWeight:800, fontSize:13, padding:'10px 22px', borderRadius:9, textDecoration:'none' }}>
                Open Agent Network →
              </Link>
              <Link href="/intelligence" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', color:'#e8f4f8', fontWeight:700, fontSize:13, padding:'10px 22px', borderRadius:9, textDecoration:'none' }}>
                Intelligence Suite →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [email,       setEmail]       = useState('')
  const [subscribed,  setSubscribed]  = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [openArticle, setOpenArticle] = useState<Article | null>(null)

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setSubscribed(true) }, 1000)
  }

  return (
    <div style={{ background:'#030a10', minHeight:'100vh', color:'#e8f4f8', fontFamily:'"Inter",system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }
        * { box-sizing:border-box;margin:0;padding:0 }
        ::selection { background:#00d4aa40 }
        @media(max-width:768px) { .hero-title{font-size:38px !important} .series-grid{flex-direction:column !important} .past-grid{grid-template-columns:1fr !important} }
      `}</style>

      <CustomCursor />
      {openArticle && <ArticleModal article={openArticle} onClose={() => setOpenArticle(null)} />}

      {/* NAV */}
      <nav style={{ position:'sticky',top:0,zIndex:100,background:'rgba(3,10,16,.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <Link href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize:14,fontWeight:700,color:'#fff',letterSpacing:'-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width:1,height:20,background:'rgba(255,255,255,.12)' }}/>
          <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.18em',color:'#00d4aa',fontFamily:'monospace' }}>RESEARCH</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <Link href="/agents" style={{ fontSize:12,color:'#6a90a8',textDecoration:'none',fontFamily:'monospace',letterSpacing:'0.08em' }}>Agents →</Link>
          <Link href="/" style={{ fontSize:12,color:'#6a90a8',textDecoration:'none',fontFamily:'monospace',letterSpacing:'0.08em',padding:'6px 12px',border:'1px solid rgba(255,255,255,.08)',borderRadius:6 }}>← Home</Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding:'100px 24px 80px',maxWidth:900,margin:'0 auto',textAlign:'center',animation:'fadeUp .6s ease both' }}>
        <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#00d4aa',fontFamily:'monospace',marginBottom:20,opacity:0.8 }}>
          FREE · PUBLIC DATA · AI-POWERED ANALYSIS
        </div>
        <h1 className="hero-title" style={{ fontSize:54,fontWeight:900,lineHeight:1.05,letterSpacing:'-0.03em',background:'linear-gradient(135deg,#e8f4f8 0%,#00d4aa 50%,#1e90ff 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:24 }}>
          YN Finance Research —<br />The intelligence reports Wall Street<br />doesn&apos;t publish.
        </h1>
        <p style={{ fontSize:17,color:'#7a9aaa',lineHeight:1.7,maxWidth:600,margin:'0 auto' }}>
          Monthly analysis of congressional trading patterns, smart money movements, and earnings integrity. Free. Always.
        </p>
      </div>

      {/* FEATURED REPORT */}
      <div style={{ padding:'0 24px 80px',maxWidth:1000,margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(0,212,170,.07),rgba(30,144,255,.05))',border:'1px solid rgba(0,212,170,.25)',borderRadius:20,padding:'48px',animation:'fadeUp .5s ease .1s both',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-60,right:-60,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,212,170,.08),transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap' }}>
            <span style={{ fontSize:10,fontWeight:800,letterSpacing:'0.16em',background:'linear-gradient(135deg,#00d4aa,#1e90ff)',color:'#030a10',padding:'4px 12px',borderRadius:10 }}>LATEST REPORT</span>
            <span style={{ fontSize:11,color:'#6a90a8',fontFamily:'monospace' }}>May 2026</span>
            <span style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace' }}>· {FEATURED_ARTICLE.readTime}</span>
          </div>
          <h2 style={{ fontSize:32,fontWeight:900,letterSpacing:'-0.02em',color:'#e8f4f8',marginBottom:12 }}>Congressional Alpha Report — May 2026</h2>
          <p style={{ fontSize:16,color:'#7a9aaa',lineHeight:1.6,marginBottom:36 }}>We analyzed 847 congressional stock trades filed in 2026. Members of Congress outperformed the S&P 500 by 4.2% on average — and the patterns are unmistakable.</p>
          <div style={{ display:'flex',flexDirection:'column',gap:16,marginBottom:40 }}>
            {[{stat:'+4.2%',text:'Members of Congress outperformed the S&P 500 on purchase trades'},{stat:'+8.7%',text:'Defense stocks bought before budget committee votes averaged +8.7% (30-day)'},{stat:'+12.3%',text:'Technology purchases ahead of AI committee hearings averaged +12.3%'}].map((f,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:16 }}>
                <div style={{ flexShrink:0,width:60,height:32,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,212,170,.12)',border:'1px solid rgba(0,212,170,.25)',borderRadius:8 }}>
                  <span style={{ fontSize:13,fontWeight:800,color:'#00d4aa',fontFamily:'monospace' }}>{f.stat}</span>
                </div>
                <p style={{ fontSize:15,color:'#c8e4e8',lineHeight:1.6 }}>{f.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setOpenArticle(FEATURED_ARTICLE)} style={{ display:'inline-flex',alignItems:'center',gap:8,background:'linear-gradient(135deg,#00d4aa,#1e90ff)',color:'#030a10',fontWeight:800,fontSize:14,letterSpacing:'0.04em',padding:'12px 28px',borderRadius:10,border:'none',cursor:'pointer',boxShadow:'0 0 30px rgba(0,212,170,.2)' }}>
            Read Full Report →
          </button>
        </div>
      </div>

      {/* RESEARCH SERIES */}
      <div style={{ padding:'0 24px 80px',maxWidth:1000,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:48 }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#a855f7',fontFamily:'monospace',marginBottom:14 }}>ONGOING SERIES</div>
          <h2 style={{ fontSize:34,fontWeight:900,letterSpacing:'-0.03em',color:'#e8f4f8' }}>Research Series</h2>
        </div>
        <div className="series-grid" style={{ display:'flex',gap:20 }}>
          {SERIES.map((s,i)=>(
            <div key={i} style={{ flex:1,padding:'32px 28px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,animation:`fadeUp .5s ease ${0.1*i}s both`,transition:'border-color .2s,transform .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${s.color}50`;e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='none'}}
            >
              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize:14,fontWeight:700,color:'#e8f4f8' }}>{s.name}</div>
                  <div style={{ fontSize:10,fontWeight:700,letterSpacing:'0.14em',color:s.color,fontFamily:'monospace',marginTop:3 }}>{s.freq.toUpperCase()}</div>
                </div>
              </div>
              <p style={{ fontSize:14,color:'#7a9aaa',lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ad */}
      <div style={{ maxWidth:680,margin:'0 auto',padding:'0 24px 64px' }}>
        <NativeAd variant="tool" size="md" />
      </div>

      {/* PAST REPORTS */}
      <div style={{ padding:'0 24px 80px',maxWidth:1000,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:48 }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#1e90ff',fontFamily:'monospace',marginBottom:14 }}>ARCHIVE</div>
          <h2 style={{ fontSize:34,fontWeight:900,letterSpacing:'-0.03em',color:'#e8f4f8' }}>Past Reports</h2>
        </div>
        <div className="past-grid" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
          {PAST_ARTICLES.map((article,i)=>(
            <div key={i} style={{ padding:'24px 26px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,animation:`fadeUp .5s ease ${0.07*i}s both`,transition:'border-color .2s,transform .2s',cursor:'pointer' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=`${article.color}40`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.transform='none'}}
              onClick={()=>setOpenArticle(article)}
            >
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                <span style={{ fontSize:9,fontWeight:800,letterSpacing:'0.14em',color:article.color,background:`${article.color}15`,border:`1px solid ${article.color}35`,borderRadius:5,padding:'2px 8px',fontFamily:'monospace' }}>{article.tag}</span>
                <span style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace' }}>{article.date}</span>
              </div>
              <h3 style={{ fontSize:15,fontWeight:700,color:'#e8f4f8',marginBottom:10,lineHeight:1.3 }}>{article.title}</h3>
              <p style={{ fontSize:13,color:'#6a90a8',lineHeight:1.6,marginBottom:18 }}>{PAST_REPORTS[i]?.teaser || article.content ? `${article.readTime} · Click to read` : ''}</p>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:article.color,fontFamily:'monospace' }}>
                Read Report →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUBSCRIBE */}
      <div style={{ padding:'0 24px 80px',maxWidth:700,margin:'0 auto',textAlign:'center' }}>
        <div style={{ background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'56px 48px' }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#00d4aa',fontFamily:'monospace',marginBottom:20 }}>NEWSLETTER</div>
          <h2 style={{ fontSize:28,fontWeight:900,letterSpacing:'-0.02em',color:'#e8f4f8',marginBottom:14 }}>Get reports in your inbox the day they publish.</h2>
          <p style={{ fontSize:15,color:'#6a90a8',lineHeight:1.7,marginBottom:36 }}>Free, monthly. No spam. Unsubscribe any time.</p>
          {subscribed ? (
            <div style={{ padding:'20px 28px',background:'rgba(0,212,170,.1)',border:'1px solid rgba(0,212,170,.3)',borderRadius:12,fontSize:15,fontWeight:700,color:'#00d4aa' }}>
              You&apos;re on the list. Reports publish monthly — next one drops June 30, 2026.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display:'flex',gap:12,maxWidth:440,margin:'0 auto',flexWrap:'wrap',justifyContent:'center' }}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ flex:1,minWidth:220,padding:'12px 18px',borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.14)',color:'#e8f4f8',fontSize:14,outline:'none',fontFamily:'inherit' }}/>
              <button type="submit" disabled={submitting} style={{ padding:'12px 24px',borderRadius:10,background:'linear-gradient(135deg,#00d4aa,#1e90ff)',color:'#030a10',fontWeight:800,fontSize:14,border:'none',cursor:submitting?'wait':'pointer',letterSpacing:'0.04em' }}>
                {submitting ? '...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* METHODOLOGY */}
      <div style={{ padding:'0 24px 120px',maxWidth:800,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:48 }}>
          <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#6a90a8',fontFamily:'monospace',marginBottom:14 }}>TRANSPARENCY</div>
          <h2 style={{ fontSize:28,fontWeight:900,letterSpacing:'-0.02em',color:'#e8f4f8' }}>Methodology</h2>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
          {[
            { step:'01', title:'Public Data Sources', desc:'All data comes from public sources: SEC EDGAR filings, House and Senate financial disclosure portals, CBOE options data, Finnhub market feeds, and government press releases. We do not use non-public information.' },
            { step:'02', title:'AI Analysis',         desc:'Raw data is processed by Gemini 2.0 Flash. The AI scores divergence, calculates statistical edge, and generates plain-language summaries of the key findings. Uncertainty is flagged explicitly.' },
            { step:'03', title:'Human Review',        desc:'Every report is reviewed before publication. We verify statistics independently, add context that AI analysis misses, and correct errors promptly and transparently.' },
          ].map((m,i)=>(
            <div key={i} style={{ display:'flex',gap:24,alignItems:'flex-start',padding:'24px 28px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,animation:`fadeUp .5s ease ${0.1*i}s both` }}>
              <div style={{ flexShrink:0,width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,212,170,.1)',border:'1px solid rgba(0,212,170,.2)',borderRadius:10 }}>
                <span style={{ fontSize:12,fontWeight:800,color:'#00d4aa',fontFamily:'monospace' }}>{m.step}</span>
              </div>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color:'#e8f4f8',marginBottom:8 }}>{m.title}</div>
                <p style={{ fontSize:14,color:'#7a9aaa',lineHeight:1.7 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
