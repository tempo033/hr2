import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE)?.value
    if (!token || !PUBLIC_KEY) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }
    const auth = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers, cache: 'no-store' })
    if (!auth.ok) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const get = async (path: string) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, cache: 'no-store' })
      if (!r.ok) throw new Error(await r.text())
      return r.json()
    }
    const [candidates, requests, interviews, links, scores, approvals] = await Promise.all([
      get('candidates?select=id,request_id,full_name,phone,email,specialization,status,total_experience_years,created_at&order=created_at.desc'),
      get('requests?select=id,exact_type,request_type,status,created_at&order=created_at.desc'),
      get('candidate_interviews?select=id,candidate_id,request_id,final_score,recommendation,final_decision,interview_date,created_at&order=created_at.desc'),
      get('candidate_evaluation_links?select=*'),
      get('candidate_requirement_scores?select=*'),
      get('candidate_hiring_approvals?select=*'),
    ])
    return NextResponse.json({ candidates, requests, interviews, links, scores, approvals }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل بيانات المقابلات والتقييمات' }, { status: 500 })
  }
}
