'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConsultSession } from '@/lib/types'

type Tab = 'nutritionist' | 'trainer' | 'consultant'

function timeAgo(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
}

function formatDateRange(from: string, to: string) {
  const f = new Date(from)
  const t = new Date(to)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(f)} – ${fmt(t)}`
}

export default function ConsultPage() {
  const supabase = createClient()
  const [lastConsult, setLastConsult] = useState<ConsultSession | null>(null)
  const [consulting, setConsulting] = useState(false)
  const [result, setResult] = useState<ConsultSession | null>(null)
  const [tab, setTab] = useState<Tab>('nutritionist')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consult_sessions')
        .select('*')
        .order('consulted_at', { ascending: false })
        .limit(1)
      setLastConsult(data?.[0] || null)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleConsult() {
    setConsulting(true)
    setError('')
    setPhase('Gathering your logs…')

    try {
      setPhase('Consulting your nutritionist…')
      await new Promise(r => setTimeout(r, 800))
      setPhase('Consulting your trainer…')
      await new Promise(r => setTimeout(r, 800))
      setPhase('Getting the health consultant\'s view…')

      const res = await fetch('/api/consult', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Consult failed')

      setResult(data)
      setLastConsult(data)
      setTab('nutritionist')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }

    setPhase('')
    setConsulting(false)
  }

  const displayConsult = result || null

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="animate-fade-up mb-6">
        <p className="text-xs font-display uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>AI Health Team</p>
        <h1 className="text-2xl font-display" style={{ fontFamily: 'Syne, sans-serif' }}>Consult</h1>
      </div>

      {/* Last consult info */}
      {!loading && (
        <div className="glass p-5 mb-5 animate-fade-up-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="label mb-1">Last consulted</p>
              <p className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>
                {lastConsult ? timeAgo(lastConsult.consulted_at) : 'Never — this will be your first'}
              </p>
              {lastConsult && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Covered {formatDateRange(lastConsult.logs_covered_from, lastConsult.logs_covered_to)}
                </p>
              )}
            </div>
            <span style={{ fontSize: 36 }}>🧠</span>
          </div>
        </div>
      )}

      {/* CTA button */}
      {!displayConsult && (
        <div className="animate-fade-up-2 mb-6">
          <button
            className="btn-primary w-full text-lg"
            style={{ padding: '16px 24px' }}
            onClick={handleConsult}
            disabled={consulting}
          >
            {consulting ? (
              <span className="flex items-center gap-3 justify-center">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{phase}</span>
              </span>
            ) : (
              '🧠 Consult my health team'
            )}
          </button>
          {consulting && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              This may take 15–30 seconds
            </p>
          )}
          {error && (
            <p className="text-sm text-center mt-3" style={{ color: 'var(--red)' }}>{error}</p>
          )}
        </div>
      )}

      {/* Results */}
      {displayConsult && (
        <div className="animate-fade-up">
          <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            {(['nutritionist', 'trainer', 'consultant'] as Tab[]).map(t => (
              <button
                key={t}
                className={`tab flex-1 ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'nutritionist' ? '🥗 Nutrition' : t === 'trainer' ? '🏋️ Training' : '🩺 Health'}
              </button>
            ))}
          </div>

          <div className="glass p-6">
            {tab === 'nutritionist' && (
              <AdviceBlock text={displayConsult.nutritionist_advice} />
            )}
            {tab === 'trainer' && (
              <AdviceBlock text={displayConsult.trainer_advice} />
            )}
            {tab === 'consultant' && (
              <AdviceBlock text={displayConsult.consultant_advice} />
            )}
          </div>

          <button
            className="btn-ghost w-full mt-4 justify-center"
            onClick={() => { setResult(null); setPhase('') }}
          >
            Consult again
          </button>
        </div>
      )}

      {/* Previous consult (shown when we just did a new one and also show history) */}
      {lastConsult && !displayConsult && !consulting && (
        <div className="animate-fade-up-3">
          <p className="label mb-3">Previous consult</p>
          <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            {(['nutritionist', 'trainer', 'consultant'] as Tab[]).map(t => (
              <button
                key={t}
                className={`tab flex-1 ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'nutritionist' ? '🥗 Nutrition' : t === 'trainer' ? '🏋️ Training' : '🩺 Health'}
              </button>
            ))}
          </div>
          <div className="glass p-6">
            {tab === 'nutritionist' && <AdviceBlock text={lastConsult.nutritionist_advice} />}
            {tab === 'trainer' && <AdviceBlock text={lastConsult.trainer_advice} />}
            {tab === 'consultant' && <AdviceBlock text={lastConsult.consultant_advice} />}
          </div>
        </div>
      )}
    </div>
  )
}

function AdviceBlock({ text }: { text: string }) {
  if (!text) return <p style={{ color: 'var(--text-muted)' }}>No advice yet.</p>

  // Render markdown-ish text with basic formatting
  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h3 key={i} className="text-base font-display font-bold mt-2" style={{ fontFamily: 'Syne, sans-serif' }}>{line.slice(2)}</h3>
        }
        if (line.startsWith('## ')) {
          return <h4 key={i} className="text-sm font-display font-semibold mt-2" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--accent)' }}>{line.slice(3)}</h4>
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>·</span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{line.slice(2)}</p>
            </div>
          )
        }
        if (line.match(/^\d+\./)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs font-display font-bold" style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>{line.match(/^\d+/)![0]}.</span>
              <p className="text-sm leading-relaxed">{line.replace(/^\d+\./, '').trim()}</p>
            </div>
          )
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{line.slice(2, -2)}</p>
        }
        if (line.toUpperCase() === line && line.length < 60) {
          return <p key={i} className="label mt-2">{line}</p>
        }
        return <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{line}</p>
      })}
    </div>
  )
}
