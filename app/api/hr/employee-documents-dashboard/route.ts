import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const ALLOWED = ['admin', 'hr']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'

function isSaudi(value: unknown) {
  return String(value || '').trim().toLowerCase() === 'سعودي'
}

function isCompanySponsored(value: unknown) {
  const v = String(value || '').trim()
  return v === 'على الكفالة' || v === 'على كفالة الشركة'
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const headers = supabaseHeaders(auth)
    const [employeesRes, documentsRes] = await Promise.all([
      fetch(`${URL}/rest/v1/employee_records?select=id,employee_number,full_name,national_id,nationality,job_title,department,residency_status,employment_status,hire_date&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${URL}/rest/v1/employee_documents?select=id,employee_id,document_type,document_name,document_number,issue_date,expiry_date,status,updated_at&order=updated_at.desc`, { headers, cache: 'no-store' }),
    ])

    if (!employeesRes.ok) return NextResponse.json({ error: await employeesRes.text() }, { status: 500 })
    if (!documentsRes.ok) return NextResponse.json({ error: await documentsRes.text() }, { status: 500 })

    const employees = await employeesRes.json()
    const documents = await documentsRes.json()

    const byEmployee = new Map<string, any[]>()
    for (const doc of documents) {
      const list = byEmployee.get(doc.employee_id) || []
      list.push(doc)
      byEmployee.set(doc.employee_id, list)
    }

    const rows = employees
      .filter((e: any) => isSaudi(e.nationality) || isCompanySponsored(e.residency_status))
      .map((e: any) => ({
        ...e,
        scope: isSaudi(e.nationality) ? 'سعودي' : 'أجنبي على الكفالة',
        documents: byEmployee.get(e.id) || [],
      }))

    return NextResponse.json({ employees: rows, generated_at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل لوحة الموظفين' }, { status: 500 })
  }
}
