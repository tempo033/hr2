import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders, SUPABASE_URL } from '@/lib/server-auth'

const allowed = ['admin','hr','interviewer','manager']

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, allowed)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_links?select=*&order=created_at.desc`, { headers: supabaseHeaders(auth), cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: response.status })
  return NextResponse.json({ links: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth(req, allowed)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const formType = body.form_type
  if (!['leave','clearance','advance'].includes(formType)) {
    return NextResponse.json({ error: 'نوع النموذج غير مدعوم.' }, { status: 400 })
  }

  const headers = { ...supabaseHeaders(auth), 'Content-Type': 'application/json', Prefer: 'return=representation' }

  // طلب السلفة يبدأ بموظف محدد، ويتم إنشاء سجل الطلب وروابط الاعتماد الأربعة دفعة واحدة.
  if (formType === 'advance' && body.employee_id && !body.record_id) {
    const employeeResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/employee_records?id=eq.${encodeURIComponent(body.employee_id)}&select=id,employee_number,full_name,department,job_title,nationality,national_id,phone,email,hire_date,work_location,project_name,basic_salary,housing_allowance,transportation_allowance,total_salary_with_allowances`,
      { headers: supabaseHeaders(auth), cache: 'no-store' }
    )
    const employees = await employeeResponse.json()
    if (!employeeResponse.ok || !employees?.[0]) {
      return NextResponse.json({ error: 'تعذر العثور على الموظف في ملف الموظفين.' }, { status: 404 })
    }

    const employee = employees[0]
    const formData = {
      employee_name: employee.full_name || '',
      employee_number: employee.employee_number || '',
      nationality: employee.nationality || '',
      national_id: employee.national_id || '',
      phone: employee.phone || '',
      email: employee.email || '',
      department: employee.department || '',
      job_title: employee.job_title || '',
      project_name: employee.project_name || '',
      work_location: employee.work_location || '',
      hire_date: employee.hire_date || '',
      basic_salary: employee.basic_salary == null ? '' : String(employee.basic_salary),
      housing_allowance: employee.housing_allowance == null ? '' : String(employee.housing_allowance),
      transportation_allowance: employee.transportation_allowance == null ? '' : String(employee.transportation_allowance),
      total_salary_with_allowances: employee.total_salary_with_allowances == null ? '' : String(employee.total_salary_with_allowances),
    }

    const recordResponse = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        form_type: 'advance',
        employee_id: employee.id,
        employee_number: employee.employee_number || null,
        employee_name: employee.full_name || null,
        department: employee.department || null,
        job_title: employee.job_title || null,
        form_data: formData,
        status: 'مسودة',
      }),
    })
    const recordData = await recordResponse.json()
    if (!recordResponse.ok || !recordData?.[0]?.id) {
      return NextResponse.json({ error: recordData?.message || 'تعذر إنشاء سجل طلب السلفة.' }, { status: recordResponse.status || 500 })
    }

    const recordId = recordData[0].id
    const scopes = [
      ['hr', 'الموارد البشرية'],
      ['finance', 'الإدارة المالية'],
      ['general_manager', 'المدير العام'],
    ]

    const scopes = [null, 'advance:hr', 'advance:finance', 'advance:general_manager']
    const links: any[] = []
    for (const linkScope of scopes) {
      const linkResponse = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_links`, {
        method: 'POST', headers,
        body: JSON.stringify({ form_type: 'advance', employee_id: employee.id, record_id: recordId, link_scope: linkScope, created_by: auth.user.id, expires_at: body.expires_at || null }),
      })
      const linkData = await linkResponse.json()
      if (!linkResponse.ok) return NextResponse.json({ error: linkData?.message || linkData?.hint || JSON.stringify(linkData) || 'تعذر إنشاء أحد روابط السلفة.' }, { status: linkResponse.status || 500 })
      if (linkData?.[0]) links.push(linkData[0])
    }
    const initialLink = links.find((x: any) => !x.link_scope)
    return NextResponse.json({ link: initialLink, record_id: recordId, approval_links: links.filter((x: any) => x.link_scope), links })
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_links`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      form_type: formType,
      employee_id: body.employee_id || null,
      record_id: body.record_id || null,
      created_by: auth.user.id,
      expires_at: body.expires_at || null,
    }),
  })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: data?.message || JSON.stringify(data) }, { status: response.status })
  return NextResponse.json({ link: data?.[0] || data })
}
