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

  const companies=employee.company_id
    ? await getJson('employee_companies?select=id,name,unified_number,name_en&id=eq.'+encodeURIComponent(employee.company_id)+'&limit=1',auth)
    : []

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
  const financeNotes=String(
    finance.clearance_notes ??
    finance.finance_notes ??
    finance.notes ??
    finance.comment ??
    ''
  ).trim()

  return {
    employee:{
      id:employee.id, employee_number:employee.employee_number, full_name:employee.full_name,
      national_id:employee.national_id, nationality:employee.nationality, job_title:employee.job_title,
      department:employee.department, project_name:employee.project_name, work_location:employee.work_location,
      manager_name:employee.manager_name, hire_date:employee.hire_date, contract_type:employee.contract_type,
      bank_name:employee.bank_name, bank_account_number:employee.bank_account_number, iban:employee.iban
    },
    company:companies?.[0]||null,
    clearance:{
      id:clearanceRecordId, status:clearance.status, form_data:c,
      last_work_date:c.employee?.last_work_date||finance.last_work_date||null,
      termination_type:c.employee?.reason||c.employee?.termination_type||null,
      leave_start:c.employee?.leave_start||null,
      leave_end:c.employee?.leave_end||null,
      financial:finance,
      finance_notes:financeNotes,
    },
    payroll,
    captured_at:new Date().toISOString()
  }
}

export function initialFinancialData(snapshot:any) {
  const e=snapshot.employee||{}, c=snapshot.clearance||{}
  const financeNotes=String(c.finance_notes||'').trim()
  const obligations=financeNotes ? [{
    code:'finance_clearance_note',
    label:'ملاحظات الإدارة المالية الواردة من إخلاء الطرف',
    amount:0,
    source:'clearance:finance',
    editable:false,
    notes:financeNotes,
  }] : []

  return {
    contract_start_date:e.hire_date||null,
    leave_start:null,
    leave_end:null,
    days_counted:0,
    basic_salary:null,
    housing_allowance:null,
    transportation_allowance:null,
    other_allowances:null,
    daily_wage:null,
    payment_method:null,
    cheque_number:'',
    payment_date:null,
    bank_name:'',
    iban:'',
    confidentiality_acknowledged:false,
    leave_balance_days:0,
    entitlements:[],
    obligations,
  }
}

export function calculateLeaveValue(days:any,basicSalary:any) {
  const d=Number(days||0)
  const salary=Number(basicSalary||0)
  if(!Number.isFinite(d)||d<=0||!Number.isFinite(salary)||salary<=0) return 0
  return d*(salary/30)
}

export function totalsFromItems(items:any[]) {
  const entitlements=(items||[]).filter(x=>x.item_type==='entitlement')
  const obligations=(items||[]).filter(x=>x.item_type==='obligation')
  const entitlementsTotal=entitlements.reduce((s,x)=>s+Number(x.amount||0),0)
  const obligationsTotal=obligations.reduce((s,x)=>s+Number(x.amount||0),0)
  return {entitlementsTotal,obligationsTotal,netAmount:entitlementsTotal-obligationsTotal}
}

export async function ensureStageLink(auth:any, clearanceId:string, stage:string) {
  const existing=await getJson(
    'financial_clearance_links?select=*&clearance_id=eq.'+encodeURIComponent(clearanceId)+'&stage=eq.'+encodeURIComponent(stage)+'&status=eq.active&order=created_at.desc&limit=1',
    auth
  )
  if(existing?.[0]) return existing[0]
  const r=await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_links',{
    method:'POST',
    headers:adminHeaders(auth,{'Prefer':'return=representation'}),
    body:JSON.stringify({clearance_id:clearanceId,stage,status:'active'})
  })
  const d=await r.json().catch(()=>[])
  if(!r.ok) throw new Error(d?.message||JSON.stringify(d))
  return d?.[0]||null
}

export async function audit(auth:any, clearanceId:string, action:string, details:any={}, stage?:string) {
  const name=auth?.user?.user_metadata?.full_name || auth?.user?.email || 'المستخدم'
  await fetch(SUPABASE_URL+'/rest/v1/financial_clearance_audit_logs',{
    method:'POST',headers:adminHeaders(auth,{'Prefer':'return=minimal'}),
    body:JSON.stringify({clearance_id:clearanceId,action,stage:stage||null,actor_user_id:auth.user.id,actor_name:name,actor_role:auth.role,details})
  })
}
