'use client'
import Link from 'next/link'
import {ClipboardList,ArrowRight,RefreshCw} from 'lucide-react'
import {useEffect,useState} from 'react'
type Row={id:string;full_name:string;request_id:string;status?:string;evaluated_at?:string;evaluation_source?:string}
export default function InitialReportsPage(){
 const[rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{
  setLoading(true);setError('')
  try{
   const r=await fetch('/api/reports/data',{cache:'no-store'})
   const b=await r.json()
   if(!r.ok)throw new Error(b.error||'تعذر تحميل تقارير التقييم المبدئي')
   setRows(b.candidates||[])
  }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل التقارير')}
  finally{setLoading(false)}
 }
 useEffect(()=>{
  load()
  const timer=window.setInterval(load,15000)
  return()=>window.clearInterval(timer)
 },[])
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-10"><div className="max-w-6xl mx-auto">
  <header className="flex items-center justify-between mb-7">
   <div><div className="text-[#b88618] font-bold">قسم التقييم</div><h1 className="text-3xl font-black text-[#09233f]">تقارير التقييم المبدئي</h1><p className="text-slate-500 mt-1">يظهر المرشح هنا فور إكمال بياناته، دون تكرار المرشح أكثر من مرة.</p></div>
   <button onClick={load} className="border rounded-xl p-3" title="تحديث"><RefreshCw size={19}/></button>
  </header>
  {error&&<div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}
  {loading?<div className="card p-12 text-center">جاري تحميل المرشحين الذين أكملوا بياناتهم...</div>:rows.length?<section className="card overflow-hidden">
   <div className="p-5 border-b"><h2 className="font-black text-xl text-[#09233f]">{rows.length} مرشح</h2></div>
   <div className="divide-y">{rows.map(x=><div key={x.id} className="p-4 flex items-center justify-between gap-4">
    <div><div className="font-black text-[#09233f]">{x.full_name}</div><div className="text-sm text-slate-500">{x.evaluation_source||'تم إكمال بيانات المرشح'}</div><div className="text-xs text-emerald-700 mt-1">تاريخ الإكمال: {x.evaluated_at ? new Date(x.evaluated_at).toLocaleString('ar-SA') : 'غير محدد'}</div></div>
    <Link href={`/reports/initial/${x.id}`} className="bg-[#b88618] text-white rounded-xl px-4 py-2 font-bold inline-flex items-center gap-2"><ClipboardList size={17}/> فتح التقرير</Link>
   </div>)}</div>
  </section>:<div className="card p-12 text-center text-slate-500">لا يوجد مرشحون أكملوا بياناتهم حتى الآن.</div>}
  <Link href="/reports" className="mt-5 inline-flex items-center gap-2 text-[#09233f] font-bold"><ArrowRight size={18}/> العودة إلى التقارير</Link>
 </div></main>
}