import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders, SUPABASE_URL } from '@/lib/server-auth'
import crypto from 'crypto'
const roles=['admin','hr','manager','interviewer']
const stages=[['employee','الموظف'],['managers','المدير المباشر'],['it','إدارة الحاسب الآلي'],['transport','إدارة الحركة'],['warehouse','إدارة المستودعات'],['admin','إدارة الشؤون الإدارية'],['finance','الإدارة المالية'],['hr','إدارة الموارد البشرية'],['project_manager','مدير المشروع / مدير المشاريع'],['senior','المدير العام — الاعتماد النهائي']]
async function db(path:string,auth:any,init?:RequestInit){return fetch(SUPABASE_URL+'/rest/v1/'+path,{...init,headers:{...supabaseHeaders(auth),'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'})}
export async function POST(req:NextRequest){
 const auth=await getServerAuth(req,roles);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const body=await req.json().catch(()=>({}));const employeeId=body.employee_id
 if(!employeeId)return NextResponse.json({error:'اختر الموظف أولاً.'},{status:400})
 const er=await db('employee_records?select=id,employee_number,full_name,national_id,nationality,department,project_name,work_location,job_title,hire_date&id=eq.'+encodeURIComponent(employeeId)+'&limit=1',auth)
 const es=await er.json();const e=es?.[0];if(!e)return NextResponse.json({error:'الموظف غير موجود.'},{status:404})
 const now=new Date().toISOString()
 const initial={employee_name:e.full_name||'',employee_number:e.employee_number||'',nationality:e.nationality||'',national_id:e.national_id||'',department_location:e.work_location||e.project_name||'',department:e.department||'',job_title:e.job_title||'',joining_date:e.hire_date||'',last_work_date:'',reason:'',employee_signature:'',employee_signature_date:''}
 const rr=await db('hr_form_records',auth,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({form_type:'clearance',employee_id:e.id,employee_number:e.employee_number||null,employee_name:e.full_name||null,department:e.department||null,job_title:e.job_title||null,form_data:{clearance:{employee:initial}},status:'قيد الإخلاء',created_at:now,updated_at:now})})
 const recs=await rr.json();if(!rr.ok)return NextResponse.json({error:recs?.message||JSON.stringify(recs)},{status:500})
 const recordId=recs?.[0]?.id;const links=[]
 for(const s of stages){
  const lr=await db('hr_form_links',auth,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({token:crypto.randomUUID(),form_type:'clearance',record_id:recordId,employee_id:e.id,created_by:auth.user.id,link_scope:'clearance:'+s[0],status:'active',created_at:now,updated_at:now})})
  const data=await lr.json();if(!lr.ok)return NextResponse.json({error:data?.message||JSON.stringify(data)},{status:500})
  links.push({...data?.[0],stage:{key:s[0],label:s[1]},public_url:req.nextUrl.origin+'/forms/public/'+data?.[0]?.token})
 }
 return NextResponse.json({record_id:recordId,employee:e,links})
}
export async function PATCH(req:NextRequest){
 const body=await req.json().catch(()=>({}))
 const auth=await getServerAuth(req,['admin','hr','manager']);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const linkId=body.link_id
 if(body.ensure_project_manager_link===true){
  const recordId=body.record_id
  if(!recordId)return NextResponse.json({error:'معرف السجل مطلوب.'},{status:400})
  const existing=await db('hr_form_links?select=id,token,link_scope,status,last_submitted_at&form_type=eq.clearance&record_id=eq.'+encodeURIComponent(recordId)+'&link_scope=eq.clearance:project_manager&limit=1',auth)
  const rows=await existing.json()
  if(rows?.[0]) return NextResponse.json({ok:true,link:rows[0],created:false})
  const rr=await db('hr_form_records?select=employee_id&id=eq.'+encodeURIComponent(recordId)+'&limit=1',auth)
  const recs=await rr.json(); const employeeId=recs?.[0]?.employee_id
  if(!employeeId)return NextResponse.json({error:'الموظف المرتبط بالسجل غير موجود.'},{status:404})
  const now=new Date().toISOString()
  const cr=await db('hr_form_links',auth,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({token:crypto.randomUUID(),form_type:'clearance',record_id:recordId,employee_id:employeeId,created_by:auth.user.id,link_scope:'clearance:project_manager',status:'active',created_at:now,updated_at:now})})
  const data=await cr.json()
  if(!cr.ok)return NextResponse.json({error:data?.message||JSON.stringify(data)},{status:500})
  return NextResponse.json({ok:true,link:data?.[0]||null,created:true})
 }
 if(!linkId)return NextResponse.json({error:'معرف الرابط مطلوب.'},{status:400})
 const now=new Date().toISOString()
 if(body.skip===true){
  const lr=await db('hr_form_links?id=eq.'+encodeURIComponent(linkId)+'&form_type=eq.clearance&limit=1',auth)
  const ls=await lr.json();const link=ls?.[0]
  if(!link)return NextResponse.json({error:'رابط إخلاء الطرف غير موجود.'},{status:404})
  const stage=String(link.link_scope||'').replace('clearance:','')
  if(!stage||stage==='employee'||!stages.some(x=>x[0]===stage))return NextResponse.json({error:'لا يمكن تخطي هذه المرحلة.'},{status:400})
  if(!link.record_id)return NextResponse.json({error:'سجل إخلاء الطرف غير موجود.'},{status:404})
  const rr=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1',auth)
  const rs=await rr.json();const current=rs?.[0]?.form_data||{};const clearance=current.clearance||{}
  const skipped={...(clearance.skipped||{}),[stage]:true}
  const applicability={...(clearance.applicability||{}),[stage]:false}
  const save=await db('hr_form_records?id=eq.'+encodeURIComponent(link.record_id),auth,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({form_data:{...current,clearance:{...clearance,skipped,applicability}},updated_at:now})})
  if(!save.ok)return NextResponse.json({error:await save.text()},{status:500})
  const lr2=await db('hr_form_links?id=eq.'+encodeURIComponent(linkId),auth,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'disabled',last_submitted_at:now,updated_at:now})})
  const ld=await lr2.json();if(!lr2.ok)return NextResponse.json({error:ld?.message||JSON.stringify(ld)},{status:lr2.status})
  return NextResponse.json({ok:true,skipped:true,link:ld?.[0]||null})
 }
 const lr0=await db('hr_form_links?select=record_id,link_scope&id=eq.'+encodeURIComponent(linkId)+'&form_type=eq.clearance&limit=1',auth)
 const l0=await lr0.json(); const target=l0?.[0]
 if(!target)return NextResponse.json({error:'رابط إخلاء الطرف غير موجود.'},{status:404})
 const stage0=String(target.link_scope||'').replace('clearance:','')
 if(!stage0||stage0==='employee')return NextResponse.json({error:'لا يمكن تغيير حالة هذه المرحلة.'},{status:400})
 if(!target.record_id)return NextResponse.json({error:'سجل إخلاء الطرف غير موجود.'},{status:404})
 const rr0=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(target.record_id)+'&limit=1',auth)
 const rs0=await rr0.json(); const current0=rs0?.[0]?.form_data||{}; const c0=current0.clearance||{}
 const app0={...(c0.applicability||{}),[stage0]:true}; const sk0={...(c0.skipped||{})}; delete sk0[stage0]
 const save0=await db('hr_form_records?id=eq.'+encodeURIComponent(target.record_id),auth,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({form_data:{...current0,clearance:{...c0,applicability:app0,skipped:sk0}},updated_at:now})})
 if(!save0.ok)return NextResponse.json({error:await save0.text()},{status:500})
 const reopened=await db('hr_form_links?id=eq.'+encodeURIComponent(linkId)+'&form_type=eq.clearance',auth,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({last_submitted_at:null,status:'active',updated_at:now})})
 const data=await reopened.json();if(!reopened.ok)return NextResponse.json({error:data?.message||JSON.stringify(data)},{status:reopened.status})
 return NextResponse.json({ok:true,link:data?.[0]||null})
}
export async function GET(req:NextRequest){
 const auth=await getServerAuth(req,roles);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const r=await db('hr_form_links?select=*&form_type=eq.clearance&order=created_at.desc',auth);const data=await r.json()
 if(!r.ok)return NextResponse.json({error:JSON.stringify(data)},{status:r.status})
 const origin=req.nextUrl.origin
 const links=(Array.isArray(data)?data:[]).map((link:any)=>({...link,public_url:origin+'/forms/public/'+link.token}))
 return NextResponse.json({links})
}