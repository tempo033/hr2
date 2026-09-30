import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseAdminHeaders, SUPABASE_URL } from '@/lib/server-auth'

const ALLOWED = ['admin','hr','manager','general_manager']

async function adminAction(auth:any, payload:any){
  const r = await fetch(`${SUPABASE_URL}/functions/v1/attendance-admin`, {
    method:'POST',
    headers:{'Authorization':`Bearer ${auth.token}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
  })
  const b=await r.json().catch(()=>({error:'تعذر تنفيذ العملية'}))
  return {r,b}
}

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, ALLOWED)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [employeesRes,mappingsRes,locationsRes,employeeLocationsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/employee_records?select=id,employee_number,full_name,email,job_title,department,employment_status&order=full_name.asc&limit=5000`,{headers:supabaseAdminHeaders(auth),cache:'no-store'}),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_employee_users?select=id,user_id,employee_id,app_username,is_active,created_at,updated_at&order=created_at.desc`,{headers:supabaseAdminHeaders(auth),cache:'no-store'}),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_locations?select=id,name,latitude,longitude,radius_meters,is_active&is_active=eq.true&order=name.asc`,{headers:supabaseAdminHeaders(auth),cache:'no-store'}),
    fetch(`${SUPABASE_URL}/rest/v1/attendance_employee_locations?select=id,employee_id,location_id,is_active&is_active=eq.true`,{headers:supabaseAdminHeaders(auth),cache:'no-store'})
  ])
  if(!employeesRes.ok||!mappingsRes.ok||!locationsRes.ok||!employeeLocationsRes.ok)
    return NextResponse.json({error:'تعذر تحميل بيانات الحسابات والمواقع'},{status:500})
  return NextResponse.json({
    employees:await employeesRes.json(),
    mappings:await mappingsRes.json(),
    locations:await locationsRes.json(),
    employeeLocations:await employeeLocationsRes.json()
  })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth(req, ALLOWED)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body=await req.json().catch(()=>({}))
  const action=String(body.action||'create_account')
  const payload=action==='set_locations'
    ? {action,employee_id:body.employee_id,location_ids:Array.isArray(body.location_ids)?body.location_ids:[]}
    : {action:'create_account',employee_id:body.employee_id,username:body.username,password:body.password,location_ids:Array.isArray(body.location_ids)?body.location_ids:[]}
  const {r,b}=await adminAction(auth,payload)
  if(!r.ok) return NextResponse.json(b,{status:r.status})
  return NextResponse.json(b)
}
