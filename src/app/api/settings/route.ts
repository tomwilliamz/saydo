import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('settings')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert array to object for easier access
  const settings: Record<string, string> = {}
  for (const setting of data) {
    settings[setting.key] = setting.value
  }

  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { key, value } = body

  // Upsert the setting
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
