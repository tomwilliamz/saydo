import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/auth', '/api/devices', '/api/alerts']

// Paths that require auth but not a profile
const AUTH_ONLY_PATHS = ['/onboarding', '/api/profile']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login page
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // For authenticated users on non-auth-only paths, check if they have a profile
  if (user && !isPublicPath && !isAuthOnlyPath) {
    // Check if user has a profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // If no profile, redirect to onboarding
    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // If user is on onboarding but already has a profile, redirect home
  if (user && pathname === '/onboarding') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
