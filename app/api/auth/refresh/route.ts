import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const COOKIE = 'hr2_access_token'

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()
    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ ok: false, error: 'جلسة غير صالحة.' }, { status: 400 })
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })

    if (!authRes.ok) {
      return NextResponse.json({ ok: false, error: 'انتهت الجلسة.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
    return response
  } catch {
    return NextResponse.json({ ok: false, error: 'تعذر تمديد الجلسة.' }, { status: 500 })
  }
}
