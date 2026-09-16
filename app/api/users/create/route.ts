import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'

async function getCaller(token: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' })
  return response.ok ? response.json() : null
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('hr2_access_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const caller = await getCaller(token)
    if (!caller?.id || !caller?.email) return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'لم يتم إعداد مفتاح إدارة المستخدمين على الخادم.' }, { status: 503 })

    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${caller.id}`, { headers: adminHeaders, cache: 'no-store' })
    const profiles = await profileResponse.json()
    const isAdmin = caller.email.toLowerCase() === BOOTSTRAP_EMAIL || (profiles?.[0]?.role === 'admin' && profiles?.[0]?.is_active === true)
    if (!isAdmin) return NextResponse.json({ error: 'لا تملك صلاحية إضافة مستخدمين.' }, { status: 403 })

    if (caller.email.toLowerCase() === BOOTSTRAP_EMAIL && !profiles?.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/app_users`, { method: 'POST', headers: { ...adminHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: caller.id, display_name: 'مسؤول الموارد البشرية', role: 'admin', is_active: true }) })
    }

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const displayName = String(body.display_name || '').trim()
    const role = String(body.role || 'hr')
    if (!email || !password || !displayName) return NextResponse.json({ error: 'الاسم والبريد وكلمة المرور مطلوبة.' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }, { status: 400 })
    if (!['admin', 'hr', 'interviewer', 'manager'].includes(role)) return NextResponse.json({ error: 'الصلاحية غير صحيحة.' }, { status: 400 })

    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ email, password, email_confirm: true }) })
    const created = await createResponse.json()
    if (!createResponse.ok || !created?.id) return NextResponse.json({ error: created?.msg || created?.message || 'تعذر إنشاء المستخدم.' }, { status: 400 })

    const profileInsert = await fetch(`${SUPABASE_URL}/rest/v1/app_users`, { method: 'POST', headers: { ...adminHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: created.id, display_name: displayName, role, is_active: true }) })
    if (!profileInsert.ok) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: adminHeaders })
      const detail = await profileInsert.text()
      return NextResponse.json({ error: detail || 'تعذر حفظ صلاحيات المستخدم.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, id: created.id, email, display_name: displayName, role })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }, { status: 500 })
  }
}
