import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Goal, ConsultSession, Reminder } from '@/lib/types'

function ProgressGauge({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const sweep = circumference * 0.75 // 270 degree arc
  const offset = sweep - (score / 100) * sweep
  const color = score >= 71 ? '#4ade80' : score >= 41 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(135deg)' }}>
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="10"
          strokeDasharray={`${sweep} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${sweep} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif', color }}>{score}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>/ 100</div>
      </div>
    </div>
  )
}

function timeAgo(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function weekStreak(logs: { logged_at: string }[]) {
  const days = new Set(logs.map(l => new Date(l.logged_at).toDateString()))
  const now = new Date()
  let streak = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (days.has(d.toDateString())) streak++
    else if (i > 0) break
  }
  return streak
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: goals },
    { data: lastConsult },
    { data: weekLogs },
    { data: reminders },
    { data: profile },
  ] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).limit(1),
    supabase.from('consult_sessions').select('*').eq('user_id', user.id).order('consulted_at', { ascending: false }).limit(1),
    supabase.from('logs').select('logged_at').eq('user_id', user.id)
      .gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_dismissed', false).limit(3),
    supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
  ])

  const activeGoal = goals?.[0] as Goal | null
  const consult = lastConsult?.[0] as ConsultSession | null
  const streak = weekStreak(weekLogs || [])
  const activeReminders = (reminders || []) as Reminder[]

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
      <div className="animate-fade-up mb-6">
        <p className="text-xs font-display uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>Overview</p>
        <h1 className="text-2xl font-display" style={{ fontFamily: 'Syne, sans-serif' }}>
          Hey{profile?.data?.name ? `, ${profile.data.name}` : ''} 👋
        </h1>
      </div>

      {/* Goal card */}
      {activeGoal ? (
        <div className="glass p-6 mb-4 animate-fade-up-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="label mb-1">Active goal</p>
              <h2 className="text-lg font-display font-semibold mb-1 leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
                {activeGoal.title}
              </h2>
              {activeGoal.target_value && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Target: {activeGoal.target_value} {activeGoal.target_unit}
                  {activeGoal.target_date && ` · By ${new Date(activeGoal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                {(['0–40', '41–70', '71–100'] as const).map((range, i) => {
                  const labels = ['Needs work', 'On track', 'Crushing it']
                  const colors = ['var(--red)', 'var(--amber)', 'var(--green)']
                  const score = activeGoal.progress_score
                  const active = i === 0 ? score <= 40 : i === 1 ? score <= 70 : score > 70
                  return (
                    <span key={range} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: active ? `${colors[i]}22` : 'var(--surface-2)', color: active ? colors[i] : 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontWeight: 600 }}>
                      {labels[i]}
                    </span>
                  )
                })}
              </div>
            </div>
            <ProgressGauge score={Math.round(activeGoal.progress_score || 0)} />
          </div>
        </div>
      ) : (
        <div className="glass p-6 mb-4 animate-fade-up-1 text-center">
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No active goal set</p>
          <Link href="/onboarding" className="btn-ghost text-sm mt-3 inline-block">Set a goal →</Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4 animate-fade-up-2">
        <div className="glass p-4">
          <p className="label mb-1">Weekly streak</p>
          <p className="text-3xl font-display font-bold" style={{ fontFamily: 'Syne, sans-serif', color: streak >= 5 ? 'var(--green)' : 'var(--text)' }}>
            {streak}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>/7</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>days logged</p>
        </div>
        <div className="glass p-4">
          <p className="label mb-1">Last consult</p>
          {consult ? (
            <>
              <p className="text-sm font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>{timeAgo(consult.consulted_at)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }} >
                {new Date(consult.consulted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Never</p>
          )}
        </div>
      </div>

      {/* Last consult summary */}
      {consult?.summary && (
        <div className="glass p-5 mb-4 animate-fade-up-3">
          <p className="label mb-2">Last consult summary</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{consult.summary}</p>
        </div>
      )}

      {/* Reminders */}
      {activeReminders.length > 0 && (
        <div className="glass p-5 mb-4 animate-fade-up-4">
          <p className="label mb-3">Upcoming</p>
          <div className="flex flex-col gap-2">
            {activeReminders.map(r => (
              <div key={r.id} className="flex items-start gap-3">
                <span style={{ fontSize: 16 }}>
                  {r.type === 'body_checkin' ? '⚖️' : r.type === 'workout' ? '🏋️' : r.type === 'meal' ? '🥗' : '📌'}
                </span>
                <div>
                  <p className="text-sm">{r.message}</p>
                  {r.due_date && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(r.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consult CTA */}
      <div className="animate-fade-up-5">
        <Link href="/consult" className="btn-primary w-full text-base block text-center">
          🧠 Consult my health team
        </Link>
      </div>
    </div>
  )
}
