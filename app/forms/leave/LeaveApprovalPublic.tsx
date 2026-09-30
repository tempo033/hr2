'use client'

import {useEffect,useMemo,useState} from 'react'
import SignatureEditor from '@/app/components/signature/SignatureEditor'
import {CheckCircle2,Clock3,Printer,Save,XCircle,ShieldCheck} from 'lucide-react'

const labels:any={replacement:'البديل',hr:'الموارد البشرية',general_manager:'المدير العام'}
const titles:any={replacement:'المعتمد / البديل',hr:'مسؤول الموارد البشرية',general_manager:'المدير العام'}

const fmt=(v:any)=>v?new Date(v).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'}):'—'

function ApprovalCard({scope,data}:{scope:string;data:any}){
  if(!data)return null
  const approved=Boolean(data.approval_signature)&&data.approval_decision!=='rejected'
  const rejected=data.approval_decision==='rejected'
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm break-inside-avoid">
    <div className="flex items-center justify-between gap-3">
      <div><div className="text-xs font-bold text-[#b88618]">{labels[scope]||scope}</div><div className="font-black text-[#09233f]">{data.approval_name||'—'}</div><div className="text-xs text-slate-500">{data.approval_title||titles[scope]||'—'}</div></div>
      <span className={rejected?'rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700':approved?'rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700':'rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700'}>{rejected?'مرفوض':approved?'معتمد':'قيد الانتظار'}</span>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div><div className="text-[11px] text-slate-500">التاريخ</div><div className="font-bold">{data.approval_date||'—'}</div></div>
      <div><div className="text-[11px] text-slate-500">وقت الاعتماد</div><div className="font-bold">{fmt(data.submitted_at)}</div></div>
      <div className="flex min-h-[70px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50 p-2"><img src={data.approval_signature||''} alt="التوقيع" className="max-h-16 max-w-full object-contain"/></div>
    </div>
    {rejected&&data.rejection_reason&&<div className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">سبب الرفض: {data.rejection_reason}</div>}
  </div>
}

export default function LeaveApprovalPublic({token}:{token:string}){
 const [data,setData]=useState<any>(),[form,setForm]=useState<any>({}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const load=async()=>{const r=await fetch('/api/forms/public/'+token,{cache:'no-store'});const x=await r.json();if(r.ok){setData(x);const s=String(x.link?.link_scope||'').replace('leave:','');setForm(x.record?.form_data?.leave_approvals?.[s]||{})}else setMsg(x.error||'تعذر فتح الرابط');setLoading(false)}
 useEffect(()=>{void load()},[token])
 const scope=String(data?.link?.link_scope||'').replace('leave:',''),e=data?.data?.employee||{},f=data?.record?.form_data||{},a=f.leave_approvals||{}
 const approvals=useMemo(()=>['replacement','hr','general_manager'].map(k=>[k,a[k]] as const).filter(([,v])=>v),[a])
 const prior=scope==='replacement'?!!f.employee_signature:scope==='hr'?(f.replacement?!!a.replacement?.approval_signature||!!a.replacement?.skipped:!!f.employee_signature):scope==='general_manager'?(!!a.hr?.approval_signature&&(!f.replacement||!!a.replacement?.approval_signature||!!a.replacement?.skipped)):false
 const set=(k:string,v:any)=>setForm((x:any)=>({...x,[k]:v}))
 const save=async(decision:'approved'|'rejected')=>{
   if(!prior){setMsg('لا يمكن الاعتماد قبل اكتمال المرحلة السابقة.');return}
   if(decision==='approved'&&!form.approval_signature){setMsg('يجب إدخال التوقيع قبل الاعتماد.');return}
   if(decision==='rejected'&&!form.rejection_reason){setMsg('اكتب سبب الرفض قبل رفض الطلب.');return}
   setBusy(true)
   const payload={...form,approval_decision:decision,approval_title:titles[scope]||labels[scope]}
   const r=await fetch('/api/forms/public/'+token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({form:payload,device_name:navigator.userAgent})})
   const x=await r.json();setBusy(false)
   setMsg(r.ok?(decision==='approved'?'تم اعتماد الطلب وتسجيل التوقيع بنجاح.':'تم رفض الطلب وتسجيل سبب الرفض.'):(x.error||'تعذر حفظ الاعتماد'))
   if(r.ok)await load()
 }
 const rows=[['اسم الموظف',e.full_name],['الرقم الوظيفي',e.employee_number],['القسم',e.department],['المسمى الوظيفي',e.job_title],['نوع الإجازة',f.leave_type],['من تاريخ',f.from_date],['إلى تاريخ',f.to_date],['عدد الأيام',f.days],['البديل',f.replacement||'لا يوجد'],['ملاحظات',f.notes]]
 if(loading)return <main dir="rtl" className="min-h-screen grid place-items-center">جارٍ تحميل طلب الإجازة...</main>
 const finalApproved=f.status==='معتمد نهائياً'||data?.record?.status==='معتمد نهائياً'
 return <main dir="rtl" className="min-h-screen bg-[#f3f5f7] p-4 md:p-6">
  <div className="mx-auto max-w-[210mm]">
   <div className="print:hidden mb-4 flex flex-wrap items-center justify-between gap-3">
    <div><div className="text-xs font-black tracking-widest text-[#b88618]">HR2 / LEAVE APPROVAL</div><h1 className="text-xl font-black text-[#09233f]">اعتماد طلب الإجازة — {labels[scope]}</h1></div>
    <div className="flex gap-2"><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#b88618] px-4 py-2 font-black text-white"><Printer size={16}/> طباعة / PDF</button></div>
   </div>

   <section className="leave-document bg-white p-[8mm] shadow-sm print:shadow-none">
    <header className="border-b-2 border-[#b88618] pb-4 text-center">
      <div className="text-sm font-black text-[#09233f]">شركة البنية الأساسية للمقاولات</div>
      <h1 className="mt-1 text-2xl font-black text-[#09233f]">طلب إجازة</h1>
      <div className="font-bold text-[#b88618]">LEAVE REQUEST</div>
      <div className="mt-2 text-xs text-slate-500">مسار الاعتماد — {labels[scope]}</div>
    </header>

    <h3 className="section">بيانات الموظف</h3>
    <div className="grid grid-cols-2 gap-2">{rows.slice(0,5).map(([k,v])=><div className="border-b p-2" key={String(k)}><small className="block text-slate-500">{k}</small><b>{v||'—'}</b></div>)}</div>
    <h3 className="section">بيانات الإجازة</h3>
    <div className="grid grid-cols-2 gap-2">{rows.slice(5).map(([k,v])=><div className="border-b p-2" key={String(k)}><small className="block text-slate-500">{k}</small><b>{v||'—'}</b></div>)}</div>

    <h3 className="section">التوقيعات والاعتمادات السابقة</h3>
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 p-4 break-inside-avoid">
        <div className="text-xs font-bold text-[#b88618]">الموظف</div><div className="font-black text-[#09233f]">{f.employee_name||e.full_name||'—'}</div>
        <div className="mt-3 grid grid-cols-2 gap-3"><div>التاريخ: <b>{f.employee_date||'—'}</b></div><div className="flex min-h-[65px] items-center justify-center bg-slate-50"><img src={f.employee_signature||''} alt="توقيع الموظف" className="max-h-14 max-w-full object-contain"/></div></div>
      </div>
      {approvals.filter(([k])=>k!==scope).map(([k,v])=><ApprovalCard key={k} scope={k} data={v}/>)}
    </div>

    <h3 className="section">اعتماد {labels[scope]}</h3>
    <fieldset disabled={!!data?.link?.locked||!prior} className="rounded-xl border-2 border-[#b88618] p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="font-bold">اسم المعتمد<input className="field" value={form.approval_name||''} onChange={e=>set('approval_name',e.target.value)} /></label>
        <label className="font-bold">المسمى الوظيفي<input className="field" value={form.approval_title||titles[scope]||''} onChange={e=>set('approval_title',e.target.value)} /></label>
        <label className="font-bold">التاريخ<input type="date" className="field" value={form.approval_date||''} onChange={e=>set('approval_date',e.target.value)} /></label>
        <div><div className="font-bold mb-1">التوقيع الرقمي</div><SignatureEditor value={form.approval_signature||''} onChange={v=>set('approval_signature',v)} autoUseSaved={false}/></div>
      </div>
      <div className="mt-4"><label className="font-bold">سبب الرفض (يُطلب عند الرفض)<textarea className="field min-h-20" value={form.rejection_reason||''} onChange={e=>set('rejection_reason',e.target.value)}/></label></div>
    </fieldset>

    {data?.link?.locked&&<div className="mt-4 rounded-xl bg-slate-100 p-3 text-center font-bold">تم اعتماد هذا الرابط ولا يمكن تعديله.</div>}
    {!prior&&<div className="mt-4 rounded-xl bg-amber-50 p-3 font-bold text-amber-800">الرابط في انتظار اكتمال الاعتماد السابق.</div>}
    {finalApproved&&<div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center font-black text-emerald-800"><CheckCircle2 className="mx-auto mb-1"/>معتمد نهائيًا — يمكن طباعة النموذج وتصديره PDF.</div>}
    {msg&&<div className="print:hidden mt-4 rounded-xl bg-slate-100 p-3 text-center font-bold">{msg}</div>}

    <div className="print:hidden mt-5 flex flex-wrap gap-2">
      {!data?.link?.locked&&prior&&<><button disabled={busy} onClick={()=>void save('approved')} className="inline-flex items-center gap-2 rounded-xl bg-[#09233f] px-5 py-2.5 font-black text-white"><ShieldCheck size={17}/> اعتماد وتوقيع</button><button disabled={busy} onClick={()=>void save('rejected')} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 font-black text-white"><XCircle size={17}/> رفض الطلب</button></>}
      <button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#b88618] px-5 py-2.5 font-black text-white"><Printer size={17}/> طباعة / تصدير PDF</button>
    </div>

    <footer className="mt-8 border-t pt-3 text-center text-[10px] text-slate-400">جميع الاعتمادات والتوقيعات المعروضة مرتبطة بسجل طلب الإجازة نفسه.</footer>
   </section>
  </div>
  <style jsx>{`
   .section{margin:18px 0 9px;padding:6px 8px;border-top:1.5px solid #b88618;border-bottom:1.5px solid #b88618;font-weight:900;color:#09233f}
   .field{display:block;width:100%;border:0;border-bottom:1px solid #cbd5e1;padding:7px 2px;background:transparent;outline:0}
   @page{size:A4 portrait;margin:0}
   @media print{body{background:#fff}.print\\:hidden{display:none!important}.leave-document{box-shadow:none!important}.break-inside-avoid{break-inside:avoid}}
  `}</style>
 </main>
}
