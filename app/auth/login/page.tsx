'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="bg-glow" />
      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1 className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Vital</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Your personal health intelligence</p>
        </div>

        <div className="glass p-8">
          {!sent ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm mb-4" style={{ color: 'var(--red)' }}>{error}</p>
              )}

              <button
                type="submit"
                className="btn-primary w-full text-base"
                disabled={loading || !email}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  'Send magic link'
                )}
              </button>

              <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
                No password needed. We&apos;ll email you a sign-in link.
              </p>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-xl font-display mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Check your inbox</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Click it to sign in.
              </p>
              <button
                className="btn-ghost mt-6 text-sm"
                onClick={() => { setSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
