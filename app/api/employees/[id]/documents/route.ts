import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerAuth } from '@/lib/server-auth'
const ROLES=['admin','hr','interviewer','manager']
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||''
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
const MAX_SIZE=1024*1024
const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png'])
const headers=(extra:Record<string,string>={})=>({apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,Accept:'application/json',...extra})
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
 if(!ins.ok){await fetch(`${SUPABASE_URL}/storage/v1/object/employee-documents/${encodeURIComponent(path)}`,{method:'DELETE',headers:headers()}).catch(()=>null);return NextResponse.json({error:await ins.text()},{status:500})}
 return NextResponse.json({document:(await ins.json())[0]})
}
