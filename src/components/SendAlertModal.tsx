'use client'

import { useState, useEffect } from 'react'
import { useAlerts } from './AlertProvider'
import { fetchAllDevices } from '@/lib/device'
import { playUrgentChime } from '@/lib/audio'
import type { Device } from '@/lib/types'

// Preset messages for quick sending
const PRESET_MESSAGES = [
  { label: 'Call Daddy ASAP', message: 'Call Daddy ASAP', emoji: '📞' },
  { label: 'Boys!! Dinner time!', message: 'Boys!! Dinner time!', emoji: '🍽️' },
  { label: 'Ivor! please get in the shower', message: 'Ivor! please get in the shower', emoji: '🚿' },
]

// Check if device is online (active in last 10 minutes)
function isDeviceOnline(device: Device): boolean {
  const lastActive = new Date(device.last_active_at).getTime()
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  return lastActive > tenMinutesAgo
}

interface SendAlertModalProps {
  onClose: () => void
}

export default function SendAlertModal({ onClose }: SendAlertModalProps) {
  const { deviceId, deviceName, sendAlert } = useAlerts()
  const [devices, setDevices] = useState<Device[]>([])
  const [targetDeviceId, setTargetDeviceId] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchAllDevices().then(setDevices)
  }, [])

  // Filter out current device from target list
  const otherDevices = devices.filter((d) => d.id !== deviceId)

  const handleSendPreset = async (message: string) => {
    setIsSending(true)
    try {
      await sendAlert(message, targetDeviceId)
      onClose() // Close modal after sending
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
      onClose() // Close modal after sending
    } catch (error) {
      console.error('Failed to send alert:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{
                background: 'linear-gradient(135deg, #F87171, #B91C1C)',
                boxShadow: '0 0 20px rgba(239,68,68,0.4)',
              }}
            >
              📢
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Send Alert</h2>
              <p className="text-sm text-gray-400">
                From: {deviceName || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => playUrgentChime()}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:bg-gray-600/50 transition-colors"
            >
              🔊 Test
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Target device selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Send to:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTargetDeviceId(null)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                targetDeviceId === null
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/50'
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
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    targetDeviceId === device.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : online
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/50'
                        : 'bg-gray-800/30 text-gray-500 border border-gray-700/30 cursor-not-allowed'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${online ? 'bg-green-400' : 'bg-gray-600'}`} />
                  {device.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preset messages - Big buttons */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Quick alerts:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRESET_MESSAGES.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSendPreset(preset.message)}
                disabled={isSending}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-red-500 to-orange-600 text-white font-semibold rounded-2xl
                  hover:from-red-600 hover:to-orange-700 active:from-red-700 active:to-orange-800
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all
                  shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105"
              >
                <span className="text-3xl">{preset.emoji}</span>
                <span className="text-sm">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom message */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Custom message:
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-5 py-4 text-lg text-white bg-gray-700/50 rounded-xl border border-gray-600/50
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendCustom()
              }}
            />
            <button
              onClick={handleSendCustom}
              disabled={isSending || !customMessage.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl
                hover:from-blue-600 hover:to-indigo-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                shadow-lg shadow-blue-500/30"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
