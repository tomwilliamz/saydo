'use client'

import { useState, useEffect } from 'react'
import { formatTimer } from '@/lib/utils'

interface TimerProps {
  startedAt: string
}

export default function Timer({ startedAt }: TimerProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    // Calculate initial seconds
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const initialSeconds = Math.floor((now - start) / 1000)
    setSeconds(initialSeconds)

    // Update every second
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000)
      setSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <span className="font-mono text-lg font-semibold text-blue-600">
      {formatTimer(seconds)}
    </span>
  )
}
