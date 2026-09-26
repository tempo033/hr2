import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders, SUPABASE_URL } from '@/lib/server-auth'
import crypto from 'crypto'

const roles = ['admin','hr','manager','interviewer']
const stages = [
  ['employee', 'الموظف'],
  ['hr', 'الموارد البشرية'],
  ['finance', 'الإدارة المالية'],
  ['general_manager', 'المدير العام'],
]

async function db(path: string, auth: any, init?: RequestInit) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...init,
    headers: {
      ...supabaseHeaders(auth),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth(req, roles)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const employeeId = body.employee_id
  if (!employeeId) return NextResponse.json({ error: 'اختر الموظف أولاً.' }, { status: 400 })

  const er = await db(
    'employee_records?select=id,employee_number,full_name,nationality,national_id,phone,email,department,job_title,project_name,work_location,hire_date,basic_salary,housing_allowance,transportation_allowance,total_salary_with_allowances&id=eq.' +
      encodeURIComponent(employeeId) + '&limit=1',
    auth
  )
  const es = await er.json()
  const employee = es?.[0]
  if (!employee) return NextResponse.json({ error: 'الموظف غير موجود.' }, { status: 404 })

  const now = new Date().toISOString()
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

  const rr = await db('hr_form_records', auth, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      form_type: 'advance',
      employee_id: employee.id,
      employee_number: employee.employee_number || null,
      employee_name: employee.full_name || null,
      department: employee.department || null,
      job_title: employee.job_title || null,
      form_data: formData,
      status: 'مسودة',
      created_at: now,
      updated_at: now,
    }),
  })
  const recs = await rr.json()
  if (!rr.ok) return NextResponse.json({ error: recs?.message || JSON.stringify(recs) }, { status: 500 })

  const recordId = recs?.[0]?.id
  if (!recordId) return NextResponse.json({ error: 'تعذر إنشاء سجل طلب السلفة.' }, { status: 500 })

  const links: any[] = []
  for (const [scope, label] of stages) {
    const lr = await db('hr_form_links', auth, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        token: crypto.randomUUID(),
        form_type: 'advance',
        record_id: recordId,
        employee_id: employee.id,
        created_by: auth.user.id,
        link_scope: 'advance:' + scope,
        status: 'active',
        created_at: now,
        updated_at: now,
        expires_at: body.expires_at || null,
      }),
    })
    const data = await lr.json()
    if (!lr.ok || !data?.[0]?.id) {
      return NextResponse.json({ error: data?.message || JSON.stringify(data) || 'تعذر إنشاء رابط ' + label }, { status: 500 })
    }
    links.push({ ...data[0], stage: { key: scope, label } })
  }

  return NextResponse.json({ record_id: recordId, employee, links })
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, roles)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })

  const r = await db('hr_form_links?select=*&form_type=eq.advance&order=created_at.desc', auth)
  const data = await r.json()
  if (!r.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: r.status })
  return NextResponse.json({ links: data || [] })
}
