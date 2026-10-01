import {NextRequest,NextResponse} from 'next/server'
import {adminHeaders} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

async function serviceAuth(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||''
 if(!key) throw new Error('الخدمة غير مهيأة.')
 return {user:{id:null},role:'public',serviceKey:key}
}
export async function GET(req:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params; const auth=await serviceAuth()
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?select=*,clearance:financial_clearances(*,employee:employee_records(full_name,employee_number,national_id,nationality,job_title,department,hire_date,bank_name,iban,basic_salary,housing_allowance,transportation_allowance,other_allowances,company:employee_companies(name,unified_number)),items:financial_clearance_items(*),approvals:financial_clearance_approvals(*))&token=eq.'+encodeURIComponent(token)+'&stage=eq.employee&status=eq.active&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const d=await r.json().catch(()=>[])
 if(!r.ok||!d?.[0])return NextResponse.json({error:'الرابط غير صالح أو منتهي.'},{status:404})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+d[0].id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({last_opened_at:new Date().toISOString()})})
 return NextResponse.json({link:d[0]})
}
export async function POST(req:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params; const body=await req.json().catch(()=>({})); const auth=await serviceAuth()
 const lr=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?select=*,clearance:financial_clearances(*,employee:employee_records(full_name,employee_number,national_id,nationality,job_title,department,hire_date,bank_name,iban,basic_salary,housing_allowance,transportation_allowance,other_allowances,company:employee_companies(name,unified_number)),items:financial_clearance_items(*),approvals:financial_clearance_approvals(*))&token=eq.'+encodeURIComponent(token)+'&stage=eq.employee&status=eq.active&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await lr.json().catch(()=>[]); const link=rows?.[0]; if(!link)return NextResponse.json({error:'الرابط غير صالح.'},{status:404})
 const clearance=link.clearance; if(clearance.status!=='pending_employee')return NextResponse.json({error:'لا توجد خطوة اعتماد للموظف حاليًا.'},{status:409})
 const action=body.action==='return'?'return':'approve'; const now=new Date().toISOString()
 if(action==='approve'&&!body.signature)return NextResponse.json({error:'يجب إدخال توقيع الموظف قبل الاعتماد.'},{status:400})
 if(action==='return'&&!String(body.notes||'').trim())return NextResponse.json({error:'اكتب ملاحظة توضح سبب إرجاع المخالصة.'},{status:400})
 const approval=clearance.approvals?.find((x:any)=>x.stage==='employee')
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?id=eq.'+approval.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:action==='approve'?'approved':'returned',approver_name:clearance.employee?.full_name,approver_title:'الموظف',signature:body.signature||null,notes:String(body.notes||''),acted_at:now,updated_at:now})})
 if(action==='return'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'returned',updated_at:now})})
 } else {
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_finance',current_stage:'finance',updated_at:now})})
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+clearance.id+'&stage=eq.finance',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:clearance.id,stage:'finance',status:'pending'})})
 }
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+link.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:action==='approve'?'used':'active',last_submitted_at:now,updated_at:now})})\n await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_audit_logs',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:clearance.id,action:action==='approve'?'employee_approved':'employee_returned',stage:'employee',actor_user_id:null,actor_name:clearance.employee?.full_name||'الموظف',actor_role:'employee',details:{notes:String(body.notes||''),submitted_at:now},created_at:now})})
 return NextResponse.json({ok:true,status:action==='approve'?'pending_finance':'returned'})
}
