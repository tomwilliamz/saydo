import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id')

  let query = supabase
    .from('alerts')
    .select('*, from_device:devices!from_device_id(*)')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  // Filter alerts for this device (or broadcast alerts)
  if (deviceId) {
    query = query.or(`to_device_id.eq.${deviceId},to_device_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      from_device_id: body.from_device_id || null,
      to_device_id: body.to_device_id || null,
      message: body.message,
    })
    .select('*, from_device:devices!from_device_id(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send FCM push notification to target devices
  let fcmQuery = supabase
    .from('devices')
    .select('fcm_token')
    .not('fcm_token', 'is', null)

  if (body.to_device_id) {
    // Targeted alert - send to specific device
    fcmQuery = fcmQuery.eq('id', body.to_device_id)
  } else {
    // Broadcast - send to all devices except sender
    if (body.from_device_id) {
      fcmQuery = fcmQuery.neq('id', body.from_device_id)
    }
  }

  const { data: devices } = await fcmQuery

  if (devices && devices.length > 0) {
    const tokens = devices
      .map((d) => d.fcm_token)
      .filter((t): t is string => t !== null)

    if (tokens.length > 0) {
      const fromDevice = data.from_device?.name || 'Someone'
      await sendPushNotification(
        tokens,
        'Alert!',
        `${data.message} (from ${fromDevice})`,
        { alertId: data.id }
      )
    }
  }

  return NextResponse.json(data, { status: 201 })
}
