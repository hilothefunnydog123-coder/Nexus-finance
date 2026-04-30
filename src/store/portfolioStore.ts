'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, PortfolioState } from '@/lib/types'

const STARTING_CASH = 100_000

interface PortfolioStore extends PortfolioState {
  buyStock: (symbol: string, price: number, quantity: number) => { success: boolean; error?: string }
  sellStock: (symbol: string, price: number, quantity: number) => { success: boolean; error?: string }
  resetPortfolio: () => void
  getTotalValue: (prices: Record<string, number>) => number
  getTotalPnL: (prices: Record<string, number>) => number
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      cash: STARTING_CASH,
      positions: {},
      transactions: [],

      buyStock: (symbol, price, quantity) => {
        const { cash, positions } = get()
        const total = price * quantity

        if (total > cash) {
          return { success: false, error: `Insufficient funds. Need $${total.toFixed(2)}, have $${cash.toFixed(2)}` }
        }

        const existing = positions[symbol]
        const newQty = (existing?.quantity || 0) + quantity
        const newAvgCost = existing
          ? (existing.avgCost * existing.quantity + price * quantity) / newQty
          : price

        const transaction: Transaction = {
          id: crypto.randomUUID(),
          symbol,
          action: 'BUY',
          quantity,
          price,
          total,
          timestamp: new Date(),
        }

        set(state => ({
          cash: state.cash - total,
          positions: {
            ...state.positions,
            [symbol]: { quantity: newQty, avgCost: newAvgCost },
          },
          transactions: [transaction, ...state.transactions],
        }))

        return { success: true }
      },

      sellStock: (symbol, price, quantity) => {
        const { positions } = get()
        const position = positions[symbol]

        if (!position || position.quantity < quantity) {
          return { success: false, error: `Not enough shares. Have ${position?.quantity || 0}, selling ${quantity}` }
        }

        const total = price * quantity
        const newQty = position.quantity - quantity

        const transaction: Transaction = {
          id: crypto.randomUUID(),
          symbol,
          action: 'SELL',
          quantity,
          price,
          total,
          timestamp: new Date(),
        }

        set(state => ({
          cash: state.cash + total,
          positions: newQty === 0
            ? (() => {
                const p = { ...state.positions }
                delete p[symbol]
                return p
              })()
            : { ...state.positions, [symbol]: { ...position, quantity: newQty } },
          transactions: [transaction, ...state.transactions],
        }))

        return { success: true }
      },

      resetPortfolio: () => set({ cash: STARTING_CASH, positions: {}, transactions: [] }),

      getTotalValue: (prices) => {
        const { cash, positions } = get()
        const posValue = Object.entries(positions).reduce((sum, [sym, pos]) => {
          return sum + (prices[sym] || pos.avgCost) * pos.quantity
        }, 0)
        return cash + posValue
      },

      getTotalPnL: (prices) => {
        const { positions } = get()
        return Object.entries(positions).reduce((sum, [sym, pos]) => {
          const current = prices[sym] || pos.avgCost
          return sum + (current - pos.avgCost) * pos.quantity
        }, 0)
      },
    }),
    { name: 'nexus-portfolio' }
  )
)
