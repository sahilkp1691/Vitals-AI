'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BodyCheckin } from '@/lib/types'

export default function CheckinPage() {
  const supabase = createClient()
  const [checkins, setCheckins] = useState<BodyCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', body_fat_pct: '', notes: '' })
  const [success, setSuccess] = useState(false)

  const fetchCheckins = useCallback(async () => {
    const { data } = await supabase
      .from('body_checkins')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(20)
    setCheckins(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCheckins() }, [fetchCheckins])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('body_checkins').insert({
      user_id: user.id,
      weight_kg: parseFloat(form.weight_kg),
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      notes: form.notes || null,
      checked_at: new Date().toISOString().split('T')[0],
    })

    if (!error) {
      setForm({ weight_kg: '', body_fat_pct: '', notes: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      fetchCheckins()
    }
    setSubmitting(false)
  }

  const latest = checkins[0]
  const previous = checkins[1]

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="animate-fade-up mb-6">
        <p className="text-xs font-display uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Body composition</p>
        <h1 className="text-2xl font-display" style={{ fontFamily: 'Syne, sans-serif' }}>Check-in</h1>
      </div>

      {/* Latest stats */}
      {latest && (
        <div className="glass p-5 mb-5 animate-fade-up-1">
          <p className="label mb-3">Latest reading</p>
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{latest.weight_kg}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>kg</span></p>
              {previous && (
                <p className="text-xs mt-0.5" style={{ color: latest.weight_kg < previous.weight_kg ? 'var(--green)' : latest.weight_kg > previous.weight_kg ? 'var(--red)' : 'var(--text-muted)' }}>
                  {latest.weight_kg < previous.weight_kg ? '↓' : latest.weight_kg > previous.weight_kg ? '↑' : '→'} {Math.abs(latest.weight_kg - previous.weight_kg).toFixed(1)}kg
                </p>
              )}
            </div>
            {latest.body_fat_pct && (
              <div>
                <p className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{latest.body_fat_pct}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>%</span></p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>body fat</p>
              </div>
            )}
            <div className="ml-auto text-right">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(latest.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log form */}
      <div className="glass p-6 mb-5 animate-fade-up-2">
        <p className="label mb-4">Log today&apos;s check-in</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight (kg)</label>
              <input className="input" type="number" step="0.1" placeholder="74.5" value={form.weight_kg}
                onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Body fat % (optional)</label>
              <input className="input" type="number" step="0.1" placeholder="19.2" value={form.body_fat_pct}
                onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="How are you feeling?" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting || !form.weight_kg}>
            {submitting ? 'Saving…' : success ? '✓ Saved!' : 'Log check-in'}
          </button>
        </form>
      </div>

      {/* History */}
      {!loading && checkins.length > 0 && (
        <div className="animate-fade-up-3">
          <p className="label mb-3">History</p>
          <div className="flex flex-col gap-2">
            {checkins.map((c, i) => (
              <div key={c.id} className="glass p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{c.weight_kg}kg{c.body_fat_pct ? ` · ${c.body_fat_pct}% BF` : ''}</p>
                  {c.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {i > 0 && checkins[i-1] && (
                    <p className="text-xs" style={{ color: c.weight_kg < checkins[i-1].weight_kg ? 'var(--green)' : c.weight_kg > checkins[i-1].weight_kg ? 'var(--red)' : 'var(--text-muted)' }}>
                      {c.weight_kg < checkins[i-1].weight_kg ? '↓' : c.weight_kg > checkins[i-1].weight_kg ? '↑' : '→'} {Math.abs(c.weight_kg - checkins[i-1].weight_kg).toFixed(1)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
