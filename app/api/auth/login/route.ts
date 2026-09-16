import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const COOKIE = 'hr2_access_token'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'أدخل البريد الإلكتروني وكلمة المرور.' }, { status: 400 })
    }
    if (!SUPABASE_KEY) {
      return NextResponse.json({ error: 'إعدادات خدمة تسجيل الدخول غير مكتملة.' }, { status: 500 })
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let response: Response
    try {
      response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        cache: 'no-store',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.access_token) {
      const message = data?.error_description || data?.msg || 'بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.'
      return NextResponse.json({ error: message }, { status: response.status || 401 })
    }

    const result = NextResponse.json({ ok: true })
    result.cookies.set(COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    })
    return result
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? 'انتهت مهلة الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.'
      : 'تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
