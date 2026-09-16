import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'

function isPublicExternalLink(pathname: string) { return /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) }
function requiredRole(pathname: string) {
  if (pathname === '/users' || pathname.startsWith('/users/')) return ['admin']
  if (pathname === '/forms' || pathname.startsWith('/forms/')) return ['admin','hr']
  if (pathname === '/employees' || pathname.startsWith('/employees/')) return ['admin','hr']
  if (pathname === '/requests' || pathname.startsWith('/requests/')) return ['admin','hr','manager']
  if (pathname === '/hiring-approvals' || pathname.startsWith('/hiring-approvals/')) return ['admin','hr','manager']
  if (pathname === '/offers' || pathname.startsWith('/offers/')) return ['admin','hr','manager']
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) return ['admin','hr']
  if (pathname === '/reports' || pathname.startsWith('/reports/')) return ['admin','hr','manager']
  if (pathname === '/interviews' || pathname.startsWith('/interviews/')) return ['admin','hr','interviewer','manager']
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/login' || pathname.startsWith('/api/auth/') || pathname.startsWith('/_next/') || pathname === '/favicon.ico' || isPublicExternalLink(pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  try {
    // Authentication is verified by the Node.js auth API instead of making
    // Supabase auth calls from Edge Middleware. This avoids Edge/runtime
    // differences while keeping role enforcement centralized.
    const meUrl = new URL('/api/auth/me', request.url)
    const meResponse = await fetch(meUrl, {
      headers: { cookie: `${COOKIE}=${token}` },
      cache: 'no-store',
    })

    if (!meResponse.ok) throw new Error('invalid session')
    const me = await meResponse.json()
    if (!me?.authenticated || !me?.user?.is_active) throw new Error('inactive session')

    const roles = requiredRole(pathname)
    if (roles && !roles.includes(me.user.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  } catch {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    const redirect = NextResponse.redirect(url)
    redirect.cookies.delete(COOKIE)
    return redirect
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'] }
