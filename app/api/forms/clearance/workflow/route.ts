import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders, SUPABASE_URL } from '@/lib/server-auth'
import crypto from 'crypto'
const roles=['admin','hr','manager','interviewer']
const stages=[['employee','الموظف'],['managers','المدير المباشر / مدير المشروع / مدير المشاريع'],['it','إدارة الحاسب الآلي'],['transport','إدارة الحركة'],['warehouse','إدارة المستودعات'],['admin','إدارة الشؤون الإدارية'],['finance','الإدارة المالية'],['hr','إدارة الموارد البشرية'],['senior','الإدارة العليا — الاعتماد النهائي']]
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
  links.push({...data?.[0],stage:{key:s[0],label:s[1]}})
 }
 return NextResponse.json({record_id:recordId,employee:e,links})
}
export async function GET(req:NextRequest){
 const auth=await getServerAuth(req,roles);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const r=await db('hr_form_links?select=*&form_type=eq.clearance&order=created_at.desc',auth);const data=await r.json()
 if(!r.ok)return NextResponse.json({error:JSON.stringify(data)},{status:r.status});return NextResponse.json({links:data||[]})
}