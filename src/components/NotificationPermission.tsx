'use client'

import { useState } from 'react'

interface NotificationPermissionProps {
  onGranted: () => void
  onDismissed: () => void
}

export default function NotificationPermission({
  onGranted,
  onDismissed,
}: NotificationPermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false)

  const handleEnable = async () => {
    setIsRequesting(true)
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      onGranted()
    } else {
      onDismissed()
    }
    setIsRequesting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="rounded-2xl p-8 w-full max-w-md mx-4 bg-slate-800 border border-slate-700">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔔</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Enable Notifications
          </h2>
          <p className="text-gray-400">
            Get alerts even when the app is closed or the screen is off
          </p>
        </div>

        <button
          onClick={handleEnable}
          disabled={isRequesting}
          className="w-full py-4 text-lg font-bold text-white rounded-xl
            bg-gradient-to-r from-blue-500 to-indigo-600
            hover:from-blue-600 hover:to-indigo-700
            disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isRequesting ? 'Requesting...' : 'Enable Notifications'}
        </button>

        <button
          onClick={onDismissed}
          className="w-full py-3 text-gray-400 hover:text-white transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
