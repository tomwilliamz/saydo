import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const userId = searchParams.get('user_id')
  const familyId = searchParams.get('family_id')
  const forFamilyMembers = searchParams.get('family_members') === 'true'

  // If family_members=true, get all activities from all family members' libraries + family activities
  if (forFamilyMembers && familyId) {
    // Get all user_ids in this family
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId)

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberIds = members.map((m) => m.user_id)

    // Get activities owned by any family member OR family activities for this family
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .or(`user_id.in.(${memberIds.join(',')}),family_id.eq.${familyId}`)
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Get activities for a specific user's library
  if (userId) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Get family activities only
  if (familyId) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  // Default: return all activities (for backwards compatibility)
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('is_active', true)
    .order('type')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Validate: must have either user_id (personal library) or family_id (family activity)
  if (!body.user_id && !body.family_id) {
    return NextResponse.json(
      { error: 'Activity must have either user_id (personal library) or family_id (family activity)' },
      { status: 400 }
    )
  }

  if (body.user_id && body.family_id) {
    return NextResponse.json(
      { error: 'Activity cannot have both user_id and family_id' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({
      name: body.name,
      type: body.type,
      default_minutes: body.default_minutes || 30,
      description: body.description || null,
      user_id: body.user_id || null,
      family_id: body.family_id || null,
      repeat_pattern: body.repeat_pattern || null,
      is_rota: body.is_rota || false,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
