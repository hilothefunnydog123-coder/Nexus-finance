'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { calcPnL, calcMargin, INSTRUMENT_MAP, type Instrument } from '@/lib/instruments'

export interface Position {
  id: string
  symbol: string
  instrumentType: 'stock' | 'forex' | 'futures' | 'crypto'
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
  leverage: number
  marginUsed: number
  openedAt: string
}

export interface ClosedTrade {
  id: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  exitPrice: number
  pnl: number
  openedAt: string
  closedAt: string
}

interface PortfolioStore {
  cash: number
  positions: Position[]
  closedTrades: ClosedTrade[]
  openPosition: (args: {
    instrument: Instrument
    side: 'long' | 'short'
    quantity: number
    price: number
    leverage: number
    stopLoss?: number
    takeProfit?: number
  }) => { success: boolean; error?: string }
  closePosition: (id: string, price: number) => void
  checkAutoClose: (prices: Record<string, number>) => void
  resetPortfolio: () => void
  getTotalEquity: (prices: Record<string, number>) => number
  getTotalUnrealizedPnL: (prices: Record<string, number>) => number
}

const START_BALANCE = 100_000

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      cash: START_BALANCE,
      positions: [],
      closedTrades: [],

      openPosition: ({ instrument, side, quantity, price, leverage, stopLoss, takeProfit }) => {
        const margin = calcMargin(instrument, price, quantity, leverage)
        if (margin > get().cash) {
          return { success: false, error: `Insufficient margin. Need $${margin.toFixed(2)}, available $${get().cash.toFixed(2)}` }
        }
        const position: Position = {
          id: crypto.randomUUID(),
          symbol: instrument.symbol,
          instrumentType: instrument.type,
          side,
          quantity,
          entryPrice: price,
          stopLoss,
          takeProfit,
          leverage,
          marginUsed: margin,
          openedAt: new Date().toISOString(),
        }
        set(s => ({ cash: s.cash - margin, positions: [...s.positions, position] }))
        return { success: true }
      },

      closePosition: (id, price) => {
        const pos = get().positions.find(p => p.id === id)
        if (!pos) return
        const instrument = INSTRUMENT_MAP[pos.symbol]
        if (!instrument) return
        const pnl = calcPnL(instrument, pos.side, pos.entryPrice, price, pos.quantity)
        const closed: ClosedTrade = {
          id: crypto.randomUUID(),
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          entryPrice: pos.entryPrice,
          exitPrice: price,
          pnl,
          openedAt: pos.openedAt,
          closedAt: new Date().toISOString(),
        }
        set(s => ({
          cash: s.cash + pos.marginUsed + pnl,
          positions: s.positions.filter(p => p.id !== id),
          closedTrades: [closed, ...s.closedTrades.slice(0, 99)],
        }))
      },

      checkAutoClose: (prices) => {
        const { positions, closePosition } = get()
        positions.forEach(pos => {
          const price = prices[pos.symbol]
          if (!price) return
          if (pos.stopLoss) {
            const triggered = pos.side === 'long' ? price <= pos.stopLoss : price >= pos.stopLoss
            if (triggered) closePosition(pos.id, pos.stopLoss)
          }
          if (pos.takeProfit) {
            const triggered = pos.side === 'long' ? price >= pos.takeProfit : price <= pos.takeProfit
            if (triggered) closePosition(pos.id, pos.takeProfit)
          }
        })
      },

      resetPortfolio: () => set({ cash: START_BALANCE, positions: [], closedTrades: [] }),

      getTotalEquity: (prices) => {
        const { cash, positions } = get()
        const floating = positions.reduce((sum, pos) => {
          const price = prices[pos.symbol] || pos.entryPrice
          const instrument = INSTRUMENT_MAP[pos.symbol]
          if (!instrument) return sum
          return sum + calcPnL(instrument, pos.side, pos.entryPrice, price, pos.quantity)
        }, 0)
        return cash + floating + positions.reduce((s, p) => s + p.marginUsed, 0)
      },

      getTotalUnrealizedPnL: (prices) => {
        return get().positions.reduce((sum, pos) => {
          const price = prices[pos.symbol] || pos.entryPrice
          const instrument = INSTRUMENT_MAP[pos.symbol]
          if (!instrument) return sum
          return sum + calcPnL(instrument, pos.side, pos.entryPrice, price, pos.quantity)
        }, 0)
      },
    }),
    { name: 'nexus-portfolio-v2' }
  )
)
