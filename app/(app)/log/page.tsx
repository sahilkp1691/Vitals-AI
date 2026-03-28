'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LogEntry, FoodItem, WorkoutItem, SymptomItem } from '@/lib/types'

export default function LogPage() {
  const supabase = createClient()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [todayLogs, setTodayLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  const fetchTodayLogs = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('logs')
      .select('*')
      .gte('logged_at', today.toISOString())
      .order('logged_at', { ascending: false })
    setTodayLogs(data || [])
    setLoadingLogs(false)
  }, [supabase])

  useEffect(() => { fetchTodayLogs() }, [fetchTodayLogs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Insert raw log immediately
    const { data: newLog } = await supabase.from('logs').insert({
      user_id: user.id,
      raw_text: text,
      logged_at: new Date().toISOString(),
    }).select().single()

    setText('')
    setSubmitting(false)

    if (newLog) {
      setTodayLogs(prev => [newLog, ...prev])
      // Trigger background parsing
      fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: newLog.id, raw_text: newLog.raw_text }),
      }).then(async (res) => {
        if (res.ok) {
          const updated = await res.json()
          setTodayLogs(prev => prev.map(l => l.id === updated.id ? updated : l))
        }
      })
    }
  }

  // Aggregate parsed data
  const allFood: FoodItem[] = todayLogs.flatMap(l => l.parsed_food || [])
  const allWorkouts: WorkoutItem[] = todayLogs.flatMap(l => l.parsed_workout || [])
  const allSymptoms: SymptomItem[] = todayLogs.flatMap(l => l.parsed_symptoms || [])
  const hasAnyParsed = allFood.length > 0 || allWorkouts.length > 0 || allSymptoms.length > 0

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <p className="text-xs font-display uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-display" style={{ fontFamily: 'Syne, sans-serif' }}>What happened today?</h1>
      </div>

      {/* Log input */}
      <form onSubmit={handleSubmit} className="animate-fade-up-1 mb-8">
        <textarea
          className="input"
          style={{ minHeight: 140, fontSize: 16, lineHeight: 1.6 }}
          placeholder="Food, workouts, how you're feeling... just write freely."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as React.FormEvent)
          }}
        />
        <button
          type="submit"
          className="btn-primary w-full mt-3"
          disabled={submitting || !text.trim()}
        >
          {submitting ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Logging…
            </span>
          ) : (
            <>Log it <span style={{ opacity: 0.6, fontSize: 12 }}>⌘↵</span></>
          )}
        </button>
      </form>

      {/* Parsed cards */}
      {loadingLogs ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="glass h-24 shimmer" />)}
        </div>
      ) : hasAnyParsed ? (
        <div className="flex flex-col gap-3 animate-fade-up-2">
          <p className="text-xs font-display uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Today&apos;s entries</p>

          <ParsedCard
            emoji="🥗"
            title="Food & Nutrition"
            count={allFood.length}
            color="var(--food)"
            items={allFood.map(f => `${f.item}${f.time ? ` · ${f.time}` : ''}${f.notes ? ` — ${f.notes}` : ''}`)}
          />
          <ParsedCard
            emoji="🏋️"
            title="Workouts"
            count={allWorkouts.length}
            color="var(--workout)"
            items={allWorkouts.map(w => `${w.activity}${w.duration ? ` · ${w.duration}` : ''}${w.intensity ? ` (${w.intensity})` : ''}`)}
          />
          <ParsedCard
            emoji="🩺"
            title="Body & Symptoms"
            count={allSymptoms.length}
            color="var(--symptoms)"
            items={allSymptoms.map(s => `${s.symptom} — ${s.severity}${s.notes ? ` · ${s.notes}` : ''}`)}
          />
        </div>
      ) : todayLogs.length > 0 ? (
        <div className="glass p-6 text-center animate-fade-up-2">
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            ⏳ Parsing your entries…
          </p>
        </div>
      ) : (
        <div className="glass p-8 text-center animate-fade-up-2">
          <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No logs today yet. Write anything above to get started.</p>
        </div>
      )}
    </div>
  )
}

function ParsedCard({
  emoji, title, count, color, items
}: {
  emoji: string
  title: string
  count: number
  color: string
  items: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = items.slice(0, expanded ? items.length : 3)

  return (
    <div className="glass p-4 glass-hover cursor-pointer" onClick={() => setExpanded(e => !e)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>{emoji}</span>
          <span className="font-display text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-display font-semibold"
              style={{ background: `${color}22`, color, fontFamily: 'Syne, sans-serif' }}>
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {count === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nothing logged</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {preview.map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span style={{ color, marginTop: 3, flexShrink: 0 }}>·</span>
              <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>{item}</span>
            </li>
          ))}
          {!expanded && items.length > 3 && (
            <li className="text-xs" style={{ color: 'var(--text-muted)' }}>+{items.length - 3} more</li>
          )}
        </ul>
      )}
    </div>
  )
}
