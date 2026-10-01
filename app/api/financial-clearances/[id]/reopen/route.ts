import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin']); if(!auth)return NextResponse.json({error:'إعادة فتح المخالصة متاحة لمدير النظام فقط.'},{status:403})
 const {id}=await params; const body=await req.json().catch(()=>({}))
 const reason=String(body.reason||'').trim(); if(!reason)return NextResponse.json({error:'سبب إعادة الفتح مطلوب.'},{status:400})
 const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id+'&select=id,status',{headers:adminHeaders(auth),cache:'no-store'});const rows=await r.json().catch(()=>[])
 if(!rows?.[0])return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 const now=new Date().toISOString()
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?id=eq.'+id,{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'returned',current_stage:'finance',reopened_at:now,reopened_by:auth.user.id,reopened_reason:reason,updated_at:now})})
 await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_approvals?clearance_id=eq.'+id+'&stage=gte.finance',{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({status:'pending',approver_user_id:null,signature:null,notes:null,acted_at:null,updated_at:now})})
 await audit(auth,id,'reopened',{reason})
 return NextResponse.json({ok:true,status:'returned',current_stage:'finance'})
}
