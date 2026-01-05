'use client'

import { useState } from 'react'

interface DeviceSetupProps {
  onComplete: (deviceId: string, deviceName: string) => void
}

export default function DeviceSetup({ onComplete }: DeviceSetupProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to register device')
      }

      const device = await response.json()
      onComplete(device.id, device.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = ['Kitchen Tablet', 'Living Room', 'Upstairs Tablet', 'Tom Phone', 'Ivor iPad', 'Axel Tablet']

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-8 w-full max-w-md mx-4"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📱</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Name This Device
          </h2>
          <p className="text-gray-400">
            Give this device a name so you can send alerts to it
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Kitchen Tablet"
            className="w-full px-4 py-4 text-lg text-white bg-gray-700/50 rounded-xl border border-gray-600/50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder-gray-500"
            autoFocus
          />

          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="px-3 py-1.5 text-sm text-gray-300 bg-gray-700/50 rounded-lg border border-gray-600/50
                  hover:bg-gray-600/50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full mt-6 py-4 text-lg font-bold text-white rounded-xl
              bg-gradient-to-r from-blue-500 to-indigo-600
              hover:from-blue-600 hover:to-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-blue-500/30 transition-all"
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
