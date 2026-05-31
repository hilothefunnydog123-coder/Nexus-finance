import type { AgentSignal } from './types'

// Map partial company names to tickers (uppercase match)
const COMPANY_TICKER: [string, string][] = [
  ['APPLE', 'AAPL'], ['NVIDIA', 'NVDA'], ['TESLA', 'TSLA'],
  ['MICROSOFT', 'MSFT'], ['ALPHABET', 'GOOGL'], ['AMAZON', 'AMZN'],
  ['META PLATFORMS', 'META'], ['ADVANCED MICRO', 'AMD'], ['NETFLIX', 'NFLX'],
  ['JPMORGAN', 'JPM'], ['JP MORGAN', 'JPM'], ['COINBASE', 'COIN'],
  ['PALANTIR', 'PLTR'], ['SNOWFLAKE', 'SNOW'], ['SALESFORCE', 'CRM'],
  ['ORACLE', 'ORCL'], ['INTEL', 'INTC'], ['QUALCOMM', 'QCOM'],
  ['BROADCOM', 'AVGO'], ['SHOPIFY', 'SHOP'], ['PAYPAL', 'PYPL'],
  ['UBER', 'UBER'], ['AIRBNB', 'ABNB'], ['SPOTIFY', 'SPOT'],
  ['ROBLOX', 'RBLX'], ['SUPERMICRO', 'SMCI'], ['ARM', 'ARM'],
]

function matchTicker(companyName: string): string | null {
  const upper = companyName.toUpperCase()
  for (const [key, ticker] of COMPANY_TICKER) {
    if (upper.includes(key)) return ticker
  }
  return null
}

export async function runInsiderAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []

  try {
    const res = await fetch(
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&dateb=&owner=include&count=40&output=atom',
      {
        headers: { 'User-Agent': 'YNFinance research@ynfinance.org' },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return signals

    const xml = await res.text()
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
    const seenCompanies = new Set<string>()

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
      const linkMatch  = entry.match(/<link[^>]*href="([^"]+)"/)
      const summaryMatch = entry.match(/<summary[^>]*>([^<]+)<\/summary>/)

      if (!titleMatch) continue
      const title = titleMatch[1]

      // Only process issuer entries — the company the insider works for
      if (!title.includes('(Issuer)')) continue

      const companyMatch = title.match(/4 - (.+?)\s*\(\d+\)\s*\(Issuer\)/)
      if (!companyMatch) continue

      const company = companyMatch[1].trim()
      if (seenCompanies.has(company)) continue
      seenCompanies.add(company)

      const ticker = matchTicker(company)
      const filedMatch = summaryMatch?.[1]?.match(/Filed:\s*([\d-]+)/)
      const filed = filedMatch ? filedMatch[1] : 'recently'

      signals.push({
        agent_name: 'insider',
        ticker,
        signal_text: `SEC Form 4 filed for ${company} — insider transaction on ${filed}. Check EDGAR for buy/sell direction.`,
        conviction: ticker ? 2 : 1,
        source_url: linkMatch?.[1] || undefined,
        raw_data: { company, filed },
      })

      if (signals.length >= 4) break
    }
  } catch (e) {
    console.error('[InsiderAgent]', e)
  }

  return signals
}
