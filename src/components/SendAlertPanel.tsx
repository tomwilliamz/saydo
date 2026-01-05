'use client'

import { useState, useEffect } from 'react'
import { useAlerts } from './AlertProvider'
import { fetchAllDevices } from '@/lib/device'
import { playUrgentChime } from '@/lib/audio'
import type { Device } from '@/lib/types'

// Preset messages for quick sending
const PRESET_MESSAGES = [
  { label: 'Call Daddy ASAP', message: 'Call Daddy ASAP' },
  { label: 'Boys!! Dinner time!', message: 'Boys!! Dinner time!' },
  { label: 'Ivor! please get in the shower', message: 'Ivor! please get in the shower' },
]

// Check if device is online (active in last 10 minutes)
function isDeviceOnline(device: Device): boolean {
  const lastActive = new Date(device.last_active_at).getTime()
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  return lastActive > tenMinutesAgo
}

export default function SendAlertPanel() {
  const { deviceId, deviceName, sendAlert } = useAlerts()
  const [devices, setDevices] = useState<Device[]>([])
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)

  useEffect(() => {
    fetchAllDevices().then(setDevices)
  }, [])

  // Filter out current device from target list
  const otherDevices = devices.filter((d) => d.id !== deviceId)

  const handleSendPreset = async (message: string) => {
    setIsSending(true)
    try {
      await sendAlert(message, targetDeviceId)
      setLastSent(message)
      setTimeout(() => setLastSent(null), 3000)
    } catch (error) {
      console.error('Failed to send alert:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSendCustom = async () => {
    if (!customMessage.trim()) return
    setIsSending(true)
    try {
      await sendAlert(customMessage.trim(), targetDeviceId)
      setLastSent(customMessage.trim())
      setCustomMessage('')
      setTimeout(() => setLastSent(null), 3000)
    } catch (error) {
      console.error('Failed to send alert:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📢</span>
          <div>
            <h2 className="text-xl font-bold text-white">Send Alert</h2>
            <p className="text-sm text-gray-400">
              From: {deviceName || 'Unknown'}
            </p>
          </div>
        </div>
        <button
          onClick={() => playUrgentChime()}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:bg-gray-600/50 transition-colors"
        >
          🔊 Test Sound
        </button>
      </div>

      {/* Target device selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Send to:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTargetDeviceId(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              targetDeviceId === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            All Devices
          </button>
          {otherDevices.map((device) => {
            const online = isDeviceOnline(device)
            return (
              <button
                key={device.id}
                onClick={() => online && setTargetDeviceId(device.id)}
                disabled={!online}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  targetDeviceId === device.id
                    ? 'bg-blue-500 text-white'
                    : online
                      ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                      : 'bg-gray-800/30 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-400' : 'bg-gray-600'}`} />
                {device.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preset messages */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick messages:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_MESSAGES.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleSendPreset(preset.message)}
              disabled={isSending}
              className="px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl
                hover:from-red-600 hover:to-orange-600 active:from-red-700 active:to-orange-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                shadow-lg shadow-red-500/20"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Custom message:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 text-white bg-gray-700/50 rounded-xl border border-gray-600/50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendCustom()
            }}
          />
          <button
            onClick={handleSendCustom}
            disabled={isSending || !customMessage.trim()}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl
              hover:bg-blue-600 active:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Success message */}
      {lastSent && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
          Sent: &quot;{lastSent}&quot;
        </div>
      )}
    </div>
  )
}
