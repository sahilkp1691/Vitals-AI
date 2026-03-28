import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Extend Vercel function timeout — requires Vercel Pro for 60s, Hobby supports up to 10s
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ProfileRow { age?: number; height_cm?: number; current_weight_kg?: number; current_body_fat_pct?: number; activity_level?: string }
interface GoalRow { title?: string; target_value?: number; target_unit?: string; target_date?: string }
interface LogRow { logged_at: string; raw_text: string }
interface CheckinRow { checked_at: string; weight_kg: number; body_fat_pct?: number; notes?: string }

function buildSharedContext({
  lastSummary,
  profile,
  goal,
  logs,
  checkins,
}: {
  lastSummary: string
  profile: ProfileRow | null
  goal: GoalRow | null
  logs: LogRow[]
  checkins: CheckinRow[]
}) {
  const dateFrom = logs.length > 0
    ? new Date(logs[logs.length - 1].logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'N/A'
  const dateTo = logs.length > 0
    ? new Date(logs[0].logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'N/A'

  const logText = logs.map(l => {
    const d = new Date(l.logged_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    return `[${d}] ${l.raw_text}`
  }).join('\n') || 'No logs in this period.'

  const checkinText = checkins.length > 0
    ? checkins.map(c => `[${c.checked_at}] Weight: ${c.weight_kg}kg${c.body_fat_pct ? `, Body fat: ${c.body_fat_pct}%` : ''}${c.notes ? ` — ${c.notes}` : ''}`).join('\n')
    : 'No check-ins in this period.'

  return `PREVIOUS CONSULT SUMMARY:
${lastSummary}

USER PROFILE:
- Age: ${profile?.age || 'unknown'}, Height: ${profile?.height_cm || 'unknown'}cm
- Current weight: ${profile?.current_weight_kg || 'unknown'}kg, Body fat: ${profile?.current_body_fat_pct || 'unknown'}%
- Activity level: ${profile?.activity_level || 'unknown'}

ACTIVE GOAL:
${goal ? `${goal.title} — Target: ${goal.target_value} ${goal.target_unit}${goal.target_date ? ` by ${new Date(goal.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}` : 'No active goal set.'}

NEW LOGS SINCE LAST CONSULT (${dateFrom} to ${dateTo}):
${logText}

BODY CHECK-INS SINCE LAST CONSULT:
${checkinText}`
}

const NUTRITIONIST_SYSTEM = `You are a professional nutritionist and dietitian. You are part of a 3-person health team supporting a user working toward a specific health goal.

Your job is to:
1. Analyse the user's food logs since the last consult
2. Assess whether their nutrition is aligned with their goal
3. Identify patterns, deficiencies, or habits that help or hinder progress
4. Give 3–5 specific, actionable dietary recommendations for the coming days
5. Flag anything that needs attention (e.g. low protein, skipping meals, poor timing)

Be specific. Reference actual foods they logged. Don't give generic advice.
Keep your response under 300 words. Use a warm, direct tone — like a coach, not a textbook.`

const TRAINER_SYSTEM = `You are an expert personal trainer and strength & conditioning coach. You are part of a 3-person health team supporting a user working toward a specific health goal.

Your job is to:
1. Analyse the user's workout logs since the last consult
2. Assess training volume, frequency, intensity, and consistency
3. Identify if they are overtraining, undertraining, or on track
4. Give 3–5 specific recommendations for their next training block
5. Flag any patterns that could cause injury or stall progress (e.g. skipping rest days, no strength work)

Be specific. Reference their actual workouts. Don't give generic plans.
Keep your response under 300 words. Use a direct, motivating tone.`

const CONSULTANT_SYSTEM = `You are a holistic health consultant. You are the lead of a 3-person health team including a nutritionist and a personal trainer. You have access to everything: the user's food logs, workout logs, body symptoms, body composition check-ins, and the advice given by your teammates.

Your job is to:
1. Connect the dots across nutrition, training, and body symptoms
2. Assess overall progress toward the user's goal
3. Update the progress gauge: give a score from 0–100 representing how on-track the user is (be honest, not generous)
4. Give 2–3 high-level insights that neither the nutritionist nor trainer would see alone
5. Issue any smart reminders (e.g. "Schedule a body comp check-in — it's been 3 weeks")
6. Write a concise summary paragraph (3–5 sentences) of the overall picture — this will be stored and passed as context to the next consult

Your response must include these two markers on their own lines:
PROGRESS_SCORE: {number 0-100}
SUMMARY FOR NEXT SESSION: {your 3-5 sentence summary here}

Keep your full response under 400 words.`

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request) {
  try {
    // Auth via session cookie
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch context data
    const [
      { data: lastConsults },
      { data: profile },
      { data: goals },
    ] = await Promise.all([
      serviceSupabase.from('consult_sessions').select('*').eq('user_id', user.id).order('consulted_at', { ascending: false }).limit(1),
      serviceSupabase.from('user_profile').select('*').eq('user_id', user.id).single(),
      serviceSupabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).limit(1),
    ])

    const lastConsult = lastConsults?.[0] || null
    const activeGoal = goals?.[0] || null

    // Fetch logs since last consult (or all if first)
    const sinceDate = lastConsult?.consulted_at || new Date(0).toISOString()
    const [{ data: logs }, { data: checkins }] = await Promise.all([
      serviceSupabase.from('logs').select('*').eq('user_id', user.id)
        .gt('logged_at', sinceDate).order('logged_at', { ascending: false }),
      serviceSupabase.from('body_checkins').select('*').eq('user_id', user.id)
        .gt('checked_at', sinceDate.split('T')[0]).order('checked_at', { ascending: false }),
    ])

    const lastSummary = (lastConsult as { summary?: string } | null)?.summary || 'No previous consult — this is the first session.'
    const sharedContext = buildSharedContext({
      lastSummary,
      profile: profile as ProfileRow | null,
      goal: activeGoal as GoalRow | null,
      logs: (logs || []) as LogRow[],
      checkins: (checkins || []) as CheckinRow[],
    })

    // Step 1: Call Nutritionist and Trainer in parallel
    const [nutritionistMsg, trainerMsg] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: NUTRITIONIST_SYSTEM,
        messages: [{ role: 'user', content: sharedContext }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: TRAINER_SYSTEM,
        messages: [{ role: 'user', content: sharedContext }],
      }),
    ])

    const nutritionistAdvice = nutritionistMsg.content[0].type === 'text' ? nutritionistMsg.content[0].text : ''
    const trainerAdvice = trainerMsg.content[0].type === 'text' ? trainerMsg.content[0].text : ''

    // Step 2: Call Health Consultant with all context
    const consultantContext = `${sharedContext}

NUTRITIONIST'S ADVICE:
${nutritionistAdvice}

TRAINER'S ADVICE:
${trainerAdvice}`

    const consultantMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1536,
      system: CONSULTANT_SYSTEM,
      messages: [{ role: 'user', content: consultantContext }],
    })

    const consultantAdvice = consultantMsg.content[0].type === 'text' ? consultantMsg.content[0].text : ''

    // Extract progress score
    const scoreMatch = consultantAdvice.match(/PROGRESS_SCORE:\s*(\d+)/i)
    const progressScore = scoreMatch ? parseInt(scoreMatch[1]) : 50

    // Extract summary
    const summaryIdx = consultantAdvice.indexOf('SUMMARY FOR NEXT SESSION:')
    const summary = summaryIdx !== -1
      ? consultantAdvice.slice(summaryIdx + 'SUMMARY FOR NEXT SESSION:'.length).split('\n\n')[0].trim()
      : consultantAdvice.slice(0, 400)

    // Determine log range
    const logsSortedAsc = [...(logs || [])].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    const logsFrom = logsSortedAsc[0]?.logged_at || new Date().toISOString()
    const logsTo = logsSortedAsc[logsSortedAsc.length - 1]?.logged_at || new Date().toISOString()

    // Save consult session
    const { data: newConsult, error: consultError } = await serviceSupabase
      .from('consult_sessions')
      .insert({
        user_id: user.id,
        summary,
        nutritionist_advice: nutritionistAdvice,
        trainer_advice: trainerAdvice,
        consultant_advice: consultantAdvice,
        logs_covered_from: logsFrom,
        logs_covered_to: logsTo,
        consulted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (consultError) throw consultError

    // Update goal progress score
    if (activeGoal) {
      await serviceSupabase
        .from('goals')
        .update({ progress_score: progressScore })
        .eq('id', activeGoal.id)
    }

    // Parse and save reminders from consultant advice
    await parseAndSaveReminders(user.id, consultantAdvice)

    return NextResponse.json(newConsult)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('consult error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function parseAndSaveReminders(userId: string, consultantAdvice: string) {
  const lines = consultantAdvice.split('\n')
  const reminders = []
  const now = new Date()

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('body comp check-in') || lower.includes('body composition check') || lower.includes('weigh yourself')) {
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 3)
      reminders.push({
        user_id: userId,
        type: 'body_checkin',
        message: line.replace(/^[-•*]\s*/, '').trim(),
        due_date: dueDate.toISOString().split('T')[0],
        is_dismissed: false,
      })
    } else if (lower.includes('rest day') || lower.includes('recovery day')) {
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 1)
      reminders.push({
        user_id: userId,
        type: 'workout',
        message: line.replace(/^[-•*]\s*/, '').trim(),
        due_date: dueDate.toISOString().split('T')[0],
        is_dismissed: false,
      })
    }
  }

  if (reminders.length > 0) {
    await serviceSupabase.from('reminders').insert(reminders)
  }
}
