'use client'

import { useState } from 'react'
import { X, Zap, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  onClose: () => void
  onSuccess?: () => void
  reason?: string
}

export default function AuthModal({ onClose, onSuccess, reason }: Props) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp } = useAuth()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    const fn = tab === 'signin' ? signIn : signUp
    const { error: err } = await fn(email, password)
    setLoading(false)

    if (err) {
      setError(err)
    } else if (tab === 'signup') {
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setTab('signin')
    } else {
      onSuccess?.()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[400px] bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2d4a] bg-[#040c14]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
              <Zap size={14} className="text-[#040c14]" fill="currentColor" />
            </div>
            <span className="font-black text-white tracking-tight">YN FINANCE</span>
          </div>
          <button onClick={onClose} className="text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {reason && (
            <div className="flex items-start gap-2 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={13} className="text-[#ffa502] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#ffa502]">{reason}</p>
            </div>
          )}

          <div className="flex rounded-lg border border-[#1a2d4a] overflow-hidden mb-6">
            {(['signup', 'signin'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  tab === t ? 'bg-[#00d4aa] text-[#040c14]' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
                }`}>
                {t === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Email Address</label>
              <div className="flex items-center gap-2 bg-[#0f1f38] border border-[#1a2d4a] rounded-lg px-3 py-2.5 focus-within:border-[#00d4aa] transition-colors">
                <Mail size={13} className="text-[#4a5e7a] shrink-0" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" autoFocus
                  className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Password</label>
              <div className="flex items-center gap-2 bg-[#0f1f38] border border-[#1a2d4a] rounded-lg px-3 py-2.5 focus-within:border-[#00d4aa] transition-colors">
                <Lock size={13} className="text-[#4a5e7a] shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="text-[#4a5e7a] hover:text-[#7f93b5]">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

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
              className="w-full py-3 bg-[#00d4aa] hover:bg-[#00ffcc] text-[#040c14] font-black text-sm rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,212,170,0.3)]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#040c14] border-t-transparent rounded-full animate-spin" />
                  {tab === 'signup' ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                tab === 'signup' ? 'Create Account & Start' : 'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-[#4a5e7a] mt-4">
            {tab === 'signup'
              ? 'Already have an account? '
              : "Don't have an account? "
            }
            <button onClick={() => { setTab(tab === 'signup' ? 'signin' : 'signup'); setError(''); setSuccess('') }}
              className="text-[#00d4aa] hover:underline">
              {tab === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
