import { NextRequest } from 'next/server'
import { getServerAuth, supabaseAdminHeaders, SUPABASE_URL } from '@/lib/server-auth'

export const FINANCIAL_ROLES = ['admin','hr','finance','project_manager','general_manager','manager'] as const

export const STAGES = [
  { key:'employee', label:'اعتماد الموظف', roles:[] as Array<(typeof FINANCIAL_ROLES)[number]> },
  { key:'finance', label:'اعتماد الإدارة المالية', roles:['admin','finance'] as Array<(typeof FINANCIAL_ROLES)[number]> },
  { key:'hr', label:'اعتماد الموارد البشرية', roles:['admin','hr'] as Array<(typeof FINANCIAL_ROLES)[number]> },
  { key:'project_manager', label:'اعتماد مدير المشاريع', roles:['admin','project_manager'] as Array<(typeof FINANCIAL_ROLES)[number]> },
  { key:'general_manager', label:'اعتماد المدير العام', roles:['admin','general_manager'] as Array<(typeof FINANCIAL_ROLES)[number]> },
] as const

export function adminHeaders(auth:any, extra:Record<string,string>={}) {
  return supabaseAdminHeaders(auth, extra)
}

export async function financialAuth(req:NextRequest, roles:string[]=Array.from(FINANCIAL_ROLES)) {
  return getServerAuth(req, roles)
}

export function clearanceComplete(formData:any) {
  const c=formData?.clearance||{}
  if(!c?.employee?.employee_signature) return false
  const applicability=c.applicability||{}
  const stages=['managers','it','transport','warehouse','admin','finance','hr','project_manager','senior']
  for(const key of stages){
    if(applicability[key]===false) continue
    const d=c[key]||{}
    const signature=key==='managers' ? (d.line_manager_signature||d.project_manager_signature)
      : key==='senior' ? d.senior_signature
      : d[key+'_signature']
    const decision=key==='managers' ? d.clearance_decision
      : key==='senior' ? d.senior_decision
      : d[key+'_decision']
    if(!signature || decision!=='clear') return false
  }
  return true
}

async function getJson(path:string, auth:any) {
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:adminHeaders(auth),cache:'no-store'})
  const d=await r.json().catch(()=>[])
  if(!r.ok) throw new Error(d?.message||JSON.stringify(d))
  return d
}

export async function buildSourceSnapshot(auth:any, employeeId:string, clearanceRecordId:string) {
  const employees=await getJson('employee_records?select=*&id=eq.'+encodeURIComponent(employeeId)+'&limit=1',auth)
  const employee=employees?.[0]
  if(!employee) throw new Error('بيانات الموظف غير موجودة.')
  const companies=employee.company_id ? await getJson('employee_companies?select=id,name,unified_number,name_en& id=eq.'+encodeURIComponent(employee.company_id)+'&limit=1'.replace(' ','') ,auth) : []
  const records=await getJson('hr_form_records?select=form_data,status,updated_at&id=eq.'+encodeURIComponent(clearanceRecordId)+'&limit=1',auth)
  const clearance=records?.[0]
  if(!clearance) throw new Error('سجل إخلاء الطرف غير موجود.')
  let payroll:any=null
  try {
    const rows=await getJson('payroll_settlements?select=*&employee_id=eq.'+encodeURIComponent(employeeId)+'&order=created_at.desc&limit=1',auth)
    payroll=rows?.[0]||null
  } catch {}
  const c=clearance.form_data?.clearance||{}
  const finance=c.finance||{}
  return {
    employee:{
      id:employee.id, employee_number:employee.employee_number, full_name:employee.full_name,
      national_id:employee.national_id, nationality:employee.nationality, job_title:employee.job_title,
      department:employee.department, project_name:employee.project_name, work_location:employee.work_location,
      manager_name:employee.manager_name, hire_date:employee.hire_date, contract_type:employee.contract_type,
      salary:employee.salary, basic_salary:employee.basic_salary, housing_allowance:employee.housing_allowance,
      transportation_allowance:employee.transportation_allowance, other_allowances:employee.other_allowances,
      total_salary_with_allowances:employee.total_salary_with_allowances, bank_name:employee.bank_name,
      bank_account_number:employee.bank_account_number, iban:employee.iban
    },
    company:companies?.[0]||null,
    clearance:{
      id:clearanceRecordId, status:clearance.status, form_data:c,
      last_work_date:c.employee?.last_work_date||null,
      termination_type:c.employee?.reason||c.employee?.termination_type||null,
      leave_start:c.employee?.leave_start||null,
      leave_end:c.employee?.leave_end||null,
      financial:finance,
    },
    payroll,
    captured_at:new Date().toISOString()
  }
}

