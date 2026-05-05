'use client'

import { useState } from 'react'
import { X, Zap, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase'

interface Props {
  onClose: () => void
  onSuccess?: () => void
  reason?: string
  redirectTo?: string
}

type Mode = 'magic' | 'password'
type Tab = 'signin' | 'signup'

export default function AuthModal({ onClose, onSuccess, reason, redirectTo }: Props) {
  const [mode, setMode] = useState<Mode>('magic')
  const [tab, setTab] = useState<Tab>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email) { setError('Please enter your email'); return }
    if (!SUPABASE_ENABLED || !supabase) { setError('Auth not configured — add Supabase keys'); return }

    setLoading(true)
    try {
      if (mode === 'magic') {
        // Magic link via Resend-powered Supabase email
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo || `${window.location.origin}/courses`,
            shouldCreateUser: true,
          },
        })
        if (err) { setError(err.message); return }
        setSuccess(`Magic link sent to ${email} — check your inbox and spam folder. Click the link to sign in.`)
      } else {
        if (!password) { setError('Please enter your password'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return }

        if (tab === 'signup') {
          const { error: err } = await supabase.auth.signUp({ email, password })
          if (err) { setError(err.message); return }
          setSuccess('Account created! Check your email to confirm, then sign in.')
          setTab('signin')
        } else {
          const { error: err } = await supabase.auth.signInWithPassword({ email, password })
          if (err) { setError(err.message); return }
          onSuccess?.()
          onClose()
        }
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[420px] bg-[#071220] border border-[#1e3a5f] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2d4a] bg-[#040c14]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
              <Zap size={13} className="text-[#040c14]" fill="currentColor" />
            </div>
            <span className="font-black text-white tracking-tight">YN Finance</span>
          </div>
          <button onClick={onClose} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={16} /></button>
        </div>

        <div className="p-6">
          {reason && (
            <div className="flex items-start gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-3 py-2.5 mb-5">
              <Sparkles size={13} className="text-[#00d4aa] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#00d4aa]">{reason}</p>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-[#1a2d4a] overflow-hidden mb-5">
            <button onClick={() => { setMode('magic'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'magic' ? 'bg-[#00d4aa] text-[#040c14]' : 'text-[#4a5e7a] hover:bg-[#0f1f38]'}`}>
              <Sparkles size={12} /> Magic Link
            </button>
            <button onClick={() => { setMode('password'); setError(''); setSuccess('') }}
              className={`flex-1 py-2.5 text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'password' ? 'bg-[#1e90ff] text-white' : 'text-[#4a5e7a] hover:bg-[#0f1f38]'}`}>
              <Lock size={12} /> Password
            </button>
          </div>

          {mode === 'password' && (
            <div className="flex rounded-lg border border-[#1a2d4a] overflow-hidden mb-4">
              {(['signup','signin'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                  className={`flex-1 py-2 text-[11px] font-bold transition-colors ${tab === t ? 'bg-[#0f1f38] text-[#cdd6f4]' : 'text-[#4a5e7a]'}`}>
                  {t === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Email Address</label>
              <div className="flex items-center gap-2 bg-[#0f1f38] border border-[#1a2d4a] rounded-lg px-3 py-2.5 focus-within:border-[#00d4aa] transition-colors">
                <Mail size={13} className="text-[#4a5e7a] shrink-0" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]" />
              </div>
            </div>

            {mode === 'password' && (
              <div>
                <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Password</label>
                <div className="flex items-center gap-2 bg-[#0f1f38] border border-[#1a2d4a] rounded-lg px-3 py-2.5 focus-within:border-[#00d4aa] transition-colors">
                  <Lock size={13} className="text-[#4a5e7a] shrink-0" />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="text-[#4a5e7a] hover:text-[#7f93b5]">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg px-3 py-2.5">
                <AlertCircle size={12} className="text-[#ff4757] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#ff4757]">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-3 py-2.5">
                <CheckCircle size={12} className="text-[#00d4aa] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#00d4aa]">{success}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 font-black text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: mode === 'magic' ? 'linear-gradient(135deg, #00d4aa, #1e90ff)' : '#1e90ff', color: '#040c14' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#040c14] border-t-transparent rounded-full animate-spin" />
                  {mode === 'magic' ? 'Sending magic link...' : tab === 'signup' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : mode === 'magic' ? '✨ Send Magic Link' : tab === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {mode === 'magic' && (
            <div className="mt-4 p-3 bg-[#0f1f38] rounded-lg text-center">
              <p className="text-[10px] text-[#4a5e7a] leading-relaxed">
                We&apos;ll send you a secure one-click sign-in link via <strong className="text-[#7f93b5]">Resend</strong>. No password needed. Works for both new and existing accounts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
