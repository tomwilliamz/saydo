import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/long-term-tasks?person=Thomas
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const person = searchParams.get('person')

  if (!person) {
    return NextResponse.json({ error: 'person parameter required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('long_term_tasks')
    .select('*')
    .eq('person', person)
    .order('status', { ascending: true }) // active first
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/long-term-tasks
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('long_term_tasks')
    .insert({
      person: body.person,
      title: body.title,
      category: body.category,
      due_date: body.due_date || null,
      default_estimate_minutes: body.default_estimate_minutes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
