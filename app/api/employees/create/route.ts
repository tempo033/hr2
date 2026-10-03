import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,PUBLIC_KEY} from '@/lib/server-auth'

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr']

function norm(v:any){
 return String(v??'').trim().toLowerCase()
  .replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/ـ/g,'').replace(/\s+/g,' ')
}
function isSaudi(v:any){
 const s=norm(v)
 return ['سعودي','السعودي','السعوديه','السعودية','saudi','saudi arabian','saudi arabia'].includes(s)
}
function clean(v:any){if(v===undefined||v===null)return null;const s=String(v).trim();return s||null}
function money(v:any){
 if(v===undefined||v===null||v==='')return null
 const n=Number(String(v).replace(/,/g,''))
 return Number.isFinite(n)&&n>=0?n:null
}
function dateValue(v:any){
 if(v===undefined||v===null||v==='')return null
 const s=String(v).trim()
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null
 const d=new Date(s+'T00:00:00')
 return Number.isNaN(d.getTime())?null:s
}
async function rest(path:string,auth:any,init?:RequestInit){
 const headers:Record<string,string>={Accept:'application/json','Content-Type':'application/json',...(init?.headers as Record<string,string>||{})}
 headers.apikey=PUBLIC_KEY
 headers.Authorization=`Bearer ${auth.token}`
 return fetch(SUPABASE_URL+'/rest/v1/'+path,{...init,headers,cache:'no-store'})
}

const employeeFields=[
 'employee_number','full_name','nationality','national_id','phone','email','date_of_birth',
 'marital_status','degree','specialization','job_title','department','project_name','work_location',
 'manager_name','hire_date','contract_type','salary','employment_status','residency_status',
 'basic_salary','housing_allowance','transportation_allowance','other_allowances',
 'total_salary_with_allowances','notes','job_description_id','bank_name','bank_account_number',
 'iban','iban_verified','gosi_status','gosi_subscriber_wage','gosi_employee_share',
 'gosi_employer_share','payroll_cost_center','payroll_cost_allocation','company_id'
]

export async function POST(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES)
  if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const body=await req.json()

  const full_name=clean(body.full_name)
  const nationality=clean(body.nationality)
  const national_id=clean(body.national_id)
  const hire_date=dateValue(body.hire_date)
  const job_title=clean(body.job_title)
  const department=clean(body.department)
  const employment_status=clean(body.employment_status)||'على رأس العمل'
  const date_of_birth=dateValue(body.date_of_birth)
  const residency_expiry_date=dateValue(body.residency_expiry_date)

  if(!full_name)return NextResponse.json({error:'اسم الموظف مطلوب.'},{status:400})
  if(!nationality)return NextResponse.json({error:'الجنسية مطلوبة.'},{status:400})
  if(!national_id)return NextResponse.json({error:isSaudi(nationality)?'رقم الهوية الوطنية مطلوب للموظف السعودي.':'رقم الإقامة مطلوب للموظف غير السعودي.'},{status:400})
  if(!hire_date)return NextResponse.json({error:'تاريخ التعيين مطلوب وبصيغة صحيحة.'},{status:400})
  if(!job_title)return NextResponse.json({error:'المسمى الوظيفي مطلوب.'},{status:400})
  if(!department)return NextResponse.json({error:'القسم/الإدارة مطلوب.'},{status:400})
  if(!isSaudi(nationality)&&!residency_expiry_date)return NextResponse.json({error:'تاريخ انتهاء الإقامة مطلوب لغير السعودي.'},{status:400})

  const duplicateQuery=`select=id,full_name,employee_number,national_id&limit=1&or=(employee_number.eq.${encodeURIComponent(clean(body.employee_number)||'__NONE__')},national_id.eq.${encodeURIComponent(national_id)})`
  const duplicateRes=await rest('employee_records?'+duplicateQuery,auth)
  if(!duplicateRes.ok)return NextResponse.json({error:await duplicateRes.text()},{status:500})
  const duplicates=await duplicateRes.json()
  if(duplicates[0])return NextResponse.json({error:'يوجد موظف مسجل بالفعل بنفس الرقم الوظيفي أو رقم الهوية/الإقامة.',employee:duplicates[0]},{status:409})

  let employeeNumber=clean(body.employee_number)
  if(!employeeNumber){
   const seqRes=await rest('employee_records?select=employee_number&employee_number=not.is.null&order=created_at.desc&limit=5000',auth)
   if(!seqRes.ok)return NextResponse.json({error:await seqRes.text()},{status:500})
   const existing:any[]=await seqRes.json()
   let max=1000
   for(const x of existing){const m=String(x.employee_number||'').match(/^EMP-(\d+)$/i);if(m)max=Math.max(max,Number(m[1]))}
   employeeNumber='EMP-'+String(max+1).padStart(4,'0')
  }

  const payload:any={employee_number:employeeNumber,full_name,nationality,national_id,hire_date,job_title,department,employment_status,employee_status:'فعال'}
  for(const f of employeeFields){
   if(['employee_number','full_name','nationality','national_id','hire_date','job_title','department','employment_status','company_id'].includes(f))continue
   if(Object.prototype.hasOwnProperty.call(body,f)){
    if(['basic_salary','housing_allowance','transportation_allowance','other_allowances','total_salary_with_allowances','gosi_subscriber_wage','gosi_employee_share','gosi_employer_share'].includes(f)){
     const n=money(body[f]); if(body[f]!==''&&body[f]!==null&&n===null)return NextResponse.json({error:'قيمة مالية غير صحيحة في الحقل: '+f},{status:400}); payload[f]=n
    }else if(['date_of_birth'].includes(f)){
     const d=dateValue(body[f]); if(body[f]!==''&&body[f]!==null&&!d)return NextResponse.json({error:'تاريخ غير صحيح في الحقل: '+f},{status:400}); payload[f]=d
    }else if(['iban_verified'].includes(f))payload[f]=Boolean(body[f])
    else if(f==='payroll_cost_allocation')payload[f]=body[f]||{}
    else payload[f]=clean(body[f])
   }
  }
  payload.company_id=clean(body.company_id)

  const createdRes=await rest('employee_records',auth,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)})
  if(!createdRes.ok)return NextResponse.json({error:await createdRes.text()},{status:500})
  const created=(await createdRes.json())[0]
  if(!created)return NextResponse.json({error:'تعذر إنشاء ملف الموظف.'},{status:500})

  if(!isSaudi(nationality)&&residency_expiry_date){
   const docPayload={employee_id:created.id,document_type:'الهوية الوطنية / الإقامة',document_name:'الإقامة',document_number:national_id,expiry_date:residency_expiry_date,status:'ساري'}
   const docRes=await rest('employee_documents',auth,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(docPayload)})
   if(!docRes.ok)return NextResponse.json({error:'تم إنشاء الموظف، لكن تعذر حفظ تاريخ انتهاء الإقامة: '+await docRes.text(),employee:created},{status:500})
  }
  return NextResponse.json({employee:created},{status:201})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر إضافة الموظف'},{status:500})}
}
