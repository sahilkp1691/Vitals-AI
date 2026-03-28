import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { log_id, raw_text } = await request.json()

    if (!log_id || !raw_text) {
      return NextResponse.json({ error: 'Missing log_id or raw_text' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Parse the following health log entry into 3 categories: food, workout, and symptoms.

Log: "${raw_text}"

Return JSON in this exact format:
{
  "food": [{ "item": "...", "time": "...", "notes": "..." }],
  "workout": [{ "activity": "...", "duration": "...", "intensity": "...", "notes": "..." }],
  "symptoms": [{ "symptom": "...", "severity": "mild|moderate|severe", "notes": "..." }]
}

If a category has no entries, return an empty array. Extract only what is clearly stated. Return only valid JSON, no other text.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    let parsed
    try {
      // Strip markdown code fences if present
      const text = content.text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Failed to parse AI response as JSON')
    }

    // Update the log row with parsed data
    const { data: updated, error } = await supabase
      .from('logs')
      .update({
        parsed_food: parsed.food || [],
        parsed_workout: parsed.workout || [],
        parsed_symptoms: parsed.symptoms || [],
      })
      .eq('id', log_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('parse-log error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
