import { NextRequest, NextResponse } from 'next/server'

const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const COOKIE = 'hr2_access_token'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE)?.value
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    if (!authRes.ok) return NextResponse.json({ authenticated: false }, { status: 401 })
    const user = await authRes.json()

    if (user.email?.toLowerCase() === BOOTSTRAP_EMAIL) {
      return NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, role: 'admin', is_active: true } })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const headers = serviceKey
      ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      : { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=display_name,role,is_active&user_id=eq.${user.id}&limit=1`, {
      headers, cache: 'no-store', signal: AbortSignal.timeout(10000)
    })
    const rows = r.ok ? await r.json() : []
    const p = rows[0]
    if (!p || p.is_active !== true) return NextResponse.json({ authenticated: false, error: 'account_disabled' }, { status: 403 })
    return NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email, display_name: p.display_name || '', role: p.role, is_active: true } })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
