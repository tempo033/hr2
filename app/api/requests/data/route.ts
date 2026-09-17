import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const ALLOWED = ['admin','hr','interviewer','manager','interview_viewer']

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = supabaseHeaders(auth)
    const [requestsRes, candidatesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'}/rest/v1/requests?select=id,company_name,request_type,exact_type,notes,status,created_at&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'}/rest/v1/candidates?select=id,request_id,status&order=created_at.desc`, { headers, cache: 'no-store' }),
    ])
    if (!requestsRes.ok || !candidatesRes.ok) throw new Error('تعذر قراءة بيانات الطلبات')
    return NextResponse.json({ requests: await requestsRes.json(), candidates: await candidatesRes.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل البيانات' }, { status: 500 })
  }
}
