'use client'

import { useEffect, useRef, useState } from 'react'
import { playUrgentChime } from '@/lib/audio'
import type { Alert } from '@/lib/types'

interface AlertOverlayProps {
  alert: Alert
  onDismiss: () => void
}

export default function AlertOverlay({ alert, onDismiss }: AlertOverlayProps) {
  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // Try to play chime - if blocked, user needs to tap first
  const tryPlayChime = () => {
    try {
      playUrgentChime()
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
    // Try to play immediately (may be blocked)
    tryPlayChime()

    // Set up interval for repeating chime every 30 seconds
    chimeIntervalRef.current = setInterval(() => {
      if (audioUnlocked) {
        playUrgentChime()
      }
    }, 30000)

    return () => {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current)
      }
    }
  }, [alert.id, audioUnlocked])

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
