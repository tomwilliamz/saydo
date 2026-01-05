import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST to join a family by invite code
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
  const { invite_code } = body

  if (!invite_code || invite_code.trim().length === 0) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  // Find family by invite code
  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, name')
    .eq('invite_code', invite_code.trim())
    .single()

  if (familyError || !family) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('family_id', family.id)
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    return NextResponse.json({ error: 'Already a member of this family' }, { status: 400 })
  }

  // Join the family
  const { error: joinError } = await supabase.from('family_members').insert({
    family_id: family.id,
    user_id: user.id,
  })

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  return NextResponse.json({ family, message: `Joined ${family.name}!` })
}
