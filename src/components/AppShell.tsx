'use client'

import { usePathname } from 'next/navigation'
import Nav from './Nav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hide nav for login, auth, home page, and person-specific pages
  const hideNav =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.startsWith('/person/')

  return (
    <>
      {!hideNav && <Nav />}
      {children}
    </>
  )
}
