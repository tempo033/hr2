import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const ALLOWED = ['admin', 'hr', 'interviewer', 'manager']

async function getAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !serviceKey || !PUBLIC_KEY) return null
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  if (!authRes.ok) return null
  const user = await authRes.json()
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  const rows = profileRes.ok ? await profileRes.json() : []
  const role = user.email?.toLowerCase() === 'hr@albenyah.sa' ? 'admin' : rows[0]?.role
  if (!ALLOWED.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null
  return serviceKey
}

export async function GET(req: NextRequest) {
  try {
    const key = await getAuth(req)
    if (!key) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/employee_records?select=*&order=created_at.desc`, { headers, cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
    return NextResponse.json({ employees: await res.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الموظفين' }, { status: 500 })
  }
}
