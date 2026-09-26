'use client'

import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,FileCheck2} from 'lucide-react'
import RequestForm from '@/app/forms/shared/RequestForm'

export default function AdvanceOfficialRecord({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState(''),[rec,setRec]=useState<any>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{void params.then(p=>setId(p.id))},[params])
 useEffect(()=>{if(!id)return;fetch('/api/forms/records?id='+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.json()).then(d=>setRec(d.records?.[0]||null)).finally(()=>setLoading(false))},[id])
 if(loading)return <main dir="rtl" className="p-10 text-center">جارٍ تحميل طلب السلفة...</main>
 if(!rec)return <main dir="rtl" className="p-10 text-center text-red-700">طلب السلفة غير موجود.</main>
 const f=rec.form_data||{},ea=f.advance_employee_approval||{},a=f.advance_approvals||{}
 const approvals={employee:{name:ea.employee_name,date:ea.employee_date,signature:ea.employee_signature},hr:{name:a.hr?.approval_name,date:a.hr?.approval_date,signature:a.hr?.approval_signature},finance:{name:a.finance?.approval_name,date:a.finance?.approval_date,signature:a.finance?.approval_signature},general_manager:{name:a.general_manager?.approval_name,date:a.general_manager?.approval_date,signature:a.general_manager?.approval_signature}}
 const complete=Object.values(approvals).every((x:any)=>x.name&&x.date&&x.signature)
 return <main dir="rtl" className="min-h-screen bg-[#ececec] py-6">
  <div className="print-toolbar max-w-[900px] mx-auto mb-4 flex justify-between items-center gap-2">
   <Link href="/forms/advance/records" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ArrowLeft size={17}/> طلبات السلف</Link>
   <div className="flex gap-2"><span className={complete?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}>{complete?'مكتمل الاعتماد':'قيد الاعتماد'}</span><button disabled={!complete} onClick={()=>window.print()} className="rounded-xl bg-[#b88618] text-white px-5 py-2 font-bold inline-flex gap-2 disabled:opacity-40"><FileCheck2 size={17}/>تصدير PDF</button></div>
  </div>
  <RequestForm kind="advance" initialData={f} readOnly approvalData={approvals}/>
 </main>
}

