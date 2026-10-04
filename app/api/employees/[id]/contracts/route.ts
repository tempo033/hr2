import {NextRequest,NextResponse} from 'next/server'
import crypto from 'crypto'
import {getServerAuth} from '@/lib/server-auth'

const ROLES=['admin','hr'] as const
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
const MAX_SIZE=10*1024*1024
const headers=(extra:Record<string,string>={})=>({apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,Accept:'application/json',...extra})

async function audit(contractId:string,employeeId:string,action:string,user:any,details:any={}) {
 await fetch(SUPABASE_URL+'/rest/v1/employee_contract_audit_logs',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({contract_id:contractId,employee_id:employeeId,action,details,user_id:user?.id||null,user_name:user?.user_metadata?.full_name||user?.email||'المستخدم'})}).catch(()=>null)
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,['admin','hr','interviewer','manager']);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const {id}=await params
 const r=await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?select=*&employee_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc',{headers:headers(),cache:'no-store'})
 const text=await r.text().catch(()=> '');let rows:any[]=[];try{rows=text?JSON.parse(text):[]}catch{}
 if(!r.ok)return NextResponse.json({error:text||'تعذر تحميل سجل العقود.'},{status:500})
 return NextResponse.json({contracts:rows})
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'رفع واعتماد عقود الموظفين متاح للموارد البشرية والإدارة فقط.'},{status:403})
 if(!SERVICE_KEY)return NextResponse.json({error:'خدمة المستندات غير مهيأة.'},{status:500})
 const {id}=await params
 const employeeRes=await fetch(SUPABASE_URL+'/rest/v1/employee_records?select=id,full_name,national_id,nationality,employee_number&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:headers(),cache:'no-store'})
 const et=await employeeRes.text().catch(()=> '');let employee:any=null;try{employee=et?JSON.parse(et)?.[0]||null:null}catch{}
 if(!employeeRes.ok||!employee)return NextResponse.json({error:'لم يتم العثور على الموظف.'},{status:404})
 const form=await req.formData();const file=form.get('file')
 if(!(file instanceof File)||!file.size)return NextResponse.json({error:'اختر عقد PDF.'},{status:400})
 if(file.type!=='application/pdf')return NextResponse.json({error:'عقد قوى يجب أن يكون بصيغة PDF.'},{status:400})
 if(file.size>MAX_SIZE)return NextResponse.json({error:'حجم عقد PDF يجب ألا يتجاوز 10 ميجابايت.'},{status:400})
 const path=id+'/contracts/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g,'_').slice(0,120)
 const up=await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(path),{method:'POST',headers:headers({'Content-Type':'application/pdf','x-upsert':'false'}),body:new Uint8Array(await file.arrayBuffer())})
 if(!up.ok)return NextResponse.json({error:(await up.text().catch(()=>''))||'تعذر رفع عقد قوى.'},{status:400})
 const row={employee_id:id,document_type:'عقد قوى',document_name:String(form.get('document_name')||file.name),document_url:path,status:'ساري',notes:'عقد موظف مرفوع من قسم عقود منصة قوى'}
 const ins=await fetch(SUPABASE_URL+'/rest/v1/employee_documents',{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(row)})
 const it=await ins.text().catch(()=> '');let doc:any=null;try{doc=it?JSON.parse(it)?.[0]||null:null}catch{}
 if(!ins.ok||!doc){await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(path),{method:'DELETE',headers:headers()}).catch(()=>null);return NextResponse.json({error:it||'تعذر حفظ سجل عقد الموظف.'},{status:500})}
 const cr=await fetch(SUPABASE_URL+'/rest/v1/employee_contracts',{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({employee_id:id,document_id:doc.id,file_name:file.name,status:'uploaded',uploaded_by:auth.user.id,uploaded_by_name:auth.user?.user_metadata?.full_name||auth.user?.email||'المستخدم'})})
 const ct=await cr.text().catch(()=> '');let contract:any=null;try{contract=ct?JSON.parse(ct)?.[0]||null:null}catch{}
 if(!cr.ok||!contract){await fetch(SUPABASE_URL+'/rest/v1/employee_documents?id=eq.'+encodeURIComponent(doc.id),{method:'DELETE',headers:headers()}).catch(()=>null);await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(path),{method:'DELETE',headers:headers()}).catch(()=>null);return NextResponse.json({error:ct||'تعذر إنشاء سجل العقد.'},{status:500})}
 await audit(contract.id,id,'رفع العقد',auth.user,{file_name:file.name})
 return NextResponse.json({contract,document:doc})
}
