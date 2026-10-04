import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerAuth } from '@/lib/server-auth'
const ROLES=['admin','hr','interviewer','manager']
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
const MAX_SIZE=1024*1024
const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
const headers=(extra:Record<string,string>={})=>({apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,Accept:'application/json',...extra})
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const {id}=await params;const url=new URL(req.url);const documentId=url.searchParams.get('document_id')||''
 if(!documentId)return NextResponse.json({error:'معرف المستند مطلوب.'},{status:400})
 const q=await fetch(SUPABASE_URL+'/rest/v1/employee_documents?select=*&id=eq.'+encodeURIComponent(documentId)+'&employee_id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:headers(),cache:'no-store'})
 const qt=await q.text().catch(()=> '');let row:any=null;try{row=qt?JSON.parse(qt)?.[0]||null:null}catch{}
 if(!q.ok)return NextResponse.json({error:qt||'تعذر تحميل المستند.'},{status:500})
 if(!row?.document_url)return NextResponse.json({error:'المستند غير موجود.'},{status:404})
 const fileRes=await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(row.document_url),{headers:headers(),cache:'no-store'})
 if(!fileRes.ok)return NextResponse.json({error:'تعذر فتح المستند من التخزين.'},{status:404})
 const body=await fileRes.arrayBuffer();const safeName=String(row.document_name||'document').replace(/[\\\\/"<>:*?|]/g,'_')
 return new Response(body,{status:200,headers:{'Content-Type':row.mime_type||fileRes.headers.get('content-type')||'application/octet-stream','Content-Disposition':'inline; filename="'+encodeURIComponent(safeName)+'"','Cache-Control':'private, no-store'}})
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const {id}=await params;const url=new URL(req.url);const documentId=url.searchParams.get('document_id')||''
 if(!documentId)return NextResponse.json({error:'معرف المستند مطلوب.'},{status:400})
 const lookup=await fetch(SUPABASE_URL+'/rest/v1/employee_documents?select=id,document_url&id=eq.'+encodeURIComponent(documentId)+'&employee_id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:headers(),cache:'no-store'})
 const lt=await lookup.text().catch(()=> '');let row:any=null;try{row=lt?JSON.parse(lt)?.[0]||null:null}catch{}
 if(!lookup.ok)return NextResponse.json({error:lt||'تعذر العثور على المستند.'},{status:500})
 if(!row)return NextResponse.json({error:'المستند غير موجود.'},{status:404})
 if(row.document_url){const delFile=await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(row.document_url),{method:'DELETE',headers:headers()});if(!delFile.ok)return NextResponse.json({error:(await delFile.text().catch(()=>''))||'تعذر حذف ملف المستند من التخزين.'},{status:500})}
 const delRow=await fetch(SUPABASE_URL+'/rest/v1/employee_documents?id=eq.'+encodeURIComponent(documentId)+'&employee_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:headers()})
 if(!delRow.ok)return NextResponse.json({error:(await delRow.text().catch(()=>''))||'تم حذف الملف ولكن تعذر حذف بيانات المستند.'},{status:500})
 return NextResponse.json({success:true})
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 if(!SERVICE_KEY)return NextResponse.json({error:'خدمة المستندات غير مهيأة.'},{status:500})
 const {id}=await params;const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||!file.size)return NextResponse.json({error:'اختر ملفًا.'},{status:400})
 if(file.size>MAX_SIZE)return NextResponse.json({error:'حجم الملف يجب ألا يتجاوز 1 ميجابايت.'},{status:400})
 if(!allowed.has(file.type))return NextResponse.json({error:'المسموح PDF وWord وJPG وPNG فقط.'},{status:400})
 const name=String(form.get('document_name')||file.name).trim()||file.name
 const type=String(form.get('document_type')||'مستند آخر')
 const path=`${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g,'_').slice(0,120)}`
 const up=await fetch(`${SUPABASE_URL}/storage/v1/object/employee-documents/${encodeURIComponent(path)}`,{method:'POST',headers:headers({'Content-Type':file.type,'x-upsert':'false'}),body:new Uint8Array(await file.arrayBuffer())})
 if(!up.ok)return NextResponse.json({error:(await up.text().catch(()=>''))||'تعذر رفع الملف.'},{status:400})
 const row={employee_id:id,document_type:type,document_name:name,document_url:path,document_number:String(form.get('document_number')||'')||null,issue_date:String(form.get('issue_date')||'')||null,expiry_date:String(form.get('expiry_date')||'')||null,status:String(form.get('status')||'ساري'),notes:String(form.get('notes')||'')||null}
 const ins=await fetch(`${SUPABASE_URL}/rest/v1/employee_documents`,{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(row)})
 const insText=await ins.text().catch(()=> '')
 if(!ins.ok){await fetch(`${SUPABASE_URL}/storage/v1/object/employee-documents/${encodeURIComponent(path)}`,{method:'DELETE',headers:headers()}).catch(()=>null);let error='تعذر حفظ بيانات المستند.';try{const parsed=insText?JSON.parse(insText):null;error=parsed?.message||parsed?.error_description||parsed?.hint||insText||error}catch{if(insText)error=insText}return NextResponse.json({error},{status:500})}
 let document:any=null
 try{document=insText?JSON.parse(insText)?.[0]||null:null}catch{document=null}
 if(!document){const verify=await fetch(`${SUPABASE_URL}/rest/v1/employee_documents?select=*&employee_id=eq.${encodeURIComponent(id)}&document_url=eq.${encodeURIComponent(path)}&limit=1`,{headers:headers()});const verifyText=await verify.text().catch(()=> '');try{document=verifyText?JSON.parse(verifyText)?.[0]||null:null}catch{document=null}}
 if(!document){await fetch(`${SUPABASE_URL}/storage/v1/object/employee-documents/${encodeURIComponent(path)}`,{method:'DELETE',headers:headers()}).catch(()=>null);return NextResponse.json({error:'تم رفع الملف لكن تعذر حفظ بياناته.'},{status:500})}
 return NextResponse.json({document})
}
