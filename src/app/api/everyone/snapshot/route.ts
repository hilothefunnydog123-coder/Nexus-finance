import { NextResponse } from 'next/server'
import { CATS, buildVerdict, toPublic } from '@/lib/everyone/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — precomputed board.
//
// The landing board reads THIS one endpoint instead of hitting /forecast four
// times. It builds every category's verdict through the shared engine (which is
// 15-min in-memory cached + logs to prediction_log), so a cron can warm it and
// real users get instant, consistent results at scale.
//
// Each category is built independently; one failing category never sinks the
// board (its slot returns an honest "unavailable" verdict). Never throws.

const DEFAULT_DAYS = 30

export async function GET(req: Request) {
  const u = new URL(req.url)
  const days = Math.max(7, Math.min(120, Number(u.searchParams.get('days')) || DEFAULT_DAYS))
  const keys = Object.keys(CATS)

  const board = await Promise.all(
    keys.map(async (key) => {
      const cfg = CATS[key]
      try {
        const v = await buildVerdict(key, cfg, days)
        return toPublic(key, cfg, v)
      } catch (e) {
        // keep the board whole even if one category's data is down.
        return {
          category: key,
          emoji: cfg.emoji,
          noun: cfg.noun,
          verdict: cfg.neutral,
          stance: 'neutral',
          confidence: 50,
          backtest: 50,
          direction: 'flat',
          headline: `Couldn't read ${cfg.noun} right now — check back shortly.`,
          drivers: [e instanceof Error ? e.message : 'temporary data outage'],
          sources: [],
          engine: 'unavailable',
          grounded: false,
          proxy: cfg.legs[0].proxyName,
          asOf: new Date().toISOString().slice(0, 10),
          movePct: 0,
          agreement: 0,
          whatChanged: '',
        }
      }
    }),
  )

  return NextResponse.json({ ok: true, asOf: new Date().toISOString(), board })
}
