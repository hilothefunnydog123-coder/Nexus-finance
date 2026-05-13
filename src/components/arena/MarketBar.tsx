'use client'

import { useState, useEffect, useRef } from 'react'

const INSTRUMENTS = [
  { symbol: 'SPY',     name: 'S&P 500',     base: 512.80,  type: 'stock',   digits: 2 },
  { symbol: 'QQQ',     name: 'NASDAQ',      base: 438.60,  type: 'stock',   digits: 2 },
  { symbol: 'DIA',     name: 'Dow Jones',   base: 394.20,  type: 'stock',   digits: 2 },
  { symbol: 'BTC',     name: 'Bitcoin',     base: 67240,   type: 'crypto',  digits: 0 },
  { symbol: 'ETH',     name: 'Ethereum',    base: 3180,    type: 'crypto',  digits: 2 },
  { symbol: 'EUR/USD', name: 'Euro',        base: 1.0842,  type: 'forex',   digits: 4 },
  { symbol: 'GBP/USD', name: 'Pound',       base: 1.2654,  type: 'forex',   digits: 4 },
  { symbol: 'ES',      name: 'S&P Futures', base: 5248,    type: 'futures', digits: 0 },
  { symbol: 'NQ',      name: 'NQ Futures',  base: 18240,   type: 'futures', digits: 0 },
  { symbol: 'GC',      name: 'Gold',        base: 2389,    type: 'futures', digits: 2 },
]

interface PriceState {
  price: number
  pct: number
}

function isMarketOpen(): boolean {
  const now = new Date()
  // Convert to US Eastern time
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = eastern.getDay()
  if (day === 0 || day === 6) return false
  const h = eastern.getHours()
  const m = eastern.getMinutes()
  const minutes = h * 60 + m
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60
}

export default function MarketBar() {
  const [prices, setPrices] = useState<PriceState[]>(() =>
    INSTRUMENTS.map(inst => ({ price: inst.base, pct: 0 }))
  )
  const [open, setOpen] = useState(isMarketOpen)

  useEffect(() => {
    const tick = setInterval(() => {
      setOpen(isMarketOpen())
      setPrices(prev =>
        prev.map((p, i) => {
          const digits = INSTRUMENTS[i].digits
          const newPrice = +(p.price * (1 + (Math.random() - 0.497) * 0.0008)).toFixed(digits)
          const newPct = +((newPrice - INSTRUMENTS[i].base) / INSTRUMENTS[i].base * 100).toFixed(2)
          return { price: newPrice, pct: newPct }
        })
      )
    }, 2000)
    return () => clearInterval(tick)
  }, [])

  return (
    <>
      <style>{`
        .yn-market-bar-inner::-webkit-scrollbar { display: none; }
        .yn-market-bar-inner { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: '#040508',
        borderTop: '1px solid #21262d',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        gap: 0,
      }}>
        {/* Market status */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 12px',
          borderRight: '1px solid #21262d',
          height: '100%',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontSize: 8,
            color: open ? '#22c55e' : '#ef4444',
          }}>●</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: open ? '#22c55e' : '#ef4444',
            letterSpacing: '0.04em',
          }}>
            {open ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
        </div>

        {/* Scrolling price items */}
        <div
          className="yn-market-bar-inner"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            height: '100%',
            gap: 0,
          }}
        >
          {INSTRUMENTS.map((inst, i) => {
            const p = prices[i]
            const isPos = p.pct >= 0
            const sign = isPos ? '+' : ''
            return (
              <div
                key={inst.symbol}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 10px',
                  height: '100%',
                  flexShrink: 0,
                  borderRight: '1px solid #21262d',
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#e6edf3',
                  letterSpacing: '0.03em',
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                }}>
                  {inst.symbol}
                </span>
                <span style={{
                  fontSize: 11,
                  color: '#e6edf3',
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                }}>
                  {inst.type === 'forex'
                    ? p.price.toFixed(inst.digits)
                    : inst.type === 'crypto' || inst.type === 'futures'
                      ? p.price.toLocaleString('en-US', { minimumFractionDigits: inst.digits, maximumFractionDigits: inst.digits })
                      : `$${p.price.toFixed(inst.digits)}`}
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                  color: isPos ? '#22c55e' : '#ef4444',
                  fontWeight: 600,
                }}>
                  {sign}{p.pct.toFixed(2)}%
                </span>
                {i < INSTRUMENTS.length - 1 && (
                  <span style={{
                    color: '#30363d',
                    fontSize: 11,
                    marginLeft: 4,
                  }}>|</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Right label */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderLeft: '1px solid #21262d',
          height: '100%',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontSize: 9,
            color: '#484f58',
            letterSpacing: '0.03em',
          }}>
            Market Data · Simulated · NYSE/NASDAQ Hours
          </span>
        </div>
      </div>
    </>
  )
}
