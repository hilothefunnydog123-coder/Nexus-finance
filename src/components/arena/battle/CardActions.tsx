'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Share2, Copy, Check, Swords } from 'lucide-react'
import { C } from './types'

// Share + copy actions for a public "I beat the AIs" card.
export default function CardActions({ tweet }: { tweet: string }) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const copy = useCallback(() => {
    if (!url) return
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }, [url])

  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition hover:scale-[1.03]"
        style={{ background: C.amber, color: '#05060a' }}
      >
        <Share2 size={16} /> Share on X
      </a>
      <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:scale-[1.03]" style={{ borderColor: C.border, color: '#e7ecf5' }}>
        {copied ? <Check size={16} style={{ color: C.green }} /> : <Copy size={16} />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <Link href="/arena/me" className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition hover:scale-[1.03]" style={{ borderColor: C.cyan, color: C.cyan, background: 'rgba(0,212,255,.06)' }}>
        <Swords size={16} /> Make your own
      </Link>
    </div>
  )
}
