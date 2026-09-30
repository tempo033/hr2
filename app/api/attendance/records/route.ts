import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseAdminHeaders, SUPABASE_URL } from '@/lib/server-auth'

const ALLOWED = ['admin','hr','manager','finance','general_manager']

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, ALLOWED)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  const employeeId = url.searchParams.get('employee_id')

  const filters = [
    date ? `attendance_date=eq.${encodeURIComponent(date)}` : '',
    employeeId ? `employee_id=eq.${encodeURIComponent(employeeId)}` : '',
  ].filter(Boolean).join('&')

  const endpoint = `${SUPABASE_URL}/rest/v1/attendance_records?select=id,employee_id,user_id,attendance_date,attendance_type,server_timestamp,device_id,latitude,longitude,location_id,verification_status,employee:employee_records!attendance_records_employee_id_fkey(id,employee_number,full_name,job_title,department,company:employee_companies!employee_records_company_id_fkey(id,name,unified_number))&order=server_timestamp.desc&limit=500${filters ? '&'+filters : ''}`
  const r = await fetch(endpoint, { headers: supabaseAdminHeaders(auth), cache: 'no-store' })
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: r.status })

  const records = await r.json()
  const employees = new Map<string, any>()
  for (const row of records) {
    const e = row.employee
    if (!e) continue
    const current = employees.get(e.id) || { ...e, check_in: null, check_out: null }
    if (row.attendance_type === 'check_in') current.check_in = row.server_timestamp
    if (row.attendance_type === 'check_out') current.check_out = row.server_timestamp
    employees.set(e.id, current)
  }

  const today = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
  const todayRows = records.filter((r:any) => r.attendance_date === today)
  const todayEmployeeIds = new Set(todayRows.map((r:any) => r.employee_id))
  const checkIns = new Set(todayRows.filter((r:any) => r.attendance_type === 'check_in').map((r:any) => r.employee_id))
  const checkOuts = new Set(todayRows.filter((r:any) => r.attendance_type === 'check_out').map((r:any) => r.employee_id))

  return NextResponse.json({
    date: today,
    summary: {
      operations: todayRows.length,
      present_now: [...checkIns].filter(id => !checkOuts.has(id)).length,
      checked_in: checkIns.size,
      checked_out: checkOuts.size,
    },
    records,
    employees: [...employees.values()],
  })
}
