'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {Copy,ExternalLink,RefreshCw,ArrowLeft} from 'lucide-react'
import {supabase} from '@/lib/supabase'

const stages:any={
  employee:'الموظف',
  managers:'المدير المباشر / مدير المشروع / مدير المشاريع',
  it:'إدارة الحاسب الآلي',
  transport:'إدارة الحركة',
  warehouse:'إدارة المستودعات',
  admin:'إدارة الشؤون الإدارية',
  finance:'الإدارة المالية',
  hr:'إدارة الموارد البشرية',
  senior:'الإدارة العليا — الاعتماد النهائي',
}

export default function ClearanceWorkflow(){
  const [employees,setEmployees]=useState<any[]>([])
  const [employeeId,setEmployeeId]=useState('')
  const [links,setLinks]=useState<any[]>([])
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')

  const load=async()=>{
    const {data}=await supabase
      .from('employee_records')
      .select('id,employee_number,full_name,department,job_title')
      .order('full_name')
    setEmployees(data||[])
  }

  useEffect(()=>{void load()},[])

  const create=async()=>{
    if(!employeeId)return
    setBusy(true)
    setMsg('')
    const response=await fetch('/api/forms/clearance/workflow',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({employee_id:employeeId}),
    })
    const data=await response.json()
    setBusy(false)
    if(!response.ok){
      setMsg(data.error||'تعذر إنشاء الروابط')
      return
    }
    setLinks(data.links||[])
    setMsg('تم إنشاء روابط إخلاء الطرف التسعة وربطها بملف الموظف.')
  }

  const copy=(token:string)=>{
    void navigator.clipboard?.writeText(location.origin+'/forms/public/'+token)
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <div>
            <div className="text-[#b88618] font-bold">مركز النماذج</div>
            <h1 className="text-3xl font-black text-[#09233f]">إخلاء الطرف — مسار الاعتمادات</h1>
            <p className="text-slate-500 mt-1">يتم إنشاء 9 روابط مستقلة لنفس الموظف، وكل رابط يصل إلى مرحلته فقط.</p>
          </div>
          <Link href="/forms" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2">
            <ArrowLeft size={17}/> مركز النماذج
          </Link>
        </header>

        <section className="bg-white border rounded-2xl p-5 mb-6">
          <label className="font-bold">
            اختيار الموظف
            <select
              className="block w-full mt-1.5 border border-slate-300 rounded-[10px] px-2.5 py-2.5 bg-white"
              value={employeeId}
              onChange={e=>setEmployeeId(e.target.value)}
            >
              <option value="">اختر الموظف...</option>
              {employees.map(employee=>(
                <option key={employee.id} value={employee.id}>
                  {employee.employee_number||'بدون رقم'} — {employee.full_name||'بدون اسم'}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!employeeId||busy}
            onClick={create}
            className="mt-4 bg-[#09233f] text-white rounded-xl px-6 py-2.5 font-bold disabled:opacity-50"
          >
            {busy?'جارٍ إنشاء الروابط...':'إنشاء روابط إخلاء الطرف'}
          </button>
          {msg&&<div className="mt-4 bg-emerald-50 text-emerald-800 p-3 rounded-xl">{msg}</div>}
        </section>

        {links.length>0&&(
          <section className="bg-white border rounded-2xl overflow-hidden">
            <div className="p-4 border-b font-black">الروابط التسعة</div>
            <div className="divide-y">
              {links.map(link=>{
                const url=location.origin+'/forms/public/'+link.token
                const stageKey=link.link_scope?.replace('clearance:','')
                const label=link.stage?.label||stages[stageKey]
                return (
                  <div key={link.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-[#09233f]">{label}</div>
                      <div className="text-xs text-slate-500">{link.link_scope}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={()=>copy(link.token)}
                        className="border rounded-lg px-3 py-2 font-bold inline-flex gap-1"
                      >
                        <Copy size={15}/> نسخ
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#b88618] text-white rounded-lg px-3 py-2 font-bold inline-flex gap-1"
                      >
                        <ExternalLink size={15}/> فتح
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="mt-5 flex gap-2">
          <Link href="/forms/clearance/records" className="text-[#b88618] font-bold">
            سجل إخلاء الطرف ←
          </Link>
          <button onClick={()=>{void load()}} className="text-[#09233f] font-bold inline-flex gap-1">
            <RefreshCw size={16}/> تحديث الموظفين
          </button>
        </div>
      </div>
    </main>
  )
}
