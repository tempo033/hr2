import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const ALLOWED = ['admin','hr','interviewer','manager','interview_viewer']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
async function get(path:string,auth:any){const r=await fetch(`${URL}/rest/v1/${path}`,{headers:supabaseHeaders(auth),cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const [candidates, requests, interviews, links, scores, approvals] = await Promise.all([
      get('candidates?select=id,request_id,full_name,phone,email,specialization,status,total_experience_years,created_at&order=created_at.desc',auth),
      get('requests?select=id,exact_type,request_type,status,created_at&order=created_at.desc',auth),
      get('candidate_interviews?select=id,candidate_id,request_id,final_score,hr_score,engineering_score,technical_office_score,recommendation,final_decision,interview_date,interview_start_at,interview_end_at,teams_scheduling_url,teams_join_url,meeting_status,hr_notes,engineering_notes,technical_office_notes,created_at&order=created_at.desc',auth),
      get('candidate_evaluation_links?select=*',auth),
      get('candidate_requirement_scores?select=*',auth),
      get('candidate_hiring_approvals?select=*',auth),
    ])
    return NextResponse.json({ candidates, requests, interviews, links, scores, approvals }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل بيانات المقابلات والتقييمات' }, { status: 500 }) }
}
