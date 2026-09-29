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

const APPROVED_UNIFIED_NUMBERS = new Set(['7030224054', '7041914610', '7041965620'])

function isApprovedCompany(company: any) {
  return !!company && APPROVED_UNIFIED_NUMBERS.has(String(company.unified_number || '').trim())
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const headers = supabaseHeaders(auth)
    const [employeesRes, documentsRes] = await Promise.all([
      fetch(`${URL}/rest/v1/employee_records?select=id,employee_number,full_name,national_id,nationality,job_title,department,residency_status,employment_status,hire_date,company_id,company:employee_companies(id,name,unified_number)&order=created_at.desc`, { headers, cache: 'no-store' }),
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

    const sponsoredForeign = employees.filter((e: any) => !isSaudi(e.nationality) && isCompanySponsored(e.residency_status))
    const excludedWithoutCompany = sponsoredForeign.filter((e: any) => !e.company_id || !e.company)
    const excludedUnapprovedCompany = sponsoredForeign.filter((e: any) => e.company && !isApprovedCompany(e.company))

    // موظفو الداشبورد: غير سعودي + على كفالة الشركة + شركة محددة فعلياً + شركة معتمدة بالرقم الموحد.
    // لا يتم تعديل أي سجل موظف؛ الموظف غير المطابق يُستبعد من إحصائيات هذه اللوحة فقط.
    // شرط الدخول الأساسي: شركة محددة ومعتمدة. السعودي يدخل مباشرة،
    // وغير السعودي يجب أن يكون على كفالة الشركة. لا يتم تعديل أي سجل في قاعدة البيانات.
    const rows = employees
      .filter((e: any) => isApprovedCompany(e.company))
      .filter((e: any) => isSaudi(e) || isCompanySponsored(e.residency_status))
      .map((e: any) => ({
        ...e,
        scope: isSaudi(e) ? 'سعودي' as const : 'أجنبي على الكفالة' as const,
        documents: byEmployee.get(e.id) || [],
      }))

    const companiesRes=await fetch(`${URL}/rest/v1/employee_companies?select=id,name,unified_number&order=name.asc`, { headers, cache: 'no-store' })
    const allCompanies=companiesRes.ok?await companiesRes.json():[]
    const companies=allCompanies.filter((c: any) => APPROVED_UNIFIED_NUMBERS.has(String(c.unified_number || '').trim()))
    return NextResponse.json({
      employees: rows,
      companies,
      excluded_without_company: excludedWithoutCompany.map((e: any) => ({ id:e.id, employee_number:e.employee_number, full_name:e.full_name, nationality:e.nationality, residency_status:e.residency_status })),
      excluded_without_company_count: excludedWithoutCompany.length,
      excluded_unapproved_company_count: excludedUnapprovedCompany.length,
      generated_at: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل لوحة الموظفين' }, { status: 500 })
  }
}
