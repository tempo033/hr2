import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,ensureStageLink} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin','finance']);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params
 const body=await req.json().catch(()=>({}))
 const items=Array.isArray(body.items)?body.items:[]
 const rr=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=id,status,current_stage&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await rr.json().catch(()=>[])
 const row=rows?.[0]
 if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed'||row.status==='rejected')return NextResponse.json({error:'لا يمكن تعديل البنود بعد إغلاق المخالصة.'},{status:409})
 if(auth.role!=='admin'&&!(auth.role==='finance'&&row.current_stage==='finance'))return NextResponse.json({error:'إدارة البنود المالية متاحة للإدارة المالية فقط أثناء مرحلتها.'},{status:403})

 const currentRes=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?select=*&clearance_id=eq.'+encodeURIComponent(id),{headers:adminHeaders(auth),cache:'no-store'})
 const current=await currentRes.json().catch(()=>[])
 const submittedIds=new Set(items.filter((x:any)=>x.id).map((x:any)=>String(x.id)))

 for(const existing of current){
   if(existing.editable!==false && !submittedIds.has(String(existing.id))){
     await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(existing.id)+'&clearance_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:adminHeaders(auth)})
   }
 }

 let order=0
 for(const item of items){
   const type=item.item_type==='obligation'?'obligation':'entitlement'
   const label=String(item.label||'').trim()
   if(!label)continue
   const amount=Number(item.amount)
   if(!Number.isFinite(amount)||amount<0)return NextResponse.json({error:'يوجد مبلغ غير صحيح.'},{status:400})
   const payload={item_type:type,label,code:String(item.code||'manual'),amount,editable:item.editable!==false,source:'finance',notes:String(item.notes||''),sort_order:order++,updated_by:auth.user.id,updated_at:new Date().toISOString()}
   if(item.id){
     const existing=current.find((x:any)=>String(x.id)===String(item.id))
     if(!existing||existing.editable===false)continue
     const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(item.id)+'&clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify(payload)})
     if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
   }else{
     const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items',{method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({...payload,clearance_id:id,created_by:auth.user.id})})
     if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
   }
 }
 const now=new Date().toISOString()
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending',approver_user_id:null,approver_name:null,approver_title:null,signature:null,decision:null,notes:null,acted_at:null,updated_at:now})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'used',updated_at:now})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending_employee',current_stage:'employee',final_approved_at:null,updated_at:now})})
 await ensureStageLink(auth,id,'employee')
 await audit(auth,id,'items_updated',{count:items.length,reopened_for_employee_signature:true})
 return NextResponse.json({ok:true})
}
