import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('activities')
    .update({
      name: body.name,
      type: body.type,
      default_minutes: body.default_minutes,
      description: body.description,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.type !== undefined) updateData.type = body.type
  if (body.default_minutes !== undefined) updateData.default_minutes = body.default_minutes
  if (body.description !== undefined) updateData.description = body.description
  if (body.repeat_pattern !== undefined) updateData.repeat_pattern = body.repeat_pattern
  if (body.is_rota !== undefined) updateData.is_rota = body.is_rota

  const { data, error } = await supabase
    .from('activities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // First, delete all schedule entries for this activity
  const { error: scheduleError } = await supabase
    .from('schedule')
    .delete()
    .eq('activity_id', id)

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 })
  }

  // Then delete the activity itself
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
