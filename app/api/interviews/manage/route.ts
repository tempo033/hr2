import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const WRITE_ROLES = ['admin','hr','interviewer','manager']

async function auth(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !key) return null
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!authRes.ok) return null
  const user = await authRes.json()
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${user.id}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
  const rows = r.ok ? await r.json() : []
  const role = user.email?.toLowerCase() === 'hr@albenyah.sa' ? 'admin' : rows[0]?.role
  if (!WRITE_ROLES.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null
  return key
}

const headers = (key:string) => ({ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' })

export async function POST(req: NextRequest) {
  try {
    const key = await auth(req)
    if (!key) return NextResponse.json({ error:'غير مصرح أو الحساب للقراءة فقط' }, { status:401 })
    const body = await req.json()
    const action = body?.action
    if (action === 'create_link') {
      const { candidateId, requestId, stage } = body
      if (!candidateId || !requestId || !stage) return NextResponse.json({ error:'بيانات إنشاء الرابط ناقصة' }, {status:400})
      const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links?select=*&candidate_id=eq.${candidateId}&stage=eq.${encodeURIComponent(stage)}&limit=1`, {headers:headers(key),cache:'no-store'})
      const existing = existingRes.ok ? await existingRes.json() : []
      if (existing[0]) return NextResponse.json({ link:existing[0] })
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links`, {method:'POST',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify({candidate_id:candidateId,request_id:requestId,stage})})
      if (!insertRes.ok) return NextResponse.json({error:await insertRes.text()},{status:500})
      const rows=await insertRes.json()
      return NextResponse.json({link:rows[0]})
    }
    if (action === 'save_meeting') {
      const { candidateId, requestId, date, start, end, teamsSchedule, teamsJoin, invitation } = body
      if (!candidateId || !requestId || !date || !start || !end || !teamsJoin) return NextResponse.json({error:'بيانات الموعد ناقصة'},{status:400})
      const interviewStart = `${date}T${start}:00+03:00`
      const interviewEnd = `${date}T${end}:00+03:00`
      const findRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews?select=id&candidate_id=eq.${candidateId}&order=created_at.desc&limit=1`,{headers:headers(key),cache:'no-store'})
      const found=findRes.ok?await findRes.json():[]
      const payload={candidate_id:candidateId,request_id:requestId,interview_date:interviewStart,interview_type:'مقابلة توظيف',interview_platform:'Microsoft Teams',interview_start_at:interviewStart,interview_end_at:interviewEnd,teams_scheduling_url:teamsSchedule||null,teams_join_url:teamsJoin,meeting_status:'محدد',invitation_message:invitation||null}
      let res:Response
      if(found[0]?.id) res=await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews?id=eq.${found[0].id}`,{method:'PATCH',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify(payload)})
      else res=await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews`,{method:'POST',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify(payload)})
      if(!res.ok)return NextResponse.json({error:await res.text()},{status:500})
      const rows=await res.json()
      return NextResponse.json({interview:rows[0]})
    }
    return NextResponse.json({error:'عملية غير معروفة'},{status:400})
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:'تعذر تنفيذ العملية'},{status:500}) }
}
