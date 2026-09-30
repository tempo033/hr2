import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseAdminHeaders, SUPABASE_URL } from '@/lib/server-auth'

const ALLOWED = ['admin','hr','manager','general_manager']

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, ALLOWED)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [usersRes, employeesRes, mappingsRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/app_users?select=user_id,display_name,role,is_active&is_active=eq.true&order=display_name.asc`,
      { headers: supabaseAdminHeaders(auth), cache: 'no-store' },
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/employee_records?select=id,employee_number,full_name,email,job_title,department,employment_status&order=full_name.asc&limit=5000`,
      { headers: supabaseAdminHeaders(auth), cache: 'no-store' },
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/attendance_employee_users?select=id,user_id,employee_id,is_active,created_at,updated_at&order=created_at.desc`,
      { headers: supabaseAdminHeaders(auth), cache: 'no-store' },
    ),
  ])

  if (!usersRes.ok || !employeesRes.ok || !mappingsRes.ok) {
    return NextResponse.json({ error: 'تعذر تحميل بيانات الربط' }, { status: 500 })
  }

  const [users, employees, mappings] = await Promise.all([
    usersRes.json(), employeesRes.json(), mappingsRes.json(),
  ])

  return NextResponse.json({ users, employees, mappings })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth(req, ALLOWED)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const userId = String(body.user_id || '').trim()
  const employeeId = String(body.employee_id || '').trim()
  if (!userId || !employeeId) {
    return NextResponse.json({ error: 'يجب اختيار مستخدم وموظف' }, { status: 400 })
  }

  const [userRes, employeeRes, userMappingRes, employeeMappingRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/app_users?select=user_id,display_name,role,is_active&user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1`, { headers: supabaseAdminHeaders(auth), cache: 'no-store' }),
    fetch(`${SUPABASE_URL}/rest/v1/employee_records?select=id,employee_number,full_name,email,job_title,department,employment_status&id=eq.${encodeURIComponent(employeeId)}&limit=1`, { headers: supabaseAdminHeaders(auth), cache: 'no-store' }),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_employee_users?select=id,user_id,employee_id,is_active&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: supabaseAdminHeaders(auth), cache: 'no-store' }),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_employee_users?select=id,user_id,employee_id,is_active&employee_id=eq.${encodeURIComponent(employeeId)}&limit=1`, { headers: supabaseAdminHeaders(auth), cache: 'no-store' }),
  ])

  if (!userRes.ok || !employeeRes.ok || !userMappingRes.ok || !employeeMappingRes.ok) {
    return NextResponse.json({ error: 'تعذر التحقق من بيانات الربط' }, { status: 500 })
  }

  const users = await userRes.json()
  const employees = await employeeRes.json()
  const byUser = await userMappingRes.json()
  const byEmployee = await employeeMappingRes.json()

  if (!users[0]) return NextResponse.json({ error: 'المستخدم غير موجود أو غير نشط في نظام HR2' }, { status: 400 })
  if (!employees[0]) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 400 })
  if (byUser[0]) return NextResponse.json({ error: 'هذا المستخدم مرتبط بالفعل بموظف' }, { status: 409 })
  if (byEmployee[0]) return NextResponse.json({ error: 'هذا الموظف مرتبط بالفعل بمستخدم' }, { status: 409 })

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/attendance_employee_users`, {
    method: 'POST',
    headers: { ...supabaseAdminHeaders(auth), Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, employee_id: employeeId, is_active: true }),
  })
  if (!insertRes.ok) {
    return NextResponse.json({ error: await insertRes.text() }, { status: insertRes.status })
  }

  return NextResponse.json({ ok: true, mapping: (await insertRes.json())[0] })
}
