import { NextRequest, NextResponse } from 'next/server'

const COOKIE='hr2_access_token'
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
const READ_ROLES=['admin','hr','interviewer','manager','interview_viewer']

async function auth(req:NextRequest){
  const token=req.cookies.get(COOKIE)?.value
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!token||!key)return null
  const ar=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:PUBLIC_KEY,Authorization:`Bearer ${token}`},cache:'no-store'})
  if(!ar.ok)return null
  const user=await ar.json()
  const ur=await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${user.id}&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store'})
  const rows=ur.ok?await ur.json():[]
  const role=user.email?.toLowerCase()==='hr@albenyah.sa'?'admin':rows[0]?.role
  if(!READ_ROLES.includes(role)||(role!=='admin'&&rows[0]?.is_active!==true))return null
  return {key,role}
}
const h=(key:string)=>({apikey:key,Authorization:`Bearer ${key}`})
async function get(path:string,key:string){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:h(key),cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{const a=await auth(req);if(!a)return NextResponse.json({error:'غير مصرح'},{status:401});const{id}=await params
    const [requests,requirements,candidates]=await Promise.all([
      get(`requests?select=*&id=eq.${id}&limit=1`,a.key),
      get(`request_requirements?select=*&request_id=eq.${id}&order=sort_order.asc`,a.key),
      get(`candidates?select=*&request_id=eq.${id}&order=created_at.desc`,a.key)
    ])
    const scores=candidates.length?await get(`candidate_requirement_scores?select=*&candidate_id=in.(${candidates.map((x:any)=>x.id).join(',')})`,a.key):[]
    return NextResponse.json({request:requests[0]||null,requirements,candidates,scores,role:a.role},{headers:{'Cache-Control':'no-store'}})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل بيانات الطلب'},{status:500})}
}
