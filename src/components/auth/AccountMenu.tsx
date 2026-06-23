'use client'

/* ════════════════════════════════════════════════════════════════════════
   AccountMenu — the auth surface for the site header.

   • Signed OUT → a "Sign in" button that opens the real AuthModal
     (Google OAuth + email/password).
   • Signed IN  → the user's avatar + name. Clicking opens a dropdown with a
     welcome message, a link to their saved history, and Sign out.

   Drop it anywhere a header lives. `tone="light"` suits a pale background
   (the landing page); `tone="dark"` suits a dark app chrome.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, History, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from './AuthModal'

export function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string {
  if (!user) return 'Trader'
  const m = user.user_metadata ?? {}
  const first = (m.first_name as string) || ''
  const full = (m.full_name as string) || (m.name as string) || ''
  if (first) return first
  if (full) return full.split(' ')[0]
  if (user.email) return user.email.split('@')[0]
  return 'Trader'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
}

export default function AccountMenu({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { user, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const ink = tone === 'light' ? '#0a0a0c' : '#e7ecf5'
  const paper = tone === 'light' ? '#fbfaf7' : '#0b1220'
  const line = tone === 'light' ? 'rgba(10,10,12,.14)' : 'rgba(255,255,255,.12)'
  const mute = tone === 'light' ? 'rgba(10,10,12,.55)' : '#8a93a8'

  // Don't flash "Sign in" before we know — render a stable placeholder while loading.
  if (loading) {
    return <span style={{ width: 64, height: 18, display: 'inline-block', opacity: 0 }} aria-hidden />
  }

  if (!user) {
    return (
      <>
        <button onClick={() => setShowAuth(true)}
          style={{ fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: ink }}>
          Sign in
        </button>
        {showAuth && (
          <AuthModal
            reason="Sign in to save every forecast and analysis to your profile."
            onClose={() => setShowAuth(false)}
            onSuccess={() => setShowAuth(false)}
          />
        )}
      </>
    )
  }

  const name = displayName(user)
  const avatarUrl = (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || ''

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: ink, padding: 0 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        ) : (
          <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: ink, color: paper, fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {initials(name)}
          </span>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 248, background: paper, border: `1px solid ${line}`, borderRadius: 12, boxShadow: '0 18px 50px rgba(0,0,0,.18)', overflow: 'hidden', zIndex: 80 }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${line}` }}>
            <div style={{ fontSize: 11, color: mute, letterSpacing: '0.04em' }}>Welcome back,</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: ink, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} 👋</div>
            {user.email && <div style={{ fontSize: 11, color: mute, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>}
          </div>
          <Link href="/account" onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: ink, textDecoration: 'none' }}>
            <History size={15} /> My history
          </Link>
          <Link href="/account?tab=profile" onClick={() => setOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: ink, textDecoration: 'none', borderTop: `1px solid ${line}` }}>
            <UserIcon size={15} /> Profile
          </Link>
          <button onClick={() => { setOpen(false); signOut() }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: '#e5484d', background: 'none', border: 'none', borderTop: `1px solid ${line}`, cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
