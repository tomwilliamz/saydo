import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET user's families with members
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Allow fetching families for a specific user (must be in same family as auth user)
  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get('user_id') || user.id

  // Get all families the target user belongs to, with members
  const { data: memberships, error } = await supabase
    .from('family_members')
    .select(
      `
      family_id,
      joined_at,
      families (
        id,
        name,
        invite_code,
        rota_cycle_weeks,
        week_nicknames,
        created_at
      )
    `
    )
    .eq('user_id', targetUserId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For each family, get all members with their user profiles
  const familiesWithMembers = await Promise.all(
    (memberships || []).map(async (m) => {
      // Supabase returns nested relation as object for single, array for multiple
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const familyData = m.families as any
      const family = Array.isArray(familyData) ? familyData[0] : familyData

      if (!family) return null

      const { data: members } = await supabase
        .from('family_members')
        .select(
          `
          user_id,
          joined_at,
          users (
            id,
            email,
            display_name,
            avatar_url,
            cycle_weeks,
            cycle_start_date
          )
        `
        )
        .eq('family_id', family.id)

      return {
        id: family.id as string,
        name: family.name as string,
        invite_code: family.invite_code as string,
        rota_cycle_weeks: (family.rota_cycle_weeks as number) || 4,
        week_nicknames: (family.week_nicknames as Record<string, string>) || {},
        created_at: family.created_at as string,
        members:
          members?.map((member) => ({
            user_id: member.user_id,
            joined_at: member.joined_at,
            user: member.users,
          })) || [],
      }
    })
  )

  // Filter out null entries
  const validFamilies = familiesWithMembers.filter(Boolean)

  return NextResponse.json({ families: validFamilies })
}

// POST to create a new family
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
  const { name } = body

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
  }

  // Create the family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name: name.trim(),
    })
    .select()
    .single()

  if (familyError) {
    return NextResponse.json({ error: familyError.message }, { status: 500 })
  }

  // Add creator as a member
  const { error: memberError } = await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: user.id,
  })

  if (memberError) {
    // Rollback family creation
    await supabase.from('families').delete().eq('id', family.id)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ family })
}
