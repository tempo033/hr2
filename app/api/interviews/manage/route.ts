import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const WRITE_ROLES = ['admin','hr','interviewer','manager']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, WRITE_ROLES)
    if (!auth) return NextResponse.json({ error:'غير مصرح أو الحساب للقراءة فقط' }, { status:401 })
    const body = await req.json()
    const action = body?.action
    const headers = supabaseHeaders(auth, { 'Content-Type':'application/json' })
    if (action === 'create_link') {
      const { candidateId, requestId, stage } = body
      if (!candidateId || !requestId || !stage) return NextResponse.json({ error:'بيانات إنشاء الرابط ناقصة' }, {status:400})
      const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links?select=*&candidate_id=eq.${candidateId}&stage=eq.${encodeURIComponent(stage)}&limit=1`, {headers,cache:'no-store'})
      const existing = existingRes.ok ? await existingRes.json() : []
      if (existing[0]) return NextResponse.json({ link:existing[0] })
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links`, {method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({candidate_id:candidateId,request_id:requestId,stage})})
      if (!insertRes.ok) return NextResponse.json({error:await insertRes.text()},{status:500})
      const rows=await insertRes.json(); return NextResponse.json({link:rows[0]})
    }
    if (action === 'reopen_evaluation') {
      const { candidateId, stage } = body
      if (!candidateId || !stage) return NextResponse.json({error:'بيانات إعادة فتح التقييم ناقصة'},{status:400})
      const findRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links?select=*&candidate_id=eq.${encodeURIComponent(candidateId)}&stage=eq.${encodeURIComponent(stage)}&limit=1`,{headers,cache:'no-store'})
      const found = findRes.ok ? await findRes.json() : []
      const link = found[0]
      if (!link) return NextResponse.json({error:'لم يتم العثور على رابط تقييم هذه الإدارة'},{status:404})
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_evaluation_links?id=eq.${link.id}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({completed_at:null})})
      if (!updateRes.ok) return NextResponse.json({error:await updateRes.text()},{status:500})
      const rows = await updateRes.json()
      return NextResponse.json({link:rows[0]})
    }
    if (action === 'save_meeting') {
      const { candidateId, requestId, date, start, end, teamsSchedule, teamsJoin, invitation } = body
      if (!candidateId || !requestId || !date || !start || !end || !teamsJoin) return NextResponse.json({error:'بيانات الموعد ناقصة'},{status:400})
      const interviewStart = `${date}T${start}:00+03:00`, interviewEnd = `${date}T${end}:00+03:00`
      const findRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews?select=id&candidate_id=eq.${candidateId}&order=created_at.desc&limit=1`,{headers,cache:'no-store'})
      const found=findRes.ok?await findRes.json():[]
      const payload={candidate_id:candidateId,request_id:requestId,interview_date:interviewStart,interview_type:'مقابلة توظيف',interview_platform:'Microsoft Teams',interview_start_at:interviewStart,interview_end_at:interviewEnd,teams_scheduling_url:teamsSchedule||null,teams_join_url:teamsJoin,meeting_status:'محدد',invitation_message:invitation||null}
      let res:Response
      if(found[0]?.id) res=await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews?id=eq.${found[0].id}`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)})
      else res=await fetch(`${SUPABASE_URL}/rest/v1/candidate_interviews`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)})
      if(!res.ok)return NextResponse.json({error:await res.text()},{status:500})
      const rows=await res.json(); return NextResponse.json({interview:rows[0]})
    }
    return NextResponse.json({error:'عملية غير معروفة'},{status:400})
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:'تعذر تنفيذ العملية'},{status:500}) }
}