export function initialFinancialData(snapshot:any) {
  const e=snapshot.employee||{}, c=snapshot.clearance||{}, p=snapshot.payroll||{}
  const leaveDays=Number(p.leave_days ?? c.financial?.leave_days ?? 0) || 0
  const basic=Number(e.basic_salary||p.basic_salary||0)||0
  const housing=Number(e.housing_allowance||p.housing_allowance||0)||0
  const transport=Number(e.transportation_allowance||p.transportation_allowance||0)||0
  const other=Number(e.other_allowances||p.other_allowances||0)||0
  const dailyLeaveValue=Number(p.leave_pay||0)>0 && leaveDays>0 ? Number(p.leave_pay)/leaveDays : basic/30
  const entitlements=[
    {code:'leave_balance',label:'رصيد الإجازات بالقيمة',amount:leaveDays*dailyLeaveValue,source:'payroll/employee',editable:true,notes:''},
    {code:'unpaid_salary',label:'راتب مستحق',amount:Number(p.unpaid_salary||0),source:'payroll',editable:true,notes:''},
    {code:'end_of_service',label:'مكافأة نهاية الخدمة',amount:Number(p.end_of_service_award||0),source:'payroll',editable:true,notes:''},
    {code:'other_dues',label:'مستحقات مالية أخرى',amount:Number(p.other_dues||0),source:'payroll',editable:true,notes:''},
  ]
  const obligations=[
    {code:'advances',label:'سلف',amount:Number(p.advances_deduction||c.financial?.loan_amount||0),source:'payroll/clearance',editable:true,notes:''},
    {code:'deductions',label:'خصومات',amount:Number(p.deductions||0),source:'payroll',editable:true,notes:''},
    {code:'other_obligations',label:'التزامات مالية أخرى',amount:Number(c.financial?.other_financial_obligation_amount||0),source:'clearance',editable:true,notes:''},
  ]
  return {
    contract_start_date:e.hire_date||null, leave_start:c.leave_start||null, leave_end:c.leave_end||null,
    days_counted:Number(p.leave_days||0)||0, basic_salary:basic, housing_allowance:housing,
    transportation_allowance:transport, other_allowances:other,
    payment_method:null, cheque_number:'', payment_date:null,
    bank_name:e.bank_name||'', iban:e.iban||'',
    confidentiality_acknowledged:false,
    entitlements_total:entitlements.reduce((s,x)=>s+Number(x.amount||0),0),
    obligations_total:obligations.reduce((s,x)=>s+Number(x.amount||0),0),
    net_amount:entitlements.reduce((s,x)=>s+Number(x.amount||0),0)-obligations.reduce((s,x)=>s+Number(x.amount||0),0),
    salary_totals:{basic, housing, transport, other, total:basic+housing+transport+other},
    leave_balance_days:leaveDays,
  }
}

export async function audit(auth:any, clearanceId:string, action:string, details:any={}, stage?:string) {
  const name=auth?.user?.user_metadata?.full_name || auth?.user?.email || 'المستخدم'
  await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_audit_logs',{
    method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),
    body:JSON.stringify({clearance_id:clearanceId,action,stage:stage||null,actor_user_id:auth.user.id,actor_name:name,actor_role:auth.role,details})
  })
}
