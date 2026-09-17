import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const ALLOWED = ['admin', 'hr', 'interviewer', 'manager']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const res = await fetch(`${URL}/rest/v1/employee_records?select=*&order=created_at.desc`, { headers: supabaseHeaders(auth), cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
    return NextResponse.json({ employees: await res.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الموظفين' }, { status: 500 }) }
}
