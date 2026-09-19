import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, PUBLIC_KEY } from '@/lib/server-auth'
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
  if(link.record_id){const rr=await db('hr_form_records?select=form_data,employee_name,employee_number,department,job_title&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();const rec=rs?.[0];const c=rec?.form_data?.clearance||{};data={...(c.employee||{}),...(c[link.link_scope.replace('clearance:','')]||{})}}
  return NextResponse.json({link:{id:link.id,token:link.token,form_type:link.form_type,link_scope:link.link_scope,expires_at:link.expires_at},data})
 }
 let record=null;if(link.record_id){const rr=await db('hr_form_records?select=*&id=eq.'+encodeURIComponent(link.record_id)+'&limit=1');const rs=await rr.json();record=rs?.[0]||null}
 return NextResponse.json({link:{id:link.id,token:link.token,form_type:link.form_type,expires_at:link.expires_at},record})
}
export async function POST(req:NextRequest,ctx:{params:Promise<{token:string}>}){
 const {token}=await ctx.params
 const lr=await db('hr_form_links?select=*&token=eq.'+encodeURIComponent(token)+'&status=eq.active&limit=1');const ls=await lr.json();const link=ls?.[0]
 if(!link)return NextResponse.json({error:'الرابط غير صالح أو تم تعطيله.'},{status:404})
 if(link.expires_at&&new Date(link.expires_at)<new Date())return NextResponse.json({error:'انتهت صلاحية الرابط.'},{status:410})
 const body=await req.json().catch(()=>({}));const m=meta(req);const now=new Date().toISOString()
 if(link.form_type==='clearance'&&link.link_scope){
  const stage=link.link_scope.replace('clearance:','');const form=body.form||{}
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
 const form=body.form||{};const base={form_type:link.form_type,employee_id:link.employee_id||null,employee_number:form.employee_number||null,employee_name:form.employee_name||null,department:form.department||null,job_title:form.job_title||null,form_data:form,status:'معبأ عبر رابط خارجي',last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua,submitted_via_link:true,updated_at:now}
 let recordId=link.record_id;let res:Response
 if(recordId)res=await db('hr_form_records?id=eq.'+encodeURIComponent(recordId),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(base)})
 else res=await db('hr_form_records',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...base,created_at:now})})
 const data=await res.json();if(!res.ok)return NextResponse.json({error:data?.message||JSON.stringify(data)},{status:500});recordId=data?.[0]?.id||recordId
 await db('hr_form_links?id=eq.'+encodeURIComponent(link.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({record_id:recordId,last_submitted_at:now,last_ip_address:m.ip,last_device_name:body.device_name||m.device,last_user_agent:m.ua})})
 return NextResponse.json({ok:true,record_id:recordId})
}