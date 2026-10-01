'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock3, LogIn, LogOut, RefreshCw, Search, Users, FileSpreadsheet } from 'lucide-react'

type RecordRow = {
  id:string; employee_id:string; attendance_date:string; attendance_type:'check_in'|'check_out'
  server_timestamp:string; device_id:string|null; latitude:number|null; longitude:number|null
  verification_status:string
  employee?: { id:string; employee_number:string|null; full_name:string; job_title:string|null; department:string|null; company?:{name:string}|null }
}

type Payload = {
  date:string
  summary:{operations:number;present_now:number;checked_in:number;checked_out:number}
  records:RecordRow[]
  employees:any[]
}

function time(v:string|null){return v?new Date(v).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'}):'—'}

export default function AttendancePage(){
  const [data,setData]=useState<Payload|null>(null)
  const [loading,setLoading]=useState(true)
  const [query,setQuery]=useState('')
  const [mode,setMode]=useState<'live'|'employees'>('live')

  async function load(){
    setLoading(true)
    const r=await fetch('/api/attendance/records',{cache:'no-store'})
    if(r.ok)setData(await r.json())
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const rows=useMemo(()=>{
    if(!data)return []
    const q=query.trim().toLowerCase()
    return data.records.filter(r=>!q || [r.employee?.full_name,r.employee?.employee_number,r.employee?.department,r.employee?.job_title].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))
  },[data,query])

  return <main dir="rtl" className="p-5 md:p-8 space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div><div className="text-xs font-black tracking-widest text-[#b88618]">HR2 / ATTENDANCE</div><h2 className="mt-1 text-3xl font-black text-[#09233f]">الحضور والانصراف</h2><p className="mt-1 text-sm text-slate-500">بيانات الحضور الواردة من تطبيق HR2 Attendance Mobile.</p><a href="/attendance/users" className="mt-3 inline-flex items-center rounded-xl bg-[#10233f] px-4 py-2 text-sm font-black text-white">ربط حساب الموظف بتطبيق الحضور</a></div>
      <div className="flex flex-wrap gap-2"><a href="/payroll/attendance" className="inline-flex items-center gap-2 rounded-xl bg-[#10233f] px-4 py-2.5 text-sm font-extrabold text-white"><FileSpreadsheet size={17}/> شيت البصمة الشهري ومسيرات الرواتب</a><button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-[#09233f]"><RefreshCw size={17}/> تحديث</button></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        ['حاضر الآن',data?.summary.present_now||0,Users],
        ['سجل حضور',data?.summary.checked_in||0,LogIn],
        ['سجل انصراف',data?.summary.checked_out||0,LogOut],
        ['آخر العمليات',data?.summary.operations||0,Activity],
      ].map(([label,value,Icon])=>{const I=Icon as any;return <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{label as string}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#10233f] text-white"><I size={18}/></span></div><div className="mt-4 text-3xl font-black text-[#09233f]">{value as number}</div></div>})}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2"><button onClick={()=>setMode('live')} className={`rounded-xl px-4 py-2 text-sm font-black ${mode==='live'?'bg-[#10233f] text-white':'bg-slate-100 text-slate-600'}`}>Live Attendance</button><button onClick={()=>setMode('employees')} className={`rounded-xl px-4 py-2 text-sm font-black ${mode==='employees'?'bg-[#10233f] text-white':'bg-slate-100 text-slate-600'}`}>الموظفون</button></div>
        <div className="relative w-full md:w-80"><Search className="absolute right-3 top-3 text-slate-400" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالاسم أو الرقم الوظيفي" className="w-full rounded-xl border border-slate-200 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-[#b88618]"/></div>
      </div>
      {loading?<div className="p-10 text-center text-slate-500">جارٍ تحميل سجل الحضور...</div>:mode==='live'?<div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">الموظف</th><th className="p-3">الشركة</th><th className="p-3">العملية</th><th className="p-3">الوقت</th><th className="p-3">التحقق</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b last:border-0"><td className="p-3"><b>{r.employee?.full_name||'—'}</b><div className="text-xs text-slate-400">{r.employee?.employee_number||'—'}</div></td><td className="p-3">{r.employee?.company?.name||'غير محددة'}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${r.attendance_type==='check_in'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{r.attendance_type==='check_in'?'تسجيل حضور':'تسجيل انصراف'}</span></td><td className="p-3 font-bold">{time(r.server_timestamp)}</td><td className="p-3">{r.verification_status==='server_verified'?'متحقق خادمي':'قيد التحقق'}</td></tr>)}</tbody></table></div>:<div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b bg-slate-50 text-slate-500"><th className="p-3">الموظف</th><th className="p-3">الشركة</th><th className="p-3">الحضور</th><th className="p-3">الانصراف</th><th className="p-3">الحالة</th></tr></thead><tbody>{data?.employees.filter(e=>!query||[e.full_name,e.employee_number,e.department,e.job_title].filter(Boolean).some((v:any)=>String(v).toLowerCase().includes(query.toLowerCase()))).map(e=><tr key={e.id} className="border-b last:border-0"><td className="p-3"><b>{e.full_name}</b><div className="text-xs text-slate-400">{e.employee_number||'—'}</div></td><td className="p-3">{e.company?.name||'غير محددة'}</td><td className="p-3 font-bold">{time(e.check_in)}</td><td className="p-3 font-bold">{time(e.check_out)}</td><td className="p-3">{e.check_out?'مكتمل':e.check_in?'حاضر':'—'}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="flex items-center gap-2 text-xs text-slate-400"><Clock3 size={14}/> المرجع الزمني للعمليات هو وقت الخادم، وليس ساعة جهاز الموظف.</div>
  </main>
}
