import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,calculateLeaveValue,ensureStageLink} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params
 const q=new URLSearchParams({select:'*,employee:employee_records(full_name,employee_number,national_id,nationality,job_title,department,hire_date,contract_type,bank_name,iban,project_name,work_location,company:employee_companies(name,unified_number,name_en)),items:financial_clearance_items(*),approvals:financial_clearance_approvals(*),links:financial_clearance_links(*),audit_logs:financial_clearance_audit_logs(*)',id:'eq.'+encodeURIComponent(id)})
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?'+q.toString(),{headers:adminHeaders(auth),cache:'no-store'})
 const d=await r.json().catch(()=>[])
 if(!r.ok||!d?.[0])return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 const row=d[0]
 const items=row.items||[]
 const entitlementsTotal=items.filter((x:any)=>x.item_type==='entitlement').reduce((s:number,x:any)=>s+Number(x.amount||0),0)
 const obligationsTotal=items.filter((x:any)=>x.item_type==='obligation').reduce((s:number,x:any)=>s+Number(x.amount||0),0)
 return NextResponse.json({clearance:{...row,totals:{entitlementsTotal,obligationsTotal,netAmount:entitlementsTotal-obligationsTotal}}})
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin','hr']); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params
 const body=await req.json().catch(()=>({}))
 const current=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await current.json().catch(()=>[])
 const row=rows?.[0]
 if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed'||row.status==='rejected')return NextResponse.json({error:'المخالصة مغلقة نهائيًا ولا يمكن تعديلها.'},{status:409})
 if(auth.role!=='admin' && !['draft','pending_employee','needs_revision','returned','pending_hr'].includes(row.status))return NextResponse.json({error:'التعديل الوظيفي والمالي متاح للموارد البشرية قبل اعتمادها ماليًا أو أثناء مرحلة الموارد البشرية.'},{status:403})

 const nextData={...(row.financial_data||{}),...(body.financial_data||{})}
 const days=Number(nextData.leave_balance_days ?? nextData.days_counted ?? 0)
 const basic=Number(nextData.basic_salary||0)
 const daily=basic>0 ? basic/30 : 0
 const leaveValue=calculateLeaveValue(days,basic)
 nextData.days_counted=Number.isFinite(days)&&days>=0?days:0
 nextData.leave_balance_days=nextData.days_counted
 nextData.daily_wage=daily||null
 nextData.leave_balance_value=leaveValue
 nextData.salary_totals={
   basic:basic||0,
   housing:Number(nextData.housing_allowance||0)||0,
   transport:Number(nextData.transportation_allowance||0)||0,
   other:Number(nextData.other_allowances||0)||0,
   total:(basic||0)+Number(nextData.housing_allowance||0)+Number(nextData.transportation_allowance||0)+Number(nextData.other_allowances||0)
 }

 const patch=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=representation'}),body:JSON.stringify({financial_data:nextData,payment_method:nextData.payment_method||null,cheque_number:nextData.cheque_number||null,payment_date:nextData.payment_date||null,updated_at:new Date().toISOString()})})
 const d=await patch.json().catch(()=>[])
 if(!patch.ok)return NextResponse.json({error:d?.message||d?.details||d?.hint||JSON.stringify(d)||'تعذر حفظ بيانات المخالصة في قاعدة البيانات.'},{status:500})

 const existingRes=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?select=*&clearance_id=eq.'+encodeURIComponent(id)+'&code=eq.leave_balance&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const existing=await existingRes.json().catch(()=>[])
 const payload={item_type:'entitlement',code:'leave_balance',label:'قيمة رصيد الإجازات المستحق',amount:leaveValue,editable:false,source:'system:days_x_daily_wage',notes:nextData.days_counted+' يوم × '+daily.toFixed(2)+' ر.س أجر يومي',sort_order:0,updated_by:auth.user.id,updated_at:new Date().toISOString()}
 if(existing?.[0]){
   const itemPatch=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(existing[0].id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(payload)})
   if(!itemPatch.ok){const e=await itemPatch.text();return NextResponse.json({error:e||'تعذر تحديث بند رصيد الإجازات.'},{status:500})}
 }else{
   const itemInsert=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({...payload,clearance_id:id,created_by:auth.user.id})})
   if(!itemInsert.ok){const e=await itemInsert.text();return NextResponse.json({error:e||'تعذر إنشاء بند رصيد الإجازات.'},{status:500})}
 }
 const stage=row.current_stage
 if(auth.role==='hr' || auth.role==='admin'){
   const now=new Date().toISOString()
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending',approver_user_id:null,approver_name:null,approver_title:null,signature:null,decision:null,notes:null,acted_at:null,updated_at:now})})
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'used',updated_at:now})})
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_employee',current_stage:'employee',final_approved_at:null,updated_at:now})})
   await ensureStageLink(auth,id,'employee')
 }
 await audit(auth,id,'hr_data_updated',{changed_keys:Object.keys(body.financial_data||{}),leave_days:nextData.days_counted,leave_value:leaveValue})
 return NextResponse.json({ok:true,clearance:d?.[0]||null,leave_value:leaveValue,daily_wage:daily})
}


export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin','hr']); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params
 const current=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=id,status,clearance_number&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await current.json().catch(()=>[]); const row=rows?.[0]
 if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed')return NextResponse.json({error:'لا يمكن حذف مخالصة مكتملة ومعتمدة نهائيًا.'},{status:409})
 for(const table of ['financial_clearance_links','financial_clearance_approvals','financial_clearance_items','financial_clearance_audit_logs']){
   await fetch(SUPABASE_URL+'/rest/v1/'+table+'?clearance_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:adminHeaders(auth)})
 }
 const del=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:adminHeaders(auth)})
 if(!del.ok)return NextResponse.json({error:'تعذر حذف المخالصة.'},{status:500})
 return NextResponse.json({ok:true})
}
