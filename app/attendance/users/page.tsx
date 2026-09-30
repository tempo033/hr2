'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Link2, RefreshCw, Search } from 'lucide-react'

type Data = { users:any[]; employees:any[]; mappings:any[] }

export default function AttendanceUsersPage() {
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [userId,setUserId]=useState('')
  const [employeeId,setEmployeeId]=useState('')
  const [query,setQuery]=useState('')
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null)

  async function load(){setLoading(true);const r=await fetch('/api/attendance/users',{cache:'no-store'});if(r.ok)setData(await r.json());setLoading(false)}
  useEffect(()=>{load()},[])
  const mappedUsers=new Set((data?.mappings||[]).filter(x=>x.is_active).map(x=>x.user_id))
  const mappedEmployees=new Set((data?.mappings||[]).filter(x=>x.is_active).map(x=>x.employee_id))
  const employees=useMemo(()=> (data?.employees||[]).filter(e=>!mappedEmployees.has(e.id)&&(!query||[e.full_name,e.employee_number,e.email,e.job_title,e.department].filter(Boolean).some((v:any)=>String(v).toLowerCase().includes(query.toLowerCase())))),[data,query])

  async function save(){
    setMessage(null)
    const r=await fetch('/api/attendance/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:userId,employee_id:employeeId})})
    const b=await r.json().catch(()=>({}))
    if(!r.ok){setMessage({ok:false,text:b.error||'تعذر تنفيذ الربط'});return}
    setMessage({ok:true,text:'تم ربط حساب المستخدم بالموظف بنجاح'})
    setUserId('');setEmployeeId('');await load()
  }

  return <main dir="rtl" className="p-5 md:p-8 space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div><div className="text-xs font-black tracking-widest text-[#b88618]">HR2 / ATTENDANCE</div><h1 className="mt-1 text-3xl font-black text-[#09233f]">ربط حسابات الحضور بالموظفين</h1><p className="mt-1 text-sm text-slate-500">ربط آمن مرة واحدة بين مستخدم HR2 وسجل الموظف الموجود مسبقاً.</p></div>
      <Link href="/attendance" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#09233f]"><ArrowRight size={17}/> الحضور والانصراف</Link>
    </div>
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">لا يتم إنشاء مستخدم جديد، ولا تعديل نظام الدخول الحالي، ولا إنشاء موظف جديد. التطبيق سيعتمد بعد الربط على هوية Supabase الحالية للمستخدم.</div>
    {message&&<div className={'rounded-xl p-3 text-sm font-bold '+(message.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700')}>{message.text}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#09233f]"><Link2 size={18}/> اختيار حساب HR2</h2>
        <select value={userId} onChange={e=>setUserId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <option value="">اختر مستخدماً نشطاً</option>
          {(data?.users||[]).filter(u=>!mappedUsers.has(u.user_id)).map(u=><option key={u.user_id} value={u.user_id}>{u.display_name||u.user_id} — {u.role}</option>)}
        </select>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-[#09233f]">اختيار الموظف</h2>
        <div className="relative mb-3"><Search className="absolute right-3 top-3 text-slate-400" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو الرقم الوظيفي" className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-3 text-sm"/></div>
        <select value={employeeId} onChange={e=>setEmployeeId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <option value="">اختر الموظف</option>
          {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} — {e.employee_number||'بدون رقم'}{e.job_title?' — '+e.job_title:''}</option>)}
        </select>
      </section>
    </div>
    <div className="flex justify-end"><button disabled={!userId||!employeeId||loading} onClick={save} className="rounded-xl bg-[#10233f] px-7 py-3 text-sm font-black text-white disabled:opacity-40">حفظ الربط</button></div>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b p-4"><h2 className="text-lg font-black text-[#09233f]">الربط الحالي</h2><button onClick={load} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><RefreshCw size={15}/> تحديث</button></div>
      {loading?<div className="p-8 text-center text-slate-500">جارٍ التحميل...</div>:<div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">حساب HR2</th><th className="p-3">الموظف</th><th className="p-3">الوظيفة</th><th className="p-3">تاريخ الربط</th></tr></thead><tbody>{(data?.mappings||[]).map(m=>{const u=data?.users.find(x=>x.user_id===m.user_id);const e=data?.employees.find(x=>x.id===m.employee_id);return <tr key={m.id} className="border-b last:border-0"><td className="p-3">{u?.display_name||m.user_id}</td><td className="p-3 font-bold">{e?.full_name||m.employee_id}<div className="text-xs text-slate-400">{e?.employee_number||'—'}</div></td><td className="p-3">{e?.job_title||'—'}</td><td className="p-3">{m.created_at?new Date(m.created_at).toLocaleDateString('ar-SA'):'—'}</td></tr>})}</tbody></table></div>}
    </section>
  </main>
}
