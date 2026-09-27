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
 const noteHtml=(data:any)=>{const note=data?.clearance_notes||'';return note?<div className="clearance-note"><b>ملاحظات</b><span>{displayValue(note)}</span></div>:null}
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
   <div className="clearance-links-grid">
    {stages.map(s=>{
     const Icon=s.icon; const d=stageData(s.key); const skipped=s.key!=='employee'&&apply[s.key]===false
     const complete=s.key==='employee'?Boolean(employee.employee_signature):skipped||stageSignatures(s.key,d).length>0&&stageDecision(s.key,d)==='clear'
     const link=links.find(x=>x.link_scope==='clearance:'+s.key)
     return <div key={s.key} className="clearance-link-card">
      <span className={complete?'clearance-link-icon ok':'clearance-link-icon'}><Icon size={21}/></span>
      <span className="clearance-link-title">{s.label}</span>
      {link&&<a href={'/forms/public/'+encodeURIComponent(link.token)} target="_blank" rel="noopener noreferrer" className="open-link" title="فتح رابط الإخلاء في صفحة جديدة"><ExternalLink size={13}/> فتح الرابط</a>}
      {role==='admin'&&link&&<button type="button" className="reopen-link" onClick={async e=>{e.preventDefault();e.stopPropagation();const r=await fetch('/api/forms/clearance/workflow',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({link_id:link.id})});if(r.ok)await load();}} title="إعادة فتح هذا الرابط للتعديل">إعادة فتح الرابط</button>}
      {s.key!=='employee'&&<div className="clearance-apply-buttons"><button type="button" disabled={savingApply} onClick={e=>{e.preventDefault();e.stopPropagation();void saveApplicability({...apply,[s.key]:true})}} className={apply[s.key]!==false?'selected':''}>ينطبق</button><button type="button" disabled={savingApply} onClick={e=>{e.preventDefault();e.stopPropagation();void saveApplicability({...apply,[s.key]:false})}} className={apply[s.key]===false?'selected skip':''}>لا ينطبق</button></div>}
      <span className={apply[s.key]===false?'clearance-link-status skipped':complete?'clearance-link-status complete':'clearance-link-status pending'}>{apply[s.key]===false?'تم التخطي':complete?'تم الاعتماد':'قيد الانتظار'}</span>
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
     <div className="form-meta">رقم الموظف: {displayValue(employee.employee_number)} &nbsp; | &nbsp; آخر يوم عمل: {displayValue(employee.last_work_date)}</div>
    </div>

    <div className="section-title"><span>بيانات الموظف</span><span>EMPLOYEE INFORMATION</span></div>
    <table className="original-grid employee-grid"><tbody>
     <tr><td>الاسم</td><td>{displayValue(employee.employee_name)}</td><td>Name</td><td>الجنسية</td><td>{displayValue(employee.nationality)}</td><td>Nationality</td></tr>
     <tr><td>رقم الهوية / الإقامة</td><td>{displayValue(employee.national_id)}</td><td>ID Number</td><td>المسمى الوظيفي</td><td>{displayValue(employee.job_title)}</td><td>Job Title</td></tr>
     <tr><td>الإدارة / الموقع</td><td>{displayValue(employee.department_location)}</td><td>Department / Location</td><td>القسم</td><td>{displayValue(employee.department)}</td><td>Section</td></tr>
     <tr><td>تاريخ المباشرة</td><td>{displayValue(employee.joining_date)}</td><td>Joining Date</td><td>سبب الإخلاء</td><td>{displayValue(employee.reason)}</td><td>Clearance Reason</td></tr>
    </tbody></table>

    <div className="employee-signature employee-signature-top"><span>توقيع الموظف</span><div className="signature-box">{employee.employee_signature?<img src={String(employee.employee_signature)} alt="توقيع الموظف"/>:<span>—</span>}</div><span>Employee Signature</span></div>

    <div className="columns-title"><span>اعتمادات وإخلاءات الجهات</span><span>DEPARTMENT CLEARANCES & SIGNATURES</span></div>
    <div className="signature-columns">
     <div className="signature-column">
      <div className="column-title">المدير المباشر ومدير المشروع <small>MANAGERS</small></div>
      <div className="signature-card">
       <b>المدير المباشر</b><span>{displayValue(clearance.managers?.line_manager_name)}</span><div className="signature-box">{sigHtml("line_manager_signature","توقيع المدير المباشر")}</div>
       <b>مدير المشروع</b><span>{displayValue(clearance.managers?.project_manager_name)}</span><div className="signature-box">{sigHtml("project_manager_signature","توقيع مدير المشروع")}</div>
       <div className="decision-row">{decisionHtml("clearance_decision")}</div>{noteHtml(clearance.managers)}
      </div>

      {apply.it!==false&&<div className="signature-card"><div className="card-title">إدارة الحاسب الآلي <small>IT</small></div><span>{displayValue(clearance.it?.it_name)}</span><div className="signature-box">{sigHtml("it_signature","توقيع الحاسب الآلي")}</div><div className="decision-row">{decisionHtml("it_decision")}</div>{noteHtml(clearance.it)}</div>}
      {apply.transport!==false&&<div className="signature-card"><div className="card-title">إدارة الحركة والصيانة <small>TRANSPORT</small></div><span>{displayValue(clearance.transport?.transport_name)}</span><div className="signature-box">{sigHtml("transport_signature","توقيع الحركة والصيانة")}</div><div className="decision-row">{decisionHtml("transport_decision")}</div>{noteHtml(clearance.transport)}</div>}
      {apply.warehouse!==false&&<div className="signature-card"><div className="card-title">المستودعات <small>STORES</small></div><span>{displayValue(clearance.warehouse?.warehouse_name)}</span><div className="signature-box">{sigHtml("warehouse_signature","توقيع المستودعات")}</div><div className="decision-row">{decisionHtml("warehouse_decision")}</div>{noteHtml(clearance.warehouse)}</div>}
     </div>

     <div className="signature-column">
      {apply.admin!==false&&<div className="signature-card"><div className="card-title">الشؤون الإدارية <small>ADMINISTRATION</small></div><span>{displayValue(clearance.admin?.admin_name)}</span><div className="signature-box">{sigHtml("admin_signature","توقيع الشؤون الإدارية")}</div><div className="decision-row">{decisionHtml("admin_decision")}</div>{noteHtml(clearance.admin)}</div>}
      {apply.finance!==false&&<div className="signature-card"><div className="card-title">المالية <small>FINANCE</small></div><span>{displayValue(clearance.finance?.finance_name)}</span><div className="signature-box">{sigHtml("finance_signature","توقيع المالية")}</div>
       <div className="finance-mini">عهدة: {clearance.finance?.financial_custody?displayValue(clearance.finance?.financial_custody_details):'لا يوجد'}<br/>سلفة: {clearance.finance?.has_loan?displayValue(clearance.finance?.has_loan_details):'لا توجد'}<br/>مستحقات: {clearance.finance?.financial_entitlement?displayValue(clearance.finance?.financial_entitlement_details):'لا توجد'}<br/>التزامات: {clearance.finance?.other_financial_obligation?displayValue(clearance.finance?.other_financial_obligation_details):'لا يوجد'}</div>
       <div className="decision-row">{decisionHtml("finance_decision")}</div>{noteHtml(clearance.finance)}
      </div>}
      {apply.hr!==false&&<div className="signature-card"><div className="card-title">الموارد البشرية <small>HR</small></div><span>{displayValue(clearance.hr?.hr_name)}</span><div className="signature-box">{sigHtml("hr_signature","توقيع الموارد البشرية")}</div><div className="decision-row">{decisionHtml("hr_decision")}</div>{noteHtml(clearance.hr)}</div>}
     </div>
    </div>

    <div className="senior-approval">
     <div className="signature-card senior-card">
      <div className="card-title">الإدارة العليا / المدير العام <small>SENIOR MANAGEMENT / GENERAL MANAGER</small></div>
      <div className="senior-grid">
       <div><b>اسم المدير العام</b><span>{displayValue(clearance.senior?.deputy_general_manager)}</span></div>
       <div><b>التوقيع</b><div className="signature-box">{sigHtml("senior_signature","توقيع الإدارة العليا")}</div></div>
       <div><div className="decision-row">{decisionHtml("senior_decision")}</div>{clearance.senior?.senior_reason&&<div className="clearance-note"><b>سبب عدم الاعتماد</b><span>{displayValue(clearance.senior.senior_reason)}</span></div>}</div>
      </div>
      {noteHtml(clearance.senior)}
     </div>
    </div>

    <div className="final-status"><b>حالة الإخلاء:</b> {allApproved?'معتمد نهائياً':'قيد الاستكمال'}</div>
    <div className="copies">الأصل &nbsp;&nbsp; | &nbsp;&nbsp; صورة لشؤون الموظفين &nbsp;&nbsp; | &nbsp;&nbsp; صورة لملف المذكور &nbsp;&nbsp; | &nbsp;&nbsp; صورة للحسابات</div>
   </section>
  </div>
  <style>{`
   /* Site links: presentation only; routes, hrefs, tokens and actions remain unchanged. */
   .clearance-links-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
   .clearance-link-card{min-width:0;border:1px solid #e3e7ed;background:linear-gradient(180deg,#fff 0%,#fafbfc 100%);border-radius:14px;padding:13px 12px;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;box-shadow:0 3px 12px rgba(15,23,42,.045);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
   .clearance-link-card:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(15,23,42,.08);border-color:#cbd5e1}
   .clearance-link-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#eef2f6;color:#334155}
   .clearance-link-icon.ok{background:#e9f7ef;color:#137a43}
   .clearance-link-title{font-size:14px;font-weight:900;color:#0f2740;line-height:1.35}
   .clearance-link-card .open-link{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;border-radius:9px;background:#09233f;color:#fff;font-size:12px;font-weight:900;text-decoration:none;box-sizing:border-box}
   .clearance-link-card .open-link:hover{background:#123b61}
   .clearance-link-card .reopen-link{width:100%;padding:7px 9px;border-radius:9px;background:#fff7e6;color:#8a5a00;border:1px solid #efd69c;font-size:11px;font-weight:900;cursor:pointer}
   .clearance-apply-buttons{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:6px}
   .clearance-apply-buttons button{padding:6px 5px;border:1px solid #d8dee6;border-radius:8px;background:#fff;color:#475569;font-size:11px;font-weight:800;cursor:pointer}
   .clearance-apply-buttons button.selected{background:#eef5fb;border-color:#8eacc5;color:#09233f}
   .clearance-apply-buttons button.selected.skip{background:#f4f5f7;border-color:#cbd5e1;color:#64748b}
   .clearance-link-status{font-size:11px;font-weight:900}
   .clearance-link-status.complete{color:#15803d}.clearance-link-status.pending{color:#b45309}.clearance-link-status.skipped{color:#64748b}
   @media(min-width:768px){.clearance-links-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
   @media(min-width:1100px){.clearance-links-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
   @media(max-width:640px){.clearance-links-grid{grid-template-columns:1fr}}

   /* Official A4 export — all selectors are scoped to avoid affecting the live site UI. */
   @page{size:A4 portrait;margin:0}
   .official-export{font-family:Arial,Tahoma,sans-serif;color:#17104f}
   .official-export .form-page{width:210mm;height:297mm;margin:0 auto;background:#fff;position:relative;padding:11mm 13mm;box-sizing:border-box;overflow:hidden;direction:rtl}
   .official-export .form-page:before{content:"";position:absolute;top:6mm;left:13mm;right:13mm;height:1px;background:#bd921f}
   .official-export .form-header{text-align:center;border-bottom:1.5px solid #bd921f;padding-bottom:2.2mm;margin-bottom:2.2mm}
   .official-export .company-name{font-size:10px;font-weight:800}.official-export .form-title{font-size:18px;font-weight:800;margin:1mm 0}.official-export .form-subtitle{color:#bd921f;letter-spacing:2px;font-weight:700;font-size:9px}.official-export .form-meta{font-size:8px;margin-top:1mm}
   .official-export .section-title,.official-export .columns-title{border-top:1.2px solid #bd921f;border-bottom:1.2px solid #bd921f;padding:3px 6px;margin:2.5mm 0 1.5mm;font-weight:800;display:flex;justify-content:space-between;align-items:center}.official-export .section-title span:last-child,.official-export .columns-title span:last-child{color:#bd921f;direction:ltr;font-size:8px}
   .official-export .original-grid{width:100%;border-collapse:collapse;font-size:7.5px}.official-export .original-grid td{border-bottom:1px solid #d8d7df;padding:2.5px 3px;vertical-align:middle}.official-export .original-grid td:nth-child(odd){font-weight:700}.official-export .original-grid td:nth-child(even){text-align:center}.official-export .employee-grid td:nth-child(1),.official-export .employee-grid td:nth-child(4){width:13%}.official-export .employee-grid td:nth-child(2),.official-export .employee-grid td:nth-child(5){width:20%}.official-export .employee-grid td:nth-child(3),.official-export .employee-grid td:nth-child(6){width:13%;color:#666879;direction:ltr}
   .official-export .employee-signature{display:flex;align-items:center;justify-content:center;gap:4mm;border-top:1px solid #bd921f;margin-top:1.8mm;padding-top:1.4mm;font-size:7px}
   .official-export .employee-signature .signature-box{width:35mm;margin-top:0;height:9mm;border:0}.official-export .employee-signature .signature-box img{max-height:8mm;max-width:100%;object-fit:contain}
   .official-export .columns-title{margin-top:2.2mm}
   .official-export .signature-columns{display:grid;grid-template-columns:1fr 1fr;gap:4mm;border-top:1px solid #17104f;position:relative}.official-export .signature-columns:before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;background:#17104f;transform:translateX(-50%)}
   .official-export .signature-column{padding:2.3mm 2.3mm 0;min-width:0}.official-export .column-title{text-align:center;font-weight:900;font-size:8px;padding-bottom:1.5mm;border-bottom:1px solid #bd921f}.official-export .column-title small,.official-export .card-title small{color:#bd921f;font-size:6.5px;direction:ltr}
   .official-export .signature-card{border:1px solid #cfd4dc;background:#fff;border-radius:2mm;margin:1.5mm 0;padding:1.6mm 1.8mm;break-inside:avoid;box-shadow:0 1px 2px rgba(15,23,42,.04)}
   .official-export .signature-card .card-title{font-weight:900;border-bottom:1px solid #e4e7eb;padding-bottom:1mm;margin-bottom:1mm;font-size:8px;display:flex;justify-content:space-between;align-items:center}.official-export .signature-card>span{display:block;text-align:center;font-size:7.5px;min-height:10px;color:#334155}
   .official-export .signature-box{height:11mm;display:flex;align-items:center;justify-content:center;border-bottom:1px dashed #aeb5bf;margin-top:1mm}.official-export .signature-box img{max-width:70%;max-height:9.5mm;object-fit:contain}.official-export .decision-row{text-align:center;font-weight:900;font-size:7px;margin-top:1mm;color:#334155}
   .official-export .finance-mini{font-size:6.3px;line-height:1.3;text-align:right;margin-top:1mm;color:#4b5563}
   .official-export .clearance-note{margin-top:1.2mm;padding:1.4mm 1.6mm;background:#faf7ed;border-right:2px solid #bd921f;font-size:6.6px;line-height:1.35;display:flex;gap:2mm;align-items:flex-start}.official-export .clearance-note b{white-space:nowrap;color:#6b5012}.official-export .clearance-note span{color:#374151;overflow-wrap:anywhere}
   .official-export .senior-approval{margin-top:2mm;border-top:1.2px solid #17104f;padding-top:1.5mm}.official-export .senior-approval .signature-card{margin:0}.official-export .senior-grid{display:grid;grid-template-columns:1fr 1.15fr .95fr;gap:3mm;align-items:center}.official-export .senior-grid>div>b{font-size:7px}.official-export .senior-grid>div>span{display:block;text-align:center;font-size:7.5px;margin-top:1mm}.official-export .senior-grid .signature-box{height:9mm;margin-top:0}.official-export .senior-grid .decision-row{margin-top:0}
   .official-export .senior-card{border-color:#bd921f;background:#fffdf7}
   .official-export .final-status{text-align:center;border-top:1px solid #bd921f;margin-top:1.4mm;padding-top:1.2mm;font-size:8px;font-weight:900}.official-export .copies{text-align:center;font-size:6.5px;margin-top:1.2mm;color:#555}
   @media print{html,body{width:210mm;margin:0;padding:0;background:#fff}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.no-print{display:none!important}.official-export{width:210mm}.official-export .form-page{width:210mm!important;height:297mm!important;margin:0!important;padding:11mm 13mm!important;box-shadow:none!important;page-break-after:auto!important;break-after:auto!important}}
  `}</style> </main>
}
