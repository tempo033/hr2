'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'
import {RefreshCw,FileText,Search,RotateCcw} from 'lucide-react'

type C=any

export default function RejectedCandidatesPage(){
 const[rows,setRows]=useState<C[]>([]),[requests,setRequests]=useState<C[]>([]),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/candidates/manage?status=rejected',{cache:'no-store'}),b=await r.json();if(!r.ok)throw new Error(b.error||'تعذر تحميل المرشحين غير المقبولين');setRows(b.candidates||[]);setRequests(b.requests||[])}catch(e){setError(e instanceof Error?e.message:'تعذر تحميل المرشحين غير المقبولين')}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const req=(id:string)=>requests.find(r=>r.id===id)
 const filtered=rows.filter(c=>String(c.full_name||'').toLowerCase().includes(q.trim().toLowerCase())||String(req(c.request_id)?.exact_type||'').toLowerCase().includes(q.trim().toLowerCase()))
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa]">
  <header className="bg-[#09233f] text-white px-6 py-5"><div className="max-w-7xl mx-auto flex justify-between items-center"><div><div className="text-[#d4a72c] font-bold">البنية الاساسية للمقاولات</div><h1 className="text-2xl font-black">المرشحون غير المقبولين</h1><p className="text-slate-300 text-sm mt-1">المرشحون الذين صدر بحقهم قرار عدم اعتماد أو رفض من المدير العام</p></div><button onClick={load} className="border border-white/20 rounded-xl p-3" title="تحديث"><RefreshCw size={18}/></button></div></header>
  <div className="max-w-7xl mx-auto p-5 md:p-8">{error&&<div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}
   <div className="relative mb-6"><Search className="absolute right-4 top-3.5 text-slate-400" size={20}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث باسم المرشح أو الوظيفة..." className="input pr-12 w-full"/></div>
   {loading?<div className="card p-12 text-center">جاري تحميل القائمة...</div>:<div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-right"><thead className="bg-slate-50 border-b"><tr><th className="p-4">المرشح</th><th className="p-4">الوظيفة</th><th className="p-4">الجوال</th><th className="p-4">الحالة</th><th className="p-4">الإجراء</th></tr></thead><tbody>{filtered.map(c=>{const r=req(c.request_id);const href=r?'/requests/'+r.id+'/candidates/'+c.id:'/candidate/'+c.share_token;return <tr key={c.id} className="border-b hover:bg-slate-50"><td className="p-4 font-black text-[#09233f]">{c.full_name||'—'}</td><td className="p-4">{r?.exact_type||'—'}</td><td className="p-4">{c.phone||'—'}</td><td className="p-4"><span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">{c.status||'مرفوض'}</span></td><td className="p-4"><Link href={href} className="bg-[#09233f] text-white rounded-xl px-3 py-2 font-bold inline-flex items-center gap-1"><FileText size={15}/> فتح ملف المرشح</Link></td></tr>})}</tbody></table></div>{!filtered.length&&<div className="p-12 text-center text-slate-500">لا يوجد مرشحون غير مقبولين حالياً.</div>}</div>}
   <div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>إجمالي المرشحين غير المقبولين: <b>{rows.length}</b></span><Link href="/candidates" className="inline-flex items-center gap-2 text-[#09233f] font-bold"><RotateCcw size={16}/> العودة إلى المرشحين</Link></div>
  </div>
 </main>
}
