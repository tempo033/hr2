import {NextRequest,NextResponse} from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','interviewer','manager','interview_viewer']
async function get(path:string,a:any){
 const r=await fetch(`${URL}/rest/v1/${path}`,{headers:supabaseHeaders(a),cache:'no-store'})
 if(!r.ok)throw new Error(await r.text())
 return r.json()
}
export async function GET(req:NextRequest){
 try{
  const a=await getServerAuth(req,ROLES)
  if(!a)return NextResponse.json({error:'غير مصرح'},{status:401})

  // التقييم المبدئي يبدأ بمجرد أن يكمل المرشح بياناته.
  // لا نعتمد على completed_at لأنه يخص التقييم الذاتي عبر الرابط.
  const [completedCandidates,links,onboarding]=await Promise.all([
   get('candidates?select=id,full_name,request_id,status,created_at,updated_at&status=eq.أكمل%20البيانات&order=updated_at.desc.nullslast,created_at.desc',a),
   get('candidate_evaluation_links?select=id,candidate_id,request_id,created_at,completed_at,token&completed_at=not.is.null&order=completed_at.desc',a),
   get('employee_onboarding?select=candidate_id&order=created_at.desc',a)
  ])

  // نضم من أكمل التقييم الذاتي أيضًا، مع منع تكرار المرشح.
  const completedLinkByCandidate=new Map<string,any>()
  for(const x of links){
   if(x.candidate_id&&!completedLinkByCandidate.has(x.candidate_id))completedLinkByCandidate.set(x.candidate_id,x)
  }

  const allIds=Array.from(new Set([
   ...completedCandidates.map((x:any)=>x.id).filter(Boolean),
   ...Array.from(completedLinkByCandidate.keys())
  ]))

  const candidates=allIds.length
   ?await get(`candidates?select=id,full_name,request_id,status,created_at,updated_at&id=in.(${allIds.join(',')})`,a)
   :[]

  const candidateMap=new Map(candidates.map((x:any)=>[x.id,x]))
  const initialMap=new Map<string,any>()

  for(const c of completedCandidates){
   initialMap.set(c.id,{
    ...c,
    evaluated_at:c.updated_at||c.created_at,
    evaluation_source:'اكتمال بيانات المرشح'
   })
  }

  for(const [candidateId,link] of completedLinkByCandidate){
   const c=candidateMap.get(candidateId)
   if(c&&!initialMap.has(candidateId)){
    initialMap.set(candidateId,{
     ...c,
     evaluation_link_id:link.id,
     evaluated_at:link.completed_at,
     link_created_at:link.created_at,
     evaluation_source:'إكمال التقييم الذاتي عبر الرابط'
    })
   }
  }

  const initialEvaluations=Array.from(initialMap.values()).sort((a:any,b:any)=>{
   const ad=new Date(a.evaluated_at||a.created_at||0).getTime()
   const bd=new Date(b.evaluated_at||b.created_at||0).getTime()
   return bd-ad
  })

  const onboardingIds=Array.from(new Set(onboarding.map((x:any)=>x.candidate_id).filter(Boolean)))
  const onboardingCandidates=onboardingIds.length
   ?await get(`candidates?select=id,full_name,request_id,status,created_at,updated_at&id=in.(${onboardingIds.join(',')})`,a)
   :[]
  const onboardingMap=new Map(onboardingCandidates.map((x:any)=>[x.id,x]))

  return NextResponse.json({
   candidates:initialEvaluations,
   onboarding:onboarding.map((x:any)=>{const c=onboardingMap.get(x.candidate_id);return c?{...c}:null}).filter(Boolean)
  },{headers:{'Cache-Control':'no-store'}})
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل التقارير'},{status:500})
 }
}