import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyShare, type SharePayload } from '@/lib/arena/humans'
import { C } from '@/components/arena/battle/types'
import CardActions from '@/components/arena/battle/CardActions'

const SITE = 'https://ynfinance.org'

function decode(token: string): { p: SharePayload; verified: boolean } | null {
  const res = verifyShare(decodeURIComponent(token))
  return res ? { p: res.payload, verified: res.verified } : null
}

function Col({ label, val, color, sub }: { label: string; val: string; color: string; sub: string }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>{label}</div>
      <div className="font-mono text-4xl font-black sm:text-5xl" style={{ color }}>{val}</div>
      <div className="text-[11px]" style={{ color: C.muted }}>{sub}</div>
    </div>
  )
}

function headlineOf(p: SharePayload): string {
  if (p.beat.length === 2) return `${p.h} beat BOTH AIs this week`
  if (p.beat.length === 1) return `${p.h} beat ${p.beat[0]} this week`
  return `${p.h} is battling the AIs`
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const d = decode(token)
  if (!d) return { title: 'The Arena — YN Finance' }
  const title = `${headlineOf(d.p)} — The Arena`
  const description = `${d.p.w}-${d.p.l} this week · ${d.p.wr}% calling the market vs BrainStock ${d.p.net}% and Gemini ${d.p.gem}%. Take the other side of the AIs.`
  return {
    metadataBase: new URL(SITE),
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'YN Finance · The Arena' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const d = decode(token)

  if (!d) {
    return (
      <main className="relative z-[1] mx-auto max-w-xl px-5 py-20 text-center">
        <div className="rounded-2xl border p-8" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
          <div className="text-lg font-bold text-white">This card couldn&apos;t be read</div>
          <p className="mt-2 text-sm" style={{ color: C.muted }}>The link may be malformed. Build your own in The Arena.</p>
          <Link href="/arena/me" className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: C.cyan, color: '#05060a' }}>
            Enter The Arena →
          </Link>
        </div>
      </main>
    )
  }

  const { p, verified } = d
  const beatBoth = p.beat.length === 2
  const hl = beatBoth ? 'I BEAT BOTH AIs' : p.beat.length === 1 ? `I BEAT ${p.beat[0].toUpperCase()}` : 'BATTLING THE AIs'
  const hlColor = p.beat.length ? C.green : C.amber
  const tweet = `${headlineOf(p)} — ${p.w}-${p.l}, ${p.wr}% calling the market. Take the other side 👇`

  return (
    <main className="relative z-[1] mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <div className="av-rise text-center text-[11px] font-bold tracking-[0.3em]" style={{ color: C.violet }}>⚔ THE ARENA</div>

      {/* The card */}
      <div className="av-pop av-card mt-4 overflow-hidden rounded-3xl border p-7 sm:p-9" style={{ borderColor: `${hlColor}44`, background: 'linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.01))', boxShadow: `0 0 50px ${hlColor}1f` }}>
        <div aria-hidden className="av-sheen" />
        <div className="text-base font-semibold" style={{ color: '#e7ecf5' }}>{p.h}</div>
        <h1 className="mt-1 text-4xl font-black leading-[1.04] sm:text-6xl" style={{ color: hlColor }}>{hl}</h1>
        <div className="mt-2 text-sm" style={{ color: C.muted }}>
          {p.w}-{p.l} this week{p.wk ? ` · ${p.wk}` : ''}
          {p.s >= 3 ? <span style={{ color: C.amber }}> · 🔥 {p.s}-streak</span> : null}
        </div>

        <div className="mt-7 flex items-end gap-4 border-t pt-6" style={{ borderColor: C.border }}>
          <Col label="You" val={`${p.wr}%`} color={C.green} sub="the market" />
          <Col label="BrainStock" val={`${p.net}%`} color={C.violet} sub="neural net" />
          <Col label="Gemini" val={`${p.gem}%`} color={C.cyan} sub="Google AI" />
        </div>

        <div className="mt-6 flex items-center justify-between text-[11px]" style={{ color: C.muted }}>
          <span>Sealed before the outcome · graded on real prices</span>
          <span style={{ color: verified ? C.green : C.muted }}>{verified ? '✓ signed & verifiable' : 'unverified'}</span>
        </div>
      </div>

      <CardActions tweet={tweet} />

      <p className="mt-8 text-center text-sm" style={{ color: C.muted }}>
        BrainStock and Gemini call ~300 stocks every morning — sealed to a Merkle root before the outcome, then graded.{' '}
        <Link href="/arena" style={{ color: C.cyan }}>Step into The Arena</Link> and take the other side.
      </p>
    </main>
  )
}
