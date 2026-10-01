import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,STAGES} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params
 const q=new URLSearchParams({select:'*,employee:employee_records(full_name,employee_number,national_id,nationality,job_title,department,hire_date,contract_type,bank_name,iban,basic_salary,housing_allowance,transportation_allowance,other_allowances,project_name,work_location,company:employee_companies(name,unified_number,name_en)),items:financial_clearance_items(*),approvals:financial_clearance_approvals(*),links:financial_clearance_links(*),audit_logs:financial_clearance_audit_logs(*)',id:'eq.'+id})
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?'+q.toString(),{headers:adminHeaders(auth),cache:'no-store'});const d=await r.json().catch(()=>[])
 if(!r.ok||!d?.[0])return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 return NextResponse.json({clearance:d[0]})
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin','hr','finance']); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params; const body=await req.json().catch(()=>({}))
 const current=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=*&id=eq.'+id+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'});const rows=await current.json().catch(()=>[])
 if(!rows?.[0])return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404}); const row=rows[0]
 if(row.status==='completed')return NextResponse.json({error:'المخالصة مكتملة نهائيًا ولا يمكن تعديلها.'},{status:409})
 if(!['draft','returned','pending_finance','pending_hr'].includes(row.status) && auth.role!=='admin')return NextResponse.json({error:'التعديل غير مسموح في المرحلة الحالية.'},{status:403})
 const nextData={...(row.financial_data||{}),...(body.financial_data||{})}
 const patch=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=representation'}),body:JSON.stringify({financial_data:nextData,payment_method:nextData.payment_method||null,cheque_number:nextData.cheque_number||null,payment_date:nextData.payment_date||null,updated_at:new Date().toISOString()})})
 const d=await patch.json().catch(()=>[])
 if(!patch.ok)return NextResponse.json({error:d?.message||JSON.stringify(d)},{status:500})
 await audit(auth,id,'data_updated',{changed_keys:Object.keys(body.financial_data||{})})
 return NextResponse.json({ok:true,clearance:d?.[0]||null})
}
