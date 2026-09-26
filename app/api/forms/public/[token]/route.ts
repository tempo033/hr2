import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, PUBLIC_KEY } from '@/lib/server-auth'
import crypto from 'crypto'
const DB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||PUBLIC_KEY
function meta(req:NextRequest){const ip=(req.headers.get('x-forwarded-for')||req.headers.get('x-real-ip')||'').split(',')[0]?.trim()||null;const ua=req.headers.get('user-agent')||null;return{ip,ua,device:ua||'غير معروف'}}
async function db(path:string,init?:RequestInit){return fetch(SUPABASE_URL+'/rest/v1/'+path,{...init,headers:{apikey:DB_KEY,Authorization:'Bearer '+DB_KEY,'Content-Type':'application/json',...(init?.headers||{})},cache:'no-store'})}
export async function GET(req:NextRequest,ctx:{params:Promise<{token:string}>}){
 const {token}=await ctx.params
 const lr=await db('hr_form_links?select=*&token=eq.'+encodeURIComponent(token)+'&status=eq.active&limit=1');const ls=await lr.json();const link=ls?.[0]
 if(!link)return NextResponse.json({error:'الرابط غير صالح أو تم تعطيله.'},{status:404})
 if(link.expires_at&&new Date(link.expires_at)<new Date())return NextResponse.json({error:'انتهت صلاحية الرابط.'},{status:410})
 const m=meta(req);await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_opened_at:new Date().toISOString(),last_ip_address:m.ip,last_device_name:m.device,last_user_agent:m.ua})})
 await db('hr_form_link_access',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({link_id:link.id,event_type:'open',ip_address:m.ip,device_name:m.device,user_agent:m.ua})})
 if(link.form_type==='clearance'&&link.link_scope){
  let data={}
  let c:any={}
  if(link.record_id){const rr=await db('hr_form_records?select=form_data,employee_name,employee_number,department,job_title&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const rec=rs?.[0];c=rec?.form_data?.clearance||{};data={...(c.employee||{}),...(c[link.link_scope.replace('clearance:','')]||{})}}
  const linksRes=await db('hr_form_links?select=id,token,link_scope,status,last_submitted_at,last_opened_at&form_type=eq.clearance&record_id=eq.'+encodeURIComponent(link.record_id)+'&order=created_at.asc'); const allLinks=await linksRes.json(); const consolidated={employee:c.employee||{},managers:c.managers||{},it:c.it||{},transport:c.transport||{},warehouse:c.warehouse||{},admin:c.admin||{},finance:c.finance||{},hr:c.hr||{},senior:c.senior||{}}; return NextResponse.json({link:{id:link.id,token:link.token,form_type:link.form_type,link_scope:link.link_scope,expires_at:link.expires_at},data,consolidated,links:allLinks||[],locked:!!link.last_submitted_at})
 }
 let record=null;if(link.record_id){const rr=await db('hr_form_records?select=*&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();record=rs?.[0]||null}
 if(link.form_type==='advance'&&link.employee_id){
  const er=await db('employee_records?select=id,employee_number,full_name,nationality,national_id,phone,email,department,job_title,project_name,work_location,hire_date,basic_salary,housing_allowance,transportation_allowance,total_salary_with_allowances&id=eq.'+encodeURIComponent(link.employee_id)+'&limit=1')
  const es=await er.json()
  const approvalRes=await db('hr_form_links?select=id,token,link_scope,status,last_submitted_at&form_type=eq.advance&record_id=eq.'+encodeURIComponent(link.record_id||'00000000-0000-0000-0000-000000000000')+'&order=created_at.asc')
  const approvals=await approvalRes.json()
  return NextResponse.json({link:{id:link.id,token:link.token,form_type:link.form_type,link_scope:link.link_scope,expires_at:link.expires_at,locked:!!link.last_submitted_at},record,data:{employee:es?.[0]||null},employee_approval:record?.form_data?.advance_employee_approval||null,approvals:approvals||[]})
 }
 return NextResponse.json({link:{id:link.id,token:link.token,form_type:link.form_type,expires_at:link.expires_at},record})
}
export async function POST(req:NextRequest,ctx:{params:Promise<{token:string}>}){
 const {token}=await ctx.params
 const lr=await db('hr_form_links?select=*&token=eq.'+encodeURIComponent(token)+'&status=eq.active&limit=1');const ls=await lr.json();const link=ls?.[0]
 if(!link)return NextResponse.json({error:'الرابط غير صالح أو تم تعطيله.'},{status:404})
 if(link.expires_at&&new Date(link.expires_at)<new Date())return NextResponse.json({error:'انتهت صلاحية الرابط.'},{status:410})
 const body=await req.json().catch(()=>({}));const m=meta(req);const now=new Date().toISOString();if(link.last_submitted_at)return NextResponse.json({error:'تم حفظ وإرسال هذا الرابط مسبقًا ولا يمكن تعديله مرة أخرى.'},{status:409})
 if(link.form_type==='clearance'&&link.link_scope){
  const stage=link.link_scope.replace('clearance:','');const form=body.form||{}
  const signatureError = stage==='employee' ? !form.employee_signature : stage==='managers' ? (!form.line_manager_signature || !form.project_manager_signature) : stage==='senior' ? !form.senior_signature : !form[stage+'_signature']
  if(signatureError)return NextResponse.json({error:'لا يمكن حفظ وإرسال إخلاء الطرف بدون التوقيع المطلوب.'},{status:400})
  if(!link.record_id)return NextResponse.json({error:'سجل إخلاء الطرف غير موجود.'},{status:404})
  const rr=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const current=rs?.[0]?.form_data?.clearance||{}
  const employee=current.employee||{}
  const next={...current,[stage]:stage==='employee'?{...employee,...form}:{...(current[stage]||{}),...form}}
  if(stage==='employee')next.employee={...employee,...form}
  const save=await db('hr_form_records?id=eq.'+encodeURIComponent(link.record_id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({form_data:{clearance:next},status:'قيد الإخلاء',updated_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua,submitted_via_link:true})})
  if(!save.ok)return NextResponse.json({error:await save.text()},{status:500})
  await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
  await db('hr_form_link_access',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({link_id:link.id,event_type:'submit',ip_address:m.ip,device_name:body.device_name||m.device,user_agent:m.ua})})
  return NextResponse.json({ok:true,record_id:link.record_id})
 }
 if(link.form_type==='advance'&&link.link_scope==='advance:employee'){
  const form=body.form||{}
  if(!form.employee_name||!form.employee_date||!form.employee_signature||!form.amount)return NextResponse.json({error:'لا يمكن إرسال طلب السلفة إلا بعد إدخال مبلغ السلفة واسم الموظف والتاريخ والتوقيع.'},{status:400})
  if(!link.record_id)return NextResponse.json({error:'سجل طلب السلفة غير موجود.'},{status:404})
  const rr=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const current=rs?.[0]?.form_data||{}
  const employeeApproval={employee_name:form.employee_name,employee_date:form.employee_date,employee_signature:form.employee_signature,submitted_at:now}
  const save=await db('hr_form_records?id=eq.'+encodeURIComponent(link.record_id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({employee_name:form.employee_name,form_data:{...current,...form,advance_employee_approval:employeeApproval},status:'قيد اعتماد الموارد البشرية',updated_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua,submitted_via_link:true})})
  if(!save.ok)return NextResponse.json({error:await save.text()},{status:500})
  await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
  await db('hr_form_link_access',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({link_id:link.id,event_type:'submit',ip_address:m.ip,device_name:body.device_name||m.device,user_agent:m.ua})})
  return NextResponse.json({ok:true,record_id:link.record_id})
 }
 if(link.form_type==='advance'&&link.link_scope?.startsWith('advance:')){
  const scope=String(link.link_scope).replace('advance:','')
  const form=body.form||{}
  if(!['hr','finance','general_manager'].includes(scope))return NextResponse.json({error:'رابط الاعتماد غير صالح.'},{status:400})
  if(!link.record_id)return NextResponse.json({error:'سجل طلب السلفة غير موجود.'},{status:404})
  if(!form.approval_name||!form.approval_date||!form.approval_signature)return NextResponse.json({error:'لا يمكن الحفظ إلا بإدخال الاسم والتاريخ والتوقيع.'},{status:400})
  const rr=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const current=rs?.[0]?.form_data||{}
  const employeeApproval=current.advance_employee_approval
  if(!employeeApproval?.employee_name||!employeeApproval?.employee_date||!employeeApproval?.employee_signature||!current.amount){
    return NextResponse.json({error:'لا يمكن اعتماد الطلب قبل استكمال توقيع الموظف ومبلغ السلفة.'},{status:400})
  }
  if(scope==='finance'&&!current.advance_approvals?.hr?.approval_signature)return NextResponse.json({error:'لا يمكن اعتماد الإدارة المالية قبل اعتماد الموارد البشرية.'},{status:400})
  if(scope==='general_manager'&&(!current.advance_approvals?.hr?.approval_signature||!current.advance_approvals?.finance?.approval_signature))return NextResponse.json({error:'لا يمكن الاعتماد النهائي قبل اعتماد الموارد البشرية والإدارة المالية.'},{status:400})
  const approvals={...(current.advance_approvals||{}),[scope]:{...form,submitted_at:now}}
  const nextStatus=scope==='general_manager'?'معتمد نهائياً':scope==='finance'?'قيد اعتماد المدير العام':'قيد اعتماد الإدارة المالية'
  const save=await db('hr_form_records?id=eq.'+encodeURIComponent(link.record_id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({form_data:{...current,advance_approvals:approvals},status:nextStatus,updated_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
  if(!save.ok)return NextResponse.json({error:await save.text()},{status:500})
  await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
  await db('hr_form_link_access',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({link_id:link.id,event_type:'submit',ip_address:m.ip,device_name:body.device_name||m.device,user_agent:m.ua})})
  return NextResponse.json({ok:true,record_id:link.record_id})
 }
 if(link.form_type==='advance'&&!link.link_scope){
  const form=body.form||{}
  if(!form.employee_name||!form.employee_date||!form.employee_signature||!form.amount)return NextResponse.json({error:'لا يمكن إرسال طلب السلفة إلا بعد إدخال مبلغ السلفة واسم الموظف والتاريخ والتوقيع.'},{status:400})
  if(!link.record_id)return NextResponse.json({error:'سجل طلب السلفة غير موجود.'},{status:404})
  const rr=await db('hr_form_records?select=form_data&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const current=rs?.[0]?.form_data||{}
  const employeeApproval={employee_name:form.employee_name,employee_date:form.employee_date,employee_signature:form.employee_signature,submitted_at:now}
  const save=await db('hr_form_records?id=eq.'+encodeURIComponent(link.record_id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({employee_name:form.employee_name,form_data:{...current,...form,advance_employee_approval:employeeApproval},status:'قيد اعتماد الموارد البشرية',updated_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua,submitted_via_link:true})})
  if(!save.ok)return NextResponse.json({error:await save.text()},{status:500})
  await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
  await db('hr_form_link_access',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({link_id:link.id,event_type:'submit',ip_address:m.ip,device_name:body.device_name||m.device,user_agent:m.ua})})
  return NextResponse.json({ok:true,record_id:link.record_id})
 }
 const form=body.form||{};const base={form_type:link.form_type,employee_id:link.employee_id||null,employee_number:form.employee_number||null,employee_name:form.employee_name||null,department:form.department||null,job_title:form.job_title||null,form_data:form,status:'معبأ عبر رابط خارجي',last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua,submitted_via_link:true,updated_at:now}
 let recordId=link.record_id;let res:Response
 if(recordId)res=await db('hr_form_records?id=eq.'+encodeURIComponent(recordId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(base)})
 else res=await db('hr_form_records',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...base,created_at:now})})
 const data=await res.json();if(!res.ok)return NextResponse.json({error:data?.message||JSON.stringify(data)},{status:500});recordId=data?.[0]?.id||recordId
 await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({record_id:recordId,last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
 if(link.form_type==='advance'){
  const stages=[['hr','الموارد البشرية'],['finance','الإدارة المالية'],['general_manager','المدير العام']]
  for(const [scope,label] of stages){
   const exists=await db('hr_form_links?select=id&form_type=eq.advance&record_id=eq.'+encodeURIComponent(recordId)+'&link_scope=eq.advance:'+scope+'&limit=1')
   const ex=await exists.json()
   if(!ex?.length) await db('hr_form_links',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({token:crypto.randomUUID(),form_type:'advance',record_id:recordId,employee_id:link.employee_id||null,created_by:link.created_by||null,link_scope:'advance:'+scope,status:'active',created_at:now,updated_at:now})})
  }
 }
 return NextResponse.json({ok:true,record_id:recordId})
}