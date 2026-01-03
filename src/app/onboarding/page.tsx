'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Person } from '@/lib/types'
import Image from 'next/image'

const PEOPLE: { person: Person; color: string; gradient: string }[] = [
  { person: 'Thomas', color: 'blue', gradient: 'from-blue-500 to-blue-700' },
  { person: 'Ivor', color: 'green', gradient: 'from-green-500 to-green-700' },
  { person: 'Axel', color: 'orange', gradient: 'from-orange-500 to-orange-700' },
]

interface ClaimedPerson {
  person: Person
  email: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [claimedPeople, setClaimedPeople] = useState<ClaimedPerson[]>([])

  useEffect(() => {
    checkProfile()
  }, [])

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()

      if (data.profile) {
        // Already has a profile, redirect to home
        router.push('/')
        return
      }

      setUserEmail(data.user?.email || null)

      // Check which people are already claimed
      const claimedRes = await fetch('/api/profile/claimed')
      const claimedData = await claimedRes.json()
      setClaimedPeople(claimedData.claimed || [])

      setLoading(false)
    } catch {
      setError('Failed to load profile')
      setLoading(false)
    }
  }

  const handleSelect = async (person: Person) => {
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setSubmitting(false)
        return
      }

      // Success - redirect to home
      router.push('/')
    } catch {
      setError('Failed to save selection')
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

  const isPersonClaimed = (person: Person) =>
    claimedPeople.some((c) => c.person === person)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            Welcome to Say Do
          </h1>
          <p className="text-xl text-gray-400">
            Who are you?
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-2">
              Signed in as {userEmail}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          {PEOPLE.map(({ person, gradient }) => {
            const claimed = isPersonClaimed(person)
            const claimedBy = claimedPeople.find((c) => c.person === person)

            return (
              <button
                key={person}
                onClick={() => !claimed && !submitting && handleSelect(person)}
                disabled={claimed || submitting}
                className={`relative group transition-all duration-300 ${
                  claimed
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 cursor-pointer'
                }`}
              >
                <div
                  className="rounded-3xl p-8 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
                    boxShadow: claimed
                      ? 'none'
                      : '0 25px 50px -12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Avatar */}
                  <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${gradient} p-1`}>
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                      <Image
                        src={`/avatars/${person.toLowerCase()}.jpg`}
                        alt={person}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image not found
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <span className="hidden text-4xl font-bold text-white">
                        {person[0]}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h2 className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}>
                    {person}
                  </h2>

                  {/* Status */}
                  {claimed ? (
                    <p className="text-gray-500 text-sm">
                      Already claimed
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm group-hover:text-white transition-colors">
                      Click to select
                    </p>
                  )}
                </div>

                {/* Selection indicator */}
                {!claimed && !submitting && (
                  <div className={`absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/30 transition-all pointer-events-none`} />
                )}
              </button>
            )
          })}
        </div>

        <p className="text-gray-500 text-sm mt-12 max-w-md text-center">
          This selection is permanent and associates your Google account with this family member.
        </p>
      </div>
    </div>
  )
}
