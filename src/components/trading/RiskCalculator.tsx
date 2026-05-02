'use client'

import { useState } from 'react'
import { Calculator, AlertTriangle } from 'lucide-react'

export default function RiskCalculator() {
  const [account, setAccount] = useState('100000')
  const [riskPct, setRiskPct] = useState('1')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [type, setType] = useState<'stock' | 'forex' | 'futures'>('stock')

  const accountN = parseFloat(account) || 0
  const riskN = parseFloat(riskPct) || 0
  const entryN = parseFloat(entry) || 0
  const slN = parseFloat(sl) || 0

  const dollarRisk = (accountN * riskN) / 100
  const priceDiff = Math.abs(entryN - slN)
  const shares = priceDiff > 0 ? Math.floor(dollarRisk / priceDiff) : 0
  const positionSize = shares * entryN
  const pctOfAccount = accountN > 0 ? (positionSize / accountN) * 100 : 0

  const risk = pctOfAccount > 10 ? 'high' : pctOfAccount > 5 ? 'medium' : 'low'
  const riskColor = risk === 'high' ? '#ff4757' : risk === 'medium' ? '#ffa502' : '#00d4aa'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <Calculator size={11} className="text-[#1e90ff]" />
        <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-widest">Position Size Calculator</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Instrument type */}
        <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
          {(['stock','forex','futures'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-1.5 text-[9px] font-mono uppercase transition-colors ${type === t ? 'bg-[#1e90ff] text-white' : 'text-[#4a5e7a] hover:bg-[#0f1f38]'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Inputs */}
        {[
          { label: 'Account Size ($)', val: account, set: setAccount, placeholder: '100000' },
          { label: `Risk Per Trade (%)`, val: riskPct, set: setRiskPct, placeholder: '1' },
          { label: `Entry Price${type === 'forex' ? ' (pips)' : ' ($)'}`, val: entry, set: setEntry, placeholder: '0.00' },
          { label: 'Stop Loss Price', val: sl, set: setSl, placeholder: '0.00' },
        ].map(({ label, val, set, placeholder }) => (
          <div key={label}>
            <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">{label}</label>
            <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
              className="w-full bg-[#040c14] border border-[#1a2d4a] rounded px-2.5 py-2 text-sm mono text-[#cdd6f4] outline-none focus:border-[#1e90ff]" />
          </div>
        ))}

        {/* Results */}
        {entryN > 0 && slN > 0 && (
          <div className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-3 space-y-2">
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-2">Calculation Result</div>
            {[
              { label: 'Dollar Risk',       value: `$${dollarRisk.toFixed(2)}`,      color: '#ff4757' },
              { label: 'Risk Per Share',     value: `$${priceDiff.toFixed(4)}`,       color: '#cdd6f4' },
              { label: 'Max Position Size',  value: `${shares.toLocaleString()} ${type === 'stock' ? 'shares' : type === 'forex' ? 'lots' : 'contracts'}`, color: '#00d4aa' },
              { label: 'Position Value',     value: `$${positionSize.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '#cdd6f4' },
              { label: '% of Account',       value: `${pctOfAccount.toFixed(1)}%`,   color: riskColor },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-[#7f93b5]">{label}</span>
                <span className="mono font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {risk === 'high' && positionSize > 0 && (
          <div className="flex items-start gap-2 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded px-2.5 py-2">
            <AlertTriangle size={11} className="text-[#ff4757] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#ff4757]">Position size exceeds 10% of account. High risk — consider reducing.</p>
          </div>
        )}

        {/* Quick risk presets */}
        <div>
          <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1.5">Quick Risk %</div>
          <div className="flex gap-1.5">
            {['0.5','1','2','3'].map(r => (
              <button key={r} onClick={() => setRiskPct(r)}
                className={`flex-1 py-1.5 text-[10px] font-mono rounded border transition-colors ${
                  riskPct === r ? 'bg-[#1e90ff] border-[#1e90ff] text-white' : 'border-[#1a2d4a] text-[#7f93b5] hover:border-[#1e3a5f]'
                }`}>{r}%</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
