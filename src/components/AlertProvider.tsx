'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getStoredDeviceId, getStoredDeviceName, storeDevice, updateDeviceHeartbeat } from '@/lib/device'
import { useFcm } from '@/hooks/useFcm'
import type { Alert } from '@/lib/types'
import DeviceSetup from './DeviceSetup'
import AlertOverlay from './AlertOverlay'
import NotificationPermission from './NotificationPermission'

interface AlertContextValue {
  deviceId: string | null
  deviceName: string | null
  activeAlert: Alert | null
  sendAlert: (message: string, toDeviceId?: string | null) => Promise<void>
  dismissAlert: () => Promise<void>
}

const AlertContext = createContext<AlertContextValue | null>(null)

export function useAlerts() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider')
  }
  return context
}

interface AlertProviderProps {
  children: ReactNode
}

export default function AlertProvider({ children }: AlertProviderProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [showDeviceSetup, setShowDeviceSetup] = useState(false)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // FCM hook for push notifications
  const { permissionStatus, requestPermission } = useFcm(deviceId)

  // Initialize device from localStorage
  useEffect(() => {
    const storedId = getStoredDeviceId()
    const storedName = getStoredDeviceName()

    if (storedId && storedName) {
      setDeviceId(storedId)
      setDeviceName(storedName)
      // Verify device still exists in DB
      fetch(`/api/devices/${storedId}`)
        .then((res) => {
          if (!res.ok) {
            // Device was deleted, clear storage and show setup
            setDeviceId(null)
            setDeviceName(null)
            setShowDeviceSetup(true)
          }
        })
        .catch(() => {
          // Network error, keep local data
        })
    } else {
      setShowDeviceSetup(true)
    }
    setIsInitialized(true)
  }, [])

  // Heartbeat to update last_active_at
  useEffect(() => {
    if (!deviceId) return

    // Update immediately
    updateDeviceHeartbeat(deviceId)

    // Then every 5 minutes
    const interval = setInterval(() => {
      updateDeviceHeartbeat(deviceId)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [deviceId])

  // Fetch active alerts on init
  const fetchActiveAlerts = useCallback(async () => {
    if (!deviceId) return

    try {
      const response = await fetch(`/api/alerts?device_id=${deviceId}`)
      if (response.ok) {
        const alerts = await response.json()
        if (alerts.length > 0) {
          // Show the most recent active alert
          setActiveAlert(alerts[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }, [deviceId])

  useEffect(() => {
    fetchActiveAlerts()
  }, [fetchActiveAlerts])

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!deviceId) return

    const supabase = createClient()

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as Alert
          // Check if this alert is for us (our device or broadcast)
          if (newAlert.to_device_id === null || newAlert.to_device_id === deviceId) {
            // Don't show our own alerts
            if (newAlert.from_device_id !== deviceId) {
              setActiveAlert(newAlert)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts' },
        (payload) => {
          const updatedAlert = payload.new as Alert
          // If the active alert was dismissed, clear it
          if (activeAlert?.id === updatedAlert.id && updatedAlert.status !== 'active') {
            setActiveAlert(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [deviceId, activeAlert?.id])

  const handleDeviceSetupComplete = (id: string, name: string) => {
    storeDevice(id, name)
    setDeviceId(id)
    setDeviceName(name)
    setShowDeviceSetup(false)
    // Show notification permission prompt after device setup
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      setShowNotificationPrompt(true)
    }
  }

  const handleNotificationGranted = async () => {
    await requestPermission()
    setShowNotificationPrompt(false)
  }

  const handleNotificationDismissed = () => {
    setShowNotificationPrompt(false)
  }

  const sendAlert = async (message: string, toDeviceId?: string | null) => {
    if (!deviceId) return

    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_device_id: deviceId,
        to_device_id: toDeviceId || null,
        message,
      }),
    })
  }

  const dismissAlert = async () => {
    if (!activeAlert || !deviceId) return

    try {
      await fetch(`/api/alerts/${activeAlert.id}/dismiss`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dismissed_by_device_id: deviceId,
        }),
      })
      setActiveAlert(null)
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  // Don't render anything until we've checked localStorage
  if (!isInitialized) {
    return null
  }

  return (
    <AlertContext.Provider
      value={{
        deviceId,
        deviceName,
        activeAlert,
        sendAlert,
        dismissAlert,
      }}
    >
      {children}

      {/* Device setup modal */}
      {showDeviceSetup && (
        <DeviceSetup onComplete={handleDeviceSetupComplete} />
      )}

      {/* Notification permission prompt */}
      {showNotificationPrompt && !showDeviceSetup && (
        <NotificationPermission
          onGranted={handleNotificationGranted}
          onDismissed={handleNotificationDismissed}
        />
      )}

      {/* Alert overlay */}
      {activeAlert && !showDeviceSetup && !showNotificationPrompt && (
        <AlertOverlay alert={activeAlert} onDismiss={dismissAlert} />
      )}
    </AlertContext.Provider>
  )
}
