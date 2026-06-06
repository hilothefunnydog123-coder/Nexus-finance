// Popular tickers we pre-render for SEO (/stock/[symbol]) and list in the sitemap.
// These capture the highest-intent "is X a buy / X stock forecast" search volume.
export const POPULAR_TICKERS = [
  // Mega-cap tech
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','AVGO','ORCL','AMD',
  // Semis & hardware
  'INTC','MU','QCOM','TXN','SMCI','ARM','TSM','ASML',
  // Software / internet
  'NFLX','CRM','ADBE','PLTR','SNOW','UBER','SHOP','SQ','COIN','ABNB','PYPL',
  // Financials
  'JPM','BAC','GS','MS','V','MA','BRK.B','SOFI',
  // Consumer / retail
  'COST','WMT','DIS','NKE','SBUX','MCD','KO','PEP',
  // Health / pharma
  'LLY','UNH','JNJ','PFE','MRK','ABBV',
  // Energy / industrials
  'XOM','CVX','BA','CAT','GE','F','GM',
  // EV / growth
  'RIVN','LCID','NIO',
  // Indexes / ETFs
  'SPY','QQQ','IWM','DIA','VOO',
] as const

export const isLikelyTicker = (s: string) => /^[A-Z]{1,6}(\.[A-Z])?$/.test(s)
