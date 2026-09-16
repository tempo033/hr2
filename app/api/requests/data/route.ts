import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const ALLOWED = ['admin','hr','interviewer','manager','interview_viewer']

async function auth(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !key) return null
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!authRes.ok) return null
  const user = await authRes.json()
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${user.id}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
  const rows = r.ok ? await r.json() : []
  const role = user.email?.toLowerCase() === 'hr@albenyah.sa' ? 'admin' : rows[0]?.role
  if (!ALLOWED.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null
  return key
}

export async function GET(req: NextRequest) {
  try {
    const key = await auth(req)
    if (!key) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const [requestsRes, candidatesRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,company_name,request_type,exact_type,notes,status,created_at&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/candidates?select=id,request_id,status&order=created_at.desc`, { headers, cache: 'no-store' }),
    ])
    if (!requestsRes.ok || !candidatesRes.ok) throw new Error('تعذر قراءة بيانات الطلبات')
    return NextResponse.json({ requests: await requestsRes.json(), candidates: await candidatesRes.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل البيانات' }, { status: 500 })
  }
}
