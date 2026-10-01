import {NextRequest,NextResponse} from 'next/server'
import {adminHeaders,ensureStageLink,calculateLeaveValue} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

async function serviceAuth(){return {user:{id:null},role:'public',serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY||''}}
async function getLink(token:string){
 const auth=await serviceAuth()
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?select=*,clearance:financial_clearances(*,employee:employee_records(full_name,employee_number,national_id,nationality,job_title,department,hire_date,bank_name,iban,company:employee_companies(name,unified_number)),items:financial_clearance_items(*),approvals:financial_clearance_approvals(*),links:financial_clearance_links(*))&token=eq.'+encodeURIComponent(token)+'&status=in.(active,used)&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const d=await r.json().catch(()=>[])
 return {auth,link:d?.[0]||null}
}

async function saveFinanceItems(auth:any,clearance:any,items:any[]){
 const current=clearance.items||[]
 const submittedIds=new Set(items.filter((x:any)=>x.id).map((x:any)=>String(x.id)))
 for(const existing of current){
   if(existing.editable!==false&&!submittedIds.has(String(existing.id))){
     await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(existing.id)+'&clearance_id=eq.'+encodeURIComponent(clearance.id),{method:'DELETE',headers:adminHeaders(auth)})
   }
 }
 let order=0
 for(const item of items){
   const label=String(item.label||'').trim(); if(!label)continue
   const amount=Number(item.amount)
   if(!Number.isFinite(amount)||amount<0)throw new Error('يوجد مبلغ غير صحيح.')
   const payload={item_type:item.item_type==='obligation'?'obligation':'entitlement',code:String(item.code||'manual'),label,amount,editable:item.editable!==false,source:'finance:link',notes:String(item.notes||''),sort_order:order++,updated_at:new Date().toISOString()}
   if(item.id){
     const existing=current.find((x:any)=>String(x.id)===String(item.id))
     if(!existing||existing.editable===false)continue
     await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(item.id)+'&clearance_id=eq.'+encodeURIComponent(clearance.id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(payload)})
   }else{
     await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({...payload,clearance_id:clearance.id})})
   }
 }
}

export async function GET(req:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params
 const {auth,link}=await getLink(token)
 if(!link)return NextResponse.json({error:'الرابط غير صالح أو تم تعطيله.'},{status:404})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+link.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({last_opened_at:new Date().toISOString()})})
 return NextResponse.json({link})
}

export async function POST(req:NextRequest,{params}:{params:Promise<{token:string}>}){
 const {token}=await params
 const {auth,link}=await getLink(token)
 if(!link)return NextResponse.json({error:'الرابط غير صالح.'},{status:404})
 if(link.status!=='active')return NextResponse.json({error:'تم استخدام هذا الرابط ولا يمكن التوقيع أو التعديل من خلاله مرة أخرى.'},{status:410})
 const clearance=link.clearance
 if(['completed','rejected'].includes(clearance.status))return NextResponse.json({error:'المخالصة مغلقة نهائيًا.'},{status:409})

 const body=await req.json().catch(()=>({}))
 const action=body.action==='return'?'return':body.action==='reject'?'reject':body.action==='save'?'save':'approve'
 const now=new Date().toISOString()
 if(link.stage==='project_manager'&&action==='approve'&&!['applies','not_applies'].includes(String(body.decision||'')))return NextResponse.json({error:'يجب تحديد: ينطبق أو لا ينطبق.'},{status:400})

 if(action==='save')return NextResponse.json({error:'لا يمكن تعديل المخالصة من روابط الاعتماد. الاطلاع والتوقيع والاعتماد فقط.'},{status:403})

 if((action==='approve'||action==='return'||action==='reject')&&!String(body.notes||'').trim()&&action!=='approve')
   return NextResponse.json({error:'يجب كتابة سبب الإجراء.'},{status:400})
 if(action==='approve'&&!body.signature)return NextResponse.json({error:'يجب إدخال التوقيع قبل الاعتماد.'},{status:400})
 if(action==='approve'&&!String(body.name||'').trim())return NextResponse.json({error:'يجب إدخال اسم المعتمد.'},{status:400})

 const approval=(clearance.approvals||[]).find((x:any)=>x.stage===link.stage)
 if(!approval)return NextResponse.json({error:'سجل الاعتماد غير موجود.'},{status:409})
 const name=String(body.name||'').trim()
 const title=String(body.title||({employee:'الموظف',finance:'الإدارة المالية',hr:'الموارد البشرية',project_manager:'مدير المشاريع',general_manager:'المدير العام'} as any)[link.stage]||link.stage)
 const approvalUpdate=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?id=eq.'+approval.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=representation'}),body:JSON.stringify({status:action==='approve'?'approved':'returned',approver_user_id:null,approver_name:name,approver_title:title,signature:body.signature||null,decision:link.stage==='project_manager'?(body.decision||null):null,notes:String(body.notes||''),acted_at:now,updated_at:now})})
 if(!approvalUpdate.ok){
   const errorText=await approvalUpdate.text().catch(()=> '')
   return NextResponse.json({error:'تعذر حفظ التوقيع والاعتماد. لم يتم إغلاق الرابط. حاول مرة أخرى.',details:errorText.slice(0,500)},{status:500})
 }
 const savedApprovalRows=await approvalUpdate.json().catch(()=>[])
 const savedApproval=savedApprovalRows?.[0]
 if(action==='approve' && (!savedApproval || savedApproval.status!=='approved' || savedApproval.approver_name!==name || savedApproval.signature!==String(body.signature||''))){
   return NextResponse.json({error:'لم يتم التحقق من حفظ التوقيع والاعتماد في قاعدة البيانات. لم يتم إغلاق الرابط.',details:'approval verification failed'},{status:500})
 }

 if(action==='reject'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'rejected',updated_at:now})})
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+link.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'used',last_submitted_at:now,updated_at:now})})
   return NextResponse.json({ok:true,status:'rejected'})
 }

 if(action==='return'){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'needs_revision',updated_at:now})})
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+link.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'active',last_submitted_at:now,updated_at:now})})
   return NextResponse.json({ok:true,status:'needs_revision'})
 }

 // All approval links are independent and can be completed in any order.
 // The clearance becomes completed only when employee + finance + HR + GM are approved,
 // and the optional project-manager stage is either approved or skipped.
 const requiredStages=['employee','finance','hr','general_manager']
 const approvals=(clearance.approvals||[])
 const requiredDone=requiredStages.every((s:string)=>approvals.some((a:any)=>a.stage===s&&a.status==='approved'))
 const pmDone=approvals.some((a:any)=>a.stage==='project_manager'&&['approved','skipped'].includes(a.status))
 const complete=requiredDone && pmDone
 if(complete){
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'completed',current_stage:'general_manager',final_approved_at:now,updated_at:now})})
 }else{
   await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+clearance.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_approvals',updated_at:now})})
 }
 const linkClose=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?id=eq.'+link.id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=representation'}),body:JSON.stringify({status:'used',last_submitted_at:now,updated_at:now})})
 if(!linkClose.ok){
   return NextResponse.json({error:'تم حفظ الاعتماد لكن تعذر إغلاق رابط التوقيع. يمكنك فتح الرابط مرة أخرى دون فقدان الاعتماد.'},{status:500})
 }
 return NextResponse.json({ok:true,status:next?({finance:'pending_finance',hr:'pending_hr',project_manager:'pending_project_manager',general_manager:'pending_general_manager'} as any)[next]:'completed',current_stage:next||'general_manager'})
}
