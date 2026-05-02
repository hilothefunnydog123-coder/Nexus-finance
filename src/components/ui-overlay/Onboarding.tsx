'use client'

import { useState, useEffect } from 'react'
import { X, BarChart2, Users, ShieldCheck, CandlestickChart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  {
    icon: <CandlestickChart size={28} className="text-[#00d4aa]" />,
    title: 'Welcome to YN Finance',
    desc: 'The professional trading terminal where serious traders practice, compete, and prepare for real funded accounts.',
    highlight: 'Start on the Dashboard — your live market overview.',
    tab: null,
  },
  {
    icon: <BarChart2 size={28} className="text-[#1e90ff]" />,
    title: 'Real TradingView Charts',
    desc: 'Click the Trade tab for full-featured TradingView charts with indicators, drawing tools, and live prices across stocks, forex, and futures.',
    highlight: 'Press B to go Long, S to go Short, Enter to execute.',
    tab: 'trade',
  },
  {
    icon: <Users size={28} className="text-[#a855f7]" />,
    title: 'Live Trading Community',
    desc: 'The Trade-Room has 6 real-time channels. Post your ideas with $TICKER tags. The leaderboard updates live — can you crack the top 10?',
    highlight: 'Set your trader name at the bottom of the channel list.',
    tab: 'traderoom',
  },
  {
    icon: <ShieldCheck size={28} className="text-[#ffa502]" />,
    title: 'YN Capital Prop Challenge',
    desc: 'Go to Community → YN Capital to start a simulated prop firm challenge. Follow real FTMO-style rules, pass, and earn your certificate.',
    highlight: 'You start with $100K paper money — use it wisely.',
    tab: 'community',
  },
]

interface Props { onTabChange?: (tab: string) => void }

export default function Onboarding({ onTabChange }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const visited = localStorage.getItem('yn_app_visited')
    if (!visited) setVisible(true)
  }, [])

  const close = () => {
    localStorage.setItem('yn_app_visited', '1')
    setVisible(false)
  }

  const next = () => {
    const curr = STEPS[step]
    if (curr.tab && onTabChange) onTabChange(curr.tab)
    if (step < STEPS.length - 1) { setStep(s => s + 1) } else { close() }
  }

  if (!visible) return null

  const curr = STEPS[step]

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[440px] bg-[#071220] border border-[#1e3a5f] rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 80px rgba(0,212,170,0.15)' }}>
        {/* Progress bar */}
        <div className="h-1 bg-[#0f1f38]">
          <div className="h-full bg-gradient-to-r from-[#00d4aa] to-[#1e90ff] transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#040c14] border border-[#1a2d4a] flex items-center justify-center">
              {curr.icon}
            </div>
            <button onClick={close} className="text-[#4a5e7a] hover:text-[#7f93b5] transition-colors mt-1">
              <X size={16} />
            </button>
          </div>

          <h2 className="text-xl font-black text-[#cdd6f4] mb-3">{curr.title}</h2>
          <p className="text-[13px] text-[#7f93b5] leading-relaxed mb-4">{curr.desc}</p>

          <div className="bg-[#040c14] border border-[#1a2d4a] rounded-lg px-4 py-3 mb-8">
            <p className="text-[11px] text-[#00d4aa] font-semibold">{curr.highlight}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-colors"
                  style={{ background: i === step ? '#00d4aa' : '#1a2d4a' }} />
              ))}
            </div>
            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="text-[11px] text-[#4a5e7a] hover:text-[#7f93b5] px-3 py-2">
                  ← Back
                </button>
              )}
              <button onClick={next}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00d4aa] text-[#040c14] font-bold text-[12px] rounded-lg hover:bg-[#00ffcc] transition-colors">
                {step === STEPS.length - 1 ? 'Start Trading' : 'Next'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
