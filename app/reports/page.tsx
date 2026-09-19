'use client'
import Link from 'next/link'
import {FileText,Printer,RefreshCw} from 'lucide-react'
import {useEffect,useState} from 'react'
type Row={id:string;full_name:string;request_id:string}
export default function ReportsPage(){
 const[candidates,setCandidates]=useState<Row[]>([]),[onboarding,setOnboarding]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/reports/data',{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error||'تعذر تحميل التقارير');setCandidates(b.candidates||[]);setOnboarding(b.onboarding||[])}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل التقارير')}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const ReportRow=({x,url,label}:{x:Row;url:string;label:string})=><div className="border rounded-xl p-4 flex items-center justify-between gap-4"><div><b>{x.full_name}</b><div className="text-sm text-slate-500">{label}</div></div><Link href={url} className="btn-primary rounded-xl px-4 py-2 font-bold inline-flex items-center gap-2"><Printer size={17}/> فتح التقرير الشامل</Link></div>
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-10"><div className="max-w-6xl mx-auto">
  <header className="flex items-center justify-between mb-7"><div><div className="text-[#b88618] font-bold">البنية الاساسية للمقاولات</div><h1 className="text-3xl font-black text-[#09233f]">التقارير</h1><p className="text-slate-500 mt-1">التقرير الشامل هو التقرير التفصيلي المعتمد لملف المرشح ويجمع بياناته وتقييماته المبدئية وجميع مراحل التقييم.</p></div><button onClick={load} className="border rounded-xl p-3"><RefreshCw size={19}/></button></header>
  {error&&<div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}
  {loading?<div className="card p-12 text-center">جاري تحميل التقارير...</div>:<div className="space-y-6">
   <section className="card p-6"><div className="flex items-center gap-3 mb-5"><FileText className="text-[#b88618]"/><h2 className="text-xl font-black text-[#09233f]">التقرير الشامل</h2></div>{candidates.length?<div className="space-y-3">{candidates.map((x,i)=><ReportRow key={`${x.id}-${i}`} x={x} url={`/reports/candidate/${x.id}`} label="بيانات المرشح + التقييم المبدئي + جميع تقييمات الإدارات"/>)}</div>:<p className="text-slate-500">لا توجد تقارير شاملة حتى الآن.</p>}</section>
   </div>}
  <div className="mt-6 bg-white border rounded-xl p-4 text-sm text-slate-600">التقارير مضبوطة للطباعة على A4. من نافذة الطباعة اختر <b>Save as PDF / حفظ كملف PDF</b>.</div>
 </div></main>
}