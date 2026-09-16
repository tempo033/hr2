import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()
    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 400 })
    }

    // Supabase has already authenticated this token on the login page.
    // The token is verified again by middleware and /api/auth/me on protected requests.
    // Keeping this endpoint local prevents a second remote verification from hanging login.
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
