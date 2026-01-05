'use client'

import { useEffect, useRef, useState } from 'react'
import { playUrgentChime, playEscalatedAlarm } from '@/lib/audio'
import type { Alert } from '@/lib/types'

const MAX_ALERT_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const ESCALATION_THRESHOLD_MS = 60 * 1000 // 1 minute
const NORMAL_INTERVAL_MS = 5000 // 5 seconds between chimes
const ESCALATED_INTERVAL_MS = 3000 // 3 seconds between alarms when escalated

interface AlertOverlayProps {
  alert: Alert
  onDismiss: () => void
}

export default function AlertOverlay({ alert, onDismiss }: AlertOverlayProps) {
  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [isEscalated, setIsEscalated] = useState(false)

  // Play the appropriate sound based on escalation state
  const playSound = (escalated: boolean) => {
    if (escalated) {
      playEscalatedAlarm()
    } else {
      playUrgentChime()
    }
  }

  // Try to play chime - if blocked, user needs to tap first
  const tryPlayChime = () => {
    try {
      playSound(isEscalated)
      setAudioUnlocked(true)
    } catch {
      // Audio blocked, will work after user interaction
    }
  }

  // Unlock audio on any tap
  const handleTap = () => {
    if (!audioUnlocked) {
      tryPlayChime()
    }
  }

  useEffect(() => {
    startTimeRef.current = Date.now()

    // Try to play immediately (may be blocked)
    tryPlayChime()

    const runChimeLoop = () => {
      const elapsed = Date.now() - startTimeRef.current

      // Stop after max duration
      if (elapsed >= MAX_ALERT_DURATION_MS) {
        if (chimeIntervalRef.current) {
          clearInterval(chimeIntervalRef.current)
        }
        return
      }

      // Check if we should escalate
      const shouldEscalate = elapsed >= ESCALATION_THRESHOLD_MS
      if (shouldEscalate && !isEscalated) {
        setIsEscalated(true)
      }

      if (audioUnlocked) {
        playSound(shouldEscalate)
      }
    }

    // Start with normal interval, will switch to escalated interval when needed
    const getInterval = () => isEscalated ? ESCALATED_INTERVAL_MS : NORMAL_INTERVAL_MS

    chimeIntervalRef.current = setInterval(runChimeLoop, getInterval())

    return () => {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current)
      }
    }
  }, [alert.id, audioUnlocked, isEscalated])

  const fromDevice = alert.from_device?.name || 'Unknown device'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.95), rgba(185,28,28,0.98))',
      }}
      onClick={handleTap}
    >
      {/* Pulsing overlay effect */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative text-center px-8 max-w-2xl">
        {/* Alert icon */}
        <div className="text-8xl mb-6 animate-bounce">
          🔔
        </div>

        {/* Message */}
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          {alert.message}
        </h1>

        {/* From device */}
        <p className="text-xl text-white/80 mb-12">
          From: {fromDevice}
        </p>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="px-16 py-6 text-2xl font-bold text-red-600 bg-white rounded-2xl shadow-2xl hover:bg-gray-100 active:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
        >
          OK
        </button>

        {/* Tap anywhere hint */}
        <p className="mt-8 text-white/60 text-lg">
          {audioUnlocked ? 'Tap OK to dismiss' : 'Tap anywhere to enable sound'}
        </p>
      </div>
    </div>
  )
}
