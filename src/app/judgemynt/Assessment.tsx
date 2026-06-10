'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Cpu, Clock, Zap, CornerDownLeft, Crown } from 'lucide-react'

const TEAL = '#00d4aa'
const BLUE = '#1e90ff'
const BUDGET = 10000
const TIME = 1200 // 20 minutes

const MODEL_INFO: Record<string, { tag: string; mult: number; blurb: string }> = {
  claude: { tag: 'Claude', mult: 1.25, blurb: 'Careful & thorough. Best code, costs the most per call.' },
  gpt: { tag: 'GPT', mult: 1.0, blurb: 'Fast & confident. Balanced cost.' },
  gemini: { tag: 'Gemini', mult: 0.8, blurb: 'Efficient & direct. Cheapest per call.' },
}
const MODEL_IDS = Object.keys(MODEL_INFO)
const tagOf = (id: string) => MODEL_INFO[id]?.tag || 'AI'
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const FALLBACK_TASK = {
  title: 'Ship a production-grade slugify()',
  brief:
    'Direct the AI to write a JavaScript function slugify(text) that turns any string into a clean URL slug. It MUST: (1) lowercase everything, (2) turn spaces and underscores into single hyphens, (3) remove every character except a-z, 0-9 and hyphens, (4) collapse repeated hyphens into one, (5) trim leading/trailing hyphens, (6) return an empty string for empty or whitespace-only input. You drive — the AI writes the code. Get it correct AND clean, then /submit.',
}

interface Msg {
  role: 'user' | 'assistant' | 'system'
  content: string
  cost?: number
}
interface Grade {
  overall: number
  verdict: string
  dimensions: { creativity: number; efficiency: number; quality: number }
  steps: { move: string; take: string }[]
  analysis: string
  hire: string
}

