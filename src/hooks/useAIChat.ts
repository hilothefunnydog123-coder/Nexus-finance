'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface AiMsg {
  id: string
  username: string
  avatarColor: string
  content: string
  createdAt: Date
}

interface AiTrader {
  name: string
  color: string
  style: string
}

const AI_TRADERS: AiTrader[] = [
  { name: 'ScalpKing_NYC',  color: '#00d4aa', style: 'scalper'  },
  { name: 'MomoMike_ATL',   color: '#1e90ff', style: 'momentum' },
  { name: 'ThetaQueen',     color: '#a855f7', style: 'options'  },
  { name: 'QuantDave',      color: '#ffa502', style: 'quant'    },
  { name: 'ForexFred',      color: '#00d4aa', style: 'forex'    },
  { name: 'SwingKing_LA',   color: '#1e90ff', style: 'swing'    },
  { name: 'IronCondor99',   color: '#a855f7', style: 'options'  },
  { name: 'DeltaForce_CHI', color: '#ff4757', style: 'futures'  },
]

// Conversation threads per channel — each has a trigger message + optional replies
const THREADS: Record<string, Array<{
  trigger: { trader: string; msg: (p: Record<string, number>) => string }
  replies?: Array<{ trader: string; delay: number; msg: (p: Record<string, number>) => string }>
}>> = {
  general: [
    {
      trigger: { trader: 'MomoMike_ATL', msg: p => `market feels heavy today. VIX creeping up and $SPY can't hold ${(p.SPY || 512).toFixed(2)}. watching closely` },
      replies: [
        { trader: 'ThetaQueen', delay: 38, msg: () => 'vol is cheap relative to what could happen at FOMC. positioning for a move either way' },
        { trader: 'QuantDave', delay: 90, msg: p => `statistically when SPY closes below ${((p.SPY || 512) * 0.997).toFixed(2)} on elevated vol, next 3 days are red 68% of the time` },
      ],
    },
    {
      trigger: { trader: 'ForexFred', msg: () => 'DXY grinding higher is gonna weigh on everything. risk-off vibes all morning' },
      replies: [
        { trader: 'SwingKing_LA', delay: 55, msg: () => 'agreed. trimmed half my tech longs into this strength. rather be safe' },
      ],
    },
    {
      trigger: { trader: 'ScalpKing_NYC', msg: () => 'anyone else just sitting on hands rn? not worth trading this chop' },
      replies: [
        { trader: 'MomoMike_ATL', delay: 25, msg: () => 'same. waiting for a clean setup. patience is the trade rn' },
        { trader: 'DeltaForce_CHI', delay: 70, msg: () => 'been watching futures all morning and nothing clean. sometimes no trade is the best trade' },
      ],
    },
    {
      trigger: { trader: 'IronCondor99', msg: () => 'reminder that theta decays even when you\'re not watching the screen. trust your setups' },
      replies: [
        { trader: 'ThetaQueen', delay: 45, msg: () => 'living by this 😂 iron condors printing while the market chops. theta gang for a reason' },
      ],
    },
  ],
  stocks: [
    {
      trigger: { trader: 'MomoMike_ATL', msg: p => `$NVDA holding ${(p.NVDA || 875).toFixed(2)} well after the morning dip. think we see ${((p.NVDA || 875) * 1.018).toFixed(0)} before close if market cooperates` },
      replies: [
        { trader: 'ThetaQueen', delay: 42, msg: p => `IV on NVDA still juicy. selling the ${(Math.round((p.NVDA || 875) / 5) * 5)} strike calls against my long position for extra credit` },
        { trader: 'ScalpKing_NYC', delay: 85, msg: () => 'grabbed the breakout long. tight stop below VWAP. small size' },
      ],
    },
    {
      trigger: { trader: 'SwingKing_LA', msg: p => `$AAPL daily chart showing a textbook bull flag. entry area ${(p.AAPL || 189).toFixed(2)}-${((p.AAPL || 189) + 1.5).toFixed(2)}, target ${((p.AAPL || 189) * 1.04).toFixed(0)}` },
      replies: [
        { trader: 'QuantDave', delay: 60, msg: () => 'earnings in 3 weeks tho. flag could resolve either way. sizing down for me' },
        { trader: 'MomoMike_ATL', delay: 110, msg: () => 'i like it but gonna wait for confirmation above last weeks high first' },
      ],
    },
    {
      trigger: { trader: 'QuantDave', msg: p => `$TSLA short float at 3.8%. with ${(p.TSLA || 248).toFixed(2)} as support, any catalyst could cause a violent squeeze` },
      replies: [
        { trader: 'ScalpKing_NYC', delay: 35, msg: () => 'been watching TSLA all week. volume is sus. feels like someone knows something' },
        { trader: 'IronCondor99', delay: 80, msg: p => `got a strangle on TSLA centered at ${(p.TSLA || 248).toFixed(0)}. paying for itself already` },
      ],
    },
    {
      trigger: { trader: 'DeltaForce_CHI', msg: p => `$META breaking out. ${(p.META || 492).toFixed(2)} was the key level everyone was watching. next stop ${((p.META || 492) * 1.025).toFixed(0)} imo` },
      replies: [
        { trader: 'MomoMike_ATL', delay: 28, msg: () => 'in this one. added on the break. volume confirms it' },
      ],
    },
  ],
  forex: [
    {
      trigger: { trader: 'ForexFred', msg: p => `EUR/USD rejected hard at ${((p['EUR/USD'] || 1.0842) + 0.003).toFixed(4)}. third touch of that resistance. watching for continuation lower` },
      replies: [
        { trader: 'SwingKing_LA', delay: 48, msg: p => `DXY strengthening is the driver. if it breaks ${(p['EUR/USD'] || 1.0842).toFixed(4)} support we flush to ${((p['EUR/USD'] || 1.0842) - 0.008).toFixed(4)}` },
        { trader: 'QuantDave', delay: 95, msg: () => 'ECB officials speaking at 2pm. could move it significantly either way. checking my risk' },
      ],
    },
    {
      trigger: { trader: 'SwingKing_LA', msg: p => `GBP/USD 4h chart looking constructive. building a long position here at ${(p['GBP/USD'] || 1.2654).toFixed(4)}. SL below ${((p['GBP/USD'] || 1.2654) - 0.0030).toFixed(4)}` },
      replies: [
        { trader: 'ForexFred', delay: 55, msg: () => 'BOE tone was slightly hawkish yesterday. supports your thesis. watching it' },
      ],
    },
    {
      trigger: { trader: 'QuantDave', msg: p => `USD/JPY creeping toward ${((p['USD/JPY'] || 154.23) + 0.5).toFixed(2)}. BOJ intervention risk increasing above 155. being very careful up here` },
      replies: [
        { trader: 'ForexFred', delay: 40, msg: () => 'smart. BOJ surprised everyone last time. not worth the tail risk imo' },
        { trader: 'SwingKing_LA', delay: 85, msg: () => 'volatility in JPY pairs is crazy lately. definitely sizing down near these levels' },
      ],
    },
  ],
  futures: [
    {
      trigger: { trader: 'DeltaForce_CHI', msg: p => `ES failing at ${((p.ES || 5248) + 10).toFixed(0)} for the 3rd time this morning. watching for a short setup back to ${((p.ES || 5248) - 15).toFixed(0)} VPOC` },
      replies: [
        { trader: 'ScalpKing_NYC', delay: 32, msg: p => `tight range. 5 point stops. took a small short at ${((p.ES || 5248) + 8).toFixed(0)} with target ${((p.ES || 5248) - 12).toFixed(0)}` },
        { trader: 'MomoMike_ATL', delay: 75, msg: () => 'waiting for the 10:30 data before committing either way. cash volume been weak all morning' },
      ],
    },
    {
      trigger: { trader: 'ScalpKing_NYC', msg: p => `NQ volume picking up at ${(p.NQ || 18240).toFixed(0)}. buyers defending this level. watching for long entry` },
      replies: [
        { trader: 'DeltaForce_CHI', delay: 50, msg: () => 'VWAP reclaim was the signal I needed. in small long. will add if it holds' },
      ],
    },
    {
      trigger: { trader: 'QuantDave', msg: p => `Gold (GC) consolidating at ${(p.GC || 2389).toFixed(1)}. historically this pattern resolves with a $20-30 move. direction TBD` },
      replies: [
        { trader: 'ForexFred', delay: 65, msg: () => 'dollar strength is the key variable. if DXY rolls over, gold flies' },
        { trader: 'SwingKing_LA', delay: 110, msg: p => `got a long in GC from ${((p.GC || 2389) - 8).toFixed(1)}. stubbornly holding it. physical demand remains strong` },
      ],
    },
  ],
  crypto: [
    {
      trigger: { trader: 'MomoMike_ATL', msg: () => 'BTC forming a bull flag on 4h. if this resolves up it targets 10% higher. watching the consolidation closely' },
      replies: [
        { trader: 'ScalpKing_NYC', delay: 45, msg: () => 'on-chain data showing accumulation. whales been buying dips all week' },
        { trader: 'ThetaQueen', delay: 90, msg: () => 'BTC IV at 60% feels cheap if we get that move. looking at options plays' },
      ],
    },
  ],
  'trade-ideas': [
    {
      trigger: { trader: 'SwingKing_LA', msg: p => `📋 TRADE IDEA: $NVDA Long\nEntry: ${(p.NVDA || 875).toFixed(2)}\nSL: ${((p.NVDA || 875) * 0.985).toFixed(2)}\nTP1: ${((p.NVDA || 875) * 1.025).toFixed(2)}\nR:R: 1.7:1\nThesis: AI demand tailwind, breaking out of 5-day consolidation on elevated volume` },
      replies: [
        { trader: 'QuantDave', delay: 90, msg: () => 'solid setup. volume confirmation is key here. watching this one too' },
        { trader: 'ThetaQueen', delay: 150, msg: p => `instead of shares I\'m buying the ${(Math.round((p.NVDA || 875) / 5) * 5 + 10)} calls. defined risk, same upside exposure` },
      ],
    },
    {
      trigger: { trader: 'DeltaForce_CHI', msg: p => `📋 TRADE IDEA: ES Futures Short\nEntry: ${((p.ES || 5248) + 5).toFixed(0)}\nSL: ${((p.ES || 5248) + 15).toFixed(0)}\nTP: ${((p.ES || 5248) - 20).toFixed(0)}\nR:R: 2:1\nThesis: Triple resistance test, low volume push, fading the move` },
      replies: [
        { trader: 'ScalpKing_NYC', delay: 55, msg: () => 'taking this setup. small size to start, add on confirmation' },
      ],
    },
  ],
}

