'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type OnboardingStep = 'profile' | 'family'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [step, setStep] = useState<OnboardingStep>('profile')

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [cycleWeeks, setCycleWeeks] = useState(1)

  // Family fields
  const [familyChoice, setFamilyChoice] = useState<'create' | 'join' | 'skip'>('skip')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()

      if (data.profile) {
        // Already has a profile, redirect to home
        router.push('/')
        return
      }

      setUserEmail(data.auth_user?.email || null)

      // Check if there's a pre-created user with this email - try to associate
      if (data.auth_user?.email) {
        const associateRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Empty body - will use pre-created profile if exists
        })
        const associateData = await associateRes.json()

        if (associateData.associated) {
          // Successfully associated with pre-created user, go to family step or home
          if (associateData.profile) {
            // Check if user is already in a family
            const familyRes = await fetch('/api/families')
            const familyData = await familyRes.json()
            if (familyData.families?.length > 0) {
              router.push('/')
              return
            }
            // No family yet, show family step
            setStep('family')
            setLoading(false)
            return
          }
        }

        // Pre-fill display name from email for new users
        const emailName = data.auth_user.email.split('@')[0]
        // Capitalize first letter
        setDisplayName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
      }

      setLoading(false)
    } catch {
      setError('Failed to load profile')
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          cycle_weeks: cycleWeeks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setSubmitting(false)
        return
      }

      // Move to family step
      setStep('family')
      setSubmitting(false)
    } catch {
      setError('Failed to create profile')
      setSubmitting(false)
    }
  }

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (familyChoice === 'create') {
        const res = await fetch('/api/families', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: familyName }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error)
          setSubmitting(false)
          return
        }
      } else if (familyChoice === 'join') {
        const res = await fetch('/api/families/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite_code: inviteCode }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error)
          setSubmitting(false)
          return
        }
      }

      // Success - redirect to home
      router.push('/')
    } catch {
      setError('Failed to set up family')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            Welcome to Say Do
          </h1>
          <p className="text-xl text-gray-400">{step === 'profile' ? "Let's set up your profile" : 'Join or create a family'}</p>
          {userEmail && <p className="text-sm text-gray-500 mt-2">Signed in as {userEmail}</p>}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step === 'profile' ? 'bg-blue-500' : 'bg-blue-500/30'}`} />
          <div className={`w-3 h-3 rounded-full ${step === 'family' ? 'bg-blue-500' : 'bg-blue-500/30'}`} />
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl mb-8">{error}</div>}

        {step === 'profile' ? (
          <form onSubmit={handleProfileSubmit} className="w-full max-w-md">
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="mb-8">
                <label className="block text-gray-300 text-sm font-medium mb-2">Schedule Cycle Length</label>
                <select
                  value={cycleWeeks}
                  onChange={(e) => setCycleWeeks(Number(e.target.value))}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
                <p className="text-gray-500 text-xs mt-2">Your schedule will repeat every {cycleWeeks} week{cycleWeeks > 1 ? 's' : ''}</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !displayName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFamilySubmit} className="w-full max-w-md">
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="space-y-4 mb-6">
                {/* Create family option */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    familyChoice === 'create' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="familyChoice"
                      value="create"
                      checked={familyChoice === 'create'}
                      onChange={() => setFamilyChoice('create')}
                      className="text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Create a new family</p>
                      <p className="text-gray-500 text-sm">Start a family group others can join</p>
                    </div>
                  </div>
                  {familyChoice === 'create' && (
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      className="mt-3 w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder="Family name (e.g., The Smiths)"
                    />
                  )}
                </label>

                {/* Join family option */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    familyChoice === 'join' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="familyChoice"
                      value="join"
                      checked={familyChoice === 'join'}
                      onChange={() => setFamilyChoice('join')}
                      className="text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Join an existing family</p>
                      <p className="text-gray-500 text-sm">Enter an invite code to join</p>
                    </div>
                  </div>
                  {familyChoice === 'join' && (
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="mt-3 w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                      placeholder="Enter invite code"
                    />
                  )}
                </label>

                {/* Skip option */}
                <label
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    familyChoice === 'skip' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="familyChoice"
                      value="skip"
                      checked={familyChoice === 'skip'}
                      onChange={() => setFamilyChoice('skip')}
                      className="text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Skip for now</p>
                      <p className="text-gray-500 text-sm">You can create or join a family later</p>
                    </div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  (familyChoice === 'create' && !familyName.trim()) ||
                  (familyChoice === 'join' && !inviteCode.trim())
                }
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Setting up...' : familyChoice === 'skip' ? 'Get Started' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        <p className="text-gray-500 text-sm mt-8 max-w-md text-center">
          {step === 'profile'
            ? 'You can change these settings anytime from the admin page.'
            : 'Families let you share activities and track progress together.'}
        </p>
      </div>
    </div>
  )
}
