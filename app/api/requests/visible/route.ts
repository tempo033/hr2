import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE)?.value
    if (!token || !PUBLIC_KEY) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }
    const auth = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers, cache: 'no-store' })
    if (!auth.ok) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
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
