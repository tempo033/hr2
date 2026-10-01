import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,STAGES} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params; const auth=await financialAuth(req); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const body=await req.json().catch(()=>({})); const action=body.action==='return'?'return':'approve'
 const rowRes=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=*&id=eq.'+id+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'});const rows=await rowRes.json().catch(()=>[])
 const row=rows?.[0]; if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed')return NextResponse.json({error:'المخالصة مكتملة نهائيًا.'},{status:409})
 const stage=row.current_stage
 const stageDef=STAGES.find(x=>x.key===stage)
 if(!stageDef)return NextResponse.json({error:'مرحلة الاعتماد غير صالحة.'},{status:409})
 if(stage==='employee')return NextResponse.json({error:'اعتماد الموظف يتم فقط من رابط الموظف.'},{status:403})
 if(stage!=='employee'&&!stageDef.roles.includes(auth.role as (typeof STAGES)[number]['roles'][number]))return NextResponse.json({error:'ليس لديك صلاحية اعتماد هذه المرحلة.'},{status:403})
 if(action==='return'&&!String(body.notes||'').trim())return NextResponse.json({error:'يجب كتابة سبب الإرجاع.'},{status:400})
 const now=new Date().toISOString()
 const approval=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+id+'&stage=eq.'+stage,{headers:adminHeaders(auth),cache:'no-store'});const aRows=await approval.json().catch(()=>[])
 const currentApproval=aRows?.[0]
 if(action==='approve' && stage==='employee' && !body.signature)return NextResponse.json({error:'اعتماد الموظف يتطلب التوقيع.'},{status:400})
 const name=String(body.name||auth.user?.user_metadata?.full_name||auth.user?.email||'المعتمد')
 const title=String(body.title||stageDef.label)
 const approvalPatch={status:action==='approve'?'approved':'returned',approver_user_id:stage==='employee'?null:auth.user.id,approver_name:name,approver_title:title,signature:body.signature||currentApproval?.signature||null,notes:String(body.notes||''),acted_at:now,updated_at:now}
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?id=eq.'+currentApproval.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(approvalPatch)})
 if(action==='return'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'returned',updated_at:now})})
   await audit(auth,id,'returned',{notes:body.notes},stage)
   return NextResponse.json({ok:true,status:'returned'})
 }
 const index=STAGES.findIndex(x=>x.key===stage); const next=STAGES[index+1]
 if(!next){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'completed',current_stage:'general_manager',final_approved_at:now,updated_at:now})})
   await audit(auth,id,'final_approved',{stage})
   return NextResponse.json({ok:true,status:'completed'})
 }
 const nextStatus=next.key==='finance'?'pending_finance':next.key==='hr'?'pending_hr':next.key==='project_manager'?'pending_project_manager':'pending_general_manager'
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+id+'&stage=eq.'+next.key,{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({clearance_id:id,stage:next.key,status:'pending'})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:nextStatus,current_stage:next.key,updated_at:now})})
 await audit(auth,id,'approved',{next_stage:next.key},stage)
 return NextResponse.json({ok:true,status:nextStatus,current_stage:next.key})
}
