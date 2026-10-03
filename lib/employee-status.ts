import {SUPABASE_URL, supabaseHeaders} from '@/lib/server-auth'

export const EMPLOYEE_STATUSES=['فعال','إجازة','غير فعال','تم إنهاء خدماته'] as const
export type EmployeeStatus=(typeof EMPLOYEE_STATUSES)[number]

function normalize(v:any){
  return String(v??'').trim().toLowerCase()
    .replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/ـ/g,'').replace(/\s+/g,' ')
}

export function statusFromClearanceReason(reason:any): EmployeeStatus|null {
  const r=normalize(reason)
  if(r==='اجازه' || r.includes('اجازة') || r.includes('اجازه')) return 'إجازة'
  if(r==='خروج نهائي' || r.includes('خروج نهائي')) return 'تم إنهاء خدماته'
  if(r==='انهاء خدمات' || r==='انهاء خدمه' || r.includes('انهاء خدمات') || r.includes('إنهاء خدمات')) return 'تم إنهاء خدماته'
  return null
}

export async function setEmployeeStatus(
  auth:any,
  args:{
    employeeId:string
    newStatus:EmployeeStatus
    reason:string
    source:'يدوي'|'تلقائي'
    sourceReferenceId?:string|null
    changedBy?:string|null
    changedByName?:string|null
  }
){
  const headers=supabaseHeaders(auth,{'Prefer':'return=representation'})
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/set_employee_status',{
    method:'POST',
    headers,
    body:JSON.stringify({
      p_employee_id:args.employeeId,
      p_new_status:args.newStatus,
      p_reason:args.reason,
      p_source:args.source,
      p_source_reference_id:args.sourceReferenceId||null,
      p_changed_by:args.changedBy||null,
      p_changed_by_name:args.changedByName||null,
    }),
    cache:'no-store',
  })
  const data=await r.json().catch(()=>null)
  if(!r.ok) throw new Error(data?.message||data?.error||JSON.stringify(data)||'تعذر تحديث حالة الموظف')
  return data
}

export async function setEmployeeStatusWithKey(args:{
  apiKey:string
  employeeId:string
  newStatus:EmployeeStatus
  reason:string
  source:'يدوي'|'تلقائي'
  sourceReferenceId?:string|null
  changedBy?:string|null
  changedByName?:string|null
}){
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/set_employee_status',{
    method:'POST',
    headers:{apikey:args.apiKey,Authorization:'Bearer '+args.apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({
      p_employee_id:args.employeeId,
      p_new_status:args.newStatus,
      p_reason:args.reason,
      p_source:args.source,
      p_source_reference_id:args.sourceReferenceId||null,
      p_changed_by:args.changedBy||null,
      p_changed_by_name:args.changedByName||null,
    }),
    cache:'no-store',
  })
  const data=await r.json().catch(()=>null)
  if(!r.ok) throw new Error(data?.message||data?.error||JSON.stringify(data)||'تعذر تحديث حالة الموظف')
  return data
}

export async function clearanceStatusIfComplete(formData:any){
  const c=formData?.clearance||{}
  if(!c?.employee?.employee_signature) return null
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
    if(!signature || decision!=='clear') return null
  }
  return statusFromClearanceReason(c.employee?.reason)
}
