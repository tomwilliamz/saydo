import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const completionId = searchParams.get('id')

  if (!completionId) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
  }

  // Get the completion first to verify ownership
  const { data: completion, error: fetchError } = await supabase
    .from('completions')
    .select('user_id')
    .eq('id', completionId)
    .single()

  if (fetchError || !completion) {
    return NextResponse.json({ error: 'Completion not found' }, { status: 404 })
  }

  // Verify permission - must be own completion or share family
  if (completion.user_id !== user.id) {
    const [{ data: myFamilies }, { data: theirFamilies }] = await Promise.all([
      supabase.from('family_members').select('family_id').eq('user_id', user.id),
      supabase.from('family_members').select('family_id').eq('user_id', completion.user_id),
    ])

    const myFamilyIds = new Set(myFamilies?.map((f) => f.family_id) || [])
    const hasSharedFamily = theirFamilies?.some((f) => myFamilyIds.has(f.family_id))

    if (!hasSharedFamily) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('id', completionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

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

  // Also check if there's a deferred completion pointing to this date
  // (this handles completing a task that was deferred from a previous day)
  const { data: deferredExisting } = await supabase
    .from('completions')
    .select('id')
    .eq('activity_id', body.activity_id)
    .eq('user_id', targetUserId)
    .eq('deferred_to', body.date)
    .eq('status', 'deferred')
    .single()

  if (existing) {
    // Update existing completion for this date
    const { data, error } = await supabase
      .from('completions')
      .update({
        status: body.status,
        started_at: body.started_at,
        completed_at: body.completed_at,
        elapsed_ms: body.elapsed_ms ?? null,
        label: body.label ?? null,
        deferred_to: body.deferred_to ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } else if (deferredExisting) {
    // Update the deferred completion - change its date to today and update status
    const { data, error } = await supabase
      .from('completions')
      .update({
        date: body.date, // Move to target date
        status: body.status,
        started_at: body.started_at,
        completed_at: body.completed_at,
        elapsed_ms: body.elapsed_ms ?? null,
        label: body.label ?? null,
        deferred_to: null, // Clear deferred_to since we're acting on it
      })
      .eq('id', deferredExisting.id)
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
        deferred_to: body.deferred_to || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
}
