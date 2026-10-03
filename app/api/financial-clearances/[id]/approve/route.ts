import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,STAGES,ensureStageLink} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

const statusForStage:any={finance:'pending_finance',hr:'pending_hr',project_manager:'pending_project_manager',general_manager:'pending_general_manager'}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params
 const auth=await financialAuth(req)
 if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})

 const body=await req.json().catch(()=>({}))
 const action=body.action==='return'?'return':body.action==='reject'?'reject':body.action==='skip_project_manager'?'skip_project_manager':'approve'
 const rowRes=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await rowRes.json().catch(()=>[])
 const row=rows?.[0]
 if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed'||row.status==='rejected')return NextResponse.json({error:'المخالصة مغلقة نهائيًا.'},{status:409})

 const stage=row.current_stage
 const stageDef=STAGES.find(x=>x.key===stage)
 if(!stageDef)return NextResponse.json({error:'مرحلة الاعتماد غير صالحة.'},{status:409})
 if(stage==='employee')return NextResponse.json({error:'اعتماد الموظف يتم فقط من رابط الموظف.'},{status:403})
 if(!stageDef.roles.includes(auth.role as any))return NextResponse.json({error:'ليس لديك صلاحية اعتماد هذه المرحلة.'},{status:403})
 if((action==='return'||action==='reject')&&!String(body.notes||'').trim())return NextResponse.json({error:'يجب كتابة سبب الإجراء.'},{status:400})
 if(action==='skip_project_manager'&&stage!=='project_manager')return NextResponse.json({error:'تخطي مدير المشاريع متاح فقط عند مرحلة مدير المشاريع.'},{status:400})

 const now=new Date().toISOString()
 if(stage==='project_manager'&&action==='approve'&&!['applies','not_applies'].includes(String(body.decision||'')))return NextResponse.json({error:'يجب تحديد: ينطبق أو لا ينطبق.'},{status:400})
 const approval=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+encodeURIComponent(id)+'&stage=eq.'+encodeURIComponent(stage)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const aRows=await approval.json().catch(()=>[])
 const currentApproval=aRows?.[0]
 if(!currentApproval)return NextResponse.json({error:'سجل الاعتماد غير موجود.'},{status:409})

 const name=String(body.name||auth.user?.user_metadata?.full_name||auth.user?.email||'المعتمد')
 const title=String(body.title||stageDef.label)
 if(action==='skip_project_manager'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?id=eq.'+currentApproval.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'skipped',approver_user_id:auth.user.id,approver_name:name,approver_title:'مدير النظام',signature:null,decision:'skipped',notes:String(body.notes||'تم تخطي اعتماد مدير المشاريع'),acted_at:now,updated_at:now})})
   const nextKey='general_manager'
   await ensureStageLink(auth,id,nextKey)
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_general_manager',current_stage:nextKey,updated_at:now})})
   await audit(auth,id,'project_manager_skipped',{reason:body.notes||'تم تخطي اعتماد مدير المشاريع'},stage)
   return NextResponse.json({ok:true,status:'pending_general_manager',current_stage:nextKey})
 }
 const approvalPatch={status:action==='approve'?'approved':'returned',approver_user_id:auth.user.id,approver_name:name,approver_title:title,signature:body.signature||null,decision:stage==='project_manager'?(body.decision||null):null,notes:String(body.notes||''),acted_at:now,updated_at:now}
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?id=eq.'+currentApproval.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(approvalPatch)})

 if(action==='reject'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'rejected',updated_at:now})})
   await audit(auth,id,'rejected',{notes:body.notes},stage)
   return NextResponse.json({ok:true,status:'rejected'})
 }

 if(action==='return'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'needs_revision',updated_at:now})})
   await audit(auth,id,'needs_revision',{notes:body.notes},stage)
   return NextResponse.json({ok:true,status:'needs_revision'})
 }

 // Each stage is independent. Approving one stage must not block or advance the others.
 const allRes=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?select=stage,status&clearance_id=eq.'+encodeURIComponent(id),{headers:adminHeaders(auth),cache:'no-store'})
 const allApprovals=await allRes.json().catch(()=>[])
 const requiredStages=['employee','finance','hr','general_manager']
 const requiredDone=requiredStages.every((s:string)=>allApprovals.some((a:any)=>a.stage===s&&a.status==='approved'))
 const pmDone=allApprovals.some((a:any)=>a.stage==='project_manager'&&['approved','skipped'].includes(a.status))
 const complete=requiredDone&&pmDone
 if(complete){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'completed',current_stage:'general_manager',final_approved_at:now,updated_at:now})})
   await audit(auth,id,'final_approved',{stage},stage)
   return NextResponse.json({ok:true,status:'completed'})
 }
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_approvals',updated_at:now})})
 await audit(auth,id,'approved',{stage,independent:true},stage)
 return NextResponse.json({ok:true,status:'pending_approvals',current_stage:row.current_stage||'general_manager'})
}
