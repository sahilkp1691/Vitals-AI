'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'verify'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // disable magic link, use OTP
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMode('verify')
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="bg-glow" />
      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1 className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Vital</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Your personal health intelligence</p>
        </div>

        <div className="glass p-8">
          {mode === 'verify' ? (
            <form onSubmit={handleVerifyOtp}>
              <div className="text-center mb-6">
                <p style={{ fontSize: 32, marginBottom: 8 }}>📬</p>
                <h2 className="text-lg font-display font-semibold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Check your email</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>
                </p>
              </div>
              <div className="mb-5">
                <label className="label">Verification code</label>
                <input
                  className="input text-center text-2xl tracking-widest font-display"
                  style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '0.3em' }}
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm mb-4" style={{ color: 'var(--red)' }}>{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || otp.length < 6}>
                {loading ? 'Verifying…' : 'Verify email →'}
              </button>
              <button type="button" className="btn-ghost w-full mt-2 justify-center text-sm"
                onClick={() => { setMode('signup'); setOtp(''); setError('') }}>
                Back
              </button>
            </form>
          ) : (
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--surface-2)' }}>
                <button type="button" className={`tab flex-1 ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => { setMode('signin'); setError('') }}>
                  Sign in
                </button>
                <button type="button" className={`tab flex-1 ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setMode('signup'); setError('') }}>
                  Sign up
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    minLength={mode === 'signup' ? 8 : undefined} required />
                </div>
              </div>

              {error && <p className="text-sm mt-4" style={{ color: 'var(--red)' }}>{error}</p>}

              <button type="submit" className="btn-primary w-full mt-6" disabled={loading || !email || !password}>
                {loading
                  ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                  : (mode === 'signin' ? 'Sign in →' : 'Create account →')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
