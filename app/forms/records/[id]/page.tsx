'use client'
import {useEffect,useState} from 'react'
import {useParams,useRouter} from 'next/navigation'
import Link from 'next/link'
import {ArrowLeft,Edit3,Trash2,Printer,Save,FileDown} from 'lucide-react'
import RequestForm,{config} from '@/app/forms/shared/RequestForm'

type Kind='leave'|'clearance'|'advance'
type Row={id:string;form_type:Kind;employee_name:string|null;employee_number:string|null;department:string|null;job_title:string|null;status:string;form_data:Record<string,string>;last_ip_address:string|null;last_device_name:string|null;updated_at:string}

export default function RecordDetail(){
 const {id}=useParams<{id:string}>();const router=useRouter();const [row,setRow]=useState<Row|null>(null);const [form,setForm]=useState<Record<string,string>>({});const [edit,setEdit]=useState(false);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false)
 useEffect(()=>{if(!id)return;fetch('/api/forms/records?id='+encodeURIComponent(id),{cache:'no-store'}).then(r=>r.json()).then(d=>{const x=d.records?.[0] as Row|undefined;if(x){setRow(x);setForm(x.form_data||{})}}).finally(()=>setLoading(false))},[id])
 const save=async()=>{setBusy(true);const r=await fetch('/api/forms/records?id='+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({form,status:row?.status})});const d=await r.json();if(!r.ok){alert(d.error||'تعذر حفظ التعديل')}else{setRow(x=>x?{...x,form_data:d.record.form_data,employee_name:d.record.employee_name,employee_number:d.record.employee_number,department:d.record.department,job_title:d.record.job_title,updated_at:d.record.updated_at}:x);setEdit(false)}setBusy(false)}
 const del=async()=>{if(!confirm('هل أنت متأكد من حذف هذا النموذج؟ لا يمكن التراجع عن الحذف.'))return;setBusy(true);const r=await fetch('/api/forms/records?id='+encodeURIComponent(id),{method:'DELETE'});if(r.ok)router.back();else{const d=await r.json();alert(d.error||'تعذر الحذف')}setBusy(false)}
 if(loading)return <main className="p-10 text-center">جارٍ تحميل النموذج...</main>
 if(!row||!config[row.form_type])return <main className="p-10 text-center text-red-700">النموذج غير موجود.</main>
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
  <div className="max-w-[1100px] mx-auto">
   <header className="print-hidden flex flex-wrap items-center justify-between gap-3 mb-5"><div><div className="text-[#b88618] font-bold">سجل النماذج / {config[row.form_type].title}</div><h1 className="text-3xl font-black text-[#09233f]">عرض النموذج</h1></div><div className="flex flex-wrap gap-2"><Link href="/forms/records" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ArrowLeft size={16}/> السجل</Link>{!edit&&<button onClick={()=>setEdit(true)} className="bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2"><Edit3 size={16}/> تعديل</button>}{edit&&<button disabled={busy} onClick={save} className="bg-green-700 text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2"><Save size={16}/> حفظ التعديل</button>}<button disabled={busy} onClick={del} className="bg-red-700 text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2"><Trash2 size={16}/> حذف</button><button onClick={()=>window.print()} className="bg-[#b88618] text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2"><Printer size={16}/> طباعة</button><button onClick={()=>window.print()} className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2"><FileDown size={16}/> تصدير PDF</button></div></header>
   <div className="print-hidden bg-white border rounded-xl p-4 mb-4 text-sm grid md:grid-cols-4 gap-3"><div><b>الموظف:</b> {row.employee_name||'—'}</div><div><b>الرقم:</b> {row.employee_number||'—'}</div><div><b>الجهاز:</b> {row.last_device_name||'—'}</div><div><b>IP:</b> {row.last_ip_address||'—'}</div></div>
   <div className={edit?'':'pointer-events-none'}><RequestForm kind={row.form_type} initialData={form} readOnly={!edit} recordEdit={edit}/></div>
  </div>
 </main>
}
