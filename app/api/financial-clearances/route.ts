import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,clearanceComplete,buildSourceSnapshot,initialFinancialData,ensureStageLink,audit} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function GET(req:NextRequest){
 const auth=await financialAuth(req); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const q=req.nextUrl.searchParams
 const params=new URLSearchParams({select:'*,employee:employee_records(full_name,employee_number,national_id,department,job_title,company_id,employee_companies(name,unified_number)),approvals:financial_clearance_approvals(*),links:financial_clearance_links(*)',order:'created_at.desc'})
 for(const k of ['status','current_stage','employee_id','clearance_record_id']){const v=q.get(k);if(v)params.set(k,'eq.'+v)}
 const search=q.get('search')?.trim()
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?'+params.toString(),{headers:adminHeaders(auth),cache:'no-store'})
 const d=await r.json().catch(()=>[])
 if(!r.ok)return NextResponse.json({error:d?.message||JSON.stringify(d)},{status:r.status})
 let rows=Array.isArray(d)?d:[]
 if(search) rows=rows.filter((x:any)=>[x.employee?.full_name,x.employee?.employee_number,x.employee?.national_id].some((v:any)=>String(v||'').toLowerCase().includes(search.toLowerCase())))
 return NextResponse.json({clearances:rows})
}

export async function POST(req:NextRequest){
 const auth=await financialAuth(req,['admin','hr','manager']); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const body=await req.json().catch(()=>({}))
 const clearanceRecordId=String(body.clearance_record_id||'')
 const directEmployeeId=String(body.employee_id||'')
 const withoutClearance=body.without_clearance===true
 if(!withoutClearance&&!clearanceRecordId)return NextResponse.json({error:'سجل إخلاء الطرف مطلوب.'},{status:400})
 if(withoutClearance&&!directEmployeeId)return NextResponse.json({error:'يجب اختيار الموظف لإنشاء المخالصة بدون إخلاء طرف.'},{status:400})
 if(withoutClearance){
   const er=await fetch(SUPABASE_URL+'/rest/v1/employee_records?select=*&id=eq.'+encodeURIComponent(directEmployeeId)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
   const employees=await er.json().catch(()=>[])
   if(!er.ok||!employees?.[0])return NextResponse.json({error:'بيانات الموظف غير موجودة.'},{status:404})
   const employee=employees[0]
   let company:any=null
   if(employee.company_id){const cr=await fetch(SUPABASE_URL+'/rest/v1/employee_companies?select=id,name,unified_number,name_en&id=eq.'+encodeURIComponent(employee.company_id)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'});const cd=await cr.json().catch(()=>[]);company=cd?.[0]||null}
   let payroll:any=null
   try{const pr=await fetch(SUPABASE_URL+'/rest/v1/payroll_settlements?select=*&employee_id=eq.'+encodeURIComponent(directEmployeeId)+'&order=created_at.desc&limit=1',{headers:adminHeaders(auth),cache:'no-store'});const pd=await pr.json().catch(()=>[]);payroll=pd?.[0]||null}catch{}
   const snapshot={employee:{id:employee.id,employee_number:employee.employee_number,full_name:employee.full_name,national_id:employee.national_id,nationality:employee.nationality,job_title:employee.job_title,department:employee.department,project_name:employee.project_name,work_location:employee.work_location,manager_name:employee.manager_name,hire_date:employee.hire_date,contract_type:employee.contract_type,bank_name:employee.bank_name,bank_account_number:employee.bank_account_number,iban:employee.iban},company,payroll,clearance:null,source_type:'direct_without_clearance',captured_at:new Date().toISOString()}
   const financialData=initialFinancialData(snapshot)
   const nr=await fetch(SUPABASE_URL+'/rest/v1/rpc/next_financial_clearance_number',{method:'POST',headers:adminHeaders(auth),body:'{}'})
   const number=await nr.text(); if(!nr.ok)return NextResponse.json({error:number},{status:500})
   const clearanceNumber=number.replace(/^"|"$/g,'')
   const insert=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=representation'}),body:JSON.stringify({clearance_number:clearanceNumber,employee_id:employee.id,clearance_record_id:null,status:'pending_employee',current_stage:'employee',source_snapshot:snapshot,financial_data:financialData,created_by:auth.user.id})})
   const created=await insert.json().catch(()=>[])
   if(!insert.ok)return NextResponse.json({error:created?.message||JSON.stringify(created)},{status:500})
   const id=created?.[0]?.id;if(!id)return NextResponse.json({error:'تعذر إنشاء رقم المخالصة.'},{status:500})
   const stages=['employee','finance','hr','project_manager','general_manager']
   for(const stage of stages)await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:id,stage,status:'pending'})})
   const links:any={};for(const stage of stages){const stageLink=await ensureStageLink(auth,id,stage);links[stage]=stageLink?.token||null}
   await audit(auth,id,'created_without_clearance',{employee_id:employee.id,clearance_number:clearanceNumber,approval_links:links})
   return NextResponse.json({ok:true,clearance:{id,clearance_number:clearanceNumber,status:'pending_employee',links,without_clearance:true}})
 }

 const cr=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?select=id,employee_id,form_data,status&form_type=eq.clearance&id=eq.'+encodeURIComponent(clearanceRecordId)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const records=await cr.json().catch(()=>[])
 if(!cr.ok||!records?.[0])return NextResponse.json({error:'سجل إخلاء الطرف غير موجود.'},{status:404})
 const source=records[0]
 if(!clearanceComplete(source.form_data))return NextResponse.json({error:'لا يمكن إنشاء المخالصة قبل اكتمال واعتماد إخلاء الطرف بالكامل.'},{status:409})

 const existing=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=id,clearance_number,status&clearance_record_id=eq.'+encodeURIComponent(clearanceRecordId)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const existingRows=await existing.json().catch(()=>[])
 if(existingRows?.[0])return NextResponse.json({ok:true,clearance:existingRows[0],existing:true})

 const snapshot=await buildSourceSnapshot(auth,source.employee_id,clearanceRecordId)
 const financialData=initialFinancialData(snapshot)
 const nr=await fetch(SUPABASE_URL+'/rest/v1/rpc/next_financial_clearance_number',{method:'POST',headers:adminHeaders(auth),body:'{}'})
 const number=await nr.text(); if(!nr.ok)return NextResponse.json({error:number},{status:500})
 const clearanceNumber=number.replace(/^"|"$/g,'')
 const insert=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances',{
  method:'POST',headers:adminHeaders(auth,{'Prefer':'return=representation'}),
  body:JSON.stringify({clearance_number:clearanceNumber,employee_id:source.employee_id,clearance_record_id:clearanceRecordId,status:'pending_employee',current_stage:'employee',source_snapshot:snapshot,financial_data:financialData,created_by:auth.user.id})
 })
 const created=await insert.json().catch(()=>[])
 if(!insert.ok)return NextResponse.json({error:created?.message||JSON.stringify(created)},{status:500})
 const id=created?.[0]?.id
 if(!id)return NextResponse.json({error:'تعذر إنشاء رقم المخالصة.'},{status:500})

 const items=(financialData.obligations||[]).map((x:any,i:number)=>({clearance_id:id,item_type:'obligation',code:x.code,label:x.label,amount:0,editable:false,source:x.source||null,notes:x.notes||'',sort_order:i,created_by:auth.user.id,updated_by:auth.user.id}))
 if(items.length) await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(items)})

 const stages=['employee','finance','hr','project_manager','general_manager']
 for(const stage of stages){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:id,stage,status:'pending'})})
 }
 const links:any={}
 for(const stage of stages){
   const stageLink=await ensureStageLink(auth,id,stage)
   links[stage]=stageLink?.token||null
 }
 await audit(auth,id,'created',{clearance_record_id:clearanceRecordId,clearance_number:clearanceNumber,approval_links:links})
 return NextResponse.json({ok:true,clearance:{id,clearance_number:clearanceNumber,status:'pending_employee',links}})
}
