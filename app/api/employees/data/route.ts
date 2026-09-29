import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const ALLOWED = ['admin', 'hr', 'interviewer', 'manager']
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
function documentKind(d:any){ const text=String(d.document_name||'')+' '+String(d.document_type||''); if(/رخصة العمل|رخص العمل|work permit|workpermit/i.test(text)) return 'work_permit'; if(/تأمين طبي|التأمين الطبي|medical insurance|insurance/i.test(text)) return 'medical_insurance'; if(/الإقامة|iqama|residency/i.test(text)) return 'residency'; return '' }
export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const employeeUrl = URL + '/rest/v1/employee_records?select=*,company:employee_companies(id,name,unified_number)&order=created_at.desc'
    const docsUrl = URL + '/rest/v1/employee_documents?select=employee_id,document_name,document_type,expiry_date,updated_at&order=updated_at.desc'
    const [res,docsRes] = await Promise.all([fetch(employeeUrl,{headers:supabaseHeaders(auth),cache:'no-store'}),fetch(docsUrl,{headers:supabaseHeaders(auth),cache:'no-store'})])
    if (!res.ok) return NextResponse.json({error:await res.text()},{status:500})
    if (!docsRes.ok) return NextResponse.json({error:await docsRes.text()},{status:500})
    const employees=await res.json(); const documents=await docsRes.json()
    const docsByEmployee=new Map<string,{residency_expiry_date:string|null;work_permit_expiry_date:string|null;medical_insurance_status:string}>()
    for(const d of documents){ if(!d.employee_id) continue; const kind=documentKind(d); if(!kind) continue; const cur=docsByEmployee.get(d.employee_id)||{residency_expiry_date:null,work_permit_expiry_date:null,medical_insurance_status:'غير محدد'}; if(kind==='residency'&&!cur.residency_expiry_date&&d.expiry_date)cur.residency_expiry_date=d.expiry_date; if(kind==='work_permit'&&!cur.work_permit_expiry_date&&d.expiry_date)cur.work_permit_expiry_date=d.expiry_date; if(kind==='medical_insurance')cur.medical_insurance_status='لديه تأمين طبي'; docsByEmployee.set(d.employee_id,cur) }
    const result=employees.map((e:any)=>{ const d=docsByEmployee.get(e.id)||{residency_expiry_date:null,work_permit_expiry_date:null,medical_insurance_status:'غير محدد'}; return {id:e.id,employee_number:e.employee_number??null,full_name:e.full_name??'',company_id:e.company_id??null,company:e.company??null,nationality:e.nationality??null,national_id:e.national_id??null,job_title:e.job_title??null,department:e.department??null,residency_status:e.residency_status??null,hire_date:e.hire_date??null,employment_status:e.employment_status??null,basic_salary:e.basic_salary??null,housing_allowance:e.housing_allowance??null,transportation_allowance:e.transportation_allowance??null,other_allowances:e.other_allowances??null,total_salary_with_allowances:e.total_salary_with_allowances??null,phone:e.phone??null,email:e.email??null,date_of_birth:e.date_of_birth??null,project_name:e.project_name??null,work_location:e.work_location??null,residency_expiry_date:d.residency_expiry_date,work_permit_expiry_date:d.work_permit_expiry_date,medical_insurance_status:d.medical_insurance_status,file_status:e.employment_status||'غير محدد'} })
    return NextResponse.json({employees:result},{headers:{'Cache-Control':'no-store'}})
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل الموظفين'},{status:500}) }
}