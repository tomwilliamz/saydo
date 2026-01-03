'use client'

import { usePathname } from 'next/navigation'
import Nav from './Nav'

// Person routes that have their own immersive header
const PERSON_ROUTES = ['/thomas', '/ivor', '/axel']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hide nav for login, auth, home page, and person-specific pages
  const hideNav =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    PERSON_ROUTES.some((route) => pathname.startsWith(route))

  return (
    <>
      {!hideNav && <Nav />}
      {children}
    </>
  )
}
