import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const ROLES = ['admin','hr','interviewer','manager','interview_viewer']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'

async function get(path:string, auth:any){
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: supabaseHeaders(auth), cache:'no-store' })
  if(!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const auth=await getServerAuth(req,ROLES)
    if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
    const{id}=await params
    const [requests,requirements,candidates]=await Promise.all([
      get(`requests?select=*&id=eq.${id}&limit=1`,auth),
      get(`request_requirements?select=*&request_id=eq.${id}&order=sort_order.asc`,auth),
      get(`candidates?select=*&request_id=eq.${id}&order=created_at.desc`,auth)
    ])
    const scores=candidates.length?await get(`candidate_requirement_scores?select=*&candidate_id=in.(${candidates.map((x:any)=>x.id).join(',')})`,auth):[]
    return NextResponse.json({request:requests[0]||null,requirements,candidates,scores,role:auth.role},{headers:{'Cache-Control':'no-store'}})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل بيانات الطلب'},{status:500})}
}
