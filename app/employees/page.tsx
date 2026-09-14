'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Employee = { id:string; employee_number:string|null; full_name:string; job_title:string|null; department:string|null; project_name:string|null; work_location:string|null; employment_status:string; hire_date:string|null }

export default function EmployeesPage(){
 const [employees,setEmployees]=useState<Employee[]>([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const {data}=await supabase.from('employee_records').select('id,employee_number,full_name,job_title,department,project_name,work_location,employment_status,hire_date').order('created_at',{ascending:false}); setEmployees((data||[]) as Employee[]); setLoading(false)})()},[])
 const rows=useMemo(()=>employees.filter(e=>`${e.employee_number||''} ${e.full_name} ${e.job_title||''} ${e.department||''} ${e.project_name||''}`.toLowerCase().includes(search.toLowerCase())),[employees,search])
 return <main className="min-h-screen bg-[#f5f7fa]" dir="rtl"><div className="max-w-7xl mx-auto p-5 md:p-8">
  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center"><Users size={28}/></div><div><div className="text-sm text-[#b88618] font-bold">قسم رئيسي</div><h1 className="text-3xl font-black text-[#09233f]">ملفات الموظفين</h1><p className="text-slate-500 mt-1">السجل الفعلي للموظفين الذين باشروا العمل.</p></div></div><Link href="/" className="flex items-center gap-2 text-[#09233f] font-bold"><ArrowLeft size={18}/> الرئيسية</Link></header>
  <section className="card overflow-hidden"><div className="p-4 border-b"><div className="relative"><Search className="absolute right-3 top-3 text-slate-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="البحث بالاسم أو الرقم أو الوظيفة أو المشروع" className="w-full border rounded-xl pr-10 pl-3 py-2.5"/></div></div>
  {loading?<div className="p-10 text-center text-slate-500">جاري التحميل...</div>:rows.length===0?<div className="p-10 text-center text-slate-500">لا توجد ملفات موظفين حتى الآن. سيُنشأ السجل تلقائيًا عند تسجيل حالة «باشر العمل».</div>:<div className="overflow-auto"><table className="w-full min-w-[900px]"><thead className="bg-[#09233f] text-white"><tr><th className="p-3 text-right">الموظف</th><th className="p-3 text-right">الوظيفة</th><th className="p-3 text-right">القسم</th><th className="p-3 text-right">المشروع</th><th className="p-3 text-right">الموقع</th><th className="p-3 text-right">المباشرة</th><th className="p-3 text-right">الحالة</th></tr></thead><tbody>{rows.map(e=><tr key={e.id} className="border-b hover:bg-slate-50"><td className="p-3"><Link href={`/employees/${e.id}`} className="font-bold text-[#09233f] hover:underline">{e.full_name}</Link><div className="text-xs text-slate-500">{e.employee_number||'بدون رقم وظيفي'}</div></td><td className="p-3">{e.job_title||'—'}</td><td className="p-3">{e.department||'—'}</td><td className="p-3">{e.project_name||'—'}</td><td className="p-3">{e.work_location||'—'}</td><td className="p-3">{e.hire_date||'—'}</td><td className="p-3"><span className="rounded-full bg-green-50 text-green-700 px-3 py-1 text-sm font-bold">{e.employment_status}</span></td></tr>)}</tbody></table></div>}</section>
 </div></main>
}
