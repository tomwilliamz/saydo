import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/long-term-tasks?user_id=xxx (optional, defaults to authenticated user)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const userIdParam = searchParams.get('user_id')

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetUserId = userIdParam || user.id

  // Verify permission
  if (targetUserId !== user.id) {
    const [{ data: myFamilies }, { data: theirFamilies }] = await Promise.all([
      supabase.from('family_members').select('family_id').eq('user_id', user.id),
      supabase.from('family_members').select('family_id').eq('user_id', targetUserId),
    ])

    const myFamilyIds = new Set(myFamilies?.map((f) => f.family_id) || [])
    const hasSharedFamily = theirFamilies?.some((f) => myFamilyIds.has(f.family_id))

    if (!hasSharedFamily) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('long_term_tasks')
    .select('*')
    .eq('user_id', targetUserId)
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

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const targetUserId = body.user_id || user.id

  // Verify permission
  if (targetUserId !== user.id) {
    const [{ data: myFamilies }, { data: theirFamilies }] = await Promise.all([
      supabase.from('family_members').select('family_id').eq('user_id', user.id),
      supabase.from('family_members').select('family_id').eq('user_id', targetUserId),
    ])

    const myFamilyIds = new Set(myFamilies?.map((f) => f.family_id) || [])
    const hasSharedFamily = theirFamilies?.some((f) => myFamilyIds.has(f.family_id))

    if (!hasSharedFamily) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('long_term_tasks')
    .insert({
      user_id: targetUserId,
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
