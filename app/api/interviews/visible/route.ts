import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const ALLOWED = ['admin','hr','interviewer','manager','interview_viewer']

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
  if (!ALLOWED.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null
  return key
}

async function get(path: string, key: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function GET(req: NextRequest) {
  try {
    const key = await auth(req)
    if (!key) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const [candidates, requests, interviews, links, scores, approvals] = await Promise.all([
      get('candidates?select=id,request_id,full_name,phone,email,specialization,status,total_experience_years,created_at&order=created_at.desc', key),
      get('requests?select=id,exact_type,request_type,status,created_at&order=created_at.desc', key),
      get('candidate_interviews?select=id,candidate_id,request_id,final_score,recommendation,final_decision,interview_date,interview_start_at,interview_end_at,teams_scheduling_url,teams_join_url,meeting_status,created_at&order=created_at.desc', key),
      get('candidate_evaluation_links?select=*', key),
      get('candidate_requirement_scores?select=*', key),
      get('candidate_hiring_approvals?select=*', key),
    ])
    return NextResponse.json({ candidates, requests, interviews, links, scores, approvals }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل بيانات المقابلات والتقييمات' }, { status: 500 })
  }
}
