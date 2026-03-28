import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { profile, goal } = await request.json()

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `A person wants to achieve a health goal. Based on their current stats and goal, estimate a realistic target date.

Current stats:
- Age: ${profile.age || 'unknown'}, Height: ${profile.height_cm || 'unknown'}cm
- Weight: ${profile.current_weight_kg || 'unknown'}kg, Body fat: ${profile.current_body_fat_pct || 'unknown'}%
- Activity level: ${profile.activity_level || 'moderate'}

Goal: ${goal.title}
Type: ${goal.type}
Target value: ${goal.target_value || 'unspecified'} ${goal.target_unit || ''}
Today's date: ${new Date().toISOString().split('T')[0]}

Return a JSON object with one field: { "target_date": "YYYY-MM-DD" }
Be realistic — not too aggressive, not too conservative. Return only valid JSON.`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    const text = content.text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(text)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('estimate-goal error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
