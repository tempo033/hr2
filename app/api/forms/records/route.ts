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
 const d=await r.json()
 if(!r.ok) return NextResponse.json({error:JSON.stringify(d)},{status:r.status})
 const records=Array.isArray(d)?d:[]
 const employeeIds=[...new Set(records.map((x:any)=>x.employee_id).filter(Boolean))]
 let employees:any[]=[]
 if(employeeIds.length){
   const er=await fetch(SUPABASE_URL+'/rest/v1/employee_records?select=id,employee_number,full_name,department,job_title,company_id&id=in.('+employeeIds.join(',')+')',{headers:supabaseHeaders(auth),cache:'no-store'})
   const ed=await er.json()
   if(!er.ok) return NextResponse.json({error:JSON.stringify(ed)},{status:er.status})
   employees=Array.isArray(ed)?ed:[]
 }
 const employeeMap=new Map(employees.map((e:any)=>[e.id,e]))
 const companyIds=[...new Set(employees.map((e:any)=>e.company_id).filter(Boolean))]
 let companies:any[]=[]
 if(companyIds.length){
   const cr=await fetch(SUPABASE_URL+'/rest/v1/employee_companies?select=id,name,unified_number&id=in.('+companyIds.join(',')+')',{headers:supabaseHeaders(auth),cache:'no-store'})
   const cd=await cr.json()
   if(!cr.ok) return NextResponse.json({error:JSON.stringify(cd)},{status:cr.status})
   companies=Array.isArray(cd)?cd:[]
 }
 const companyMap=new Map(companies.map((x:any)=>[x.id,x]))
 const linkQuery=new URLSearchParams({select:'*',order:'created_at.asc'})
 if(type) linkQuery.set('form_type','eq.'+type)
 if(id) linkQuery.set('record_id','eq.'+id)
 const lr=await fetch(SUPABASE_URL+'/rest/v1/hr_form_links?'+linkQuery.toString(),{headers:supabaseHeaders(auth),cache:'no-store'})
 const ld=await lr.json()
 if(!lr.ok) return NextResponse.json({error:JSON.stringify(ld)},{status:lr.status})
 const links=Array.isArray(ld)?ld:[]
 const origin=req.nextUrl.origin
 const linksByRecord=new Map<string,any[]>()
 for(const link of links){
   if(!link.record_id) continue
   const arr=linksByRecord.get(link.record_id)||[]
   arr.push({...link,public_url:origin+'/forms/public/'+link.token})
   linksByRecord.set(link.record_id,arr)
 }
 const enriched=records.map((record:any)=>{
   const employee=record.employee_id?employeeMap.get(record.employee_id):null
   return {
     ...record,
     employee:employee||null,
     company:employee?.company_id?companyMap.get(employee.company_id)||null:null,
     employee_name:employee?.full_name??record.employee_name??null,
     employee_number:employee?.employee_number??record.employee_number??null,
     department:employee?.department??record.department??null,
     job_title:employee?.job_title??record.job_title??null,
     links:linksByRecord.get(record.id)||[],
   }
 })
 return NextResponse.json({records:enriched},{status:200})
}

export async function PATCH(req:NextRequest){
 const auth=await getServerAuth(req,allowed); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const id=req.nextUrl.searchParams.get('id'); if(!id)return NextResponse.json({error:'معرف النموذج مطلوب.'},{status:400})
 const body=await req.json().catch(()=>({})); const form=body.form||{}
 // الموارد البشرية يمكنها تعديل وحفظ طلب الإجازة وهو في حالة مسودة قبل إرساله للموظف.
 // توقيع الموظف مطلوب فقط عند الإرسال الفعلي من رابط الموظف، وليس أثناء تجهيز المسودة داخليًا.
 const currentRes=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?id=eq.'+encodeURIComponent(id)+'&select=id,form_type,status',{headers:supabaseHeaders(auth),cache:'no-store'})
 const currentRows=await currentRes.json().catch(()=>[])
 if(!currentRes.ok||!currentRows?.[0])return NextResponse.json({error:'سجل النموذج غير موجود.'},{status:404})
 const current=currentRows[0]
 if(current.form_type==='leave' && current.status==='مسودة'){
   const linkRes=await fetch(SUPABASE_URL+'/rest/v1/hr_form_links?record_id=eq.'+encodeURIComponent(id)+'&form_type=eq.leave&link_scope=eq.leave:employee&select=id,status,last_submitted_at&limit=1',{headers:supabaseHeaders(auth),cache:'no-store'})
   const linkRows=await linkRes.json().catch(()=>[])
   if(linkRows?.[0]?.last_submitted_at) return NextResponse.json({error:'تم إرسال طلب الإجازة للموظف ولا يمكن تعديل المسودة من هذا المسار.'},{status:409})
   if(linkRows?.[0] && !['disabled','draft'].includes(linkRows[0].status)) return NextResponse.json({error:'طلب الإجازة تم إرساله للموظف بالفعل.'},{status:409})
 }else if(current.form_type==='leave' && !form.employee_signature){
   return NextResponse.json({error:'لا يمكن تعديل طلب الإجازة بعد إرساله للموظف بدون توقيعه.'},{status:400})
 }else if(!form.employee_signature){
   return NextResponse.json({error:'لا يمكن حفظ النموذج بدون توقيع الموظف.'},{status:400})
 }
 const payload={form_data:form,employee_number:form.employee_number||null,employee_name:form.employee_name||null,department:form.department||null,job_title:form.job_title||null,status:body.status||current.status||'مسودة',updated_at:new Date().toISOString()}
 const r=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{...supabaseHeaders(auth),'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)})
 const d=await r.json(); return NextResponse.json({record:d?.[0]||null,error:r.ok?undefined:(d?.message||JSON.stringify(d))},{status:r.ok?200:r.status})
}

export async function DELETE(req:NextRequest){
 const auth=await getServerAuth(req,allowed); if(!auth)return NextResponse.json({error:'غير مصرح.'},{status:403})
 const id=req.nextUrl.searchParams.get('id'); if(!id)return NextResponse.json({error:'معرف النموذج مطلوب.'},{status:400})
 const lr=await fetch(SUPABASE_URL+'/rest/v1/hr_form_links?record_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:supabaseHeaders(auth)})
 if(!lr.ok){const d=await lr.text();return NextResponse.json({error:d},{status:lr.status})}
 const r=await fetch(SUPABASE_URL+'/rest/v1/hr_form_records?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:supabaseHeaders(auth)})
 if(!r.ok){const d=await r.text();return NextResponse.json({error:d},{status:r.status})}
 return NextResponse.json({ok:true})
}

