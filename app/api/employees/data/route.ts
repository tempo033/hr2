import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const ALLOWED = ['admin', 'hr', 'interviewer', 'manager']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const [res,docsRes] = await Promise.all([
      fetch(`${URL}/rest/v1/employee_records?select=*,company:employee_companies(id,name,unified_number)&order=created_at.desc`, { headers: supabaseHeaders(auth), cache: 'no-store' }),
      fetch(`${URL}/rest/v1/employee_documents?select=employee_id,document_name,document_type,expiry_date,updated_at&order=updated_at.desc`, { headers: supabaseHeaders(auth), cache: 'no-store' })
    ])
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 })
    if (!docsRes.ok) return NextResponse.json({ error: await docsRes.text() }, { status: 500 })
    const employees = await res.json()
    const documents = await docsRes.json()
    const residency = new Map<string,string>()
    for (const d of documents) {
      const text = String(d.document_name||'')+' '+String(d.document_type||'')
      const isResidency = text.includes('الإقامة') || /residency|iqama/i.test(text)
      if (isResidency && d.employee_id && !residency.has(d.employee_id) && d.expiry_date) residency.set(d.employee_id,d.expiry_date)
    }
    return NextResponse.json({ employees: employees.map((e:any)=>({...e,residency_expiry_date:residency.get(e.id)||null})) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الموظفين' }, { status: 500 }) }
}
