import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
import { fetchEmployeeDocumentsDashboardData } from '@/lib/employee-documents-dashboard'

const ALLOWED = ['admin', 'hr']

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const data = await fetchEmployeeDocumentsDashboardData(supabaseHeaders(auth))
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل لوحة الموظفين' }, { status: 500 })
  }
}
