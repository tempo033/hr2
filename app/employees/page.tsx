'use client'
import Link from 'next/link'
import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,Search,Users,Upload,RefreshCw,Trash2,CheckSquare,Square,Printer} from 'lucide-react'
type Employee={id:string;employee_number:string|null;full_name:string;nationality:string|null;national_id:string|null;residency_status:string|null;job_title:string|null;department:string|null;basic_salary:number|null;housing_allowance:number|null;transportation_allowance:number|null;other_allowances:number|null;total_salary_with_allowances:number|null;employment_status:string|null;hire_date:string|null}
export default function EmployeesPage(){
 const[employees,setEmployees]=useState<Employee[]>([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false)
 const load = async () => {
  setLoading(true)
  setError('')
  try {
   const r = await fetch('/api/employees/data', { cache: 'no-store' })
   const b = await r.json()
   if (!r.ok) throw new Error(b.error || 'تعذر تحميل الموظفين')
   setEmployees(b.employees || [])
   setSelected([])
  } catch (e) {
   setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const rows = useMemo(() => {
  const q = search.toLowerCase()
  return employees.filter((e) => {
   const text = [e.employee_number, e.full_name, e.job_title, e.department, e.national_id].filter(Boolean).join(' ')
   return text.toLowerCase().includes(q)
  })
 }, [employees, search])

 const allVisible = rows.length > 0 && rows.every((e) => selected.includes(e.id))

 const toggle = (id: string) => {
  setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
 }

 const selectVisible = () => {
  setSelected((current) => {
   if (allVisible) {
    const visibleIds = new Set(rows.map((e) => e.id))
    return current.filter((id) => !visibleIds.has(id))
   }
   return Array.from(new Set([...current, ...rows.map((e) => e.id)]))
  })
 }

 const deleteSelected = async (all = false) => {
  if (!all && selected.length === 0) return
  if (!confirm(all ? 'سيتم حذف جميع ملفات الموظفين. هل أنت متأكد؟' : 'سيتم حذف الموظفين المحددين. هل أنت متأكد؟')) return
  setBusy(true)
  try {
   const r = await fetch('/api/employees/import', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(all ? { all: true } : { ids: selected }),
   })
   const b = await r.json()
   if (!r.ok) throw new Error(b.error || 'تعذر الحذف')
   setEmployees((current) => all ? [] : current.filter((x) => !selected.includes(x.id)))
   setSelected([])
   alert('تم حذف ' + b.deleted + ' موظف')
  } catch (e) {
   alert(e instanceof Error ? e.message : 'تعذر الحذف')
  } finally {
   setBusy(false)
  }
 }
 return <main className="min-h-screen bg-[#f5f7fa]" dir="rtl"><div className="max-w-7xl mx-auto p-5 md:p-8">
 <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center"><Users size={28}/></div><div><div className="text-sm text-[#b88618] font-bold">إدارة الموارد البشرية</div><h1 className="text-3xl font-black text-[#09233f]">ملفات الموظفين</h1><p className="text-slate-500 mt-1">قائمة موحدة للموظفين مع التحديد الجماعي والاستيراد والتحديث دون تكرار.</p></div></div><div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl border bg-white px-4 py-2 font-bold inline-flex gap-2 items-center"><RefreshCw size={17}/> تحديث</button><Link href="/employees/import" className="rounded-xl bg-[#09233f] text-white px-4 py-2 font-bold inline-flex gap-2 items-center"><Upload size={17}/> استيراد / تحديث</Link><Link href="/" className="flex items-center gap-2 text-[#09233f] font-bold px-2"><ArrowLeft size={18}/> الرئيسية</Link></div></header>
 <section className="card overflow-hidden"><div className="p-4 border-b flex flex-col lg:flex-row gap-3 justify-between"><div className="relative flex-1"><Search className="absolute right-3 top-3 text-slate-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="البحث بالاسم أو الرقم أو الوظيفة أو الإقامة" className="w-full border rounded-xl pr-10 pl-3 py-2.5"/></div><div className="flex flex-wrap gap-2"><button onClick={selectVisible} className="rounded-xl border px-3 py-2 font-bold inline-flex gap-2 items-center">{allVisible?<CheckSquare size={17}/>:<Square size={17}/>} {allVisible?'إلغاء تحديد الظاهر':'تحديد الكل الظاهر'}</button><button onClick={()=>setSelected(employees.map(e=>e.id))} className="rounded-xl border px-3 py-2 font-bold">تحديد الكل</button><button disabled={!selected.length||busy} onClick={()=>deleteSelected(false)} className="rounded-xl border border-red-200 text-red-700 px-3 py-2 font-bold inline-flex gap-2 items-center"><Trash2 size={17}/> حذف المحدد ({selected.length})</button><button disabled={busy||!employees.length} onClick={()=>deleteSelected(true)} className="rounded-xl bg-red-700 text-white px-3 py-2 font-bold">حذف الكل</button></div></div>
 {loading?<div className="p-10 text-center text-slate-500">جاري التحميل...</div>:error?<div className="p-10 text-center text-red-600">{error}</div>:rows.length===0?<div className="p-10 text-center text-slate-500">لا توجد ملفات موظفين.</div>:<div className="overflow-auto"><table className="w-full min-w-[1750px]"><thead className="bg-[#09233f] text-white"><tr><th className="p-3"><input type="checkbox" checked={allVisible} onChange={selectVisible}/></th>{['الرقم الوظيفي','الاسم','الجنسية','رقم الهوية / الإقامة','تاريخ التعيين','الحالة','المسمى الوظيفي','الإدارة','الراتب الأساسي','بدل النقل','بدل السكن','البدلات الأخرى','الإجمالي','إجراء'].map(h=><th key={h} className="p-3 text-right">{h}</th>)}</tr></thead><tbody>{rows.map(e=><tr key={e.id} className={selected.includes(e.id)?'border-b bg-amber-50':'border-b hover:bg-slate-50'}><td className="p-3"><input type="checkbox" checked={selected.includes(e.id)} onChange={()=>toggle(e.id)}/></td><td className="p-3 font-bold">{e.employee_number||'—'}</td><td className="p-3"><Link href={'/employees/'+e.id} className="font-black text-[#09233f] hover:underline">{e.full_name}</Link></td><td className="p-3">{e.nationality||'—'}</td><td className="p-3">{e.national_id||'—'}</td><td className="p-3">{e.hire_date||'—'}</td><td className="p-3">{e.residency_status||e.employment_status||'—'}</td><td className="p-3">{e.job_title||'—'}</td><td className="p-3">{e.department||'—'}</td><td className="p-3">{e.basic_salary??'—'}</td><td className="p-3">{e.transportation_allowance??'—'}</td><td className="p-3">{e.housing_allowance??'—'}</td><td className="p-3">{e.other_allowances??'—'}</td><td className="p-3 font-bold">{e.total_salary_with_allowances??'—'}</td><td className="p-3"><div className="flex gap-2"><Link href={'/employees/'+e.id} className="rounded-lg bg-[#09233f] text-white px-3 py-1.5 font-bold">فتح الملف</Link><Link href={'/employees/'+e.id+'/print'} className="rounded-lg border px-3 py-1.5 font-bold inline-flex gap-1"><Printer size={15}/> طباعة</Link></div></td></tr>)}</tbody></table></div>}
 </section></div></main>
}