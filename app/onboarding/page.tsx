'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'profile' | 'goal'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    age: '',
    height_cm: '',
    current_weight_kg: '',
    current_body_fat_pct: '',
    activity_level: 'moderate',
  })

  const [goal, setGoal] = useState({
    title: '',
    type: 'weight',
    target_value: '',
    target_unit: 'kg',
    target_date: '',
    ai_estimate: false,
  })

  async function handleProfileNext(e: React.FormEvent) {
    e.preventDefault()
    setStep('goal')
  }

  async function estimateGoalDate() {
    setEstimating(true)
    try {
      const res = await fetch('/api/estimate-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, goal }),
      })
      const data = await res.json()
      if (data.target_date) {
        setGoal(g => ({ ...g, target_date: data.target_date }))
      }
    } catch {
      // silently fail
    }
    setEstimating(false)
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Upsert profile
    const { error: profileError } = await supabase.from('user_profile').upsert({
      user_id: user.id,
      current_weight_kg: parseFloat(profile.current_weight_kg) || null,
      current_body_fat_pct: parseFloat(profile.current_body_fat_pct) || null,
      height_cm: parseFloat(profile.height_cm) || null,
      age: parseInt(profile.age) || null,
      activity_level: profile.activity_level,
      updated_at: new Date().toISOString(),
    })

    if (profileError) { setError(profileError.message); setLoading(false); return }

    // Insert goal
    const { error: goalError } = await supabase.from('goals').insert({
      user_id: user.id,
      title: goal.title,
      type: goal.type,
      target_value: parseFloat(goal.target_value) || null,
      target_unit: goal.target_unit,
      target_date: goal.target_date || null,
      is_active: true,
      progress_score: 0,
    })

    if (goalError) { setError(goalError.message); setLoading(false); return }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      <div className="bg-glow" />
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <span className="text-3xl">⚡</span>
          <h1 className="text-2xl font-display mt-2 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            {step === 'profile' ? 'Tell us about yourself' : 'Set your first goal'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {step === 'profile' ? 'This helps us personalise your experience' : 'What are you working toward?'}
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-2 mb-6 justify-center animate-fade-up-1">
          <div className="h-1 w-16 rounded-full" style={{ background: 'var(--accent)' }} />
          <div className="h-1 w-16 rounded-full" style={{ background: step === 'goal' ? 'var(--accent)' : 'var(--border)' }} />
        </div>

        <div className="glass p-8 animate-fade-up-2">
          {step === 'profile' ? (
            <form onSubmit={handleProfileNext} className="flex flex-col gap-4">
              <div>
                <label className="label">Your name</label>
                <input className="input" placeholder="Sahil" value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Age</label>
                  <input className="input" type="number" placeholder="28" value={profile.age}
                    onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input className="input" type="number" placeholder="175" value={profile.height_cm}
                    onChange={e => setProfile(p => ({ ...p, height_cm: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Weight (kg)</label>
                  <input className="input" type="number" step="0.1" placeholder="75" value={profile.current_weight_kg}
                    onChange={e => setProfile(p => ({ ...p, current_weight_kg: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Body fat % (optional)</label>
                  <input className="input" type="number" step="0.1" placeholder="20" value={profile.current_body_fat_pct}
                    onChange={e => setProfile(p => ({ ...p, current_body_fat_pct: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Activity level</label>
                <select className="input" value={profile.activity_level}
                  onChange={e => setProfile(p => ({ ...p, activity_level: e.target.value }))}>
                  <option value="sedentary">Sedentary (desk job, little exercise)</option>
                  <option value="light">Light (1–3 days/week)</option>
                  <option value="moderate">Moderate (3–5 days/week)</option>
                  <option value="active">Active (6–7 days/week)</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full mt-2">Continue →</button>
            </form>
          ) : (
            <form onSubmit={handleFinish} className="flex flex-col gap-4">
              <div>
                <label className="label">Goal description</label>
                <input className="input" placeholder="Get lean and reach 75kg" value={goal.title}
                  onChange={e => setGoal(g => ({ ...g, title: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Goal type</label>
                  <select className="input" value={goal.type}
                    onChange={e => setGoal(g => ({ ...g, type: e.target.value }))}>
                    <option value="weight">Weight</option>
                    <option value="body_fat">Body fat %</option>
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="label">Target value</label>
                  <input className="input" type="number" step="0.1" placeholder="75" value={goal.target_value}
                    onChange={e => setGoal(g => ({ ...g, target_value: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Target unit</label>
                <input className="input" placeholder="kg" value={goal.target_unit}
                  onChange={e => setGoal(g => ({ ...g, target_unit: e.target.value }))} />
              </div>
              <div>
                <label className="label">Target date</label>
                <input className="input" type="date" value={goal.target_date}
                  onChange={e => setGoal(g => ({ ...g, target_date: e.target.value, ai_estimate: false }))} />
                <button type="button" className="btn-ghost w-full mt-2 text-sm justify-center"
                  onClick={estimateGoalDate} disabled={estimating || !goal.title}>
                  {estimating ? '⏳ Estimating…' : '✨ Let AI estimate a realistic date'}
                </button>
              </div>

              {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}

              <div className="flex gap-3 mt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep('profile')}>← Back</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading || !goal.title}>
                  {loading ? 'Setting up…' : "Let's go →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
