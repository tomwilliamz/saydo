import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's family memberships
  const { data: memberships } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)

  const familyIds = memberships?.map((m) => m.family_id) || []

  // Get all user_ids in user's families
  let familyUserIds: string[] = [user.id]
  if (familyIds.length > 0) {
    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('user_id')
      .in('family_id', familyIds)

    familyUserIds = [...new Set([user.id, ...(familyMembers?.map((m) => m.user_id) || [])])]
  }

  // Get devices owned by family members only
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .in('user_id', familyUserIds)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
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

  const { data, error } = await supabase
    .from('devices')
    .insert({
      name: body.name,
      fcm_token: body.fcm_token || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
