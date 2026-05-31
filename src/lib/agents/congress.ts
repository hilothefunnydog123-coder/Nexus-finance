import type { AgentSignal } from './types'

type HouseTx = {
  disclosure_date: string
  transaction_date: string
  ticker: string
  asset_description: string
  type: string
  amount: string
  representative: string
  district: string
  ptr_link: string
}

const WATCHED = new Set([
  'AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','QQQ','NFLX',
  'COIN','PLTR','SNOW','CRM','ORCL','INTC','QCOM','AVGO','TSM','SHOP','SQ','PYPL',
  'UBER','ABNB','SPOT','RBLX','HOOD','SOFI','RIVN','LCID','ARM','SMCI',
])

export async function runCongressAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  try {
    const res = await fetch(
      'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json',
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return signals

    const data: HouseTx[] = await res.json()

    // Most recent transactions are at the end of the array
    const recent = data.slice(-300).reverse()

    for (const tx of recent) {
      if (!tx.ticker || tx.ticker === 'N/A' || tx.ticker === '--') continue
      if (tx.type !== 'Purchase' && tx.type !== 'purchase') continue

      const disclosureDate = new Date(tx.disclosure_date)
      if (isNaN(disclosureDate.getTime()) || disclosureDate < cutoff) break // array is sorted; once past cutoff, stop

      const ticker = tx.ticker.replace('$', '').trim().toUpperCase()
      if (!ticker || ticker.length > 6) continue

      const daysAgo = Math.floor((Date.now() - disclosureDate.getTime()) / 86400000)
      const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`
      const conviction: 1 | 2 | 3 = WATCHED.has(ticker) ? 2 : 1

      signals.push({
        agent_name: 'congress',
        ticker,
        signal_text: `Rep. ${tx.representative} (${tx.district}) purchased ${tx.amount} of $${ticker} — disclosed ${timeLabel}`,
        conviction,
        source_url: tx.ptr_link || undefined,
        raw_data: { representative: tx.representative, amount: tx.amount, district: tx.district, disclosure_date: tx.disclosure_date },
      })

      if (signals.length >= 5) break
    }
  } catch (e) {
    console.error('[CongressAgent]', e)
  }

  return signals
}
