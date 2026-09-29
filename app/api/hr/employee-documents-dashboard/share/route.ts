import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin', 'hr'])
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const headers = supabaseHeaders(auth, { Prefer: 'return=representation' })
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'}/rest/v1/employee_documents_dashboard_shares`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ created_by: auth.user.id, allow_export: true }),
        cache: 'no-store',
      },
    )
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
    const rows = await res.json()
    const token = rows?.[0]?.token
    if (!token) return NextResponse.json({ error: 'تعذر إنشاء رابط المشاركة' }, { status: 500 })
    return NextResponse.json({ token, path: `/hr/employee-documents?share=${token}`, allow_export: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر إنشاء رابط المشاركة' }, { status: 500 })
  }
}
