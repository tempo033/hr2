import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit,ensureStageLink} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

const stages=['employee','finance','hr','project_manager','general_manager']
const statuses:any={employee:'pending_employee',finance:'pending_finance',hr:'pending_hr',project_manager:'pending_project_manager',general_manager:'pending_general_manager'}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin'])
 if(!auth)return NextResponse.json({error:'إعادة فتح رابط المخالصة متاحة لمدير النظام فقط.'},{status:403})
 const {id}=await params
 const body=await req.json().catch(()=>({}))
 const stage=String(body.stage||'')
 const reason=String(body.reason||'').trim()
 if(!stages.includes(stage)||!reason)return NextResponse.json({error:'يجب تحديد مرحلة صحيحة وسبب إعادة الفتح.'},{status:400})
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id)+'&select=id,status,current_stage',{headers:adminHeaders(auth),cache:'no-store'})
 const rows=await r.json().catch(()=>[])
 if(!rows?.[0])return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 const now=new Date().toISOString()
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+encodeURIComponent(id)+'&stage=eq.'+encodeURIComponent(stage),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending',approver_user_id:null,approver_name:null,approver_title:null,signature:null,decision:null,notes:null,acted_at:null,updated_at:now})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links?clearance_id=eq.'+encodeURIComponent(id)+'&stage=eq.'+encodeURIComponent(stage),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'used',updated_at:now})})
 await ensureStageLink(auth,id,stage)
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:statuses[stage],current_stage:stage,updated_at:now})})
 await audit(auth,id,'reopened_stage',{stage,reason})
 return NextResponse.json({ok:true,status:statuses[stage],current_stage:stage})
}
