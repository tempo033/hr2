import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth} from '@/lib/server-auth'
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
const headers=(extra:Record<string,string>={})=>({apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,Accept:'application/json',...extra})
const fieldMap:any={full_name:'اسم الموظف',national_id:'رقم الهوية / الإقامة',nationality:'الجنسية',date_of_birth:'تاريخ الميلاد',employee_number:'الرقم الوظيفي',job_title:'المسمى الوظيفي',department:'القسم',work_location:'مكان العمل',contract_type:'نوع العقد',hire_date:'تاريخ بداية العقد',basic_salary:'الراتب الأساسي',housing_allowance:'بدل السكن',transportation_allowance:'بدل النقل',other_allowances:'البدلات الأخرى',total_salary_with_allowances:'إجمالي الراتب'}
const employeeFields=Object.keys(fieldMap)
const confidenceValues=['high','medium','low','none']

function normalize(v:any){return String(v??'').trim().toLowerCase().replace(/[\s\-_/().]+/g,'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))}
function digits(v:any){return String(v??'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))}
function num(v:any){const n=Number(digits(String(v??'')).replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:null}
function safeDate(v:any){const s=digits(v);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}
function employeeValue(e:any,k:string){return e?.[k]??''}
function confidenceArabic(v:string){return v==='high'?'ثقة عالية':v==='medium'?'ثقة متوسطة':v==='low'?'ثقة منخفضة':'غير مستخرج'}

const extractionSchema={type:'object',properties:Object.fromEntries(employeeFields.concat(['profession','contract_duration','contract_end_date','contract_status','probation_period','work_hours','work_days','weekly_rest_days','annual_leave','annual_leave_days','signing_date','joining_date','termination_notice','termination_method','other_monthly_benefits']).map(k=>[k,{type:'object',properties:{value:{type:'string'},confidence:{type:'string',enum:confidenceValues},source_label:{type:'string'}},required:['value','confidence','source_label']}]))),required:employeeFields.concat(['profession','contract_duration','contract_end_date','contract_status','probation_period','work_hours','work_days','weekly_rest_days','annual_leave','annual_leave_days','signing_date','joining_date','termination_notice','termination_method','other_monthly_benefits'])}

async function getContract(id:string,employeeId:string){
 const r=await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?select=*&id=eq.'+encodeURIComponent(id)+'&employee_id=eq.'+encodeURIComponent(employeeId)+'&limit=1',{headers:headers(),cache:'no-store'})
 const t=await r.text().catch(()=> '');let row:any=null;try{row=t?JSON.parse(t)?.[0]||null:null}catch{}
 return {r,row,text:t}
}
async function audit(contractId:string,employeeId:string,action:string,user:any,details:any={}){await fetch(SUPABASE_URL+'/rest/v1/employee_contract_audit_logs',{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({contract_id:contractId,employee_id:employeeId,action,details,user_id:user?.id||null,user_name:user?.user_metadata?.full_name||user?.email||'المستخدم'})}).catch(()=>null)}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string;contractId:string}>}){
 const auth=await getServerAuth(req,['admin','hr','interviewer','manager']);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const {id,contractId}=await params;const {r,row,text}=await getContract(contractId,id)
 if(!r.ok)return NextResponse.json({error:text||'تعذر تحميل العقد.'},{status:500});if(!row)return NextResponse.json({error:'العقد غير موجود.'},{status:404})
 if(new URL(req.url).searchParams.get('file')==='1'){
  const dr=await fetch(SUPABASE_URL+'/rest/v1/employee_documents?select=document_url,document_name&employee_id=eq.'+encodeURIComponent(id)+'&id=eq.'+encodeURIComponent(row.document_id||'')+'&limit=1',{headers:headers()})
  const dt=await dr.text().catch(()=> '');let d:any=null;try{d=dt?JSON.parse(dt)?.[0]||null:null}catch{}
  if(!d?.document_url)return NextResponse.json({error:'ملف العقد غير موجود.'},{status:404})
  const s=await fetch(SUPABASE_URL+'/storage/v1/object/sign/employee-documents/'+encodeURIComponent(d.document_url),{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({expiresIn:3600})})
  const st=await s.text().catch(()=> '');let sd:any=null;try{sd=st?JSON.parse(st):null}catch{}
  const signed=sd?.signedURL||sd?.signedUrl
  if(!s.ok||!signed)return NextResponse.json({error:'تعذر إنشاء رابط العقد.'},{status:500})
  return NextResponse.redirect(new URL(signed))
 }
 return NextResponse.json({contract:row})
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string;contractId:string}>}){
 const auth=await getServerAuth(req,['admin','hr']);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:403})
 const {id,contractId}=await params;const action=(await req.json().catch(()=>({}))).action
 const {r,row,text}=await getContract(contractId,id);if(!r.ok)return NextResponse.json({error:text||'تعذر تحميل العقد.'},{status:500});if(!row)return NextResponse.json({error:'العقد غير موجود.'},{status:404})
 if(action==='analyze'){
  if(!process.env.GEMINI_API_KEY&&!process.env.GOOGLE_API_KEY){await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({status:'error',error_message:'لم يتم إعداد GEMINI_API_KEY أو GOOGLE_API_KEY في بيئة الخادم.'})});return NextResponse.json({error:'تحليل العقد يحتاج مفتاح Gemini في بيئة الخادم.'},{status:503})}
  const er=await fetch(SUPABASE_URL+'/rest/v1/employee_records?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:headers(),cache:'no-store'});const et=await er.text().catch(()=> '');let employee:any=null;try{employee=et?JSON.parse(et)?.[0]||null:null}catch{}
  if(!employee)return NextResponse.json({error:'لم يتم العثور على الموظف.'},{status:404})
  const dr=await fetch(SUPABASE_URL+'/rest/v1/employee_documents?select=document_url,document_name&id=eq.'+encodeURIComponent(row.document_id||'')+'&employee_id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:headers()});const dt=await dr.text().catch(()=> '');let doc:any=null;try{doc=dt?JSON.parse(dt)?.[0]||null:null}catch{}
  if(!doc?.document_url)return NextResponse.json({error:'ملف العقد غير موجود.'},{status:404})
  const file=await fetch(SUPABASE_URL+'/storage/v1/object/employee-documents/'+encodeURIComponent(doc.document_url),{headers:headers()});if(!file.ok)return NextResponse.json({error:'تعذر قراءة ملف العقد من التخزين.'},{status:500})
  const b64=Buffer.from(await file.arrayBuffer()).toString('base64')
  await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({status:'analyzing',error_message:null})})
  const prompt=`حلل عقد موظف صادر من منصة قوى. المطلوب استخراج البيانات الموجودة صراحة فقط، دون تخمين أو استنتاج غير مدعوم. إذا لم تجد البيان أو كان غير واضح اكتب القيمة "غير مستخرج" والثقة "none". حوّل التواريخ الواضحة إلى YYYY-MM-DD. الثقة high فقط إذا كانت القيمة واضحة بجوار اسم/وصف الحقل، medium إذا كانت واضحة لكن السياق أقل مباشرة، low إذا كانت القراءة أو الصياغة ملتبسة. استخرج من معنى الحقل لا من موضع ثابت في الصفحة. يجب أن تدعم الصفحات الممسوحة ضوئيًا والصور داخل PDF. بيانات الموظف الحالية للمطابقة فقط وليست مصدرًا لملء العقد: الاسم="${employee.full_name||''}", الهوية="${employee.national_id||''}", الجنسية="${employee.nationality||''}". لا تستخدم هذه البيانات لتخمين قيمة ناقصة في العقد.`
  const ai=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'','Content-Type':'application/json'},body:JSON.stringify({model:'gemini-3.8-flash',input:[{type:'text',text:prompt},{type:'document',data:b64,mime_type:'application/pdf'}],response_format:{type:'text',mime_type:'application/json',schema:extractionSchema}})})
  const at=await ai.text().catch(()=> '');if(!ai.ok){await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({status:'error',error_message:at||'تعذر تحليل العقد.'})});return NextResponse.json({error:at||'تعذر تحليل العقد.'},{status:502})}
  let payload:any=null;try{const x=JSON.parse(at);const texts=(x.steps||[]).flatMap((s:any)=>s.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text);payload=JSON.parse(texts.join('')||'{}')}catch{payload=null}
  if(!payload){await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({status:'error',error_message:'نتيجة التحليل لم تكن بصيغة بيانات صالحة.'})});return NextResponse.json({error:'تعذر قراءة نتيجة تحليل العقد.'},{status:502})}
  const ex:any={};for(const k of Object.keys(extractionSchema.properties)){const v=payload[k]||{value:'غير مستخرج',confidence:'none',source_label:''};ex[k]={value:String(v.value||'غير مستخرج'),confidence:confidenceValues.includes(v.confidence)?v.confidence:'none',source_label:String(v.source_label||'')}}
  const idv=ex.national_id?.value;const namev=ex.full_name?.value
  const idMatch=idv&&idv!=='غير مستخرج'&&employee.national_id?normalize(idv)===normalize(employee.national_id):null
  const nameMatch=namev&&namev!=='غير مستخرج'&&employee.full_name?normalize(namev)===normalize(employee.full_name):null
  const mismatch=idMatch===false||(idMatch===null&&nameMatch===false)
  const match={id_match:idMatch,name_match:nameMatch,status:mismatch?'mismatch':(idMatch===true||nameMatch===true?'matched':'insufficient'),message:mismatch?'تنبيه: بيانات العقد لا تتطابق مع بيانات الموظف الحالي. يرجى مراجعة المستند قبل اعتماده.':(idMatch===true||nameMatch===true?'تمت مطابقة العقد مع الموظف.':'تعذر التحقق الكامل من هوية الموظف من البيانات المستخرجة.')}
  const patch={status:'review',extracted_data:ex,employee_match:match,analyzed_at:new Date().toISOString(),error_message:null}
  const ur=await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify(patch)})
  if(!ur.ok)return NextResponse.json({error:await ur.text().catch(()=> 'تعذر حفظ نتيجة التحليل.')},{status:500})
  await audit(contractId,id,'تحليل العقد',auth.user,{status:'review',employee_match:match})
  return NextResponse.json({contract:{...row,...patch}})
 }
 if(action==='approve'){
  const body=await req.json().catch(()=>({}));const decisions=body.decisions||{}
  if(row.status!=='review'&&row.status!=='reviewed')return NextResponse.json({error:'العقد ليس في حالة مراجعة.'},{status:400})
  if(row.employee_match?.status==='mismatch')return NextResponse.json({error:'لا يمكن اعتماد العقد لأن بياناته لا تتطابق مع الموظف الحالي.'},{status:409})
  const ex=row.extracted_data||{};const updates:any={};const reviewed:any={}
  for(const k of employeeFields){const d=decisions[k];const item=ex[k];if(d==='extracted'&&item&&item.value&&item.value!=='غير مستخرج'&&item.confidence!=='none'){let v=item.value;if(['basic_salary','housing_allowance','transportation_allowance','other_allowances','total_salary_with_allowances'].includes(k))v=num(v);else if(k==='date_of_birth'||k==='hire_date')v=safeDate(v);if(v!==null&&v!=='')updates[k]=v;reviewed[k]={decision:'extracted',value:v}}else{reviewed[k]={decision:'current',value:employeeValue(employee,k)}}}
  const er=await fetch(SUPABASE_URL+'/rest/v1/employee_records?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(updates)})
  const rt=await er.text().catch(()=> '');if(!er.ok)return NextResponse.json({error:rt||'تعذر تحديث ملف الموظف.'},{status:500})
  const patch={status:'approved',reviewed_data:reviewed,approved_by:auth.user.id,approved_by_name:auth.user?.user_metadata?.full_name||auth.user?.email||'المستخدم',approved_at:new Date().toISOString(),reviewed_at:new Date().toISOString()}
  const cr=await fetch(SUPABASE_URL+'/rest/v1/employee_contracts?id=eq.'+encodeURIComponent(contractId),{method:'PATCH',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify(patch)})
  if(!cr.ok)return NextResponse.json({error:await cr.text().catch(()=> 'تعذر حفظ اعتماد العقد.')},{status:500})
  await audit(contractId,id,'اعتماد بيانات العقد',auth.user,{updated_fields:Object.keys(updates)})
  return NextResponse.json({success:true,updated_fields:Object.keys(updates),contract:{...row,...patch}})
 }
 return NextResponse.json({error:'إجراء غير معروف.'},{status:400})
}
