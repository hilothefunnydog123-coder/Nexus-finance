'use client'

import { useEffect, useState } from 'react'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { section: 'Navigation', items: [
    { keys: ['⌘', 'K'], desc: 'Search instruments' },
    { keys: ['B'],       desc: 'Switch to Buy / Long' },
    { keys: ['S'],       desc: 'Switch to Sell / Short' },
    { keys: ['⏎'],       desc: 'Execute order' },
    { keys: ['1–5'],     desc: 'Select quantity preset' },
    { keys: ['?'],       desc: 'Show keyboard shortcuts' },
  ]},
  { section: 'Chart', items: [
    { keys: ['←', '→'], desc: 'Scroll chart timeline' },
    { keys: ['+', '−'], desc: 'Zoom in / out' },
    { keys: ['R'],      desc: 'Reset chart zoom' },
    { keys: ['Esc'],    desc: 'Close modals / search' },
  ]},
  { section: 'Trade-Room', items: [
    { keys: ['⏎'], desc: 'Send message' },
    { keys: ['$'], desc: 'Start ticker tag' },
  ]},
]

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[480px] bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2d4a] bg-[#040c14]">
          <div className="flex items-center gap-2">
            <Keyboard size={14} className="text-[#00d4aa]" />
            <span className="text-sm font-bold text-[#cdd6f4]">Keyboard Shortcuts</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map(section => (
            <div key={section.section}>
              <div className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-wider mb-3">{section.section}</div>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.desc} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#7f93b5]">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map(k => (
                        <kbd key={k} className="px-2 py-0.5 bg-[#040c14] border border-[#1a2d4a] rounded text-[11px] text-[#cdd6f4] font-mono">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-[#1a2d4a] text-center">
            <span className="text-[10px] text-[#4a5e7a]">Press <kbd className="px-1 py-0.5 bg-[#040c14] border border-[#1a2d4a] rounded text-[9px] font-mono">?</kbd> to toggle this panel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
