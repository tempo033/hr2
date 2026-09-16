import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function authenticate(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !serviceKey || !PUBLIC_KEY) return null

  const auth = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!auth.ok) return null

  const user = await auth.json()
  const usersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${user.id}&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
  )
  const rows = usersRes.ok ? await usersRes.json() : []
  const role = user.email?.toLowerCase() === 'hr@albenyah.sa' ? 'admin' : rows[0]?.role
  const allowed = ['admin', 'hr', 'interviewer', 'manager', 'interview_viewer']
  if (!allowed.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null
  return serviceKey
}

export async function GET(req: NextRequest) {
  try {
    const key = await authenticate(req)
    if (!key) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const [requestsRes, candidatesRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,company_name,request_type,exact_type,notes,status,created_at&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/candidates?select=id,request_id,status&order=created_at.desc`, { headers, cache: 'no-store' }),
    ])
    if (!requestsRes.ok || !candidatesRes.ok) return NextResponse.json({ error: 'تعذر قراءة بيانات الطلبات' }, { status: 500 })
    return NextResponse.json({ requests: await requestsRes.json(), candidates: await candidatesRes.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل البيانات' }, { status: 500 })
  }
}
