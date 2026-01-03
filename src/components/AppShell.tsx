'use client'

import { usePathname } from 'next/navigation'
import Nav from './Nav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = !pathname.startsWith('/login') && !pathname.startsWith('/auth')

  return (
    <>
      {showNav && <Nav />}
      {children}
    </>
  )
}
