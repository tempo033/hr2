'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,FileSearch,Plus,Trash2,Users,ClipboardList} from 'lucide-react'

export default function InvestigationPage(){
 const [employees,setEmployees]=useState<any[]>([])
 const [selected,setSelected]=useState<string[]>([])
 const [subject,setSubject]=useState('')
 const [questions,setQuestions]=useState<string[]>([])
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [created,setCreated]=useState<any>(null)

 useEffect(()=>{fetch('/api/administrative-investigations',{cache:'no-store'}).then(r=>r.json()).then(d=>setEmployees(d.employees||[])).catch(()=>setMessage('تعذر تحميل الموظفين'))},[])
 const addEmployee=(id:string)=>{if(id&&!selected.includes(id))setSelected(x=>[...x,id])}
 const generate=async()=>{
  if(!selected.length||!subject.trim())return
  setBusy(true);setMessage('')
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'questions',subject})})
  const d=await r.json();setQuestions(d.questions||[]);setBusy(false)
 }
 const create=async()=>{
  if(!selected.length||!subject.trim())return
  setBusy(true);setMessage('')
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',subject,employee_ids:selected})})
  const d=await r.json()
  if(!r.ok){setMessage(d.error||'تعذر إنشاء التحقيق');setBusy(false);return}
  setCreated(d);setMessage('تم إنشاء التحقيق وروابط الأطراف والإدارة المختصة.')
  setBusy(false)
 }
 const employeeName=(id:string)=>employees.find(e=>e.id===id)?.full_name||id
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8 text-[#09233f]">
  <div className="max-w-6xl mx-auto">
   <header className="bg-white border rounded-2xl p-6 mb-6 shadow-sm">
    <div className="text-center border-b-2 border-[#b88618] pb-4"><div className="font-black text-2xl">شركة البنية الأساسية للمقاولات ذ.م.م</div><div className="text-xs tracking-[.25em] mt-1">AL BUNYAH AL ASASIYAH CONTRACTING</div></div>
    <div className="flex justify-between items-center mt-5"><div><div className="text-[#b88618] font-bold">مركز النماذج</div><h1 className="text-3xl font-black">محضر تحقيق إداري</h1><p className="text-slate-500 mt-1">نموذج داخلي — خاص وسري — مخصص لوقائع مشاريع وأعمال المقاولات.</p></div><Link href="/forms/investigation/records" className="border rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ClipboardList size={17}/> سجل التحقيقات</Link></div>
   </header>

   <section className="bg-white rounded-2xl border p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-5"><FileSearch/><h2 className="text-xl font-black">بيانات التحقيق</h2></div>
    <label className="block font-bold mb-2">الموظفون محل التحقيق</label>
    <select onChange={e=>{addEmployee(e.target.value);e.target.value=''}} className="w-full border-2 rounded-xl p-3">
      <option value="">اختر موظفاً لإضافته — يمكن إضافة أكثر من طرف</option>
      {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}{e.job_title?' — '+e.job_title:''}{e.department?' — '+e.department:''}</option>)}
    </select>
    <div className="flex flex-wrap gap-2 mt-3">{selected.map(id=><div key={id} className="border rounded-xl px-3 py-2 bg-slate-50 flex items-center gap-2"><Users size={15}/><span className="font-bold">{employeeName(id)}</span><button onClick={()=>setSelected(x=>x.filter(v=>v!==id))} className="text-red-600"><Trash2 size={15}/></button></div>)}</div>

    <label className="block font-bold mb-2 mt-6">موضوع التحقيق</label>
    <textarea value={subject} onChange={e=>setSubject(e.target.value)} rows={5} placeholder="اكتب الواقعة بدقة: مثال — قيام مسؤول الحركة بتسليم مركبة لسائق غير مخول مما أدى إلى مخالفة وغرامة على الشركة..." className="w-full border-2 rounded-xl p-4"/>

    <div className="flex gap-3 mt-5 flex-wrap">
      <button disabled={!selected.length||!subject.trim()||busy} onClick={generate} className="bg-[#09233f] text-white rounded-xl px-6 py-3 font-black disabled:opacity-50">{busy?'جاري إعداد الأسئلة...':'معاينة الأسئلة المتخصصة'}</button>
      <button disabled={!selected.length||!subject.trim()||busy} onClick={create} className="bg-[#b88618] text-white rounded-xl px-6 py-3 font-black inline-flex gap-2 items-center disabled:opacity-50"><Plus size={18}/>{busy?'جاري الإنشاء...':'إنشاء التحقيق والروابط'}</button>
    </div>
   </section>

   {questions.length>0&&<section className="bg-white rounded-2xl border p-6 mt-5"><h2 className="font-black text-xl mb-4">الأسئلة التي تم توليدها من موضوع التحقيق</h2><p className="text-sm text-slate-500 mb-4">الأسئلة تُبنى من نص الواقعة نفسه ومن طبيعة أعمال المقاولات المرتبطة بها، وليست قائمة ثابتة تُكرر لكل تحقيق.</p><ol className="list-decimal pr-6 space-y-3">{questions.map((q,i)=><li key={i} className="font-semibold">{q}</li>)}</ol></section>}

   {created&&<section className="bg-white rounded-2xl border p-6 mt-5"><h2 className="font-black text-xl mb-4">روابط التحقيق</h2><div className="border rounded-xl p-4 mb-4"><div className="font-black mb-2">رابط الإدارة المختصة</div>{created.reviews?.map((r:any)=><a key={r.id} href={location.origin+'/forms/investigation/review/'+r.review_token} target="_blank" className="text-[#b88618] break-all">{location.origin+'/forms/investigation/review/'+r.review_token}</a>)}</div>{created.parties?.map((p:any,i:number)=><div key={p.id} className="border rounded-xl p-4 mb-3"><div className="font-black mb-2">الموظف: {employeeName(p.employee_id)}</div><a href={location.origin+'/forms/investigation/respond/'+p.employee_token} target="_blank" className="text-[#b88618] break-all">{location.origin+'/forms/investigation/respond/'+p.employee_token}</a></div>)}<Link href="/forms/investigation/records" className="inline-flex mt-2 bg-[#09233f] text-white rounded-xl px-5 py-3 font-bold">فتح سجل التحقيقات</Link></section>}
   {message&&<div className="mt-4 bg-white border rounded-xl p-4 font-bold">{message}</div>}
  </div>
 </main>
}
