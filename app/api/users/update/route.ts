import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'
const ROLES = new Set(['admin', 'hr', 'interviewer', 'manager'])

type Body = { user_id?: string; role?: string; is_active?: boolean }

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('hr2_access_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const callerResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const caller = callerResponse.ok ? await callerResponse.json() : null
    if (!caller?.id || !caller?.email) return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'لم يتم إعداد مفتاح إدارة المستخدمين على الخادم.' }, { status: 503 })
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    const meResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${caller.id}&limit=1`, { headers, cache: 'no-store' })
    const me = meResponse.ok ? await meResponse.json() : []
    const isAdmin = caller.email.toLowerCase() === BOOTSTRAP_EMAIL || (me?.[0]?.role === 'admin' && me?.[0]?.is_active === true)
    if (!isAdmin) return NextResponse.json({ error: 'لا تملك صلاحية تعديل المستخدمين.' }, { status: 403 })

    const body: Body = await req.json()
    if (!body.user_id) return NextResponse.json({ error: 'معرف المستخدم مطلوب.' }, { status: 400 })
    if (body.role !== undefined && !ROLES.has(body.role)) return NextResponse.json({ error: 'الصلاحية المحددة غير صحيحة.' }, { status: 400 })
    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') return NextResponse.json({ error: 'حالة المستخدم غير صحيحة.' }, { status: 400 })
    if (body.role === undefined && body.is_active === undefined) return NextResponse.json({ error: 'لا توجد تغييرات.' }, { status: 400 })

    if (body.user_id === caller.id && body.is_active === false) return NextResponse.json({ error: 'لا يمكن إيقاف حسابك الحالي.' }, { status: 400 })
    if (body.user_id === caller.id && body.role && body.role !== 'admin') return NextResponse.json({ error: 'لا يمكن إزالة صلاحية مدير النظام من حسابك الحالي.' }, { status: 400 })
    if (body.user_id && body.is_active === false) {
      const targetAuth = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${body.user_id}`, { headers, cache: 'no-store' })
      if (!targetAuth.ok) return NextResponse.json({ error: 'تعذر العثور على المستخدم.' }, { status: 404 })
      const target = await targetAuth.json()
      if (target.email?.toLowerCase() === BOOTSTRAP_EMAIL) return NextResponse.json({ error: 'حساب الإدارة الأساسي لا يمكن إيقافه.' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {}
    if (body.role !== undefined) payload.role = body.role
    if (body.is_active !== undefined) payload.is_active = body.is_active
    const update = await fetch(`${SUPABASE_URL}/rest/v1/app_users?user_id=eq.${body.user_id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) })
    if (!update.ok) {
      const text = await update.text()
      return NextResponse.json({ error: text || 'تعذر تحديث المستخدم.' }, { status: 500 })
    }
    const rows = await update.json()
    if (!rows?.length) return NextResponse.json({ error: 'المستخدم غير موجود في ملف الصلاحيات.' }, { status: 404 })
    return NextResponse.json({ user: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }, { status: 500 })
  }
}