import { SUPABASE_URL } from '@/lib/server-auth'

export function isSaudi(value: unknown) {
  return String(value || '').trim().toLowerCase() === 'سعودي'
}

export function isCompanySponsored(value: unknown) {
  const v = String(value || '').trim()
  return v === 'على الكفالة' || v === 'على كفالة الشركة'
}

export function isActiveCompany(company: any) {
  return !!company && company.is_active !== false
}

export async function fetchEmployeeDocumentsDashboardData(headers: Record<string, string>) {
  const [employeesRes, documentsRes, companiesRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/employee_records?select=id,employee_number,full_name,national_id,nationality,job_title,department,residency_status,employment_status,hire_date,company_id,company:employee_companies(id,name,name_en,unified_number,is_active)&order=created_at.desc`, { headers, cache: 'no-store' }),
    fetch(`${SUPABASE_URL}/rest/v1/employee_documents?select=id,employee_id,document_type,document_name,document_number,issue_date,expiry_date,status,updated_at&order=updated_at.desc`, { headers, cache: 'no-store' }),
    fetch(`${SUPABASE_URL}/rest/v1/employee_companies?select=id,name,unified_number&order=name.asc`, { headers, cache: 'no-store' }),
  ])

  if (!employeesRes.ok) throw new Error(await employeesRes.text())
  if (!documentsRes.ok) throw new Error(await documentsRes.text())

  const employees = await employeesRes.json()
  const documents = await documentsRes.json()
  const allCompanies = companiesRes.ok ? await companiesRes.json() : []

  const byEmployee = new Map<string, any[]>()
  for (const doc of documents) {
    const list = byEmployee.get(doc.employee_id) || []
    list.push(doc)
    byEmployee.set(doc.employee_id, list)
  }

  const sponsoredForeign = employees.filter((e: any) => !isSaudi(e.nationality) && isCompanySponsored(e.residency_status))
  const excludedWithoutCompany = sponsoredForeign.filter((e: any) => !e.company_id || !e.company)
  const excludedInactiveCompany = sponsoredForeign.filter((e: any) => e.company && !isActiveCompany(e.company))

  const rows = employees
    .filter((e: any) => isActiveCompany(e.company))
    .filter((e: any) => isSaudi(e.nationality) || isCompanySponsored(e.residency_status))
    .map((e: any) => ({
      ...e,
      scope: isSaudi(e.nationality) ? 'سعودي' as const : 'أجنبي على الكفالة' as const,
      documents: byEmployee.get(e.id) || [],
    }))

  return {
    employees: rows,
    companies: allCompanies.filter((c: any) => isActiveCompany(c)),
    excluded_without_company: excludedWithoutCompany.map((e: any) => ({
      id: e.id, employee_number: e.employee_number, full_name: e.full_name,
      nationality: e.nationality, residency_status: e.residency_status
    })),
    excluded_without_company_count: excludedWithoutCompany.length,
    excluded_inactive_company_count: excludedInactiveCompany.length,
    generated_at: new Date().toISOString(),
  }
}

export function serviceRoleHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط')
  const headers: Record<string, string> = { apikey: key, Accept: 'application/json', 'Content-Type': 'application/json' }
  if (key.split('.').length === 3) headers.Authorization = `Bearer ${key}`
  return headers
}
