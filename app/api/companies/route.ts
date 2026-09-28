import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const ALLOWED = ['admin','hr','interviewer','manager']

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const r = await fetch(`${URL}/rest/v1/employee_companies?select=id,name,unified_number&order=name.asc`, { headers: supabaseHeaders(auth), cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
    return NextResponse.json({ companies: await r.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الشركات' }, { status: 500 })
  }
}
