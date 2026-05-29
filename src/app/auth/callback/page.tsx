'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code && supabase) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        router.replace('/developers')
      })
    } else {
      router.replace('/developers')
    }
  }, [router])

  return (
    <div style={{ background: '#030a10', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dce8f0', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(59,142,234,.2)', borderTop: '2px solid #3b8eea', animation: 'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize: 14, color: '#4a6a78' }}>Signing you in...</div>
    </div>
  )
}
