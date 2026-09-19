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
const decision=(data:any)=>data?.clearance_decision||data?.senior_decision||'pending'
const decisionLabel=(v:string)=>v==='clear'?'تم الإخلاء':v==='not_clear'?'لم يتم الإخلاء':'قيد الانتظار'

export default function ClearanceRecord({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState('')
 const [rec,setRec]=useState<RecordRow|null>(null)
 const [links,setLinks]=useState<LinkRow[]>([])
 const [loading,setLoading]=useState(true)

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
  }catch(error){console.error(error);setRec(null);setLinks([])}
  finally{setLoading(false)}
 }
 useEffect(()=>{void params.then(p=>setId(p.id))},[params])
 useEffect(()=>{void load()},[id])

 const clearance=rec?.form_data?.clearance||{}
 const employee=clearance.employee||{}
 const stageData=(key:string)=>key==='employee'?employee:(clearance[key]||{})
 const allApproved=useMemo(()=>{
  if(!employee.employee_signature)return false
  return stages.slice(1).every(s=>{
   const d=stageData(s.key)
   return signed(d)&&decision(d)==='clear'
  })
 },[clearance,employee])

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
     const Icon=s.icon; const d=stageData(s.key); const complete=s.key==='employee'?Boolean(employee.employee_signature):signed(d)&&decision(d)==='clear'
     const link=links.find(x=>x.link_scope==='clearance:'+s.key)
     return <a key={s.key} href={link?'/forms/public/'+link.token:'#'} target={link?'_blank':undefined} rel="noreferrer" className="link-card">
      <span className={complete?'icon ok':'icon'}><Icon size={21}/></span>
      <span className="font-black text-sm">{s.label}</span>
      <span className={complete?'text-xs text-emerald-700 font-bold':'text-xs text-amber-700 font-bold'}>{complete?'تم الاعتماد':'قيد الانتظار'}</span>
      <ExternalLink size={14} className="absolute left-3 top-3 text-slate-400"/>
     </a>
    })}
   </div>
  </section>

  <section className="official-page mx-auto bg-white">
   <header className="official-header">
    <div className="company-mark">HR</div>
    <div className="text-center flex-1"><div className="text-[10px] font-bold text-slate-500">الموارد البشرية</div><h1>إخلاء طرف موظف</h1><div className="subtitle">EMPLOYEE CLEARANCE — OFFICIAL CONSOLIDATED RECORD</div></div>
    <div className={allApproved?'approval-stamp':'pending-stamp'}>{allApproved?'معتمد':'قيد الإخلاء'}</div>
   </header>

   <div className="employee-grid">
    {[
     ['اسم الموظف',employee.employee_name||rec.employee_name],
     ['رقم الموظف',employee.employee_number||rec.employee_number],
     ['الجنسية',employee.nationality],
     ['الهوية / الإقامة',employee.national_id],
     ['الإدارة / الموقع',employee.department_location],
     ['القسم',employee.department||rec.department],
     ['المسمى الوظيفي',employee.job_title||rec.job_title],
     ['آخر يوم عمل',employee.last_work_date],
     ['سبب الإخلاء',employee.reason],
    ].map(([k,v])=><div key={k as string} className="employee-cell"><span>{k}</span><b>{displayValue(v)}</b></div>)}
   </div>

   <div className="section-title">اعتمادات الإدارات والتوقيعات</div>
   <div className="approval-table">
    <div className="row head"><div>الإدارة</div><div>المعتمد / المسؤول</div><div>القرار</div><div>التوقيع</div><div>التاريخ</div></div>
    {stages.map(s=>{
     const d=stageData(s.key)
     const name=s.key==='employee'?employee.employee_name:(s.key==='managers'?(d.line_manager_name||d.project_manager_name||d.projects_manager_name):d[s.key+'_name']||d.deputy_general_manager||'')
     const sig=signatureEntries(d)[0]?.[1]
     const date=s.key==='employee'?d.employee_signature_date:(d[s.key+'_date']||d.senior_date||'')
     const dec=s.key==='employee'?(employee.employee_signature?'clear':'pending'):decision(d)
     return <div className="row" key={s.key}>
      <div className="font-black">{s.label}</div>
      <div>{displayValue(name)}</div>
      <div className={dec==='clear'?'decision clear':dec==='not_clear'?'decision no':'decision wait'}>{decisionLabel(dec)}</div>
      <div className="sig-box">{sig?<img src={String(sig)} alt="توقيع"/>:'—'}</div>
      <div>{displayValue(date)}</div>
     </div>
    })}
   </div>

   <div className="official-footer">
    <div><b>حالة الإخلاء:</b> {allApproved?'معتمد نهائياً':'قيد الاستكمال'}</div>
    <div><b>آخر تحديث:</b> {new Date(rec.updated_at).toLocaleString('ar-SA')}</div>
   </div>
   <div className="copies">الأصل — شؤون الموظفين &nbsp; | &nbsp; صورة لملف الموظف &nbsp; | &nbsp; صورة للحسابات</div>
  </section>

  <style>{`
   @page{size:A4 portrait;margin:6mm}
   .official-page{width:210mm;min-height:297mm;padding:7mm 8mm;color:#172033;box-shadow:0 4px 18px rgba(0,0,0,.08)}
   .official-header{display:flex;align-items:center;gap:10px;border-bottom:2px solid #b88618;padding-bottom:6px}
   .company-mark{width:34px;height:34px;border:2px solid #09233f;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#09233f;font-size:12px}
   .official-header h1{font-size:22px;font-weight:900;color:#09233f;margin:0}
   .subtitle{font-size:8px;font-weight:800;color:#b88618;letter-spacing:.4px}
   .approval-stamp,.pending-stamp{font-size:12px;font-weight:900;padding:8px 12px;border:2px solid;border-radius:6px;white-space:nowrap}
   .approval-stamp{color:#166534;border-color:#166534;transform:rotate(-3deg)}
   .pending-stamp{color:#a16207;border-color:#a16207}
   .employee-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:7px}
   .employee-cell{border:1px solid #d8dee7;padding:4px 6px;min-height:31px}.employee-cell span{display:block;font-size:7px;color:#64748b}.employee-cell b{font-size:9px}
   .section-title{margin-top:7px;background:#09233f;color:white;font-weight:900;font-size:10px;padding:4px 7px}
   .approval-table{border:1px solid #cbd5e1;border-top:0}
   .row{display:grid;grid-template-columns:1.25fr 1.45fr 1fr 1.2fr .9fr;align-items:center;border-top:1px solid #e2e8f0;min-height:32px;font-size:8px}
   .row>div{padding:3px 5px;border-left:1px solid #e2e8f0;min-height:32px;display:flex;align-items:center}.row>div:last-child{border-left:0}
   .head{background:#f1f5f9;font-weight:900;min-height:25px}.head>div{min-height:25px}
   .decision{font-weight:900}.decision.clear{color:#166534}.decision.no{color:#b91c1c}.decision.wait{color:#a16207}
   .sig-box{height:30px;justify-content:center}.sig-box img{max-width:90px;height:27px;object-fit:contain}
   .official-footer{display:flex;justify-content:space-between;margin-top:6px;font-size:8px;border-top:1px solid #cbd5e1;padding-top:5px}
   .copies{text-align:center;font-size:7px;font-weight:800;margin-top:6px;color:#475569}
   .badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900}.badge.ok{background:#ecfdf5;color:#166534}.badge.pending{background:#fffbeb;color:#a16207}
   .link-card{position:relative;min-height:108px;border:1px solid #e2e8f0;border-radius:14px;padding:14px 10px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-decoration:none;color:#09233f;background:#fafbfc;transition:.15s}.link-card:hover{border-color:#b88618;transform:translateY(-1px)}
   .icon{width:43px;height:43px;border-radius:12px;background:#eef2f7;display:grid;place-items:center;color:#475569}.icon.ok{background:#ecfdf5;color:#166534}
   @media print{
    body{background:#fff!important}.no-print{display:none!important}.official-page{box-shadow:none!important;width:210mm!important;height:297mm!important;min-height:297mm!important;padding:5mm 6mm!important}.official-header h1{font-size:19px}.employee-grid{gap:2px}.employee-cell{padding:3px 5px;min-height:27px}.row{min-height:29px;font-size:7.5px}.row>div{min-height:29px;padding:2px 4px}.sig-box{height:27px}.sig-box img{height:24px;max-width:80px}.section-title{margin-top:5px}.official-footer{margin-top:4px}
   }
  `}</style>
 </main>
}
