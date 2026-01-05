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

// POST to create a new user and add to family (or add existing user to family)
// Any authenticated user can create new users in their families
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
  const { email, display_name, avatar_url, cycle_weeks = 1, family_id } = body

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  if (!family_id) {
    return NextResponse.json({ error: 'Family ID is required' }, { status: 400 })
  }

  if (!display_name || display_name.trim().length === 0) {
    return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
  }

  if (cycle_weeks < 1 || cycle_weeks > 4) {
    return NextResponse.json({ error: 'Cycle weeks must be between 1 and 4' }, { status: 400 })
  }

  // Use the SECURITY DEFINER function to create user and add to family
  const { data: result, error } = await supabase.rpc('create_user_in_family', {
    p_email: email,
    p_display_name: display_name,
    p_family_id: family_id,
    p_avatar_url: avatar_url || null,
    p_cycle_weeks: cycle_weeks,
  })

  if (error) {
    if (error.message.includes('not a member')) {
      return NextResponse.json({ error: 'You are not a member of this family' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const newUser = result[0]
  return NextResponse.json({
    user: newUser,
    already_existed: newUser.already_existed,
  })
}

// PATCH to update a family member's profile
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
  const { user_id, display_name, avatar_url } = body

  if (!user_id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // Use the SECURITY DEFINER function to update family member
  const { data: result, error } = await supabase.rpc('update_family_member', {
    p_user_id: user_id,
    p_display_name: display_name || null,
    p_avatar_url: avatar_url !== undefined ? avatar_url : null,
  })

  if (error) {
    if (error.message.includes('not in the same family')) {
      return NextResponse.json({ error: 'You are not in the same family as this user' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: result[0] })
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
