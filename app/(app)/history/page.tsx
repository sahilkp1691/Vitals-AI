'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LogEntry } from '@/lib/types'

type Filter = 'all' | 'food' | 'workout' | 'symptoms'

function timeLabel(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function HistoryPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<LogEntry | null>(null)

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(100)
    setLogs(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l => {
    if (filter === 'food') return (l.parsed_food?.length ?? 0) > 0
    if (filter === 'workout') return (l.parsed_workout?.length ?? 0) > 0
    if (filter === 'symptoms') return (l.parsed_symptoms?.length ?? 0) > 0
    return true
  })

  // Group by date label
  const grouped: Record<string, LogEntry[]> = {}
  filtered.forEach(l => {
    const label = timeLabel(l.logged_at)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(l)
  })

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="animate-fade-up mb-5">
        <p className="text-xs font-display uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>All entries</p>
        <h1 className="text-2xl font-display" style={{ fontFamily: 'Syne, sans-serif' }}>History</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 animate-fade-up-1" style={{ background: 'var(--surface-2)' }}>
        {(['all', 'food', 'workout', 'symptoms'] as Filter[]).map(f => (
          <button
            key={f}
            className={`tab flex-1 ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'food' ? '🥗' : f === 'workout' ? '🏋️' : '🩺'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => <div key={i} className="glass h-20 shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-10 text-center animate-fade-up-2">
          <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No logs found</p>
        </div>
      ) : (
        <div className="animate-fade-up-2 flex flex-col gap-6">
          {Object.entries(grouped).map(([label, entries]) => (
            <div key={label}>
              <p className="text-xs font-display uppercase tracking-widest mb-2 px-1"
                style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>
                {label}
              </p>
              <div className="flex flex-col gap-2">
                {entries.map(log => (
                  <button
                    key={log.id}
                    className="glass p-4 text-left glass-hover w-full"
                    onClick={() => setSelected(log)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text)' }}>
                          {log.raw_text}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(log.parsed_food?.length ?? 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--food)' }}>
                              🥗 {log.parsed_food!.length}
                            </span>
                          )}
                          {(log.parsed_workout?.length ?? 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--workout)' }}>
                              🏋️ {log.parsed_workout!.length}
                            </span>
                          )}
                          {(log.parsed_symptoms?.length ?? 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,114,182,0.15)', color: 'var(--symptoms)' }}>
                              🩺 {log.parsed_symptoms!.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div className="glass w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 animate-fade-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(selected.logged_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--surface-2)' }}>
              <p className="label mb-1">Raw entry</p>
              <p className="text-sm leading-relaxed">{selected.raw_text}</p>
            </div>

            {(selected.parsed_food?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="label mb-2">🥗 Food</p>
                {selected.parsed_food!.map((f, i) => (
                  <div key={i} className="text-sm mb-1 flex gap-2">
                    <span style={{ color: 'var(--food)' }}>·</span>
                    <span><strong>{f.item}</strong>{f.time && ` · ${f.time}`}{f.notes && ` — ${f.notes}`}</span>
                  </div>
                ))}
              </div>
            )}
            {(selected.parsed_workout?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="label mb-2">🏋️ Workout</p>
                {selected.parsed_workout!.map((w, i) => (
                  <div key={i} className="text-sm mb-1 flex gap-2">
                    <span style={{ color: 'var(--workout)' }}>·</span>
                    <span><strong>{w.activity}</strong>{w.duration && ` · ${w.duration}`}{w.intensity && ` (${w.intensity})`}{w.notes && ` — ${w.notes}`}</span>
                  </div>
                ))}
              </div>
            )}
            {(selected.parsed_symptoms?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="label mb-2">🩺 Symptoms</p>
                {selected.parsed_symptoms!.map((s, i) => (
                  <div key={i} className="text-sm mb-1 flex gap-2">
                    <span style={{ color: 'var(--symptoms)' }}>·</span>
                    <span><strong>{s.symptom}</strong> — {s.severity}{s.notes && ` · ${s.notes}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
