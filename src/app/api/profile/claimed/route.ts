import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET all claimed profiles (to show which people are taken)
export async function GET() {
  const supabase = await createClient()

  const { data: claimed, error } = await supabase
    .from('user_profiles')
    .select('person, email')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ claimed: claimed || [] })
}
