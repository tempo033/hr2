'use client'

import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,ExternalLink,RefreshCw,Printer,CheckCircle2,Clock3,ShieldCheck,Monitor,Truck,Warehouse,BriefcaseBusiness,WalletCards,Users,UserCheck,FileCheck2} from 'lucide-react'

type LinkRow={id:string;token:string;record_id:string;link_scope:string;status:string}
type RecordRow={id:string;employee_name:string|null;employee_number:string|null;department:string|null;job_title:string|null;updated_at:string;form_data:any}

const stages=[
 {key:'employee',label:'الموظف',icon:UserCheck},
 {key:'managers',label:'المديرون',icon:Users},
 {key:'it',label:'الحاسب الآلي',icon:Monitor},
 {key:'transport',label:'الحركة',icon:Truck},
 {key:'warehouse',label:'المستودعات',icon:Warehouse},
 {key:'admin',label:'الشؤون الإدارية',icon:BriefcaseBusiness},
 {key:'finance',label:'المالية',icon:WalletCards},
 {key:'hr',label:'الموارد البشرية',icon:Users},
 {key:'senior',label:'الإدارة العليا',icon:ShieldCheck},
] as const

const displayValue=(value:unknown)=>{
 if(typeof value==='boolean') return value?'نعم':'لا'
 if(value===null||value===undefined||value==='') return '—'
 if(typeof value==='object') return JSON.stringify(value)
 return String(value)
}
const signatureEntries=(data:any)=>Object.entries(data||{}).filter(([key,value])=>key.toLowerCase().includes('signature')&&Boolean(value)) as [string,unknown][]
const signed=(data:any)=>signatureEntries(data).length>0
const stageDecision=(stage:string,data:any)=>{
 if(stage==='employee') return data?.employee_signature?'clear':'pending'
 if(stage==='managers') return data?.clearance_decision||'pending'
 if(stage==='senior') return data?.senior_decision||'pending'
 return data?.[stage+'_decision']||'pending'
}
const stageSignatures=(stage:string,data:any)=>{
 if(stage==='employee') return data?.employee_signature?[data.employee_signature]:[]
 if(stage==='managers') return [data?.line_manager_signature,data?.project_manager_signature].filter(Boolean)
 if(stage==='senior') return data?.senior_signature?[data.senior_signature]:[]
 return data?.[stage+'_signature']?[data[stage+'_signature']]:[]
}
const decisionLabel=(v:string)=>v==='clear'?'تم الإخلاء':v==='not_clear'?'لم يتم الإخلاء':v==='skip'?'لا ينطبق':'قيد الانتظار'

