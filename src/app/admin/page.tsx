'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, Family, getUserColor } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface FamilyWithMembers extends Family {
  members: { user_id: string; user: User }[]
}

interface AdminUser {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  cycle_weeks: number
  cycle_start_date: string
  is_superadmin: boolean
  created_at: string
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [families, setFamilies] = useState<FamilyWithMembers[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateFamily, setShowCreateFamily] = useState(false)
  const [showJoinFamily, setShowJoinFamily] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState<string | null>(null) // family_id or null
  const [editingMember, setEditingMember] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newFamilyName, setNewFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserAvatar, setNewUserAvatar] = useState('')
  const [newUserCycleWeeks, setNewUserCycleWeeks] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [userRes, familiesRes] = await Promise.all([fetch('/api/users'), fetch('/api/families')])

      const userData = await userRes.json()
      const familiesData = await familiesRes.json()

      setCurrentUser(userData.profile)
      setFamilies(familiesData.families || [])

      // If superadmin, also fetch all users
      if (userData.profile?.is_superadmin) {
        const usersRes = await fetch('/api/users/admin')
        const usersData = await usersRes.json()
        if (usersData.users) {
          setAllUsers(usersData.users)
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFamilyName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(`Created "${data.family.name}"! Share the invite code: ${data.family.invite_code}`)
      setShowCreateFamily(false)
      setNewFamilyName('')
      fetchData()
    } catch {
      setError('Failed to create family')
    }
  }

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(data.message)
      setShowJoinFamily(false)
      setInviteCode('')
      fetchData()
    } catch {
      setError('Failed to join family')
    }
  }

  const handleUpdateCycle = async (cycleWeeks: number) => {
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_weeks: cycleWeeks }),
      })
      setCurrentUser((prev) => (prev ? { ...prev, cycle_weeks: cycleWeeks } : null))
      setSuccess('Cycle updated!')
    } catch {
      setError('Failed to update cycle')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!showCreateUser) return

    try {
      const res = await fetch('/api/users/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          display_name: newUserName,
          avatar_url: newUserAvatar || null,
          cycle_weeks: newUserCycleWeeks,
          family_id: showCreateUser,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      if (data.already_existed) {
        setSuccess(`Added "${data.user.display_name}" to the family`)
      } else {
        setSuccess(`Created "${data.user.display_name}" and added to family - they can login with ${data.user.email}`)
      }
      setShowCreateUser(null)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserAvatar('')
      setNewUserCycleWeeks(1)
      fetchData()
    } catch {
      setError('Failed to create user')
    }
  }

  const handleEditMember = (member: User) => {
    setEditingMember(member)
    setEditName(member.display_name)
    setEditAvatar(member.avatar_url || '')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingMember) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${editingMember.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setEditAvatar(publicUrl)
    } catch {
      setError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setError(null)

    try {
      const res = await fetch('/api/users/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editingMember.id,
          display_name: editName,
          avatar_url: editAvatar || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(`Updated "${data.user.display_name}"`)
      setEditingMember(null)
      setEditName('')
      setEditAvatar('')
      fetchData()
    } catch {
      setError('Failed to update member')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return
    }

    setError(null)

    try {
      const res = await fetch(`/api/users/admin?id=${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      setSuccess(`Deleted user "${userName}"`)
      fetchData()
    } catch {
      setError('Failed to delete user')
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            &larr; Back to Home
          </Link>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Status messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl">
            {success}
            <button onClick={() => setSuccess(null)} className="float-right text-green-400 hover:text-green-300">
              &times;
            </button>
          </div>
        )}

        {/* Profile Section */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Your Profile</h2>
          {currentUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-br ${getUserColor(0).gradient}`}
                >
                  {currentUser.display_name[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium text-lg">{currentUser.display_name}</div>
                  <div className="text-gray-400 text-sm">{currentUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-gray-400">Schedule Cycle:</label>
                <select
                  value={currentUser.cycle_weeks}
                  onChange={(e) => handleUpdateCycle(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Families Section */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Families</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinFamily(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Join Family
              </button>
              <button
                onClick={() => setShowCreateFamily(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
              >
                Create Family
              </button>
            </div>
          </div>

          {families.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              You're not in any families yet. Create or join one to share activities with others!
            </p>
          ) : (
            <div className="space-y-4">
              {families.map((family) => (
                <div key={family.id} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium">{family.name}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Invite code:</span>
                      <code className="bg-gray-700 px-2 py-1 rounded text-blue-400 font-mono">{family.invite_code}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(family.invite_code)}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Copy code"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-gray-400 text-sm">Members:</span>
                    {family.members.map((member, idx) => (
                      <button
                        key={member.user_id}
                        onClick={() => member.user && handleEditMember(member.user)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${getUserColor(idx).gradient} hover:ring-2 hover:ring-white/50 transition-all cursor-pointer overflow-hidden`}
                        title={`Edit ${member.user?.display_name}`}
                      >
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt={member.user.display_name} className="w-full h-full object-cover" />
                        ) : (
                          member.user?.display_name?.[0]?.toUpperCase() || '?'
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowCreateUser(family.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 border border-dashed border-gray-600 transition-colors"
                      title="Add member"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Manage Users Section (Superadmin only) */}
        {currentUser?.is_superadmin && (
          <section
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">All Users</h2>

            {allUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No users found.</p>
            ) : (
              <div className="space-y-3">
                {allUsers.map((u, idx) => (
                  <div key={u.id} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${getUserColor(idx).gradient}`}
                        >
                          {u.display_name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{u.display_name}</span>
                          {u.is_superadmin && (
                            <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">Admin</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-sm">{u.cycle_weeks}w cycle</span>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.display_name)}
                          className="text-red-400 hover:text-red-300 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Schedule Coming Soon */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Schedule Grid</h2>
          <p className="text-gray-400 text-center py-8">
            Schedule management is being updated. Check back soon!
          </p>
        </section>
      </div>

      {/* Create Family Modal */}
      {showCreateFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateFamily} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Create a Family</h2>
            <input
              type="text"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="Family name (e.g., The Smiths)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreateFamily(false)} className="flex-1 py-2 text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFamilyName.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Family Modal */}
      {showJoinFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleJoinFamily} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Join a Family</h2>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4 font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowJoinFamily(false)} className="flex-1 py-2 text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inviteCode.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateUser} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Add Member to Family</h2>
            <p className="text-gray-400 text-sm mb-4">
              Add a new member. If the email already exists, they'll be added to this family. Otherwise, a new account will be created.
            </p>

            <div className="space-y-4 mb-6">
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
                required
              />
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Display name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="url"
                value={newUserAvatar}
                onChange={(e) => setNewUserAvatar(e.target.value)}
                placeholder="Profile picture URL (optional)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <div>
                <label className="text-gray-400 text-sm">Schedule cycle:</label>
                <select
                  value={newUserCycleWeeks}
                  onChange={(e) => setNewUserCycleWeeks(Number(e.target.value))}
                  className="ml-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={1}>1 week</option>
                  <option value={2}>2 weeks</option>
                  <option value={3}>3 weeks</option>
                  <option value={4}>4 weeks</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateUser(null)
                  setNewUserEmail('')
                  setNewUserName('')
                  setNewUserAvatar('')
                  setNewUserCycleWeeks(1)
                }}
                className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newUserEmail.trim() || !newUserName.trim()}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateMember} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Edit Member</h2>

            <div className="flex justify-center mb-6">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="group relative"
                >
                  {editAvatar ? (
                    <img src={editAvatar} alt={editName} className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br ${getUserColor(0).gradient}`}>
                      {editName[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="text-white text-sm">Upload</span>
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>
              <p className="text-gray-500 text-xs text-center">
                Click the avatar above to upload a new image
              </p>
              <p className="text-gray-500 text-xs">
                Email: {editingMember.email}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null)
                  setEditName('')
                  setEditAvatar('')
                }}
                className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editName.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
