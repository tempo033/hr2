'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, ExternalLink, Copy, CheckCircle2, X, FileText, Building2, BriefcaseBusiness, UserRound, Link2 } from 'lucide-react'

type Row = {
  id:string
  employee_name:string|null
  employee_number:string|null
  department:string|null
  job_title:string|null
  status:string
  updated_at:string
  employee_id?:string|null
  company?:{name?:string|null;unified_number?:string|null}|null
  links?:LinkRow[]
  form_data?:any
}

type LinkRow = {
  id:string
  token:string
  record_id:string
  link_scope:string|null
  status:string
  last_submitted_at?:string|null
  public_url?:string
}

const stageLabels:Record<string,string> = {
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

const stageOrder = ['employee','managers','it','transport','warehouse','admin','finance','hr','senior']

const stageData=(row:Row,key:string)=>{
  const clearance=row.form_data?.clearance||{}
  return key==='employee'?(clearance.employee||{}):(clearance[key]||{})
}
const stageSignatures=(stage:string,data:any)=>{
  if(stage==='employee') return data?.employee_signature?[data.employee_signature]:[]
  if(stage==='managers') return [data?.line_manager_signature,data?.project_manager_signature].filter(Boolean)
  if(stage==='senior') return data?.senior_signature?[data.senior_signature]:[]
  return data?.[stage+'_signature']?[data[stage+'_signature']]:[]
}
const stageDecision=(stage:string,data:any)=>{
  if(stage==='employee') return data?.employee_signature?'clear':'pending'
  if(stage==='managers') return data?.clearance_decision||'pending'
  if(stage==='senior') return data?.senior_decision||'pending'
  return data?.[stage+'_decision']||'pending'
}
const isClearanceComplete=(row:Row)=>{
  const clearance=row.form_data?.clearance||{}
  const employee=clearance.employee||{}
  const applicability=clearance.applicability||{}
  if(!employee.employee_signature) return false
  return stageOrder.slice(1).every(key=>{
    if(applicability[key]===false) return true
    const data=stageData(row,key)
    return stageSignatures(key,data).length>0 && stageDecision(key,data)==='clear'
  })
}

export default function Records(){
  const [rows,setRows] = useState<Row[]>([])
  const [creatingFinancial,setCreatingFinancial] = useState('')
  const [loading,setLoading] = useState(true)
  const [selected,setSelected] = useState<Row|null>(null)
  const [copied,setCopied] = useState('')
  const [error,setError] = useState('')

  const load = async() => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/forms/records?form_type=clearance',{cache:'no-store'})
      const d = await r.json().catch(()=>({}))
      if(!r.ok) throw new Error(d?.error || 'تعذر تحميل سجل إخلاء الطرف')
      setRows(Array.isArray(d.records) ? d.records : [])
    } catch(e:any) {
      setRows([])
      setError(e?.message || 'تعذر تحميل السجلات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ void load() },[])

  const selectedLinks = useMemo(
    ()=> (selected?.links || [])
      .filter(x=>x.link_scope?.startsWith('clearance:'))
      .sort((a,b)=>stageOrder.indexOf(String(a.link_scope).replace('clearance:',''))-stageOrder.indexOf(String(b.link_scope).replace('clearance:',''))),
    [selected]
  )

  const linkUrl = (x:LinkRow) => x.public_url || (typeof window !== 'undefined' ? window.location.origin : '') + '/forms/public/' + x.token

  const createFinancial = async(row:Row) => {\n    setCreatingFinancial(row.id); setError('')\n    try {\n      const r=await fetch('/api/financial-clearances',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clearance_record_id:row.id})})\n      const d=await r.json().catch(()=>({}))\n      if(!r.ok) throw new Error(d?.error||'تعذر إنشاء المخالصة المالية')\n      if(d?.clearance?.id) window.location.href='/financial-clearances/'+d.clearance.id\n    } catch(e:any){ setError(e?.message||'تعذر إنشاء المخالصة المالية') } finally { setCreatingFinancial('') }\n  }\n\n  const copy = async(url:string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      window.setTimeout(()=>setCopied(''),1800)
    } catch {
      setError('تعذر نسخ الرابط. يمكنك فتح الرابط ثم نسخه من شريط العنوان.')
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 md:py-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 text-xs font-extrabold tracking-[.16em] text-[#b88618]">FORMS / CLEARANCE</div>
              <h1 className="text-2xl font-black text-[#09233f] md:text-3xl">سجل إخلاء الطرف</h1>
              <p className="mt-2 text-sm text-slate-500">متابعة طلبات إخلاء الطرف، بيانات الموظف، وروابط جميع الإدارات المحفوظة لكل سجل.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/forms" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#09233f] hover:bg-slate-50">
                <ArrowLeft size={16}/> مركز النماذج
              </Link>
              <button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl bg-[#09233f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#123b61]">
                <RefreshCw size={16}/> تحديث السجل
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-black text-[#09233f]">طلبات إخلاء الطرف</h2>
              <p className="mt-1 text-xs text-slate-500">{rows.length} سجل</p>
            </div>
            <FileText size={20} className="text-[#b88618]"/>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm font-bold text-slate-500">جارٍ تحميل السجلات...</div>
          ) : !rows.length ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-5 text-center">
              <FileText size={34} className="text-slate-300"/>
              <strong className="text-slate-700">لا توجد سجلات إخلاء طرف</strong>
              <span className="text-sm text-slate-500">أنشئ إخلاء طرف من مسار الإخلاء لبدء المتابعة.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="bg-slate-50 text-right text-xs font-black text-slate-600">
                  <tr>
                    <th className="px-4 py-3">الموظف</th>
                    <th className="px-4 py-3">الرقم الوظيفي</th>
                    <th className="px-4 py-3">الشركة</th>
                    <th className="px-4 py-3">المسمى الوظيفي</th>
                    <th className="px-4 py-3">القسم</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">آخر تحديث</th>
                    <th className="px-4 py-3">الروابط والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r=>{
                    const count=(r.links||[]).filter(x=>x.link_scope?.startsWith('clearance:')).length
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4"><div className="font-black text-[#09233f]">{r.employee_name||'غير محدد'}</div></td>
                        <td className="px-4 py-4 font-bold text-slate-600">{r.employee_number||'—'}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-700">{r.company?.name||'غير محددة'}</div>
                          {r.company?.unified_number&&<div className="mt-0.5 text-[11px] text-slate-400">{r.company.unified_number}</div>}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{r.job_title||'—'}</td>
                        <td className="px-4 py-4 text-slate-700">{r.department||'—'}</td>
                        <td className="px-4 py-4"><span className={isClearanceComplete(r)?'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700':'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700'}>{isClearanceComplete(r)?'مكتمل':'قيد الإخلاء'}</span></td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">{r.updated_at?new Date(r.updated_at).toLocaleString('ar-SA'):'—'}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={()=>setSelected(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#09233f] px-3 py-2 text-xs font-black text-white">
                              <Link2 size={14}/> روابط الإدارات ({count}/9)
                            </button>
                            <Link href={'/forms/clearance/records/'+r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#09233f]">
                              <FileText size={14}/> فتح الملف
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 md:items-center md:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
            <section className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:rounded-2xl">
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#09233f] px-5 py-4 text-white">
                <div>
                  <div className="text-xs font-bold text-[#e2bd62]">روابط إخلاء الطرف المحفوظة</div>
                  <h2 className="mt-1 text-lg font-black">{selected.employee_name||'غير محدد'}</h2>
                  <p className="mt-1 text-xs text-slate-300">{selected.employee_number||'بدون رقم'} · {selected.job_title||'المسمى غير محدد'} · {selected.department||'الإدارة غير محددة'}</p>
                </div>
                <button onClick={()=>setSelected(null)} className="rounded-lg p-2 text-slate-200 hover:bg-white/10" title="إغلاق"><X size={19}/></button>
              </header>

              <div className="max-h-[65vh] overflow-y-auto p-4 md:p-5">
                <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">الشركة</div><div className="mt-1 font-black text-[#09233f]">{selected.company?.name||'غير محددة'}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">المسمى</div><div className="mt-1 font-black text-[#09233f]">{selected.job_title||'—'}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-500">عدد الروابط</div><div className="mt-1 font-black text-[#09233f]">{selectedLinks.length} / 9</div></div>
                </div>

                <div className="space-y-2">
                  {selectedLinks.map(x=>{
                    const url=linkUrl(x)
                    const key=String(x.link_scope).replace('clearance:','')
                    return (
                      <div key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="min-w-0">
                          <div className="font-black text-[#09233f]">{stageLabels[key]||x.link_scope||'رابط إدارة'}</div>
                          <div className="mt-1 text-xs text-slate-500">{x.last_submitted_at?'تم الإرسال':'قيد الانتظار'} · الرابط محفوظ في النظام</div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <a href={url} target="_blank" rel="noopener noreferrer" title="فتح الرابط" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#09233f] text-white hover:bg-[#123b61]">
                            <ExternalLink size={16}/>
                          </a>
                          <button onClick={()=>void copy(url)} title="نسخ الرابط" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#09233f] hover:bg-slate-50">
                            {copied===url?<CheckCircle2 size={16} className="text-emerald-600"/>:<Copy size={16}/>}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!selectedLinks.length && <div className="rounded-xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-800">لا توجد روابط محفوظة لهذا السجل.</div>}
              </div>

              <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-xs text-slate-500">الروابط المعروضة هي الروابط المحفوظة فعليًا لهذا السجل.</span>
                <button onClick={()=>setSelected(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">إغلاق</button>
              </footer>
            </section>
          </div>
        )}

        {copied && (
          <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#09233f] px-5 py-3 text-sm font-black text-white shadow-xl">
            تم نسخ الرابط بنجاح
          </div>
        )}
      </div>
    </main>
  )
}