export default function ClearanceRecord({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState('')
 const [rec,setRec]=useState<RecordRow|null>(null)
 const [links,setLinks]=useState<LinkRow[]>([])
 const [loading,setLoading]=useState(true)
 const [savingApply,setSavingApply]=useState(false)
 const [role,setRole]=useState('')
 const [apply,setApply]=useState<Record<string,boolean>>({})

 const load=async()=>{
  if(!id)return
  setLoading(true)
  try{
   const [rr,lr]=await Promise.all([
    fetch('/api/forms/records?id='+encodeURIComponent(id),{cache:'no-store'}),
    fetch('/api/forms/clearance/workflow',{cache:'no-store'})
   ])
   const rd=await rr.json(); const ld=await lr.json()
   if(!rr.ok) throw new Error(rd?.error||'تعذر تحميل ملف الإخلاء')
   setRec(rd.records?.[0]||null)
   setLinks((ld.links||[]).filter((x:LinkRow)=>x.record_id===id))
   const savedApply=rd.records?.[0]?.form_data?.clearance?.applicability||{}
   setApply(Object.fromEntries(stages.map(s=>[s.key,s.key==='employee'?true:savedApply[s.key]!==false])))
  }catch(error){console.error(error);setRec(null);setLinks([])}
  finally{setLoading(false)}
 }
 useEffect(()=>{void params.then(p=>setId(p.id))},[params])
 useEffect(()=>{fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>setRole(x?.user?.role||''))},[])
 useEffect(()=>{void load()},[id])

 const clearance=rec?.form_data?.clearance||{}
 const employee=clearance.employee||{}
 const stageData=(key:string)=>key==='employee'?employee:(clearance[key]||{})
 const allApproved=useMemo(()=>{
  if(!employee.employee_signature)return false
  return stages.slice(1).every(s=>{
   if(apply[s.key]===false)return true
   const d=stageData(s.key)
   return stageSignatures(s.key,d).length>0&&stageDecision(s.key,d)==='clear'
  })
 },[clearance,employee,apply])
 const saveApplicability=async(next:Record<string,boolean>)=>{
  setSavingApply(true)
  try{
   const form={...(rec?.form_data||{}),clearance:{...(rec?.form_data?.clearance||{}),applicability:next}}
   const r=await fetch('/api/forms/records?id='+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({form,status:'قيد الإخلاء'})})
   if(!r.ok)throw new Error('تعذر حفظ حالة الإدارات')
   setApply(next)
   setRec(prev=>prev?{...prev,form_data:form,updated_at:new Date().toISOString()}:prev)
  }catch(e){console.error(e)}finally{setSavingApply(false)}
 }


 const sigHtml=(key:string,alt:string)=>{const v=key==='line_manager_signature'?clearance.managers?.line_manager_signature:key==='project_manager_signature'?clearance.managers?.project_manager_signature:key==='senior_signature'?clearance.senior?.senior_signature:undefined; const fallback=key==='finance_signature'?clearance.finance?.finance_signature:key==='hr_signature'?clearance.hr?.hr_signature:undefined; const value=v||fallback||clearance[key.replace('_signature','')]?.[key]||''; return value?<img src={String(value)} alt={alt}/>:<span>—</span>}
 const decisionHtml=(key:string)=>{const v=key==='clearance_decision'?clearance.managers?.clearance_decision:key==='senior_decision'?clearance.senior?.senior_decision:clearance[key.replace('_decision','')]?.[key]||''; return v==='clear'?'يخلى طرفه / Clear':v==='not_clear'?'لا يخلى طرفه / Not Clear':v==='skip'?'لا ينطبق / N/A':'—'}
 const officialExport=()=>{if(allApproved)window.print()}

 if(loading)return <main dir="rtl" className="p-10 text-center">جارٍ تحميل ملف إخلاء الطرف...</main>
 if(!rec)return <main dir="rtl" className="p-10 text-center">السجل غير موجود</main>

 return <main dir="rtl" className="min-h-screen bg-[#f3f5f7] p-5 md:p-8">
  <section className="no-print max-w-6xl mx-auto mb-5">
   <div className="flex items-center justify-between gap-3">
    <Link href="/forms/clearance/records" className="inline-flex items-center gap-2 font-bold"><ArrowLeft size={17}/> العودة لسجل الإخلاء</Link>
    <div className="flex gap-2">
     <button onClick={()=>void load()} className="border bg-white rounded-xl px-3 py-2 font-bold"><RefreshCw size={16}/></button>
     <button disabled={!allApproved} onClick={officialExport} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-black text-white disabled:bg-slate-300 bg-[#09233f]">
      <FileCheck2 size={17}/> {allApproved?'اعتماد وتصدير الملف الرسمي':'يكتمل الاعتماد بعد موافقة جميع الإدارات'}
     </button>
    </div>
   </div>
  </section>

  <section className="no-print max-w-6xl mx-auto bg-white rounded-2xl border p-5 mb-5">
   <div className="flex items-center justify-between mb-4">
    <div><h2 className="text-xl font-black text-[#09233f]">روابط إخلاء الطرف</h2><p className="text-sm text-slate-500">رابط مستقل لكل إدارة — اضغط على الأيقونة لفتح رابط الإدارة.</p></div>
    <span className={allApproved?'badge ok':'badge pending'}>{allApproved?<><CheckCircle2 size={15}/> مكتمل ومعتمد</>:<><Clock3 size={15}/> قيد الاستكمال</>}</span>
   </div>
   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
    {stages.map(s=>{
     const Icon=s.icon; const d=stageData(s.key); const skipped=s.key!=='employee'&&apply[s.key]===false
     const complete=s.key==='employee'?Boolean(employee.employee_signature):skipped||stageSignatures(s.key,d).length>0&&stageDecision(s.key,d)==='clear'
     const link=links.find(x=>x.link_scope==='clearance:'+s.key)
     return <div key={s.key} className="link-card">
      <span className={complete?'icon ok':'icon'}><Icon size={21}/></span>
      <span className="font-black text-sm">{s.label}</span>
      {link&&<a href={'/forms/public/'+encodeURIComponent(link.token)} target="_blank" rel="noopener noreferrer" className="open-link bg-[#09233f] text-white rounded-lg px-3 py-1.5 text-xs font-black inline-flex items-center gap-1" title="فتح رابط الإخلاء في صفحة جديدة"><ExternalLink size={13}/> فتح الرابط</a>}
      {role==='admin'&&link&&<button type="button" className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2 py-1 font-black" onClick={async e=>{e.preventDefault();e.stopPropagation();const r=await fetch('/api/forms/clearance/workflow',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({link_id:link.id})});if(r.ok)await load();}} title="إعادة فتح هذا الرابط للتعديل">إعادة فتح الرابط</button>}
      {s.key!=='employee'&&<div className="apply-buttons"><button type="button" disabled={savingApply} onClick={e=>{e.preventDefault();e.stopPropagation();void saveApplicability({...apply,[s.key]:true})}} className={apply[s.key]!==false?'selected':''}>ينطبق</button><button type="button" disabled={savingApply} onClick={e=>{e.preventDefault();e.stopPropagation();void saveApplicability({...apply,[s.key]:false})}} className={apply[s.key]===false?'selected skip':''}>لا ينطبق</button></div>}
      <span className={apply[s.key]===false?'text-xs text-slate-500 font-bold':complete?'text-xs text-emerald-700 font-bold':'text-xs text-amber-700 font-bold'}>{apply[s.key]===false?'تم التخطي':complete?'تم الاعتماد':'قيد الانتظار'}</span>
     </div>
    })}
   </div>
  </section>

  <div className="official-export">
   <section className="form-page">
    <div className="form-header">
     <div className="company-name">شركة البنية الأساسية للمقاولات</div>
     <div className="form-title">نموذج إخلاء طرف</div>
     <div className="form-subtitle">EMPLOYEE CLEARANCE</div>
     <div className="form-meta">رقم الخطاب | {displayValue(employee.employee_number || '—')} &nbsp; | &nbsp; التاريخ: {displayValue(employee.last_work_date || '—')}</div>
    </div>

    <div className="section-title"><span>أولاً: بيانات الموظف</span><span>EMPLOYEE INFORMATION</span></div>
    <table className="original-grid">
     <tbody>
      <tr><td>الاسم</td><td>{displayValue(employee.employee_name)}</td><td>Name</td></tr><tr><td>الجنسية</td><td>{displayValue(employee.nationality)}</td><td>Nationality</td></tr><tr><td>رقم الهوية / الإقامة</td><td>{displayValue(employee.national_id)}</td><td>ID Number</td></tr><tr><td>الرقم الوظيفي</td><td>{displayValue(employee.employee_number)}</td><td>Employee No</td></tr><tr><td>الإدارة / الموقع</td><td>{displayValue(employee.department_location)}</td><td>Department / Location</td></tr><tr><td>القسم</td><td>{displayValue(employee.department)}</td><td>Section</td></tr><tr><td>المسمى الوظيفي</td><td>{displayValue(employee.job_title)}</td><td>Job Title</td></tr><tr><td>تاريخ المباشرة</td><td>{displayValue(employee.joining_date)}</td><td>Joining Date</td></tr><tr><td>آخر يوم عمل</td><td>{displayValue(employee.last_work_date)}</td><td>Last Working Day</td></tr><tr><td>سبب إخلاء الطرف</td><td>{displayValue(employee.reason)}</td><td>Clearance Reason</td></tr>
     </tbody>
    </table>

    <div className="section-title"><span>ثانياً: اعتمادات الجهات ذات العلاقة</span><span>Second Related Managements</span></div>
    <table className="original-grid">
     <tbody>
      <tr><td>المدير المباشر</td><td>{displayValue(employee.line_manager_name || '—')}</td><td>Line Manager Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("line_manager_signature","توقيع المدير المباشر")}</td><td>Signature</td></tr>
      <tr><td>مدير المشروع</td><td>{displayValue(employee.project_manager_name || '—')}</td><td>Project Manager Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("project_manager_signature","توقيع مدير المشروع")}</td><td>Signature</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("clearance_decision")}</td><td>Decision</td></tr>
     </tbody>
    </table>

    {apply["it"]!==false && (
    <div className="dept-card">
     <div className="dept-head"><span>IT Department</span><b>إدارة الحاسب الآلي</b></div>
     <table className="original-grid"><tbody>
      <tr><td>الاسم</td><td>{displayValue(clearance.it?.it_name)}</td><td>Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("it_signature","توقيع إدارة الحاسب الآلي")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(clearance.it?.it_date)}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("it_decision")}</td><td>Decision</td></tr>
     </tbody></table>
    </div>
   )}
    {apply["transport"]!==false && (
    <div className="dept-card">
     <div className="dept-head"><span>Transportation Management</span><b>إدارة الحركة والصيانة</b></div>
     <table className="original-grid"><tbody>
      <tr><td>الاسم</td><td>{displayValue(clearance.transport?.transport_name)}</td><td>Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("transport_signature","توقيع إدارة الحركة والصيانة")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(clearance.transport?.transport_date)}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("transport_decision")}</td><td>Decision</td></tr>
     </tbody></table>
    </div>
   )}
    <div className="original-decision">{decisionHtml("clearance_decision")}</div>
    <div className="copies">الأصل &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة لشؤون الموظفين &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة لملف المذكور &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة للحسابات</div>
   </section>

   <section className="form-page page-two">
    <div className="form-header compact">
     <div className="company-name">شركة البنية الأساسية للمقاولات</div>
     <div className="form-title">نموذج إخلاء طرف</div>
     <div className="form-subtitle">EMPLOYEE CLEARANCE — الصفحة الثانية</div>
    </div>

    {apply["warehouse"]!==false && (
    <div className="dept-card">
     <div className="dept-head"><span>Stores</span><b>المستودعات</b></div>
     <table className="original-grid"><tbody>
      <tr><td>الاسم</td><td>{displayValue(clearance.warehouse?.warehouse_name)}</td><td>Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("warehouse_signature","توقيع المستودعات")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(clearance.warehouse?.warehouse_date)}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("warehouse_decision")}</td><td>Decision</td></tr>
     </tbody></table>
    </div>
   )}
    {apply["admin"]!==false && (
    <div className="dept-card">
     <div className="dept-head"><span>Administration</span><b>الشؤون الإدارية</b></div>
     <table className="original-grid"><tbody>
      <tr><td>الاسم</td><td>{displayValue(clearance.admin?.admin_name)}</td><td>Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("admin_signature","توقيع الشؤون الإدارية")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(clearance.admin?.admin_date)}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("admin_decision")}</td><td>Decision</td></tr>
     </tbody></table>
    </div>
   )}
    {apply.finance!==false && (
   <div className="dept-card">
    <div className="dept-head"><span>Financial</span><b>المالية</b></div>
    <table className="original-grid"><tbody>
     <tr><td>الاسم</td><td>{displayValue(clearance.finance?.finance_name)}</td><td>Name</td></tr>
     <tr><td>التوقيع</td><td>{sigHtml("finance_signature","توقيع المالية")}</td><td>Signature</td></tr>
     <tr><td>التاريخ</td><td>{displayValue(clearance.finance?.finance_date)}</td><td>Date</td></tr>
     <tr><td>عهدة / أمانة</td><td>{clearance.finance?.financial_custody?displayValue(clearance.finance?.financial_custody_details):'لا يوجد'}</td><td>Custody</td></tr>
     <tr><td>سلفة</td><td>{clearance.finance?.has_loan?displayValue(clearance.finance?.has_loan_details):'لا توجد'}</td><td>Loans</td></tr>
     <tr><td>مستحقات مالية</td><td>{clearance.finance?.financial_entitlement?displayValue(clearance.finance?.financial_entitlement_details):'لا توجد'}</td><td>Entitlements</td></tr>
     <tr><td>التزامات أخرى</td><td>{clearance.finance?.other_financial_obligation?displayValue(clearance.finance?.other_financial_obligation_details):'لا يوجد'}</td><td>Other</td></tr>
     <tr><td>القرار</td><td>{decisionHtml("finance_decision")}</td><td>Decision</td></tr>
    </tbody></table>
   </div>
  )}
    {apply["hr"]!==false && (
    <div className="dept-card">
     <div className="dept-head"><span>HR Department</span><b>الموارد البشرية</b></div>
     <table className="original-grid"><tbody>
      <tr><td>الاسم</td><td>{displayValue(clearance.hr?.hr_name)}</td><td>Name</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("hr_signature","توقيع الموارد البشرية")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(clearance.hr?.hr_date)}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("hr_decision")}</td><td>Decision</td></tr>
     </tbody></table>
    </div>
   )}

    <div className="section-title"><span>الإدارة العليا</span><span>Senior management</span></div>
    <table className="original-grid">
     <tbody>
      <tr><td>المدير العام / نائب المدير العام</td><td>{displayValue(employee.deputy_general_manager || '—')}</td><td>General Manager / Deputy</td></tr>
      <tr><td>التوقيع</td><td>{sigHtml("senior_signature","توقيع الإدارة العليا")}</td><td>Signature</td></tr>
      <tr><td>التاريخ</td><td>{displayValue(employee.senior_date || '—')}</td><td>Date</td></tr>
      <tr><td>القرار</td><td>{decisionHtml("senior_decision")}</td><td>Decision</td></tr>
     </tbody>
    </table>

    <div className="final-status">
     <b>حالة الإخلاء:</b> {allApproved?'معتمد نهائياً':'قيد الاستكمال'}
    </div>
    <div className="copies">الأصل &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة لشؤون الموظفين &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة لملف المذكور &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; صورة للحسابات</div>
   </section>
  </div>
  <style>{`
   @page{size:A4 portrait;margin:0}
   .official-export{font-family:Arial,Tahoma,sans-serif;color:#17104f}
   .form-page{width:210mm;height:297mm;min-height:297mm;margin:0 auto 12px;background:#fff;position:relative;padding:17mm 18mm 18mm;box-shadow:0 2px 14px #0002;overflow:hidden;direction:rtl}
   .form-page:before{content:"";position:absolute;top:8mm;left:18mm;right:18mm;height:1px;background:#bd921f}
   .form-header{border-bottom:1.5px solid #bd921f;padding-bottom:3mm;margin-bottom:3mm;text-align:center}
   .form-header.compact{margin-bottom:5mm}
   .company-name{font-size:11px;font-weight:800;color:#17104f}
   .form-title{font-size:20px;font-weight:800;margin:1mm 0}
   .form-subtitle{color:#bd921f;letter-spacing:3px;font-weight:700;font-size:11px}
   .form-meta{text-align:center;font-size:9px;margin-top:2mm}
   .section-title{border-top:1.5px solid #bd921f;border-bottom:1.5px solid #bd921f;padding:4px 7px;margin:5mm 0 2mm;font-weight:700;display:flex;justify-content:space-between;direction:rtl}
   .section-title span:last-child{color:#bd921f;direction:ltr}
   .original-grid{width:100%;border-collapse:collapse;font-size:9px;direction:rtl}
   .original-grid td{border-bottom:1px solid #c9c8d5;padding:4px 5px;vertical-align:middle}
   .original-grid td:first-child{width:31%;font-weight:700;text-align:right}
   .original-grid td:nth-child(2){width:38%;text-align:center;font-size:10px}
   .original-grid td:last-child{width:31%;color:#666879;direction:ltr;text-align:left}
   .sig-inline{display:inline-flex;align-items:center;justify-content:center;min-height:24px;width:100%}
   .sig-inline img{max-width:95px;height:28px;object-fit:contain}
   .sig-inline span{color:#94a3b8}
   .dept-card{border-top:1.5px solid #bd921f;margin-top:4mm}
   .dept-head{display:flex;justify-content:space-between;font-weight:700;padding:5px 7px;border-bottom:1px solid #bd921f}
   .dept-head span{color:#a5831b;direction:ltr}
   .original-decision{text-align:center;margin-top:4mm;font-size:9px}
   .final-status{text-align:center;border-top:1px solid #bd921f;margin-top:8mm;padding-top:4mm;font-size:10px;font-weight:700}
   .copies{text-align:center;font-size:8px;margin-top:5mm}
   .no-print{display:block}
   @media print{
    html,body{width:210mm;margin:0;padding:0;background:#fff}
    body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .no-print{display:none!important}
    .official-export{width:210mm}
    .form-page{box-shadow:none!important;margin:0!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;padding:17mm 18mm 18mm!important;page-break-after:always!important;break-after:page!important;page-break-inside:avoid!important;break-inside:avoid!important}
    .form-page:last-child{page-break-after:auto!important;break-after:auto!important}
   }
  `}</style>>
 </main>
}
