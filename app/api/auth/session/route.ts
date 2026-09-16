import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()
    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
    const verify = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    })

    if (!verify.ok) return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 401 })

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
    return NextResponse.json({ error: 'تعذر إنشاء جلسة الدخول' }, { status: 500 })
  }
}
