'use client'

import { usePathname } from 'next/navigation'
import Nav from './Nav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hide nav for login, auth, home page, person pages, and leaderboard
  const hideNav =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/person/') ||
    pathname.startsWith('/leaderboard')

  return (
    <>
      {!hideNav && <Nav />}
      {children}
    </>
  )
}
