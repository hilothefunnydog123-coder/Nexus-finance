import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const SUPABASE_ENABLED = !!(
  url && key &&
  url !== 'your_supabase_url_here' &&
  key !== 'your_supabase_anon_key_here'
)

export const supabase = SUPABASE_ENABLED ? createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null

export interface DBMessage {
  id: string
  channel_id: string
  username: string
  content: string
  avatar_color: string
  created_at: string
}

export interface DBChannel {
  id: string
  name: string
  description: string
  emoji: string
}

export interface DBChallenge {
  id: string
  user_id: string
  email: string
  username: string
  tier: string
  account_size: number
  profit_target: number
  max_drawdown: number
  daily_loss_limit: number
  min_trading_days: number
  max_days: number
  status: 'active' | 'passed' | 'failed' | 'payout_requested' | 'paid'
  started_at: string
  passed_at: string | null
  payout_requested_at: string | null
  current_pnl_pct: number
  current_drawdown: number
  trading_days: number
}

export interface DBProfile {
  id: string
  username: string
  email: string
  avatar_color: string
}
