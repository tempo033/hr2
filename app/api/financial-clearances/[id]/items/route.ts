import {NextRequest,NextResponse} from 'next/server'
import {financialAuth,adminHeaders,audit} from '@/lib/financial-clearance'
import {SUPABASE_URL} from '@/lib/server-auth'
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await financialAuth(req,['admin','finance','hr']);if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const {id}=await params;const body=await req.json().catch(()=>({}));const items=Array.isArray(body.items)?body.items:[]
 const rr=await fetch(SUPABASE_URL+'/rest/v1/financial_clearances?select=id,status,current_stage& id=eq.'+encodeURIComponent(id)+'&limit=1'.replace(' ',''),{headers:adminHeaders(auth),cache:'no-store'});const rows=await rr.json().catch(()=>[]);const row=rows?.[0]
 if(!row)return NextResponse.json({error:'المخالصة غير موجودة.'},{status:404})
 if(row.status==='completed')return NextResponse.json({error:'لا يمكن تعديل البنود بعد الاعتماد النهائي.'},{status:409})
 if(auth.role!=='admin'&&!(auth.role==='finance'&&row.current_stage==='finance')&&!(auth.role==='hr'&&row.current_stage==='hr'))return NextResponse.json({error:'تعديل البنود غير مسموح في المرحلة الحالية.'},{status:403})
 for(const item of items){
  if(!item.id||item.editable===false)continue
  const amount=Number(item.amount);if(!Number.isFinite(amount)||amount<0)return NextResponse.json({error:'قيمة مالية غير صحيحة.'},{status:400})
  const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_items?id=eq.'+encodeURIComponent(item.id)+'&clearance_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),body:JSON.stringify({amount,notes:String(item.notes||''),updated_by:auth.user.id,updated_at:new Date().toISOString()})})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
 }
 await audit(auth,id,'items_updated',{count:items.length})
 return NextResponse.json({ok:true})
}
