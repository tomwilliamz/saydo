import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  // Use the provided user_id or default to authenticated user
  const targetUserId = body.user_id || user.id

  // Verify permission to create/update completions for this user
  if (targetUserId !== user.id) {
    // Check if they share a family - get both users' family memberships
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

  // Check if a completion already exists for this activity/user/date
  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('activity_id', body.activity_id)
    .eq('user_id', targetUserId)
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
        elapsed_ms: body.elapsed_ms ?? null,
        label: body.label ?? null,
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
        user_id: targetUserId,
        date: body.date,
        status: body.status,
        started_at: body.started_at || null,
        completed_at: body.completed_at || null,
        elapsed_ms: body.elapsed_ms ?? null,
        label: body.label ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
}
