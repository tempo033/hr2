import {NextRequest,NextResponse} from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','interviewer','manager','interview_viewer']
async function get(path:string,a:any){const r=await fetch(`${URL}/rest/v1/${path}`,{headers:supabaseHeaders(a),cache:'no-store'});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function GET(req:NextRequest){
 try{
  const a=await getServerAuth(req,ROLES);if(!a)return NextResponse.json({error:'غير مصرح'},{status:401})
  const [links,onboarding]=await Promise.all([
   get('candidate_evaluation_links?select=id,candidate_id,request_id,created_at,completed_at,token&completed_at=not.is.null&order=completed_at.desc',a),
   get('employee_onboarding?select=candidate_id&order=created_at.desc',a)
  ])
  const ids=Array.from(new Set(links.map((x:any)=>x.candidate_id).filter(Boolean)))
  const candidates=ids.length?await get(`candidates?select=id,full_name,request_id&id=in.(${ids.join(',')})`,a):[]
  const map=new Map(candidates.map((x:any)=>[x.id,x]))
  const initialEvaluations=links.map((x:any)=>{const c=map.get(x.candidate_id);return c?{...c,evaluation_link_id:x.id,evaluated_at:x.completed_at,link_created_at:x.created_at}:null}).filter(Boolean)
  const onboardingIds=Array.from(new Set(onboarding.map((x:any)=>x.candidate_id).filter(Boolean)))
  const onboardingCandidates=onboardingIds.length?await get(`candidates?select=id,full_name,request_id&id=in.(${onboardingIds.join(',')})`,a):[]
  const onboardingMap=new Map(onboardingCandidates.map((x:any)=>[x.id,x]))
  return NextResponse.json({
   candidates:initialEvaluations,
   onboarding:onboarding.map((x:any)=>{const c=onboardingMap.get(x.candidate_id);return c?{...c}:null}).filter(Boolean)
  },{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل التقارير'},{status:500})}
}
