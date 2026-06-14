/**
 * The screening universe for the daily AI Bull Board — ~300 liquid US large/
 * mid-caps + popular ETFs. Yahoo-format tickers (dashes, not dots).
 */
export const UNIVERSE: string[] = [
  // Mega-cap tech
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'AVGO', 'ORCL',
  'ADBE', 'CRM', 'AMD', 'INTC', 'QCOM', 'CSCO', 'TXN', 'IBM', 'NOW', 'INTU',
  'AMAT', 'MU', 'LRCX', 'KLAC', 'ADI', 'SNPS', 'CDNS', 'MRVL', 'NXPI', 'MCHP',
  'PANW', 'CRWD', 'FTNT', 'PLTR', 'SNOW', 'DDOG', 'NET', 'ZS', 'TEAM', 'WDAY',
  'DELL', 'HPQ', 'HPE', 'WDC', 'STX', 'ANET', 'CSGP', 'ROP', 'FICO', 'IT',
  // Communication / media
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR', 'WBD', 'EA', 'TTWO',
  'SPOT', 'RBLX', 'PINS', 'SNAP', 'UBER', 'LYFT', 'ABNB', 'DASH', 'ROKU', 'TTD',
  // Consumer
  'WMT', 'COST', 'HD', 'LOW', 'TGT', 'NKE', 'SBUX', 'MCD', 'CMG', 'YUM',
  'KO', 'PEP', 'PG', 'CL', 'KMB', 'MDLZ', 'MNST', 'KDP', 'STZ', 'KHC',
  'PM', 'MO', 'EL', 'GIS', 'HSY', 'K', 'SYY', 'KR', 'DG', 'DLTR',
  'LULU', 'ROST', 'TJX', 'ULTA', 'BBY', 'ORLY', 'AZO', 'TSCO', 'DPZ', 'DRI',
  // Autos / industrials
  'F', 'GM', 'RIVN', 'LCID', 'BA', 'CAT', 'DE', 'HON', 'GE', 'MMM',
  'LMT', 'RTX', 'NOC', 'GD', 'EMR', 'ETN', 'PH', 'ITW', 'CMI', 'PCAR',
  'UNP', 'CSX', 'NSC', 'FDX', 'UPS', 'WM', 'RSG', 'GWW', 'FAST', 'URI',
  // Financials
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SCHW', 'USB', 'PNC', 'TFC',
  'AXP', 'V', 'MA', 'PYPL', 'COF', 'DFS', 'BK', 'STT', 'BLK', 'SPGI',
  'MCO', 'ICE', 'CME', 'MMC', 'AON', 'PGR', 'TRV', 'ALL', 'CB', 'AIG',
  'MET', 'PRU', 'AFL', 'COIN', 'HOOD', 'SOFI', 'NU', 'AFRM', 'BX', 'KKR',
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'BMY',
  'AMGN', 'GILD', 'VRTX', 'REGN', 'ISRG', 'MDT', 'SYK', 'BSX', 'ZTS', 'CI',
  'CVS', 'HUM', 'ELV', 'MCK', 'BDX', 'EW', 'DXCM', 'IDXX', 'IQV', 'MRNA',
  'BIIB', 'HCA', 'CNC', 'A', 'GEHC', 'RMD', 'ALGN', 'WST', 'COR', 'HOLX',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'WMB',
  'KMI', 'OKE', 'HES', 'DVN', 'FANG', 'HAL', 'BKR', 'TRGP', 'CTRA', 'MRO',
  // Industrials/materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'NUE', 'DOW', 'DD', 'PPG',
  'VMC', 'MLM', 'CTVA', 'CF', 'MOS', 'ALB', 'STLD', 'CLF', 'X', 'AA',
  // Utilities / real estate
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'ED',
  'AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'WELL', 'DLR', 'VICI',
  // Misc large caps / growth
  'ADP', 'PAYX', 'CTAS', 'VRSK', 'EFX', 'BR', 'GPN', 'FIS', 'FISV', 'GL',
  'MAR', 'HLT', 'BKNG', 'EXPE', 'RCL', 'CCL', 'NCLH', 'MGM', 'LVS', 'WYNN',
  'CARR', 'OTIS', 'JCI', 'TT', 'DOV', 'ROK', 'AME', 'XYL', 'IEX', 'PNR',
  'WDAY', 'HUBS', 'ZM', 'DOCU', 'OKTA', 'TWLO', 'MDB', 'CFLT', 'GTLB', 'BILL',
  'SHOP', 'SQ', 'MELI', 'SE', 'ETSY', 'EBAY', 'CHWY', 'W', 'CVNA', 'DKNG',
  'SMCI', 'ARM', 'ON', 'ENPH', 'FSLR', 'SEDG', 'RUN', 'PLUG', 'CHPT', 'QS',
  // ETFs (sector + index proxies)
  'SPY', 'QQQ', 'DIA', 'IWM', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI',
  'XLP', 'XLU', 'XLB', 'XLRE', 'SMH', 'SOXX', 'XBI', 'ARKK', 'GLD', 'SLV',
]
