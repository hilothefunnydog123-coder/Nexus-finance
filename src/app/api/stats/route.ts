import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getAdmin() {
  if (!URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(URL, SERVICE)
  } catch {
    return null
  }
}

// Count rows in a table without pulling the data. Returns null on any error
// (table missing, no creds) so the UI can fall back to platform facts.
async function count(
  admin: NonNullable<ReturnType<typeof getAdmin>>,
  table: string,
  since?: string
): Promise<number | null> {
  try {
    let q = admin.from(table).select('*', { count: 'exact', head: true })
    if (since) q = q.gte('created_at', since)
    const { count, error } = await q
    if (error) return null
    return count ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const admin = getAdmin()
  let users: number | null = null
  let signals: number | null = null
  let convergence: number | null = null
  if (admin) {
    const [u, s, c] = await Promise.all([
      count(admin, 'profiles'),
      count(admin, 'agent_signals'),
      count(admin, 'convergence_alerts'),
    ])
    users = u
    signals = s
    convergence = c
  }
  return NextResponse.json(
    { users, signals, convergence },
    { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
  )
}
