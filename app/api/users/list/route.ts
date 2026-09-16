import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('hr2_access_token')?.value
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const callerResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const caller = callerResponse.ok ? await callerResponse.json() : null
    if (!caller?.id || !caller?.email) return NextResponse.json({ error: 'جلسة الدخول غير صالحة' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'لم يتم إعداد مفتاح إدارة المستخدمين على الخادم.' }, { status: 503 })
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    const meResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${caller.id}`, { headers, cache: 'no-store' })
    const me = meResponse.ok ? await meResponse.json() : []
    const isAdmin = caller.email.toLowerCase() === BOOTSTRAP_EMAIL || (me?.[0]?.role === 'admin' && me?.[0]?.is_active === true)
    if (!isAdmin) return NextResponse.json({ error: 'لا تملك صلاحية عرض المستخدمين.' }, { status: 403 })

    const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=user_id,display_name,role,is_active,created_at,updated_at&order=created_at.desc`, { headers, cache: 'no-store' })
    const profiles = profilesResponse.ok ? await profilesResponse.json() : []
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers, cache: 'no-store' })
    const auth = authResponse.ok ? await authResponse.json() : { users: [] }
    const authUsers = auth.users || []
    const authMap = new Map(authUsers.map((u: any) => [u.id, u]))
    const users = profiles.map((p: any) => ({ ...p, email: authMap.get(p.user_id)?.email || '', last_sign_in_at: authMap.get(p.user_id)?.last_sign_in_at || null }))
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }, { status: 500 })
  }
}
