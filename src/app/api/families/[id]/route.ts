import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH to update family settings
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a member of this family
  const { data: membership } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
  }

  const body = await request.json()
  const { rota_cycle_weeks, name, week_nicknames } = body

  // Build update object
  const updates: Record<string, unknown> = {}

  if (rota_cycle_weeks !== undefined) {
    const weeks = Number(rota_cycle_weeks)
    if (weeks < 1 || weeks > 8) {
      return NextResponse.json({ error: 'Rota cycle weeks must be between 1 and 8' }, { status: 400 })
    }
    updates.rota_cycle_weeks = weeks
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Family name cannot be empty' }, { status: 400 })
    }
    updates.name = name.trim()
  }

  if (week_nicknames !== undefined) {
    if (typeof week_nicknames !== 'object') {
      return NextResponse.json({ error: 'Week nicknames must be an object' }, { status: 400 })
    }
    updates.week_nicknames = week_nicknames
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  }

  const { data: family, error: updateError } = await supabase
    .from('families')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ family })
}
