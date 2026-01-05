import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET all users (for admins)
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if current user is superadmin
  const { data: currentUserProfile } = await supabase.from('users').select('is_superadmin').eq('id', user.id).single()

  if (!currentUserProfile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden - superadmin required' }, { status: 403 })
  }

  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, cycle_weeks, cycle_start_date, is_superadmin, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users })
}

// POST to create a new user (pre-create before they login)
// Any authenticated user can create new users
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { email, display_name, avatar_url, cycle_weeks = 1 } = body

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  if (!display_name || display_name.trim().length === 0) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  if (cycle_weeks < 1 || cycle_weeks > 4) {
    return NextResponse.json({ error: 'Cycle weeks must be between 1 and 4' }, { status: 400 })
  }

  // Check if user with this email already exists
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single()

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
  }

  // Create the user with a placeholder UUID (will be updated when they actually login)
  // The id will be replaced with their actual auth.users id when they login
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      id: crypto.randomUUID(), // Placeholder - will be updated on first login
      email: email.toLowerCase().trim(),
      display_name: display_name.trim(),
      avatar_url: avatar_url || null,
      cycle_weeks,
      cycle_start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: newUser })
}

// DELETE a user
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if current user is superadmin
  const { data: currentUserProfile } = await supabase.from('users').select('is_superadmin').eq('id', user.id).single()

  if (!currentUserProfile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden - superadmin required' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // Don't allow deleting yourself
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const { error } = await supabase.from('users').delete().eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
