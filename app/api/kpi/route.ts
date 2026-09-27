import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,supabaseHeaders} from '@/lib/server-auth'

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','manager']

async function sb(path:string,auth:any,init:RequestInit={}){
 const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{...init,headers:supabaseHeaders(auth,{'Content-Type':'application/json',...(init.headers||{})}),cache:'no-store'})
 const text=await r.text();let data:any=null;try{data=text?JSON.parse(text):null}catch{data=text}
 if(!r.ok)throw new Error(typeof data==='string'?data:(data?.message||data?.hint||'Supabase request failed'))
 return data
}
const cleanKpis=(v:any)=>Array.isArray(v)?v.map(x=>String(x??'').trim()).filter(Boolean):[]

export async function GET(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const jobId=new URL(req.url).searchParams.get('job_description_id')
  const [employees,jobs,evaluations]=await Promise.all([
   sb('employee_records?select=id,employee_number,full_name,job_title,department,employment_status&order=full_name.asc',auth),
   sb('job_descriptions?select=id,name,department,kpi&order=job_level.asc,sort_order.asc,name.asc',auth),
   sb('employee_evaluations?select=id,employee_id,job_description_id,evaluator_name,evaluation_date,total_score,performance_level&order=evaluation_date.desc,created_at.desc&limit=100',auth)
  ])
  if(jobId){
   const job=jobs.find((j:any)=>j.id===jobId);if(!job)return NextResponse.json({error:'الوصف الوظيفي غير موجود'},{status:404})
   let kpis=await sb('job_kpi_templates?select=id,job_description_id,indicator_name,question,category,weight&job_description_id=eq.'+encodeURIComponent(jobId)+'&active=eq.true&order=created_at.asc',auth)
   const names=cleanKpis(job.kpi)
   if(!kpis.length&&names.length){
    const payload=names.map((name:string,i:number)=>({job_description_id:jobId,indicator_name:name,question:'ما مدى تحقيق الموظف لهذا المؤشر وفق متطلبات الوظيفة؟',category:null,weight:Math.round(100/names.length*100)/100,answer_type:'scale_1_5',active:true}))
    kpis=await sb('job_kpi_templates',auth,{method:'POST',body:JSON.stringify(payload),headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'})})
   }
   return NextResponse.json({employees,jobs,evaluations,kpis},{headers:{'Cache-Control':'no-store'}})
  }
  return NextResponse.json({employees,jobs,evaluations},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل قسم KPI'},{status:500})}
}

export async function POST(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const b=await req.json(),employeeId=String(b.employee_id||''),jobId=String(b.job_description_id||''),evaluator=String(b.evaluator_name||'').trim()||null,scores=Array.isArray(b.scores)?b.scores:[]
  if(!employeeId||!jobId||!scores.length)return NextResponse.json({error:'بيانات التقييم غير مكتملة'},{status:400})
  const employees=await sb('employee_records?select=id,job_title,department&id=eq.'+encodeURIComponent(employeeId),auth)
  const jobs=await sb('job_descriptions?select=id,name,kpi&id=eq.'+encodeURIComponent(jobId),auth)
  if(!employees?.length||!jobs?.length)return NextResponse.json({error:'الموظف أو الوصف الوظيفي غير موجود'},{status:404})
  let templates=await sb('job_kpi_templates?select=id,indicator_name,weight&job_description_id=eq.'+encodeURIComponent(jobId)+'&active=eq.true&order=created_at.asc',auth)
  if(!templates.length){
   const names=cleanKpis(jobs[0].kpi);if(!names.length)return NextResponse.json({error:'لا توجد مؤشرات KPI لهذا الوصف الوظيفي'},{status:400})
   templates=await sb('job_kpi_templates',auth,{method:'POST',body:JSON.stringify(names.map((name:string,i:number)=>({job_description_id:jobId,indicator_name:name,question:'ما مدى تحقيق الموظف لهذا المؤشر وفق متطلبات الوظيفة؟',weight:Math.round(100/names.length*100)/100,answer_type:'scale_1_5',active:true}))),headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'})})
  }
  const valid=templates.map((t:any)=>t.id),rows=scores.filter((s:any)=>valid.includes(s.kpi_id)&&Number(s.score)>=1&&Number(s.score)<=5)
  if(rows.length!==templates.length)return NextResponse.json({error:'يجب تقييم جميع مؤشرات الأداء'},{status:400})
  const totalWeight=templates.reduce((s:number,t:any)=>s+Number(t.weight||0),0)
  const weighted=rows.reduce((s:number,r:any)=>{const t=templates.find((x:any)=>x.id===r.kpi_id);return s+(Number(r.score)/5)*Number(t?.weight||0)},0)
  const total=totalWeight?(weighted/totalWeight)*100:0,level=total>=90?'ممتاز':total>=80?'جيد جداً':total>=70?'جيد':total>=60?'مقبول':'يحتاج إلى تحسين'
  const evaluation=(await sb('employee_evaluations',auth,{method:'POST',body:JSON.stringify({employee_id:employeeId,job_description_id:jobId,evaluator_name:evaluator,evaluation_date:new Date().toISOString().slice(0,10),total_score:Number(total.toFixed(2)),performance_level:level}),headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'})}))[0]
  await sb('employee_evaluation_answers',auth,{method:'POST',body:JSON.stringify(rows.map((r:any)=>{const t=templates.find((x:any)=>x.id===r.kpi_id),score=Number(r.score);return {evaluation_id:evaluation.id,kpi_id:r.kpi_id,answer:score,score,weighted_score:Number(((score/5)*Number(t.weight||0)).toFixed(2))}})),headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=minimal'})})
  return NextResponse.json({evaluation})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر حفظ تقييم KPI'},{status:500})}
}
