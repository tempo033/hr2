import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,clearanceComplete,buildSourceSnapshot,initialFinancialData,audit} from '@/lib/financial-clearance'
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
 const body=await req.json().catch(()=>({})); const clearanceRecordId=String(body.clearance_record_id||'')
 if(!clearanceRecordId)return NextResponse.json({error:'سجل إخلاء الطرف مطلوب.'},{status:400})
 const cr=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?select=id,employee_id,form_data,status&form_type=eq.clearance&id=eq.'+encodeURIComponent(clearanceRecordId)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const records=await cr.json().catch(()=>[])
 if(!cr.ok||!records?.[0])return NextResponse.json({error:'سجل إخلاء الطرف غير موجود.'},{status:404})
 const source=records[0]
 if(!clearanceComplete(source.form_data))return NextResponse.json({error:'لا يمكن إنشاء المخالصة قبل اكتمال واعتماد إخلاء الطرف بالكامل.'},{status:409})
 const existing=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=id,clearance_number,status&id=eq.'+encodeURIComponent(clearanceRecordId)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const existingRows=await existing.json().catch(()=>[])
 if(existingRows?.[0])return NextResponse.json({ok:true,clearance:existingRows[0],existing:true})
 const snapshot=await buildSourceSnapshot(auth,source.employee_id,clearanceRecordId)
 const financialData=initialFinancialData(snapshot)
 const nr=await fetch(SUPABASE_URL+'/rest/v1/rpc/next_financial_clearance_number',{method:'POST',headers:adminHeaders(auth),body:'{}'})
 const number=await nr.text(); if(!nr.ok)return NextResponse.json({error:number},{status:500})
 const clearanceNumber=number.replace(/^"|"$/g,'')
 const insert=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances',{
  method:'POST',headers:adminHeaders(auth,{'Prefer':'return=representation'}),
  body:JSON.stringify({clearance_number:clearanceNumber,employee_id:source.employee_id,clearance_record_id:clearanceRecordId,status:'pending_employee',current_stage:'employee',source_snapshot: snapshot,financial_data:financialData,created_by:auth.user.id})
 })
 const created=await insert.json().catch(()=>[])
 if(!insert.ok)return NextResponse.json({error:created?.message||JSON.stringify(created)},{status:500})
 const id=created?.[0]?.id
 const items=[...(financialData.entitlements||[]).map((x:any,i:number)=>({clearance_id:id,item_type:'entitlement',code:x.code,label:x.label,amount:Number(x.amount||0),editable:x.editable!==false,source:x.source||null,notes:x.notes||'',sort_order:i,created_by:auth.user.id,updated_by:auth.user.id})),...(financialData.obligations||[]).map((x:any,i:number)=>({clearance_id:id,item_type:'obligation',code:x.code,label:x.label,amount:Number(x.amount||0),editable:x.editable!==false,source:x.source||null,notes:x.notes||'',sort_order:i,created_by:auth.user.id,updated_by:auth.user.id}))]
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(items)})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:id,stage:'employee',status:'pending'})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:id,stage:'employee',status:'active'})})
 await audit(auth,id,'created',{clearance_record_id:clearanceRecordId,clearance_number:clearanceNumber})
 return NextResponse.json({ok:true,clearance:{id,clearance_number:clearanceNumber,status:'pending_employee'}})
}
