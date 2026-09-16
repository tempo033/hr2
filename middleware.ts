import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_A_vnr01AW'
const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'

function isPublicExternalLink(pathname: string) { return /^\/(candidate|evaluation)\/[^/]+\/?$/.test(pathname) }

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
  if (!token) { const url=request.nextUrl.clone(); url.pathname='/login'; url.searchParams.set('next',pathname); return NextResponse.redirect(url) }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`}, cache:'no-store' })
    if (!response.ok) throw new Error('invalid session')
    const authUser = await response.json()

    if (authUser.email?.toLowerCase() === BOOTSTRAP_EMAIL) return NextResponse.next()

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.next()
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${authUser.id}&limit=1`, { headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}, cache:'no-store' })
    const profiles = profileResponse.ok ? await profileResponse.json() : []
    const profile = profiles[0]
    if (!profile || profile.is_active !== true) { const url=request.nextUrl.clone(); url.pathname='/login'; url.searchParams.set('error','account_disabled'); const redirect=NextResponse.redirect(url); redirect.cookies.delete(COOKIE); return redirect }

    const roles = requiredRole(pathname)
    if (roles && !roles.includes(profile.role)) { const url=request.nextUrl.clone(); url.pathname='/'; url.searchParams.set('error','forbidden'); return NextResponse.redirect(url) }
    return NextResponse.next()
  } catch {
    const url=request.nextUrl.clone(); url.pathname='/login'; url.searchParams.set('next',pathname)
    const redirect=NextResponse.redirect(url); redirect.cookies.delete(COOKIE); return redirect
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'] }
