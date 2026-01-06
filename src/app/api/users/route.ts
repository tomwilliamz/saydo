import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET current user's profile
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also get user's families
  const { data: families } = await supabase
    .from('family_members')
    .select(
      `
      family_id,
      joined_at,
      families (
        id,
        name,
        invite_code,
        created_at
      )
    `
    )
    .eq('user_id', user.id)

  return NextResponse.json({
    profile,
    families: families?.map((f) => f.families) || [],
    auth_user: { email: user.email, id: user.id },
  })
}

// POST to create user profile (onboarding) or associate with pre-created user
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already has a profile linked to their auth id
  const { data: existingProfile } = await supabase.from('users').select('id').eq('id', user.id).single()

  if (existingProfile) {
    return NextResponse.json({ error: 'Profile already exists' }, { status: 400 })
  }

  // Check if there's a pre-created user with this email (created by admin)
  const { data: preCreatedUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .single()

  if (preCreatedUser) {
    // Update the pre-created user's id to the actual auth user id
    const oldId = preCreatedUser.id
    const { data: profile, error } = await supabase
      .from('users')
      .update({ id: user.id })
      .eq('id', oldId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update any family_members references
    await supabase.from('family_members').update({ user_id: user.id }).eq('user_id', oldId)

    // Update any other tables that reference this user
    await supabase.from('schedule').update({ user_id: user.id }).eq('user_id', oldId)
    await supabase.from('completions').update({ user_id: user.id }).eq('user_id', oldId)
    await supabase.from('long_term_tasks').update({ user_id: user.id }).eq('user_id', oldId)
    await supabase.from('activities').update({ user_id: user.id }).eq('user_id', oldId)

    return NextResponse.json({ profile, associated: true })
  }

  // No pre-created user - create a new profile
  const body = await request.json()
  const { display_name, cycle_weeks = 1 } = body

  if (!display_name || display_name.trim().length === 0) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  if (cycle_weeks < 1 || cycle_weeks > 4) {
    return NextResponse.json({ error: 'Cycle weeks must be between 1 and 4' }, { status: 400 })
  }

  // Create the profile
  const { data: profile, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email!.toLowerCase(),
      display_name: display_name.trim(),
      cycle_weeks,
      cycle_start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Seed default personal activities for new users
  const defaultActivities = [
    // Home tasks - common rooms
    { name: 'Kitchen', type: 'Home', default_minutes: 15, user_id: user.id, is_rota: false },
    { name: 'Living Room', type: 'Home', default_minutes: 15, user_id: user.id, is_rota: false },
    { name: 'Bathroom', type: 'Home', default_minutes: 10, user_id: user.id, is_rota: false },
    { name: 'Bedroom', type: 'Home', default_minutes: 10, user_id: user.id, is_rota: false },
    // Body
    { name: 'Exercise', type: 'Body', default_minutes: 30, user_id: user.id, is_rota: false },
    // Brain
    { name: 'Read', type: 'Brain', default_minutes: 20, user_id: user.id, is_rota: false },
    // Downtime
    { name: 'Family Time', type: 'Downtime', default_minutes: 30, user_id: user.id, is_rota: false },
  ]

  await supabase.from('activities').insert(defaultActivities)

  return NextResponse.json({ profile })
}

// PATCH to update user profile
export async function PATCH(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.display_name !== undefined) {
    if (body.display_name.trim().length === 0) {
      return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 })
    }
    updates.display_name = body.display_name.trim()
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url
  }

  if (body.cycle_weeks !== undefined) {
    if (body.cycle_weeks < 1 || body.cycle_weeks > 4) {
      return NextResponse.json({ error: 'Cycle weeks must be between 1 and 4' }, { status: 400 })
    }
    updates.cycle_weeks = body.cycle_weeks
  }

  if (body.cycle_start_date !== undefined) {
    updates.cycle_start_date = body.cycle_start_date
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const { data: profile, error } = await supabase.from('users').update(updates).eq('id', user.id).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
