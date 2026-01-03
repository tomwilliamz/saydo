import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Check if a completion already exists for this activity/person/date
  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('activity_id', body.activity_id)
    .eq('person', body.person)
    .eq('date', body.date)
    .single()

  if (existing) {
    // Update existing completion
    const { data, error } = await supabase
      .from('completions')
      .update({
        status: body.status,
        started_at: body.started_at,
        completed_at: body.completed_at,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } else {
    // Create new completion
    const { data, error } = await supabase
      .from('completions')
      .insert({
        activity_id: body.activity_id,
        person: body.person,
        date: body.date,
        status: body.status,
        started_at: body.started_at || null,
        completed_at: body.completed_at || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
}
