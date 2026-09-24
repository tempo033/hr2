'use client'
import {useEffect,useState} from 'react'
import {CheckCircle2} from 'lucide-react'
export default function Review({params}:{params:{token:string}}){
 const [data,setData]=useState<any>(null),[opinion,setOpinion]=useState(''),[name,setName]=useState(''),[dept,setDept]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('')
 useEffect(()=>{fetch('/api/administrative-investigations?reviewToken='+params.token).then(r=>r.json()).then(d=>{if(d.error)setError(d.error);else{setData(d);setOpinion(d.review?.opinion||'');setName(d.review?.reviewer_name||'');setDept(d.review?.department_name||'')}})},[params.token])
 const save=async()=>{setBusy(true);const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.token,action:'management-opinion',opinion,reviewer_name:name,department_name:dept})});const d=await r.json();setBusy(false);if(!r.ok)setError(d.error||'تعذر الإرسال');else setDone(true)}
 if(error)return <main dir="rtl" className="p-8 text-center">{error}</main>
 if(!data)return <main dir="rtl" className="p-8 text-center">جاري تحميل التحقيق...</main>
 return (
  <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8 text-[#09233f]"><div className="max-w-5xl mx-auto bg-white border rounded-2xl p-6">
   <header className="text-center border-b-2 border-[#b88618] pb-4"><div className="font-black text-2xl">شركة البنية الأساسية للمقاولات ذ.م.م</div><div className="font-black text-xl mt-4">رأي الإدارة المختصة في تحقيق إداري</div><div className="text-xs text-slate-500 mt-1">خاص وسري — للاطلاع على أقوال الموظفين وإبداء الرأي</div></header>
   <div className="my-5 bg-slate-50 rounded-xl p-4"><b>موضوع التحقيق:</b> {data.investigation?.subject}</div>
   <h2 className="font-black text-xl mb-3">أقوال الموظفين</h2>
   {(data.parties||[]).map((p:any,i:number)=><div key={p.id} className="border rounded-xl p-4 mb-3"><div className="font-black mb-2">{p.employee?.full_name||'الموظف '+(i+1)}</div>{(p.questions||[]).map((q:string,j:number)=><div key={j} className="mb-3"><div className="font-bold">{j+1}. {q}</div><div className="mt-1 p-3 bg-slate-50 rounded-lg whitespace-pre-wrap">{p.answers?.[j]?.answer||'لم تتم الإجابة بعد'}</div></div>)}</div>)}
   {done ? <div className="text-center py-10"><CheckCircle2 className="mx-auto text-green-600" size={50}/><h2 className="font-black text-xl mt-3">تم إرسال رأي الإدارة</h2></div> :
    <><div className="grid md:grid-cols-2 gap-4 mt-5"><input value={dept} onChange={e=>setDept(e.target.value)} placeholder="اسم الإدارة المختصة" className="border rounded-xl p-3"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="اسم المسؤول" className="border rounded-xl p-3"/></div><textarea value={opinion} onChange={e=>setOpinion(e.target.value)} rows={8} placeholder="رأي الإدارة في الوقائع، مدى ثبوت المخالفة، أثرها على المشروع، مسؤولية كل طرف، والمقترح الإداري..." className="w-full border rounded-xl p-4 mt-4"/><button disabled={busy||!opinion.trim()} onClick={save} className="mt-4 bg-[#09233f] text-white rounded-xl px-7 py-3 font-black disabled:opacity-50">{busy?'جاري الإرسال...':'إرسال رأي الإدارة'}</button></>}
  </div></main>
 )
}