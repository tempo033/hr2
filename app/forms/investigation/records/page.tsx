'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,RefreshCw,ExternalLink,Scale} from 'lucide-react'

export default function Records(){
 const [data,setData]=useState<any>({investigations:[],employees:[]})
 const [selected,setSelected]=useState<any>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')

 const load=async()=>{const r=await fetch('/api/administrative-investigations',{cache:'no-store'});setData(await r.json())}
 useEffect(()=>{load()},[])

 const detail=async(id:string)=>{
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'detail',id})})
  setSelected(await r.json())
 }
 const saveSubject=async()=>{
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:selected.investigation.id,subject:selected.investigation.subject,status:selected.investigation.status})})
  setMessage(r.ok?'تم حفظ تعديل موضوع التحقيق.':'تعذر حفظ التعديل')
 }
 const finalize=async()=>{
  if(!selected)return
  setBusy(true)
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finalize',id:selected.investigation.id,subject:selected.investigation.subject})})
  const d=await r.json()
  if(r.ok){setSelected({...selected,investigation:{...selected.investigation,final_analysis:d.analysis,status:'completed'},parties:d.parties,reviews:d.reviews});setMessage('تم التحليل النهائي بناءً على أقوال الموظفين ورأي الإدارة المختصة.')}
  else setMessage(d.error||'تعذر التحليل')
  setBusy(false)
 }

 return (
  <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8 text-[#09233f]">
   <div className="max-w-7xl mx-auto">
    <header className="bg-white border rounded-2xl p-6 mb-6 flex justify-between items-center">
     <div><div className="text-[#b88618] font-bold">شركة البنية الأساسية للمقاولات ذ.م.م</div><h1 className="text-3xl font-black">سجل التحقيقات الإدارية</h1><p className="text-slate-500">عرض التحقيقات، روابط الأطراف، رأي الإدارة، والتحليل النهائي.</p></div>
     <div className="flex gap-2"><Link href="/forms/investigation" className="bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold">تحقيق جديد</Link><button onClick={load} className="border rounded-xl px-4 py-2 font-bold inline-flex gap-2"><RefreshCw size={17}/> تحديث</button><Link href="/forms" className="border rounded-xl px-4 py-2 font-bold inline-flex gap-2"><ArrowLeft size={17}/> النماذج</Link></div>
    </header>
    <div className="grid lg:grid-cols-2 gap-5">
     {(data.investigations||[]).map((x:any)=><button key={x.id} onClick={()=>detail(x.id)} className="text-right bg-white border rounded-2xl p-5 hover:shadow-md"><div className="text-xs text-[#b88618] font-bold">{new Date(x.created_at).toLocaleString('ar-SA')}</div><h2 className="font-black text-xl mt-2">{x.subject}</h2><div className="mt-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{x.status==='completed'?'مكتمل':'قيد التحقيق'}</span></div></button>)}
    </div>
    {selected && (
     <section className="bg-white border rounded-2xl p-6 mt-6">
      <div className="flex justify-between items-start gap-4">
       <div className="flex-1"><div className="text-[#b88618] font-bold">تفاصيل التحقيق</div><input value={selected.investigation.subject||''} onChange={e=>setSelected({...selected,investigation:{...selected.investigation,subject:e.target.value}})} className="w-full border rounded-xl p-3 text-xl font-black mt-2"/><button onClick={saveSubject} className="mt-2 border rounded-lg px-4 py-2 font-bold">حفظ التعديل</button></div>
       <button onClick={finalize} disabled={busy} className="bg-[#b88618] text-white rounded-xl px-5 py-3 font-black inline-flex gap-2"><Scale size={18}/>{busy?'جاري التحليل...':'التحليل النهائي والجزاءات المحتملة'}</button>
      </div>
      <div className="mt-5">
       {(selected.parties||[]).map((p:any)=><div key={p.id} className="border rounded-xl p-4 mb-3"><div className="font-black">الموظف: {(data.employees||[]).find((e:any)=>e.id===p.employee_id)?.full_name||p.employee_id}</div><div className="text-sm mt-2">حالة الأقوال: {p.employee_submitted_at?'تم الإرسال':'لم يتم الإرسال'}</div><a className="text-[#b88618] inline-flex gap-1 mt-2" href={location.origin+'/forms/investigation/respond/'+p.employee_token} target="_blank" rel="noreferrer"><ExternalLink size={15}/> فتح رابط الموظف</a></div>)}
      </div>
      {(selected.reviews||[]).map((r:any)=><div key={r.id} className="border rounded-xl p-4 mb-4"><div className="font-black">الإدارة المختصة: {r.department_name||'غير محددة'} — {r.reviewer_name||'لم يحدد المسؤول'}</div><p className="whitespace-pre-wrap mt-2">{r.opinion||'لم يصل رأي الإدارة بعد.'}</p><a className="text-[#b88618] inline-flex gap-1 mt-2" href={location.origin+'/forms/investigation/review/'+r.review_token} target="_blank" rel="noreferrer"><ExternalLink size={15}/> فتح رابط الإدارة</a></div>)}
      {selected.investigation.final_analysis && (
       <div className="border-2 border-[#b88618] rounded-xl p-5">
        <h3 className="font-black text-xl mb-3">التحليل النهائي</h3><p className="font-bold">{selected.investigation.final_analysis.summary}</p>
        <div className="mt-4 space-y-3">
         {(selected.investigation.final_analysis.options||[]).map((o:any,i:number)=><div key={i} className="border rounded-xl p-4"><div className="font-black">{o.penalty}</div><div className="text-sm mt-1"><b>الأساس النظامي:</b> {o.basis}</div><div className="text-sm mt-1"><b>متى يُبحث:</b> {o.when}</div></div>)}
        </div>
        <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm"><b>ضوابط نظامية:</b><ul className="list-disc pr-5 mt-2 space-y-1">{(selected.investigation.final_analysis.legalControls||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>
       </div>
      )}
      {message && <div className="mt-4 p-3 border rounded-xl font-bold">{message}</div>}
     </section>
    )}
   </div>
  </main>
 )
}