'use client'

import { useState, useEffect } from 'react'

interface DurationModalProps {
  isOpen: boolean
  initialMinutes: number
  activityName: string
  onConfirm: (minutes: number) => void
  onCancel: () => void
}

export default function DurationModal({
  isOpen,
  initialMinutes,
  activityName,
  onConfirm,
  onCancel,
}: DurationModalProps) {
  // Store as "H:MM" or just minutes string
  const [display, setDisplay] = useState('')
  const [hasColon, setHasColon] = useState(false)

  // Initialize display when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplay(String(initialMinutes))
      setHasColon(false)
    }
  }, [isOpen, initialMinutes])

  if (!isOpen) return null

  const handleDigit = (digit: string) => {
    if (hasColon) {
      // In H:MM mode - limit minutes part to 2 digits
      const parts = display.split(':')
      const minsPart = parts[1] || ''
      if (minsPart.length < 2) {
        setDisplay(display + digit)
      }
    } else {
      // In minutes mode - limit to 3 digits
      if (display.length < 3) {
        setDisplay(display + digit)
      }
    }
  }

  const handleColon = () => {
    if (hasColon) return // Already has colon
    // Convert current display to hours part
    setDisplay(display + ':')
    setHasColon(true)
  }

  const handleBackspace = () => {
    const newDisplay = display.slice(0, -1)
    setDisplay(newDisplay)
    setHasColon(newDisplay.includes(':'))
  }

  const handleClear = () => {
    setDisplay('')
    setHasColon(false)
  }

  const getTotalMinutes = () => {
    if (hasColon) {
      const parts = display.split(':')
      const h = parseInt(parts[0]) || 0
      const m = parseInt(parts[1]) || 0
      return h * 60 + m
    }
    return parseInt(display) || 0
  }

  const getDisplayFormatted = () => {
    if (!display) return '0'
    return display
  }

  const handleConfirm = () => {
    onConfirm(getTotalMinutes())
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-6 w-full max-w-sm mx-4"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            {activityName}
          </h2>
          <p className="text-gray-400">How long did this take?</p>
        </div>

        {/* Display */}
        <div className="bg-gray-700/50 rounded-xl p-4 mb-6 text-center border border-gray-600/50">
          <div className="text-5xl font-bold text-white font-mono tabular-nums">
            {getDisplayFormatted()}
          </div>
          <div className="text-gray-400 mt-1">
            {hasColon ? 'hours : minutes' : 'minutes'}
          </div>
        </div>

        {/* Keypad - 4 columns */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {['1', '2', '3', 'C', '4', '5', '6', ':', '7', '8', '9', '⌫', '', '0', '', ''].map((key, idx) => {
            if (key === '') {
              return <div key={idx} />
            }
            if (key === 'C') {
              return (
                <button
                  key={idx}
                  onClick={handleClear}
                  className="h-14 text-xl font-semibold text-red-400 bg-red-500/20 rounded-xl border border-red-500/30
                    hover:bg-red-500/30 active:bg-red-500/40 transition-colors"
                >
                  C
                </button>
              )
            }
            if (key === ':') {
              return (
                <button
                  key={idx}
                  onClick={handleColon}
                  className={`h-14 text-2xl font-bold rounded-xl transition-colors ${
                    hasColon
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/50'
                  }`}
                  disabled={hasColon}
                >
                  :
                </button>
              )
            }
            if (key === '⌫') {
              return (
                <button
                  key={idx}
                  onClick={handleBackspace}
                  className="h-14 text-xl font-semibold text-gray-300 bg-gray-700/50 rounded-xl border border-gray-600/50
                    hover:bg-gray-600/50 active:bg-gray-500/50 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6 mx-auto"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"
                    />
                  </svg>
                </button>
              )
            }
            return (
              <button
                key={idx}
                onClick={() => handleDigit(key)}
                className="h-14 text-2xl font-semibold text-white bg-gray-700/50 rounded-xl border border-gray-600/50
                  hover:bg-gray-600/50 active:bg-gray-500/50 transition-colors"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-gray-300 font-semibold rounded-xl
              bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 text-white font-bold rounded-xl
              bg-gradient-to-r from-green-500 to-emerald-600
              hover:from-green-600 hover:to-emerald-700
              shadow-lg shadow-green-500/30 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
