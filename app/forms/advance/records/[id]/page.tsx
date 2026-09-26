'use client'

import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,Printer,CheckCircle2,Clock3,FileCheck2} from 'lucide-react'

type RecordRow={id:string;employee_name:string|null;employee_number:string|null;department:string|null;job_title:string|null;updated_at:string;form_data:any}

const display=(v:any)=>v===null||v===undefined||v===''?'—':String(v)
const sig=(v:any)=>Boolean(v)

export default function AdvanceOfficialRecord({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState('')
 const [rec,setRec]=useState<RecordRow|null>(null)
 const [loading,setLoading]=useState(true)

 useEffect(()=>{void params.then(p=>setId(p.id))},[params])
 useEffect(()=>{if(!id)return;fetch('/api/forms/records?id='+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.json()).then(d=>setRec(d.records?.[0]||null)).finally(()=>setLoading(false))},[id])

 const f=rec?.form_data||{}
 const employeeApproval=f.advance_employee_approval||{}
 const approvals=f.advance_approvals||{}
 const stages=[
  {key:'employee',label:'الموظف',name:employeeApproval.employee_name,date:employeeApproval.employee_date,signature:employeeApproval.employee_signature},
  {key:'hr',label:'الموارد البشرية',name:approvals.hr?.approval_name,date:approvals.hr?.approval_date,signature:approvals.hr?.approval_signature},
  {key:'finance',label:'الإدارة المالية',name:approvals.finance?.approval_name,date:approvals.finance?.approval_date,signature:approvals.finance?.approval_signature},
  {key:'general_manager',label:'المدير العام',name:approvals.general_manager?.approval_name,date:approvals.general_manager?.approval_date,signature:approvals.general_manager?.approval_signature},
 ]
 const complete=useMemo(()=>stages.every(x=>sig(x.signature)&&x.name&&x.date),[stages])
 const print=()=>{if(complete)window.print()}

 if(loading)return <main dir="rtl" className="p-10 text-center">جارٍ تحميل طلب السلفة...</main>
 if(!rec)return <main dir="rtl" className="p-10 text-center text-red-700">طلب السلفة غير موجود.</main>

 return <main dir="rtl" className="min-h-screen bg-[#f3f5f7] p-5 md:p-8">
  <div className="no-print max-w-[1000px] mx-auto mb-5 flex items-center justify-between gap-3">
   <Link href="/forms/advance/records" className="inline-flex items-center gap-2 font-bold"><ArrowLeft size={17}/> العودة لسجل السلف</Link>
   <button disabled={!complete} onClick={print} className="inline-flex items-center gap-2 rounded-xl px-5 py-2 font-black text-white bg-[#09233f] disabled:bg-slate-300">
    <FileCheck2 size={17}/>{complete?'تصدير PDF رسمي شامل التوقيعات':'لا يمكن التصدير قبل اكتمال جميع الاعتمادات'}
   </button>
  </div>

  <section className="no-print max-w-[1000px] mx-auto bg-white border rounded-2xl p-4 mb-5">
   <div className={complete?'ok-banner':'wait-banner'}>{complete?<><CheckCircle2 size={18}/> اكتملت الموافقات: الموظف + الموارد البشرية + الإدارة المالية + المدير العام</>:<><Clock3 size={18}/> الطلب لم يكتمل اعتماده بعد، ولن يتم إصدار النسخة الرسمية</>}</div>
  </section>

  <section className="official-page mx-auto bg-white">
   <header className="official-header">
    <div className="company-mark">HR</div>
    <div className="text-center flex-1">
     <div className="text-[9px] font-bold text-slate-500">الموارد البشرية</div>
     <h1>طلب سلفة مالية</h1>
     <div className="subtitle">SALARY ADVANCE REQUEST — OFFICIAL APPROVED COPY</div>
    </div>
    <div className={complete?'approval-stamp':'pending-stamp'}>{complete?'معتمد نهائياً':'غير مكتمل'}</div>
   </header>

   <div className="employee-grid">
    {[
     ['اسم الموظف',rec.employee_name],['الرقم الوظيفي',rec.employee_number],['الإدارة / القسم',rec.department],
     ['المسمى الوظيفي',rec.job_title],['الجنسية',f.nationality],['الهوية / الإقامة',f.national_id],
     ['الجوال',f.phone],['المشروع / الموقع',f.project_name||f.work_location],['تاريخ التعيين',f.hire_date]
    ].map(([k,v])=><div className="cell" key={String(k)}><span>{k}</span><b>{display(v)}</b></div>)}
   </div>

   <div className="section-title">بيانات السلفة</div>
   <div className="loan-grid">
    <div><span>مبلغ السلفة</span><b>{display(f.amount)} ريال</b></div>
    <div><span>عدد الأقساط</span><b>{display(f.installments)}</b></div>
    <div><span>تاريخ الطلب</span><b>{display(f.request_date)}</b></div>
    <div><span>طريقة السداد</span><b>{display(f.repayment)}</b></div>
    <div className="wide"><span>سبب السلفة</span><b>{display(f.reason)}</b></div>
    <div className="wide"><span>ملاحظات</span><b>{display(f.notes)}</b></div>
   </div>

   <div className="section-title">سلسلة الاعتماد والتوقيعات</div>
   <div className="approval-table">
    <div className="approval-row head"><div>المرحلة</div><div>اسم المعتمد</div><div>الحالة</div><div>التوقيع</div><div>التاريخ</div></div>
    {stages.map(x=><div className="approval-row" key={x.key}>
      <div className="font-black">{x.label}</div>
      <div>{display(x.name)}</div>
      <div className={x.signature&&x.name&&x.date?'approved':'pending'}>{x.signature&&x.name&&x.date?'تم الاعتماد':'قيد الانتظار'}</div>
      <div className="signature">{x.signature?<img src={x.signature} alt={'توقيع '+x.label}/>:<span>—</span>}</div>
      <div>{display(x.date)}</div>
    </div>)}
   </div>

   <div className="final-box">
    <div><b>النتيجة:</b> {complete?'تم اعتماد طلب السلفة من جميع المراحل':'لم يكتمل الاعتماد'}</div>
    <div><b>آخر تحديث:</b> {new Date(rec.updated_at).toLocaleString('ar-SA')}</div>
   </div>
   <div className="footer-note">هذه النسخة هي النسخة الرسمية المجمعة لطلب السلفة بعد اكتمال سلسلة الاعتماد.</div>
  </section>

  <style>{`
   @page{size:A4 portrait;margin:6mm}
   .official-page{width:210mm;min-height:297mm;padding:8mm;color:#172033;box-shadow:0 4px 18px rgba(0,0,0,.08)}
   .official-header{display:flex;align-items:center;gap:10px;border-bottom:2px solid #b88618;padding-bottom:7px}
   .company-mark{width:36px;height:36px;border:2px solid #09233f;border-radius:50%;display:grid;place-items:center;font-weight:900;color:#09233f;font-size:12px}
   .official-header h1{font-size:23px;font-weight:900;color:#09233f;margin:0}
   .subtitle{font-size:8px;font-weight:800;color:#b88618}
   .approval-stamp,.pending-stamp{font-size:11px;font-weight:900;padding:7px 10px;border:2px solid;border-radius:6px;white-space:nowrap}
   .approval-stamp{color:#166534;border-color:#166534;transform:rotate(-3deg)}
   .pending-stamp{color:#a16207;border-color:#a16207}
   .employee-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:7px}
   .cell{border:1px solid #d8dee7;padding:5px 6px;min-height:31px}.cell span,.loan-grid span{display:block;font-size:7px;color:#64748b}.cell b,.loan-grid b{font-size:9px}
   .section-title{margin-top:7px;background:#09233f;color:#fff;font-weight:900;font-size:10px;padding:5px 7px}
   .loan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;border:1px solid #cbd5e1;padding:5px}.loan-grid>div{border-bottom:1px solid #e2e8f0;padding:4px 5px;min-height:31px}.loan-grid .wide{grid-column:1/-1}
   .approval-table{border:1px solid #cbd5e1;border-top:0}
   .approval-row{display:grid;grid-template-columns:1.15fr 1.5fr 1fr 1.45fr .9fr;align-items:center;border-top:1px solid #e2e8f0;min-height:48px;font-size:8px}
   .approval-row>div{padding:4px 5px;border-left:1px solid #e2e8f0;min-height:48px;display:flex;align-items:center}.approval-row>div:last-child{border-left:0}.approval-row.head{min-height:27px;background:#f1f5f9;font-weight:900}.approval-row.head>div{min-height:27px}
   .approved{color:#166534;font-weight:900}.pending{color:#a16207;font-weight:900}.signature{justify-content:center}.signature img{width:105px;height:42px;object-fit:contain}
   .final-box{margin-top:8px;border:1.5px solid #09233f;padding:7px;display:flex;justify-content:space-between;font-size:8px;font-weight:800}
   .footer-note{text-align:center;font-size:7px;color:#475569;margin-top:7px;font-weight:700}
   .ok-banner,.wait-banner{display:flex;align-items:center;gap:7px;padding:10px;border-radius:10px;font-weight:900}.ok-banner{background:#ecfdf5;color:#166534}.wait-banner{background:#fffbeb;color:#a16207}
   @media print{body{background:#fff!important}.no-print{display:none!important}.official-page{box-shadow:none!important;width:210mm!important;height:297mm!important;min-height:297mm!important;padding:6mm!important}.official-header h1{font-size:20px}.employee-grid{gap:2px}.cell{padding:3px 5px;min-height:27px}.loan-grid{gap:2px;padding:4px}.approval-row{min-height:43px;font-size:7.5px}.approval-row>div{min-height:43px;padding:3px 4px}.signature img{width:95px;height:38px}.section-title{margin-top:5px;padding:4px 6px}}
  `}
  </style>
 </main>
}
