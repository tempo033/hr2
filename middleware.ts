import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'

function isPublicExternalLink(pathname: string) {
  return /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) || /^\/forms\/public\/[^/]+\/?$/.test(pathname)
}

function isPublicExternalApi(pathname: string) {
  return /^\/api\/(evaluation|candidate|offer)\/[^/]+\/?$/.test(pathname) || /^\/api\/forms\/public\/[^/]+\/?$/.test(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    isPublicExternalLink(pathname) ||
    isPublicExternalApi(pathname)
  ) return NextResponse.next()

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
