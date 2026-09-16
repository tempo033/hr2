import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'

function isPublicExternalLink(pathname: string) { return /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    isPublicExternalLink(pathname)
  ) return NextResponse.next()

  // Do not call an internal Node route from Edge Middleware: on Vercel this
  // self-fetch can fail before the request reaches the serverless function.
  // The authenticated application/API layer performs the authoritative
  // Supabase token + role checks. Middleware only blocks requests with no
  // session cookie and lets the validated application session continue.
  const token = request.cookies.get(COOKIE)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'] }
