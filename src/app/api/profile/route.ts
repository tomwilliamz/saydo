import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Person
 } from '@/lib/types'

// GET current user's profile
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile, user: { email: user.email } })
}

// POST to create profile (one-time person selection)
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check email domain
  if (!user.email?.endsWith('@cbright.com')) {
    return NextResponse.json({ error: 'Only @cbright.com emails allowed' }, { status: 403 })
  }

  const body = await request.json()
  const person = body.person as Person

  if (!['Thomas', 'Ivor', 'Axel'].includes(person)) {
    return NextResponse.json({ error: 'Invalid person selection' }, { status: 400 })
  }

  // Check if user already has a profile
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: 'Profile already exists' }, { status: 400 })
  }

  // Check if person is already claimed
  const { data: claimedProfile } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('person', person)
    .single()

  if (claimedProfile) {
    return NextResponse.json({
      error: `${person} has already been claimed by another user`
    }, { status: 400 })
  }

  // Create the profile
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      person,
      email: user.email,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
