export type InstrumentType = 'stock' | 'forex' | 'futures' | 'crypto'

export interface Instrument {
  symbol: string
  apiSymbol: string
  name: string
  type: InstrumentType
  pip: number
  leverage: number[]
  contractSize: number
  marginRate: number
  mockBasePrice: number
  category?: string
  digits: number
}

export const INSTRUMENTS: Instrument[] = [
  // ── Stocks ──
  { symbol: 'AAPL',  apiSymbol: 'AAPL',  name: 'Apple Inc.',       type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 189.50, digits: 2 },
  { symbol: 'NVDA',  apiSymbol: 'NVDA',  name: 'NVIDIA Corp.',     type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 875.40, digits: 2 },
  { symbol: 'TSLA',  apiSymbol: 'TSLA',  name: 'Tesla Inc.',       type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 248.80, digits: 2 },
  { symbol: 'MSFT',  apiSymbol: 'MSFT',  name: 'Microsoft',        type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 415.20, digits: 2 },
  { symbol: 'GOOGL', apiSymbol: 'GOOGL', name: 'Alphabet Inc.',    type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 175.30, digits: 2 },
  { symbol: 'AMZN',  apiSymbol: 'AMZN',  name: 'Amazon',           type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 198.60, digits: 2 },
  { symbol: 'META',  apiSymbol: 'META',  name: 'Meta Platforms',   type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 492.10, digits: 2 },
  { symbol: 'AMD',   apiSymbol: 'AMD',   name: 'AMD',              type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 168.20, digits: 2 },
  { symbol: 'SPY',   apiSymbol: 'SPY',   name: 'S&P 500 ETF',      type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 512.80, digits: 2 },
  { symbol: 'QQQ',   apiSymbol: 'QQQ',   name: 'NASDAQ ETF',       type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 438.60, digits: 2 },
  { symbol: 'NFLX',  apiSymbol: 'NFLX',  name: 'Netflix',          type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 635.10, digits: 2 },
  { symbol: 'JPM',   apiSymbol: 'JPM',   name: 'JPMorgan Chase',   type: 'stock',   pip: 0.01, leverage: [1,2,4],          contractSize: 1,      marginRate: 0.25,  mockBasePrice: 213.40, digits: 2 },

  // ── Forex ──
  { symbol: 'EUR/USD', apiSymbol: 'OANDA:EUR_USD', name: 'Euro / US Dollar',        type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 1.0842, digits: 5 },
  { symbol: 'GBP/USD', apiSymbol: 'OANDA:GBP_USD', name: 'British Pound / USD',     type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 1.2654, digits: 5 },
  { symbol: 'USD/JPY', apiSymbol: 'OANDA:USD_JPY', name: 'US Dollar / Japanese Yen',type: 'forex', pip: 0.01,   leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 154.23, digits: 3 },
  { symbol: 'AUD/USD', apiSymbol: 'OANDA:AUD_USD', name: 'Australian Dollar / USD', type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 0.6498, digits: 5 },
  { symbol: 'USD/CAD', apiSymbol: 'OANDA:USD_CAD', name: 'US Dollar / Canadian',    type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 1.3642, digits: 5 },
  { symbol: 'USD/CHF', apiSymbol: 'OANDA:USD_CHF', name: 'US Dollar / Swiss Franc', type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 0.9021, digits: 5 },
  { symbol: 'EUR/GBP', apiSymbol: 'OANDA:EUR_GBP', name: 'Euro / British Pound',    type: 'forex', pip: 0.0001, leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 0.8564, digits: 5 },
  { symbol: 'EUR/JPY', apiSymbol: 'OANDA:EUR_JPY', name: 'Euro / Japanese Yen',     type: 'forex', pip: 0.01,   leverage: [10,25,50,100], contractSize: 100000, marginRate: 0.02, mockBasePrice: 167.12, digits: 3 },

  // ── Futures ──
  { symbol: 'ES',   apiSymbol: 'ES',   name: 'E-Mini S&P 500',     type: 'futures', pip: 0.25, leverage: [1], contractSize: 50,    marginRate: 0.1, mockBasePrice: 5248.00, digits: 2 },
  { symbol: 'NQ',   apiSymbol: 'NQ',   name: 'E-Mini NASDAQ-100',  type: 'futures', pip: 0.25, leverage: [1], contractSize: 20,    marginRate: 0.1, mockBasePrice: 18240.00, digits: 2 },
  { symbol: 'YM',   apiSymbol: 'YM',   name: 'E-Mini Dow Jones',   type: 'futures', pip: 1,    leverage: [1], contractSize: 5,     marginRate: 0.1, mockBasePrice: 39480.00, digits: 0 },
  { symbol: 'GC',   apiSymbol: 'GC',   name: 'Gold Futures',       type: 'futures', pip: 0.10, leverage: [1], contractSize: 100,   marginRate: 0.1, mockBasePrice: 2389.40, digits: 2 },
  { symbol: 'CL',   apiSymbol: 'CL',   name: 'Crude Oil (WTI)',    type: 'futures', pip: 0.01, leverage: [1], contractSize: 1000,  marginRate: 0.1, mockBasePrice: 82.40,  digits: 2 },
  { symbol: 'SI',   apiSymbol: 'SI',   name: 'Silver Futures',     type: 'futures', pip: 0.005,leverage: [1], contractSize: 5000,  marginRate: 0.1, mockBasePrice: 28.14,  digits: 3 },

  // ── Crypto ──
  { symbol: 'BTC/USD', apiSymbol: 'BINANCE:BTCUSDT', name: 'Bitcoin',         type: 'crypto', pip: 1,    leverage: [1,2,5,10], contractSize: 1,    marginRate: 0.1, mockBasePrice: 67_240, digits: 0 },
  { symbol: 'ETH/USD', apiSymbol: 'BINANCE:ETHUSDT', name: 'Ethereum',        type: 'crypto', pip: 0.01, leverage: [1,2,5,10], contractSize: 1,    marginRate: 0.1, mockBasePrice: 3_180,  digits: 2 },
  { symbol: 'SOL/USD', apiSymbol: 'BINANCE:SOLUSDT', name: 'Solana',          type: 'crypto', pip: 0.01, leverage: [1,2,5],    contractSize: 1,    marginRate: 0.1, mockBasePrice: 148.40, digits: 2 },
  { symbol: 'BNB/USD', apiSymbol: 'BINANCE:BNBUSDT', name: 'BNB',             type: 'crypto', pip: 0.01, leverage: [1,2,5],    contractSize: 1,    marginRate: 0.1, mockBasePrice: 612.30, digits: 2 },
  { symbol: 'XRP/USD', apiSymbol: 'BINANCE:XRPUSDT', name: 'XRP',             type: 'crypto', pip: 0.0001,leverage: [1,2,5],   contractSize: 1,    marginRate: 0.1, mockBasePrice: 0.5820, digits: 4 },
  { symbol: 'DOGE/USD',apiSymbol: 'BINANCE:DOGEUSDT',name: 'Dogecoin',        type: 'crypto', pip: 0.0001,leverage: [1,2],      contractSize: 1,    marginRate: 0.15,mockBasePrice: 0.1640, digits: 4 },
]

export const INSTRUMENT_MAP = Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, i]))

export function getByType(type: InstrumentType) {
  return INSTRUMENTS.filter(i => i.type === type)
}

export function calcMargin(instrument: Instrument, price: number, quantity: number, leverage: number): number {
  if (instrument.type === 'forex') {
    return (price * quantity * instrument.contractSize) / leverage
  }
  if (instrument.type === 'futures') {
    return price * quantity * instrument.contractSize * instrument.marginRate
  }
  return (price * quantity) / leverage
}

export function calcPnL(instrument: Instrument, side: 'long' | 'short', entry: number, current: number, quantity: number): number {
  const diff = side === 'long' ? current - entry : entry - current
  if (instrument.type === 'forex') {
    return diff * quantity * instrument.contractSize
  }
  if (instrument.type === 'futures') {
    return diff * quantity * instrument.contractSize
  }
  return diff * quantity
}
