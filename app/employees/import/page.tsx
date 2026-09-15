'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Download, Upload, Users } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

const columns = ['الرقم الوظيفي','الاسم','الجنسية','رقم الاقامة','تاريخ التعيين','حالة العامل','الراتب الاساسي','بدل النقل','بدل السكن','البدلات الاخري','اجمالي الراتب مع البدلات']

function normalize(v: unknown) {
  return String(v ?? '').trim().toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ')
}
function money(v: unknown) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/,/g,''))
  return Number.isFinite(n) ? n : null
}
function excelDate(v: unknown) {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0,10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return s || null
}

export default function EmployeeImportPage() {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [preview,setPreview]=useState<any[]>([])

  const downloadTemplate=()=>{
    const ws=XLSX.utils.aoa_to_sheet([columns,['EMP-1001','محمد أحمد','مصري','1234567890','2026-01-01','على كفالة الشركة',5000,500,1000,250,6750]])
    ws['!cols']=columns.map(()=>({wch:24}))
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'بيانات الموظفين'); XLSX.writeFile(wb,'نموذج_ملفات_الموظفين.xlsx')
  }

  const importFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return
    setBusy(true); setMessage(''); setPreview([])
    try {
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const rows=XLSX.utils.sheet_to_json<any[]>(ws,{header:1,defval:''})
      if(rows.length<2) throw new Error('الملف لا يحتوي على بيانات.')
      const headers=(rows[0]||[]).map(normalize)
      const find=(name:string)=>headers.findIndex(h=>h===normalize(name))
      const idx=columns.map(find)
      const missing=columns.filter((_,i)=>idx[i]<0)
      if(missing.length) throw new Error(`الأعمدة التالية مفقودة: ${missing.join('، ')}`)
      const data=rows.slice(1).filter(r=>String(r[idx[0]]||'').trim() || String(r[idx[1]]||'').trim()).map(r=>({
        employee_number:String(r[idx[0]]||'').trim()||null,
        full_name:String(r[idx[1]]||'').trim(), nationality:String(r[idx[2]]||'').trim()||null,
        national_id:String(r[idx[3]]||'').trim()||null, hire_date:excelDate(r[idx[4]]),
        employment_status:String(r[idx[5]]||'').trim()||'على كفالة الشركة',
        residency_status:String(r[idx[5]]||'').trim()||null,
        basic_salary:money(r[idx[6]]), transportation_allowance:money(r[idx[7]]), housing_allowance:money(r[idx[8]]), other_allowances:money(r[idx[9]]), total_salary_with_allowances:money(r[idx[10]])
      }))
      setPreview(data.slice(0,8))
      if(!data.length) throw new Error('لم يتم العثور على صفوف صالحة.')
      const invalid=data.findIndex(x=>!x.full_name)
      if(invalid>=0) throw new Error(`الصف ${invalid+2} يحتاج إلى اسم موظف.`)
      const {error}=await supabase.from('employee_records').upsert(data,{onConflict:'employee_number'})
      if(error) throw error
      setMessage(`تم استيراد ${data.length} موظف بنجاح وتحديث السجلات الموجودة بنفس الرقم الوظيفي.`)
    } catch(err:any) { setMessage(`تعذر الاستيراد: ${err?.message||'خطأ غير معروف'}`) }
    finally { setBusy(false); e.target.value='' }
  }

  return <main dir="rtl" className="min-h-screen bg-[#f5f7fa]"><div className="max-w-6xl mx-auto p-5 md:p-8">
    <header className="flex items-center justify-between mb-7"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center"><Users/></div><div><div className="text-sm text-[#b88618] font-bold">ملفات الموظفين</div><h1 className="text-3xl font-black text-[#09233f]">استيراد بيانات الموظفين من Excel</h1></div></div><Link href="/employees" className="font-bold text-[#09233f] inline-flex gap-2 items-center"><ArrowLeft size={18}/> الموظفون</Link></header>
    <section className="card p-6"><div className="flex flex-wrap gap-3"><button onClick={downloadTemplate} className="rounded-xl border px-5 py-3 font-bold inline-flex items-center gap-2"><Download size={18}/> تنزيل نموذج Excel</button><label className="rounded-xl bg-[#09233f] text-white px-5 py-3 font-bold inline-flex items-center gap-2 cursor-pointer"><Upload size={18}/>{busy?'جاري الاستيراد...':'اختيار ملف Excel'}<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={importFile} disabled={busy}/></label></div><p className="text-sm text-slate-500 mt-4">استخدم الصف الأول لعناوين الأعمدة كما في النموذج. الاستيراد يحدّث الموظف عند تطابق الرقم الوظيفي، ويضيف موظفًا جديدًا عند عدم وجوده.</p>{message&&<div className="mt-4 rounded-xl border p-4 font-bold">{message}</div>}{preview.length>0&&<div className="mt-6 overflow-auto"><table className="w-full text-sm"><thead className="bg-[#09233f] text-white"><tr>{columns.map(c=><th key={c} className="p-2 text-right whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{preview.map((r,i)=><tr key={i} className="border-b">{[r.employee_number,r.full_name,r.nationality,r.national_id,r.hire_date,r.employment_status,r.basic_salary,r.transportation_allowance,r.housing_allowance,r.other_allowances,r.total_salary_with_allowances].map((v,j)=><td key={j} className="p-2 whitespace-nowrap">{v??'—'}</td>)}</tr>)}</tbody></table></div>}</section>
  </div></main>
}