export default function Assessment({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'run' | 'result'>('intro')
  const [model, setModel] = useState('claude')
  const [task, setTask] = useState<{ title: string; brief: string }>(FALLBACK_TASK)
  const [certName, setCertName] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [used, setUsed] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(TIME)
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState<null | 'tokens' | 'time'>(null)
  const [grade, setGrade] = useState<Grade | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const endedRef = useRef(false)

  const remaining = Math.max(0, BUDGET - used)
  const tokenPct = (remaining / BUDGET) * 100
  const tokenColor = tokenPct > 40 ? TEAL : tokenPct > 15 ? '#f59e0b' : '#ff5470'
  const timeColor = secondsLeft > 60 ? '#cdd6f4' : '#ff5470'

  useEffect(() => {
    try {
      const n = localStorage.getItem('judgemynt-name')
      if (n) setCertName(n)
    } catch {}
    fetch('/api/judgemynt/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'task' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.task) setTask(d.task)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (phase !== 'run') return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          end('time')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, busy])

  function sys(content: string) {
    setMessages((m) => [...m, { role: 'system', content }])
  }

  function begin() {
    setPhase('run')
    setMessages([
      { role: 'system', content: `TASK — ${task.title}\n\n${task.brief}` },
      {
        role: 'assistant',
        content: `I'm ${tagOf(model)}. I'll write the code — you direct me. Tell me what to build, or type /help.`,
      },
    ])
  }

  async function end(reason: 'submit' | 'tokens' | 'time') {
    if (endedRef.current) return
    endedRef.current = true
    if (reason !== 'submit') setLocked(reason)
    setBusy(true)
    setPhase('result')
    try {
      const res = await fetch('/api/judgemynt/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          model,
          history: messages,
          tokensUsed: used,
          tokensBudget: BUDGET,
          secondsUsed: TIME - secondsLeft,
          timeLimit: TIME,
          reason,
        }),
      })
      const d = await res.json()
      if (res.ok) setGrade(d as Grade)
    } catch {
      /* ignore */
    }
    setBusy(false)
  }

  async function ask(text: string) {
    if (busy || phase !== 'run') return
    const userMsg: Msg = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setBusy(true)
    try {
      const res = await fetch('/api/judgemynt/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', model, history, message: text }),
      })
      const d = await res.json()
      if (!res.ok) {
        sys(d.error || 'AI error — try again.')
        setBusy(false)
        return
      }
      const cost = Number(d.tokensUsed) || 0
      const next = used + cost
      setUsed(next)
      setMessages((m) => [...m, { role: 'assistant', content: d.reply, cost }])
      setBusy(false)
      if (next >= BUDGET) end('tokens')
    } catch {
      sys('Network error.')
      setBusy(false)
    }
  }

  function command(raw: string) {
    const [c, ...rest] = raw.slice(1).split(' ')
    const arg = rest.join(' ').trim().toLowerCase()
    switch (c.toLowerCase()) {
      case 'help':
        sys(
          'COMMANDS\n/task — show the brief\n/model <claude|gpt|gemini> — switch model (changes token cost)\n/run — test your current solution against every requirement\n/tokens — tokens left\n/time — time left\n/reset — make the AI forget the current approach (tokens are NOT refunded)\n/clear — clear the screen\n/submit — finish and get graded\n\nAnything without a / is sent to the AI and costs tokens.'
        )
        break
      case 'task':
        sys(task ? `TASK — ${task.title}\n\n${task.brief}` : 'Loading task…')
        break
      case 'tokens':
        sys(`${remaining.toLocaleString()} / ${BUDGET.toLocaleString()} tokens left.`)
        break
      case 'time':
        sys(`${fmt(secondsLeft)} left.`)
        break
      case 'model':
        if (MODEL_IDS.includes(arg)) {
          setModel(arg)
          sys(`Switched to ${tagOf(arg)} — token cost x${MODEL_INFO[arg].mult}.`)
        } else sys('Usage: /model claude | gpt | gemini')
        break
      case 'run':
        ask('Run my current solution against every requirement and tell me precisely which pass and which fail. For any failure, show the exact input that breaks it.')
        break
      case 'reset':
        setMessages((m) => [
          ...m,
          { role: 'system', content: '— context reset · the AI forgets the prior approach (spent tokens are not refunded) —' },
          { role: 'assistant', content: `Fresh start. I'm ${tagOf(model)}. What should I build?` },
        ])
        break
      case 'clear':
        setMessages([])
        break
      case 'submit':
        end('submit')
        break
      default:
        sys(`Unknown command: /${c} — try /help`)
    }
  }

  function onSubmit() {
    const raw = input.trim()
    if (!raw || busy || phase !== 'run') return
    setInput('')
    if (raw.startsWith('/')) command(raw)
    else ask(raw)
  }

  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

  /* ---------------- INTRO ---------------- */
  if (phase === 'intro') {
    return (
      <div className="min-h-screen px-6 sm:px-10 lg:px-16 py-10 max-w-3xl mx-auto">
        <button onClick={onExit} className="flex items-center gap-1 text-white/50 text-sm hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Judgemynt
        </button>
        <div className="text-xs uppercase tracking-[0.3em] mt-6" style={{ color: TEAL }}>
          AI Employment Exam
        </div>
        <h1 className="font-podium text-[clamp(2rem,6vw,3.6rem)] uppercase leading-[0.95] mt-3">
          Can you actually
          <br />
          work with AI?
        </h1>
        <p className="text-white/60 mt-4 text-sm sm:text-base max-w-xl">
          You get a real task and a real AI assistant. You direct it. Every message burns tokens, and you have 20 minutes.
          Run out of either and you&apos;re locked out. At the end, the examiner scores how you actually performed — not what you claim.
        </p>

        <div className="mt-6 rounded-xl border p-5" style={{ background: 'rgba(0,212,170,.05)', borderColor: 'rgba(0,212,170,.25)' }}>
          <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>
            Your task
          </div>
          <div className="font-semibold text-white">{task.title}</div>
          <p className="text-white/65 text-sm mt-1.5 leading-relaxed">{task.brief}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          {[
            ['10,000', 'token budget', <Zap key="z" className="w-4 h-4" />],
            ['20:00', 'on the clock', <Clock key="c" className="w-4 h-4" />],
            ['3 axes', 'creativity · efficiency · quality', <Cpu key="p" className="w-4 h-4" />],
          ].map(([a, b, ic]) => (
            <div key={b as string} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
              <div className="flex items-center gap-2" style={{ color: TEAL }}>
                {ic}
                <span className="font-bold text-lg text-white">{a}</span>
              </div>
              <div className="text-white/45 text-xs mt-1">{b}</div>
            </div>
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-widest text-white/40 mt-8 mb-2">Pick your model</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {MODEL_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setModel(id)}
              className="text-left rounded-xl p-4 border transition"
              style={{
                background: model === id ? 'rgba(0,212,170,.07)' : 'rgba(255,255,255,.02)',
                borderColor: model === id ? 'rgba(0,212,170,.4)' : 'rgba(255,255,255,.08)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{MODEL_INFO[id].tag}</span>
                <span className="text-[11px]" style={{ color: model === id ? TEAL : '#7d97ab' }}>
                  x{MODEL_INFO[id].mult}
                </span>
              </div>
              <div className="text-white/45 text-xs mt-1 leading-snug">{MODEL_INFO[id].blurb}</div>
            </button>
          ))}
        </div>

        <button
          onClick={begin}
          className="mt-8 w-full rounded-xl py-4 font-semibold text-[#06121f]"
          style={{ background: `linear-gradient(110deg, ${TEAL}, ${BLUE})` }}
        >
          Begin the exam — 20:00 · 10,000 tokens
        </button>
        <p className="text-center text-white/35 text-xs mt-3">The clock starts the moment you begin. No pausing.</p>
      </div>
    )
  }

  /* ---------------- RESULT ---------------- */
  if (phase === 'result') {
    const dims = grade?.dimensions
    return (
      <div className="min-h-screen px-6 sm:px-10 lg:px-16 py-10 max-w-3xl mx-auto">
        <button onClick={onExit} className="flex items-center gap-1 text-white/50 text-sm hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Judgemynt
        </button>

        {locked && (
          <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(255,84,112,.08)', border: '1px solid rgba(255,84,112,.3)', color: '#ff8da3' }}>
            🔒 Locked out — you ran out of {locked === 'tokens' ? 'tokens' : 'time'}. The examiner still graded what you did.
          </div>
        )}

        {busy && <div className="text-center text-white/60 py-20">The examiner is reviewing your whole session…</div>}

        {!busy && grade && (
          <>
            <div className="text-center py-7">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">Assessment Score</div>
              <div className="font-bold leading-none my-1" style={{ fontSize: 'clamp(60px,15vw,104px)', color: TEAL }}>
                {grade.overall}
              </div>
              <div className="text-white/55 text-sm">&ldquo;{grade.verdict}&rdquo;</div>
            </div>

            {grade.overall >= 70 && (
              <div
                className="max-w-xl mx-auto rounded-2xl p-6 text-center mb-6"
                style={{ background: 'linear-gradient(160deg,#06121f,#0a1726)', border: `1px solid ${TEAL}44`, boxShadow: '0 0 40px rgba(0,212,170,.12)' }}
              >
                <Crown className="w-8 h-8 mx-auto" style={{ color: TEAL }} />
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-2">Degree earned</div>
                <div className="font-podium text-2xl uppercase mt-1" style={{ color: TEAL }}>
                  AI Operator
                </div>
                <input
                  value={certName}
                  onChange={(e) => {
                    setCertName(e.target.value)
                    try {
                      localStorage.setItem('judgemynt-name', e.target.value)
                    } catch {}
                  }}
                  placeholder="Your name"
                  className="w-full text-center bg-transparent border-b border-white/20 focus:border-white/50 outline-none text-white text-lg py-1.5 mt-3 placeholder:text-white/25"
                />
                <div className="text-white/45 text-xs mt-3">
                  Certified at {grade.overall}/100 · {new Date().toLocaleDateString()} · screenshot to share
                </div>
              </div>
            )}

            <div className="space-y-4 max-w-xl mx-auto">
              {dims &&
                ([
                  ['Creativity', dims.creativity, 'how cleverly you directed'],
                  ['Efficiency', dims.efficiency, 'tokens + time discipline'],
                  ['Quality', dims.quality, 'how good the final result is'],
                ] as const).map(([label, val, hint]) => (
                  <div key={label}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-semibold">
                        {label} <span className="text-white/40 font-normal text-xs">— {hint}</span>
                      </span>
                      <span className="text-sm font-bold" style={{ color: TEAL }}>
                        {val}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: `linear-gradient(90deg, ${TEAL}, ${BLUE})` }} />
                    </div>
                  </div>
                ))}
            </div>

            <div className="max-w-xl mx-auto mt-7">
              <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>
                Step-by-step
              </div>
              <div className="space-y-2">
                {grade.steps.map((s, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                    <div className="text-sm font-semibold text-white">{s.move}</div>
                    <div className="text-white/55 text-xs mt-0.5">{s.take}</div>
                  </div>
                ))}
              </div>

              {grade.analysis && (
                <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/10 p-4 text-white/80 text-sm leading-relaxed">
                  {grade.analysis}
                </div>
              )}
              <div className="mt-4 pl-3.5" style={{ borderLeft: `3px solid ${BLUE}` }}>
                <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>
                  The hiring call
                </div>
                <div className="text-white text-sm leading-snug mt-0.5">{grade.hire}</div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={onExit} className="flex-1 rounded-xl py-3.5 font-semibold text-sm bg-white/[0.04] border border-white/10 hover:border-white/30">
                  Exit
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 rounded-xl py-3.5 font-semibold text-sm text-[#06121f]"
                  style={{ background: `linear-gradient(110deg, ${TEAL}, ${BLUE})` }}
                >
                  Take it again
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ---------------- RUN (terminal) ---------------- */
  return (
    <div className="h-screen flex flex-col">
      {/* status bar */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-white/10 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Cpu className="w-4 h-4" style={{ color: TEAL }} /> {tagOf(model)}
        </span>
        <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
          <Zap className="w-4 h-4" style={{ color: tokenColor }} />
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${tokenPct}%`, background: tokenColor }} />
          </div>
          <span className="text-xs font-mono tabular-nums" style={{ color: tokenColor }}>
            {remaining.toLocaleString()}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-mono tabular-nums" style={{ color: timeColor }}>
          <Clock className="w-4 h-4" /> {fmt(secondsLeft)}
        </span>
        <button onClick={() => command('/submit')} className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg" style={{ background: TEAL, color: '#06121f', fontWeight: 700 }}>
          /submit
        </button>
      </div>

      {/* task strip */}
      <button onClick={() => command('/task')} className="w-full text-left px-4 sm:px-6 py-2 border-b border-white/5 text-[11px] text-white/45 hover:text-white/70 truncate">
        🎯 {task.title} — tap or type <span style={{ color: TEAL }}>/task</span> for the full brief
      </button>

      {/* transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4" style={{ fontFamily: mono }}>
        {messages.map((m, i) => (
          <div key={i}>
            {m.role === 'system' ? (
              <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/45 border-l-2 border-white/15 pl-3">{m.content}</pre>
            ) : (
              <div>
                <div
                  className="text-[10px] uppercase tracking-widest mb-1"
                  style={{ color: m.role === 'user' ? TEAL : '#7d97ab' }}
                >
                  {m.role === 'user' ? 'you' : tagOf(model)}
                  {m.cost ? <span className="text-white/30 ml-2">−{m.cost} tok</span> : null}
                </div>
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#dbe6f0]">{m.content}</pre>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="text-white/40 text-[13px] animate-pulse">{tagOf(model)} is working…</div>}
      </div>

      {/* input */}
      <div className="border-t border-white/10 px-4 sm:px-6 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder="Message the AI, or /help"
            rows={1}
            disabled={busy}
            className="flex-1 resize-none bg-white/[0.04] border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-[13px] outline-none disabled:opacity-50"
            style={{ fontFamily: mono, maxHeight: 140 }}
          />
          <button
            onClick={onSubmit}
            disabled={busy}
            className="rounded-xl px-4 py-3 text-[#06121f] disabled:opacity-50 flex items-center gap-1.5 text-sm font-semibold"
            style={{ background: TEAL }}
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-white/30 mt-1.5">Enter to send · Shift+Enter for newline · everything you send to the AI costs tokens</div>
      </div>
    </div>
  )
}
