import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,supabaseHeaders,SUPABASE_URL} from '@/lib/server-auth'

const allowed=['admin','hr','interviewer','manager']

export async function GET(req:NextRequest){
 const auth=await getServerAuth(req,allowed); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const id=req.nextUrl.searchParams.get('id'); const type=req.nextUrl.searchParams.get('form_type')
 const query=new URLSearchParams({select:'*',order:'updated_at.desc'})
 if(id) query.set('id','eq.'+id)
 if(type) query.set('form_type','eq.'+type)
 const r=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?'+query.toString(),{headers:supabaseHeaders(auth),cache:'no-store'})
 const d=await r.json(); return NextResponse.json({records:d||[]},{status:r.ok?200:r.status})
}

export async function PATCH(req:NextRequest){
 const auth=await getServerAuth(req,allowed); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const id=req.nextUrl.searchParams.get('id'); if(!id)return NextResponse.json({error:'معرف النموذج مطلوب.'},{status:400})
 const body=await req.json().catch(()=>({})); const form=body.form||{}
 const payload={form_data:form,employee_number:form.employee_number||null,employee_name:form.employee_name||null,department:form.department||null,job_title:form.job_title||null,status:body.status||'مسودة',updated_at:new Date().toISOString()}
 const r=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{...supabaseHeaders(auth),'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)})
 const d=await r.json(); return NextResponse.json({record:d?.[0]||null,error:r.ok?undefined:(d?.message||JSON.stringify(d))},{status:r.ok?200:r.status})
}

export async function DELETE(req:NextRequest){
 const auth=await getServerAuth(req,allowed); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const id=req.nextUrl.searchParams.get('id'); if(!id)return NextResponse.json({error:'معرف النموذج مطلوب.'},{status:400})
 const r=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:supabaseHeaders(auth)})
 if(!r.ok){const d=await r.text();return NextResponse.json({error:d},{status:r.status})}
 return NextResponse.json({ok:true})
}
