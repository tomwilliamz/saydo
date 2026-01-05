'use client'

import { useEffect, useState, useCallback } from 'react'
import { requestNotificationPermission, getFirebaseMessaging, onMessage } from '@/lib/firebase'
import { updateDeviceFcmToken } from '@/lib/device'

export function useFcm(deviceId: string | null) {
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    if (!deviceId || typeof window === 'undefined') return

    // Check current permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('FCM SW registered:', registration.scope)
        })
        .catch((err) => {
          console.error('FCM SW registration failed:', err)
        })
    }
  }, [deviceId])

  const requestPermission = useCallback(async () => {
    if (!deviceId) return null

    const token = await requestNotificationPermission()
    if (token) {
      setFcmToken(token)
      setPermissionStatus('granted')
      // Save token to database
      await updateDeviceFcmToken(deviceId, token)
      console.log('FCM token saved:', token.substring(0, 20) + '...')
    }
    return token
  }, [deviceId])

  // Listen for foreground messages (just for logging - Realtime handles UI)
  useEffect(() => {
    if (!deviceId || typeof window === 'undefined') return

    const messaging = getFirebaseMessaging()
    if (!messaging) return

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('FCM foreground message:', payload)
      // Foreground messages are handled by the Realtime subscription
    })

    return () => unsubscribe()
  }, [deviceId])

  return { fcmToken, permissionStatus, requestPermission }
}
