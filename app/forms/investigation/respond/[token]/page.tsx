'use client'
import {useEffect,useState} from 'react'
import {CheckCircle2} from 'lucide-react'
export default function Respond({params}:{params:{token:string}}){
 const [data,setData]=useState<any>(null),[answers,setAnswers]=useState<any[]>([]),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('')
 useEffect(()=>{fetch('/api/administrative-investigations?token='+params.token).then(r=>r.json()).then(d=>{if(d.error)setError(d.error);else{setData(d);setAnswers((d.party.questions||[]).map((q:string,i:number)=>({question:q,answer:d.party.answers?.[i]?.answer||''})))}})},[params.token])
 const save=async()=>{setBusy(true);const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.token,action:'employee-answer',answers})});const d=await r.json();setBusy(false);if(!r.ok)setError(d.error||'تعذر الإرسال');else setDone(true)}
 if(error)return <main dir="rtl" className="p-8 text-center">{error}</main>
 if(!data)return <main dir="rtl" className="p-8 text-center">جاري تحميل التحقيق...</main>
 return (
  <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8 text-[#09233f]"><div className="max-w-4xl mx-auto bg-white border rounded-2xl p-6">
   <header className="text-center border-b-2 border-[#b88618] pb-4"><div className="font-black text-2xl">شركة البنية الأساسية للمقاولات ذ.م.م</div><div className="font-black text-xl mt-4">محضر تحقيق إداري — أقوال الموظف</div><div className="text-xs text-slate-500 mt-1">خاص وسري</div></header>
   <div className="my-5 bg-slate-50 rounded-xl p-4"><b>الموظف:</b> {data.employee?.full_name}<br/><b>المسمى:</b> {data.employee?.job_title||'—'}<br/><b>موضوع التحقيق:</b> {data.investigation?.subject}</div>
   {done ? <div className="text-center py-12"><CheckCircle2 className="mx-auto text-green-600" size={55}/><h2 className="font-black text-2xl mt-4">تم إرسال أقوالك بنجاح</h2><p className="text-slate-500 mt-2">تم حفظ الرد وإحالته ضمن ملف التحقيق.</p></div> :
    <><div className="space-y-4">{answers.map((a,i)=><div key={i} className="border rounded-xl p-4"><div className="font-black mb-3">{i+1}. {a.question}</div><textarea rows={5} value={a.answer} onChange={e=>setAnswers(x=>x.map((v,j)=>j===i?{...v,answer:e.target.value}:v))} className="w-full border rounded-xl p-3" placeholder="اكتب إجابتك بالتفصيل..."/></div>)}</div><button disabled={busy||answers.some(a=>!a.answer.trim())} onClick={save} className="mt-5 bg-[#09233f] text-white rounded-xl px-7 py-3 font-black disabled:opacity-50">{busy?'جاري الإرسال...':'إرسال الأقوال'}</button></>}
  </div></main>
 )
}