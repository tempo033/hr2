'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, ArrowLeft, Search, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Request = { id: string; request_type: string; exact_type: string; status: string; created_at: string }
type Candidate = { id: string; request_id: string; status: string }

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]); const [candidates, setCandidates] = useState<Candidate[]>([])
  const [q, setQ] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = async () => { setLoading(true); setError(''); if (!supabase) { setError('لم يتم إعداد اتصال Supabase.'); setLoading(false); return }
    const [{ data: rs, error: re }, { data: cs }] = await Promise.all([supabase.from('requests').select('id,request_type,exact_type,status,created_at').order('created_at',{ascending:false}),supabase.from('candidates').select('id,request_id,status')]);
    if(re)setError(re.message); setRequests(rs||[]); setCandidates(cs||[]); setLoading(false)
  }
  useEffect(()=>{load()},[])
  const remove = async (id:string) => { if(!supabase || !window.confirm('سيتم حذف الطلب وجميع البيانات التابعة له. هل تريد المتابعة؟')) return; setError('');
    const {error:e}=await supabase.rpc('delete_request_cascade',{p_request_id:id});
    if(e){ setError(e.message); return } await load()
  }
  const filtered=requests.filter(r=>`${r.request_type} ${r.exact_type} ${r.status}`.includes(q.trim()))
  return <main className="min-h-screen" dir="rtl"><header className="bg-[#09233f] text-white px-6 py-5"><div className="max-w-6xl mx-auto flex justify-between items-center"><div><div className="text-[#d4a72c] font-bold">البنية الاساسية للمقاولات</div><h1 className="text-xl font-bold">طلبات الموارد البشرية</h1></div><div className="flex gap-2"><button onClick={load} className="border border-white/20 rounded-xl px-3 py-2"><RefreshCw size={18}/></button><Link href="/requests/new" className="btn-gold rounded-xl px-4 py-2 font-bold flex gap-2 items-center"><Plus size={18}/> طلب جديد</Link></div></div></header>
    <div className="max-w-6xl mx-auto p-6 md:p-10"><div className="relative mb-6"><Search className="absolute right-4 top-3.5 text-slate-400" size={20}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث في الطلبات..." className="input pr-12"/></div>{error&&<div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}
      {loading?<div className="card p-12 text-center text-slate-500">جاري تحميل الطلبات...</div>:filtered.length?<div className="space-y-4">{filtered.map(req=>{const count=candidates.filter(c=>c.request_id===req.id).length;return <div key={req.id} className="card p-6 hover:border-[#b88618]"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5"><Link href={`/requests/${req.id}`} className="min-w-0 flex-1"><div className="flex gap-2 mb-2"><span className="bg-amber-100 text-[#8a6410] px-3 py-1 rounded-full text-xs font-bold">{req.request_type}</span><span className="bg-slate-100 px-3 py-1 rounded-full text-xs">{req.status}</span></div><h2 className="text-xl font-bold text-[#09233f]">{req.exact_type}</h2><p className="text-sm text-slate-500 mt-2">{count} مرشح • {new Date(req.created_at).toLocaleDateString('ar-SA')}</p></Link><div className="flex items-center gap-2"><Link href={`/requests/${req.id}/edit`} className="rounded-xl border border-[#b88618] text-[#8a6410] px-4 py-2 font-bold inline-flex items-center gap-2"><Pencil size={17}/> تعديل</Link><button onClick={()=>remove(req.id)} className="rounded-xl border border-red-200 text-red-600 px-4 py-2 font-bold inline-flex items-center gap-2"><Trash2 size={17}/> حذف</button><Link href={`/requests/${req.id}`} className="text-[#b88618] font-bold inline-flex items-center gap-1">إدارة الطلب <ArrowLeft size={18}/></Link></div></div></div>})}</div>:<div className="card p-12 text-center text-slate-500">لا توجد طلبات حالياً. أنشئ أول طلب للبدء.</div>}
      <div className="mt-8 grid sm:grid-cols-3 gap-4"><div className="card p-5"><div className="text-slate-500 text-sm">إجمالي الطلبات</div><div className="text-3xl font-bold text-[#09233f] mt-2">{requests.length}</div></div><div className="card p-5"><div className="text-slate-500 text-sm">إجمالي المرشحين</div><div className="text-3xl font-bold text-[#09233f] mt-2">{candidates.length}</div></div><div className="card p-5"><div className="text-slate-500 text-sm">الطلبات المفتوحة</div><div className="text-3xl font-bold text-[#09233f] mt-2">{requests.filter(r=>r.status==='مفتوح').length}</div></div></div>
    </div></main>
}
