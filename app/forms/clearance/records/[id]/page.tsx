'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,Printer,RefreshCw} from 'lucide-react'

const stages:Record<string,string>={
  employee:'بيانات الموظف وتوقيع الموظف',
  managers:'المدير المباشر / مدير المشروع / مدير المشاريع',
  it:'إدارة الحاسب الآلي',
  transport:'إدارة الحركة',
  warehouse:'إدارة المستودعات',
  admin:'إدارة الشؤون الإدارية',
  finance:'الإدارة المالية',
  hr:'إدارة الموارد البشرية',
  senior:'الإدارة العليا — الاعتماد النهائي',
}

const employeeFields:[string,string][]=[
  ['الاسم','employee_name'],
  ['الجنسية','nationality'],
  ['رقم الهوية / الإقامة','national_id'],
  ['الإدارة / الموقع','department_location'],
  ['القسم','department'],
  ['المسمى الوظيفي','job_title'],
  ['آخر يوم عمل','last_work_date'],
  ['سبب الإخلاء','reason'],
]

const displayValue=(value:unknown)=>{
  if(typeof value==='boolean') return value?'نعم':'لا'
  if(value===null||value===undefined||value==='') return '—'
  if(typeof value==='object') return JSON.stringify(value)
  return String(value)
}

export default function ClearanceRecord({params}:{params:Promise<{id:string}>}){
  const [id,setId]=useState('')
  const [rec,setRec]=useState<any>(null)
  const [loading,setLoading]=useState(true)

  const load=async()=>{
    if(!id)return
    setLoading(true)
    try{
      const response=await fetch('/api/forms/records?id='+encodeURIComponent(id),{cache:'no-store'})
      const data=await response.json()
      if(!response.ok) throw new Error(data?.error||'تعذر تحميل ملف إخلاء الطرف')
      setRec(data.records?.[0]||null)
    }catch(error){
      console.error(error)
      setRec(null)
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void params.then(p=>setId(p.id))},[params])
  useEffect(()=>{void load()},[id])

  if(loading)return <main dir="rtl" className="p-10 text-center">جارٍ تحميل ملف إخلاء الطرف...</main>
  if(!rec)return <main dir="rtl" className="p-10 text-center">السجل غير موجود</main>

  const clearance=rec.form_data?.clearance||{}
  const employee=clearance.employee||{}

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5">
      <section className="a4 max-w-[210mm] mx-auto bg-white p-[10mm]">
        <div className="no-print flex justify-between mb-5">
          <Link href="/forms/clearance/records" className="font-bold inline-flex gap-2">
            <ArrowLeft size={17}/> العودة
          </Link>
          <div className="flex gap-2">
            <button onClick={()=>{void load()}} className="border rounded-lg px-3 py-2 font-bold">
              <RefreshCw size={15}/>
            </button>
            <button onClick={()=>window.print()} className="bg-[#b88618] text-white rounded-lg px-4 py-2 font-bold inline-flex gap-2">
              <Printer size={16}/> طباعة / PDF
            </button>
          </div>
        </div>

        <header className="text-center border-b-2 border-[#b88618] pb-4">
          <h1 className="text-2xl font-black text-[#09233f]">
            ملف إخلاء طرف — {displayValue(employee.employee_name||rec.employee_name)}
          </h1>
          <div className="text-[#b88618] font-bold">EMPLOYEE CLEARANCE — CONSOLIDATED FILE</div>
        </header>

        <div className="grid grid-cols-2 gap-3 mt-5">
          {employeeFields.map(([label,key])=>(
            <div className="fieldbox" key={key}>
              <b>{label}</b>
              <div>{displayValue(employee[key])}</div>
            </div>
          ))}
        </div>

        {Object.entries(stages).map(([stageKey,title])=>{
          const stageData:Record<string,unknown>=stageKey==='employee'
            ? employee
            : (clearance[stageKey]||{})
          const entries=Object.entries(stageData)

          return (
            <section className="stage" key={stageKey}>
              <h2>{title}</h2>

              <div className="grid grid-cols-2 gap-3">
                {entries
                  .filter(([key])=>!key.toLowerCase().includes('signature'))
                  .map(([key,value])=>(
                    <div className="text-sm" key={key}>
                      <b>{key}</b>
                      <div>{displayValue(value)}</div>
                    </div>
                  ))}
              </div>

              <div className="mt-3">
                {entries
                  .filter(([key,value])=>key.toLowerCase().includes('signature')&&Boolean(value))
                  .map(([key,value])=>(
                    <div key={key}>
                      <b>التوقيع</b>
                      <img
                        src={String(value)}
                        alt="توقيع"
                        className="h-16 max-w-[260px] object-contain"
                      />
                    </div>
                  ))}
              </div>
            </section>
          )
        })}

        <footer className="mt-8 border-t pt-5 font-bold text-center">
          (الأصل &nbsp;&nbsp;&nbsp; صورة لشؤون الموظفين &nbsp;&nbsp;&nbsp; صورة لملف المذكور &nbsp;&nbsp;&nbsp; صورة للحسابات)
        </footer>
      </section>

      <style>{'@page{size:A4 portrait;margin:8mm}.fieldbox{border:1px solid #d1d5db;border-radius:8px;padding:8px}.stage{margin-top:16px;border-top:2px solid #b88618;padding-top:8px}.stage h2{font-size:15px;font-weight:900;color:#09233f;margin-bottom:8px}@media print{.no-print{display:none!important}.a4{box-shadow:none!important;max-width:none!important;padding:0!important}}'}</style>
    </main>
  )
}
