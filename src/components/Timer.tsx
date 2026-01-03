'use client'

import { useState, useEffect } from 'react'

interface TimerProps {
  startedAt: string
  elapsedMs?: number // Previously accumulated time
}

export default function Timer({ startedAt, elapsedMs = 0 }: TimerProps) {
  const [totalMs, setTotalMs] = useState(0)

  useEffect(() => {
    // Calculate initial milliseconds
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const currentSessionMs = now - start
    setTotalMs(elapsedMs + currentSessionMs)

    // Update every 10ms for hundredths display
    const interval = setInterval(() => {
      const now = Date.now()
      const currentSessionMs = now - start
      setTotalMs(elapsedMs + currentSessionMs)
    }, 10)

    return () => clearInterval(interval)
  }, [startedAt, elapsedMs])

  // Format as mm:ss.cc (minutes:seconds.centiseconds)
  const formatTimer = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    const centiseconds = Math.floor((ms % 1000) / 10)

    return `${mins}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }

  return (
    <span className="font-mono text-3xl font-bold text-blue-600 tabular-nums">
      {formatTimer(totalMs)}
    </span>
  )
}
