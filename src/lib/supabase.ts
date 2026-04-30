import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const SUPABASE_ENABLED = !!(
  url && key &&
  url !== 'your_supabase_url_here' &&
  key !== 'your_supabase_anon_key_here'
)

export const supabase = SUPABASE_ENABLED ? createClient(url, key) : null

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
