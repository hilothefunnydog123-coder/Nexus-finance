'use client'

/**
 * PROJECT MATRIX // NATIVE — spec reader.
 * Fetches the markdown from /Project-Matrix-Spec.md (public asset) and renders
 * it with a purpose-built mini formatter in the terminal aesthetic. No markdown
 * dependency — the doc's grammar (headings, tables, fences, quotes, lists) is
 * small and fixed.
 */
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Cpu, Download, FileCode2 } from 'lucide-react'

const C = {
  bg: '#030506', ink: '#e9f5ee', dim: '#7f8c84', faint: '#4a564e',
  green: '#2be86a', lime: '#b6ff3a', emerald: '#10d98a', cyan: '#22d3ee', amber: '#ffd23a', red: '#ff5a6a',
  line: 'rgba(120,255,170,.12)', panel: 'rgba(255,255,255,.025)',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}
const RAW = '/Project-Matrix-Spec.md'

// ── inline formatting: **bold**, `code`, *em* ─────────────────────────────────
function inline(s: string, key = 0): ReactNode[] {
  const out: ReactNode[] = []
  let rest = s, k = key
  while (rest.length) {
    const m = rest.match(/(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/)
    if (!m || m.index == null) { out.push(rest); break }
    if (m.index > 0) out.push(rest.slice(0, m.index))
    if (m[2] != null) out.push(<b key={k++} style={{ color: C.ink, fontWeight: 750 }}>{inline(m[2], k * 97)}</b>)
    else if (m[3] != null) out.push(<code key={k++} style={{ fontFamily: C.mono, fontSize: '0.92em', color: C.lime, background: 'rgba(182,255,58,.07)', border: `1px solid rgba(182,255,58,.15)`, borderRadius: 4, padding: '0 5px' }}>{m[3]}</code>)
    else if (m[4] != null) out.push(<em key={k++} style={{ color: C.dim }}>{inline(m[4], k * 89)}</em>)
    rest = rest.slice(m.index + m[0].length)
  }
  return out
}

// ── block-level renderer ──────────────────────────────────────────────────────
function render(md: string): ReactNode[] {
  const lines = md.split('\n')
  const out: ReactNode[] = []
  let i = 0, k = 0
  const flushTable = (rows: string[][], head: boolean) => {
    const [h, ...body] = head ? rows : [[] as string[], ...rows]
    out.push(
      <div key={k++} style={{ overflowX: 'auto', margin: '18px 0', border: `1px solid ${C.line}`, borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          {head && <thead><tr>{h.map((c, j) => <th key={j} style={{ textAlign: 'left', fontFamily: C.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.emerald, padding: '9px 12px', borderBottom: `1px solid ${C.line}`, background: 'rgba(16,217,138,.05)', whiteSpace: 'nowrap' }}>{inline(c)}</th>)}</tr></thead>}
          <tbody>{body.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
              {r.map((c, j) => <td key={j} style={{ padding: '8px 12px', borderBottom: `1px solid rgba(120,255,170,.05)`, color: j === 0 ? C.ink : C.dim, lineHeight: 1.55, verticalAlign: 'top' }}>{inline(c)}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>,
    )
  }
  while (i < lines.length) {
    const L = lines[i]
    if (/^```/.test(L)) {
      const buf: string[] = []; i++
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++
      out.push(<pre key={k++} style={{ fontFamily: C.mono, fontSize: 11.5, lineHeight: 1.55, color: C.emerald, background: 'rgba(16,217,138,.04)', border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px', overflowX: 'auto', margin: '16px 0' }}>{buf.join('\n')}</pre>)
      continue
    }
    if (/^\|/.test(L)) {
      const rows: string[][] = []
      let head = false
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim())
        if (cells.every((c) => /^:?-+:?$/.test(c))) head = true
        else rows.push(cells)
        i++
      }
      flushTable(rows, head)
      continue
    }
    if (/^> /.test(L) || L === '>') {
      const buf: string[] = []
      while (i < lines.length && (/^> ?/.test(lines[i]))) { buf.push(lines[i].replace(/^> ?/, '')); i++ }
      out.push(
        <div key={k++} style={{ borderLeft: `3px solid ${C.amber}`, background: 'rgba(255,210,58,.05)', borderRadius: '0 10px 10px 0', padding: '13px 16px', margin: '18px 0', color: C.dim, fontSize: 13.5, lineHeight: 1.7 }}>
          {buf.map((b, j) => b.trim() === '' ? <div key={j} style={{ height: 8 }} /> : <div key={j}>{inline(b)}</div>)}
        </div>,
      )
      continue
    }
    if (/^# /.test(L)) { out.push(<h1 key={k++} style={{ fontFamily: C.mono, fontSize: 'clamp(1.15rem,2.6vw,1.5rem)', fontWeight: 800, letterSpacing: '0.04em', color: C.ink, margin: '44px 0 6px', paddingTop: 22, borderTop: `1px solid ${C.line}`, textShadow: `0 0 22px rgba(43,232,106,.35)` }}>{inline(L.slice(2))}</h1>); i++; continue }
    if (/^## /.test(L)) { out.push(<h2 key={k++} style={{ fontFamily: C.mono, fontSize: 'clamp(0.95rem,2vw,1.15rem)', fontWeight: 800, color: C.green, margin: '30px 0 8px' }}>{inline(L.slice(3))}</h2>); i++; continue }
    if (/^### /.test(L)) { out.push(<h3 key={k++} style={{ fontFamily: C.mono, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.emerald, margin: '22px 0 6px' }}>{inline(L.slice(4))}</h3>); i++; continue }
    if (/^---+\s*$/.test(L)) { out.push(<hr key={k++} style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '26px 0' }} />); i++; continue }
    if (/^- /.test(L)) {
      const items: string[] = []
      while (i < lines.length && /^- /.test(lines[i])) {
        let item = lines[i].slice(2); i++
        while (i < lines.length && /^ {2,}\S/.test(lines[i]) && !/^ *- /.test(lines[i])) { item += ' ' + lines[i].trim(); i++ }
        items.push(item)
      }
      out.push(<ul key={k++} style={{ margin: '10px 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 7 }}>{items.map((it, j) => <li key={j} style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>{inline(it)}</li>)}</ul>)
      continue
    }
    if (/^\d+\. /.test(L)) {
      const items: string[] = []
      while (i < lines.length && (/^\d+\. /.test(lines[i]) || /^ {2,}\S/.test(lines[i]))) {
        if (/^\d+\. /.test(lines[i])) items.push(lines[i].replace(/^\d+\. /, ''))
        else items[items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      out.push(<ol key={k++} style={{ margin: '10px 0', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 7 }}>{items.map((it, j) => <li key={j} style={{ color: C.dim, fontSize: 14, lineHeight: 1.7 }}>{inline(it)}</li>)}</ol>)
      continue
    }
    if (L.trim() === '') { i++; continue }
    // paragraph — merge soft-wrapped lines
    let para = L
    i++
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|>|\||- |\d+\. |```|---)/.test(lines[i])) { para += ' ' + lines[i].trim(); i++ }
    out.push(<p key={k++} style={{ color: C.dim, fontSize: 14, lineHeight: 1.75, margin: '10px 0' }}>{inline(para)}</p>)
  }
  return out
}

export default function SpecClient() {
  const [md, setMd] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetch(RAW, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject())).then(setMd).catch(() => setErr(true))
  }, [])
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: C.sans, backgroundImage: `radial-gradient(1000px 400px at 70% -10%, rgba(16,217,138,.07), transparent), linear-gradient(rgba(120,255,170,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,170,.025) 1px, transparent 1px)`, backgroundSize: 'auto, 42px 42px, 42px 42px' }}>
      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${C.line}`, background: 'rgba(3,5,6,.88)', backdropFilter: 'blur(8px)', flexWrap: 'wrap' }}>
        <Link href="/terminal" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.dim, textDecoration: 'none', fontFamily: C.mono, fontSize: 11 }}><ArrowLeft size={13} /> TERMINAL</Link>
        <span style={{ fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.12em', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, textShadow: '0 0 18px rgba(43,232,106,.4)' }}>
          <Cpu size={14} style={{ color: C.green }} /> PROJECT <span style={{ color: C.green }}>MATRIX</span> <span style={{ color: C.faint }}>//</span> <span style={{ color: C.lime }}>NATIVE SPEC</span>
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', color: C.bg, background: C.emerald, padding: '3px 8px', borderRadius: 5, fontWeight: 800 }}>REV 1.0</span>
        <a href={RAW} download="PROJECT-MATRIX-NATIVE-SPEC.md" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.mono, fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 7, textDecoration: 'none', color: C.bg, background: C.green }}>
          <Download size={13} /> Raw .md
        </a>
      </div>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(20px,4vw,44px) clamp(16px,4vw,28px) 90px' }}>
        {err && (
          <div style={{ marginTop: 60, textAlign: 'center', fontFamily: C.mono, color: C.red }}>
            <FileCode2 size={28} style={{ opacity: 0.6 }} />
            <p>Spec failed to load. <a href={RAW} style={{ color: C.green }}>Open the raw file</a>.</p>
          </div>
        )}
        {!md && !err && <div style={{ marginTop: 80, textAlign: 'center', fontFamily: C.mono, fontSize: 12, color: C.faint }}>decrypting blueprint…</div>}
        {md && render(md)}
      </div>
    </div>
  )
}