const SOLO_MESSAGES: Record<string, Array<(p: Record<string, number>) => string>> = {
  general: [
    () => 'discipline over everything. the market will be here tomorrow',
    () => 'nobody talks about the 50 trades that didn\'t work before the big winner',
    () => 'checking my risk before every trade. position sizing is 80% of this game',
    p => `market breadth improving. advance/decline ratio flipping positive. ${(p.SPY || 512).toFixed(2)} key level to watch`,
    () => 'reminder: paper trading is practicing. treat it like real money or it\'s useless',
    () => 'just finished reviewing my last 20 trades. biggest issue is holding losers too long. working on it',
  ],
  stocks: [
    p => `$SPY holding ${(p.SPY || 512).toFixed(2)}. bulls defending key support`,
    p => `$NVDA ${(p.NVDA || 875).toFixed(2)} — IV rank 85th percentile. vol selling opportunity?`,
    () => 'earnings season starting. being selective. only trading setups I\'ve backtested',
    p => `watching $MSFT ${(p.MSFT || 415).toFixed(2)} for a breakout. monthly chart looks strong`,
  ],
  forex: [
    () => 'London session volatility picking up. EUR pairs moving',
    p => `EUR/USD ${(p['EUR/USD'] || 1.0842).toFixed(4)} key level. watching for reaction`,
    () => 'NFP Friday is gonna be wild. sizing way down ahead of it',
    () => 'forex is 90% patience and 10% execution. learning that slowly',
  ],
  futures: [
    p => `ES ${(p.ES || 5248).toFixed(0)} — gap from yesterday at ${((p.ES || 5248) - 12).toFixed(0)}. gaps fill eventually`,
    () => 'globex session was quiet. watching the cash open for direction',
    p => `NQ ${(p.NQ || 18240).toFixed(0)} looking heavy. underperforming ES again`,
    () => 'futures margin requirements went up. good. keeps out the overleveraged crowd',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function useAIChat(
  channelName: string,
  prices: Record<string, number>,
  lastRealMessageAt: Date | null,
  onMessage: (msg: AiMsg) => void,
  enabled: boolean
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const replyTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const pricesRef = useRef(prices)
  pricesRef.current = prices

  const makeMsg = useCallback((trader: AiTrader, content: string): AiMsg => ({
    id: `ai_${Date.now()}_${Math.random()}`,
    username: trader.name,
    avatarColor: trader.color,
    content,
    createdAt: new Date(),
  }), [])

  const fireConversation = useCallback(() => {
    if (!enabled) return
    const threads = THREADS[channelName] || THREADS.general
    const soloMsgs = SOLO_MESSAGES[channelName] || SOLO_MESSAGES.general

    // 60% chance of a thread, 40% chance of a solo message
    if (Math.random() < 0.6 && threads.length) {
      const thread = pick(threads)
      const triggerTrader = AI_TRADERS.find(t => t.name === thread.trigger.trader) || AI_TRADERS[0]
      onMessage(makeMsg(triggerTrader, thread.trigger.msg(pricesRef.current)))

      thread.replies?.forEach(reply => {
        const replyTrader = AI_TRADERS.find(t => t.name === reply.trader) || pick(AI_TRADERS)
        const replyTimer = setTimeout(() => {
          replyTimersRef.current.delete(replyTimer)
          onMessage(makeMsg(replyTrader, reply.msg(pricesRef.current)))
        }, (reply.delay + rand(-10, 15)) * 1000)
        replyTimersRef.current.add(replyTimer)
      })
    } else if (soloMsgs.length) {
      const trader = pick(AI_TRADERS)
      const msgFn = pick(soloMsgs)
      onMessage(makeMsg(trader, msgFn(pricesRef.current)))
    }

    // Schedule next conversation: 3–9 minutes
    timerRef.current = setTimeout(fireConversation, rand(180, 540) * 1000)
  }, [channelName, enabled, makeMsg, onMessage])

  useEffect(() => {
    if (!enabled) return

    // Start first message after 30–90s of chat being quiet
    const quietThreshold = 2 * 60 * 1000
    const timeSinceLast = lastRealMessageAt ? Date.now() - lastRealMessageAt.getTime() : Infinity
    const initialDelay = timeSinceLast > quietThreshold ? rand(15, 45) * 1000 : rand(90, 180) * 1000

    timerRef.current = setTimeout(fireConversation, initialDelay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      replyTimersRef.current.forEach(t => clearTimeout(t))
      replyTimersRef.current.clear()
    }
  }, [channelName, enabled, fireConversation, lastRealMessageAt])
}
