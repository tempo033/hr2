'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, BadgeCheck, BriefcaseBusiness, Building2, CalendarClock, ChevronDown,
  FileWarning, HeartPulse, IdCard, RefreshCw, Search, ShieldCheck, UserRound, Users,
  Download, FileSpreadsheet, FileDown, Share2, Copy, Check, ChevronUp
} from 'lucide-react'

type Doc = {
  id:string; document_type:string|null; document_name:string|null; document_number:string|null
  issue_date:string|null; expiry_date:string|null; status:string|null; updated_at:string|null
}
type Company = {id:string;name:string;unified_number:string}
type Employee = {
  id:string; employee_number:string|null; full_name:string; national_id:string|null; nationality:string|null
  job_title:string|null; department:string|null; company_id:string|null; company:Company|null; residency_status:string|null; employment_status:string|null
  hire_date:string|null; scope:'سعودي'|'أجنبي على الكفالة'; documents:Doc[]
}
type Filter =
  | 'all'|'saudi'|'sponsored'|'work_expired'|'work_30'|'res_expired'|'res_30'
  | 'insurance_expired'|'insured'|'no_insurance'|'work_missing'|'res_missing'|'missing'

const DAY = 86400000
const norm = (v:any) => String(v ?? '').trim().toLowerCase()
const isSaudi = (e:Employee) => norm(e.nationality) === 'سعودي'
const docsFor = (e:Employee, keys:string[]) => e.documents.filter(d => keys.some(k => norm(d.document_type).includes(k) || norm(d.document_name).includes(k)))
const latestDoc = (docs:Doc[]) => [...docs].sort((a,b) => String(b.updated_at||'').localeCompare(String(a.updated_at||'')))[0] || null
const dateOnly = (v:string|null) => v ? new Date(v+'T00:00:00') : null

function docState(doc:Doc|null, today:Date) {
  if (!doc?.expiry_date) return 'missing'
  const expiry = dateOnly(doc.expiry_date)!
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / DAY)
  if (diff < 0) return 'expired'
  if (diff <= 30) return '30'
  return 'valid'
}

function insuranceFor(e:Employee) {
  return latestDoc(docsFor(e, ['تأمين طبي','التأمين الطبي','تامين','medical insurance','health insurance','insurance']))
}
function residencyFor(e:Employee) {
  return latestDoc(docsFor(e, ['إقامة','اقامة','residency','iqama']))
}
function workPermitFor(e:Employee) {
  // مصدر واحد للتاريخ: انتهاء الإقامة لغير السعودي، ويستخدم لحساب حالة رخصة العمل أيضاً.
  return isSaudi(e) ? null : residencyFor(e)
}
const RENEWAL_COSTS = { work: 9700, residency: 650 }
function renewalCostFor(e:Employee, today:Date, expiryDate:string|null) {
  if (isSaudi(e)) return { daysExpired:0, months:0, workCost:0, residencyCost:0, totalCost:0 }
  const expiry = expiryDate ? dateOnly(expiryDate) : null
  if (!expiry) return { daysExpired:0, months:0, workCost:0, residencyCost:0, totalCost:0 }
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate())
  const daysExpired = Math.max(0, Math.floor((todayStart.getTime() - expiryStart.getTime()) / DAY))
  if (daysExpired <= 0) return { daysExpired:0, months:0, workCost:0, residencyCost:0, totalCost:0 }
  const months = daysExpired <= 90 ? 3 : daysExpired <= 180 ? 6 : daysExpired <= 270 ? 9 : 12
  const factor = months / 12
  const workCost = RENEWAL_COSTS.work * factor
  const residencyCost = RENEWAL_COSTS.residency * factor
  return { daysExpired, months, workCost, residencyCost, totalCost:workCost + residencyCost }
}
const money = (value:number) => value.toLocaleString('ar-SA',{minimumFractionDigits:value%1?2:0,maximumFractionDigits:2}) + ' ريال'
function statusLabel(state:string) {
  return state==='expired'?'منتهية':state==='30'?'تنتهي خلال 30 يوم':state==='valid'?'سارية لأكثر من 30 يوم':'غير متوفر'
}
function StatusPill({state}:{state:string}) {
  const cls = state==='expired' ? 'bg-red-50 text-red-700 border-red-200' : state==='30' ? 'bg-amber-50 text-amber-700 border-amber-200' : state==='valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
  return <span className={'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black '+cls}>{statusLabel(state)}</span>
}
function StatCard({title,value,icon:Icon,kind,onClick,active}:{title:string;value:number;icon:any;kind?:'blue'|'green'|'red'|'amber';onClick?:()=>void;active?:boolean}) {
  const tone = kind==='red'?'border-red-100 bg-red-50/60':kind==='amber'?'border-amber-100 bg-amber-50/60':kind==='green'?'border-emerald-100 bg-emerald-50/60':'border-slate-200 bg-white'
  return <button onClick={onClick} className={'text-right rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md '+tone+(active?' ring-2 ring-[#b88618]':'')}>
    <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-slate-500">{title}</div><div className="mt-2 text-3xl font-black text-[#09233f]">{value}</div></div><div className="rounded-xl bg-[#09233f] p-3 text-[#d4a72c]"><Icon size={21}/></div></div>
  </button>
}

export default function EmployeeDocumentsDashboard() {
  const [employees,setEmployees]=useState<Employee[]>([])
  const [companies,setCompanies]=useState<Company[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [filter,setFilter]=useState<Filter>('all')
  const [companyFilter,setCompanyFilter]=useState('all')
  const [query,setQuery]=useState('')
  const [today,setToday]=useState(new Date())
  const [excludedWithoutCompany,setExcludedWithoutCompany]=useState<Array<{id:string;employee_number:string|null;full_name:string;nationality:string|null;residency_status:string|null}>>([])
  const [showExcludedWithoutCompany,setShowExcludedWithoutCompany]=useState(false)
  const [expandedCompanies,setExpandedCompanies]=useState<Set<string>>(new Set())
  const [shareMode,setShareMode]=useState(false)
  const [shareAllowExport,setShareAllowExport]=useState(true)
  const [shareUrl,setShareUrl]=useState('')
  const [shareLoading,setShareLoading]=useState(false)
  const [shareCopied,setShareCopied]=useState(false)

  const load = async (shareToken?:string) => {
    setLoading(true); setError('')
    try {
      const endpoint=shareToken ? '/api/hr/employee-documents-dashboard/share/'+encodeURIComponent(shareToken) : '/api/hr/employee-documents-dashboard'
      const r=await fetch(endpoint,{cache:'no-store'})
      const b=await r.json()
      if(!r.ok) throw new Error(b.error||'تعذر تحميل البيانات')
      setEmployees(b.employees||[]); setCompanies(b.companies||[]); setExcludedWithoutCompany(b.excluded_without_company||[]); setToday(new Date())
      setShareMode(Boolean(shareToken))
      setShareAllowExport(b.share?.allow_export !== false)
    } catch(e) { setError(e instanceof Error?e.message:'تعذر تحميل البيانات') }
    finally { setLoading(false) }
  }
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get('share') || ''
    void load(token || undefined)
  },[])

  const prepared=useMemo(()=>employees.map(e=>{
    const res=residencyFor(e), work=workPermitFor(e), ins=insuranceFor(e)
    const resState=isSaudi(e)?'na':docState(res,today)
    const workState=isSaudi(e)?'na':docState(work,today)
    const insState=docState(ins,today)
    const missing = !e.national_id || !e.job_title || !e.department || (!isSaudi(e) && (!res?.expiry_date || !work?.expiry_date))
    const renewal = renewalCostFor(e,today,res?.expiry_date||null)
    return {...e,res,resState,work,workState,ins,insState,missing,renewal}
  }),[employees,today])

  const matches=(e:any)=>{
    if(companyFilter==='undefined' && e.company_id) return false
    if(companyFilter!=='all' && companyFilter!=='undefined' && e.company_id!==companyFilter) return false
    const q=query.trim().toLowerCase()
    if(q && ![e.full_name,e.employee_number,e.national_id,e.job_title,e.department,e.nationality].some((v:any)=>String(v||'').toLowerCase().includes(q))) return false
    switch(filter){
      case 'saudi': return isSaudi(e)
      case 'sponsored': return !isSaudi(e)
      case 'work_expired': return e.workState==='expired'
      case 'work_30': return e.workState==='30'
      case 'res_expired': return e.resState==='expired'
      case 'res_30': return e.resState==='30'
      case 'insurance_expired': return e.insState==='expired'
      case 'insured': return e.insState==='valid'||e.insState==='30'
      case 'no_insurance': return e.insState==='missing'
      case 'work_missing': return e.workState==='missing'
      case 'res_missing': return e.resState==='missing'
      case 'missing': return e.missing
      default: return true
    }
  }
  const rows=prepared.filter(matches)
  const choose=(f:Filter)=>setFilter(f)
  const companyStats=(list:any[])=>({total:list.length,saudi:list.filter(isSaudi).length,sponsored:list.filter((e:any)=>!isSaudi(e)).length,resExpired:list.filter((e:any)=>e.resState==='expired').length,res30:list.filter((e:any)=>e.resState==='30').length,resValid:list.filter((e:any)=>e.resState==='valid').length,resMissing:list.filter((e:any)=>e.resState==='missing').length,workExpired:list.filter((e:any)=>e.workState==='expired').length,work30:list.filter((e:any)=>e.workState==='30').length,workValid:list.filter((e:any)=>e.workState==='valid').length,workMissing:list.filter((e:any)=>e.workState==='missing').length,insured:list.filter((e:any)=>e.insState==='valid'||e.insState==='30').length,insExpired:list.filter((e:any)=>e.insState==='expired').length,insMissing:list.filter((e:any)=>e.insState==='missing').length,missing:list.filter((e:any)=>e.missing).length})
  const groupStats=useMemo(()=>companyStats(prepared),[prepared])
  const renewalStats=useMemo(()=>{
    const list=prepared
    return {
      work:list.reduce((s,e)=>s+e.renewal.workCost,0),
      residency:list.reduce((s,e)=>s+e.renewal.residencyCost,0),
      total:list.reduce((s,e)=>s+e.renewal.totalCost,0),
      count3:list.filter(e=>e.renewal.months===3).length,
      count6:list.filter(e=>e.renewal.months===6).length,
      count9:list.filter(e=>e.renewal.months===9).length,
      count12:list.filter(e=>e.renewal.months===12).length,
      counted:list.filter(e=>e.renewal.totalCost>0).length,
    }
  },[prepared])

  const stats=useMemo(()=>{
    const scope=rows
    return {
      total:scope.length,
      saudi:scope.filter(isSaudi).length,
      sponsored:scope.filter(e=>!isSaudi(e)).length,
      insured:scope.filter(e=>e.insState==='valid'||e.insState==='30').length,
      resExpired:scope.filter(e=>e.resState==='expired').length,
      workExpired:scope.filter(e=>e.workState==='expired').length,
      work30:scope.filter(e=>e.workState==='30').length,
      workValid:scope.filter(e=>e.workState==='valid').length,
      workMissing:scope.filter(e=>e.workState==='missing').length,
      res30:scope.filter(e=>e.resState==='30').length,
      resValid:scope.filter(e=>e.resState==='valid').length,
      resMissing:scope.filter(e=>e.resState==='missing').length,
      insExpired:scope.filter(e=>e.insState==='expired').length,
      insMissing:scope.filter(e=>e.insState==='missing').length,
    }
  },[rows])

  const toggleCompany=(id:string)=>setExpandedCompanies(prev=>{
    const next=new Set(prev)
    if(next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const exportExcel=async()=>{
    if(shareMode && !shareAllowExport) return
    const XLSX=await import('xlsx')
    const rowsForExport=rows.map((e:any)=>({
      'رقم الموظف':e.employee_number||'',
      'اسم الموظف':e.full_name||'',
      'الشركة':e.company?.name||'',
      'الجنسية':e.nationality||'',
      'رقم الهوية / الإقامة':e.national_id||'',
      'المسمى الوظيفي':e.job_title||'',
      'حالة الكفالة':e.residency_status||'',
      'تاريخ انتهاء الإقامة':e.res?.expiry_date||'',
      'حالة الإقامة':e.resState==='na'?'غير مطلوب':statusLabel(e.resState),
      'عدد أيام الانتهاء':isSaudi(e)?0:e.renewal.daysExpired,
      'مدة التجديد':isSaudi(e)?'غير مطلوب':(e.renewal.months?e.renewal.months+' أشهر':'0'),
      'تكلفة رخصة العمل':e.renewal.workCost,
      'تكلفة الإقامة':e.renewal.residencyCost,
      'إجمالي تكلفة التجديد':e.renewal.totalCost,
    }))
    const ws=XLSX.utils.json_to_sheet(rowsForExport)
    const summary=[
      ['Dashboard الإقامات الحالية',''],
      ['تاريخ إنشاء التقرير',today.toLocaleDateString('ar-SA')],
      ['إجمالي الموظفين المشمولين',stats.total],
      ['إجمالي تكلفة رخص العمل',renewalStats.work],
      ['إجمالي تكلفة الإقامات',renewalStats.residency],
      ['إجمالي التكلفة',renewalStats.total],
    ]
    const ws2=XLSX.utils.aoa_to_sheet(summary)
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'الموظفون')
    XLSX.utils.book_append_sheet(wb,ws2,'الإحصائيات')
    XLSX.writeFile(wb,'Dashboard-الإقامات.xlsx')
  }

  const exportPdf=()=>{
    if(shareMode && !shareAllowExport) return
    const oldTitle=document.title
    document.title='Dashboard الإقامات الحالية'
    window.print()
    window.setTimeout(()=>{document.title=oldTitle},1000)
  }

  const createShare=async()=>{
    if(shareMode) return
    setShareLoading(true); setShareCopied(false)
    try{
      const r=await fetch('/api/hr/employee-documents-dashboard/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})})
      const b=await r.json()
      if(!r.ok) throw new Error(b.error||'تعذر إنشاء رابط المشاركة')
      const absolute=new URL(b.path,window.location.origin).toString()
      setShareUrl(absolute)
      await navigator.clipboard?.writeText(absolute)
      setShareCopied(true)
    }catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء رابط المشاركة')}
    finally{setShareLoading(false)}
  }

  const employeeTable=(list:any[])=> <div className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-[1700px] text-sm">
      <thead className="bg-[#09233f] text-white"><tr>
        {['رقم الموظف','اسم الموظف','الجنسية','رقم الهوية / الإقامة','المسمى الوظيفي','حالة الكفالة','تاريخ انتهاء الإقامة','حالة الإقامة','عدد أيام الانتهاء','مدة التجديد','تكلفة رخصة العمل','تكلفة الإقامة','إجمالي التكلفة'].map(h=><th key={h} className="p-3 text-right whitespace-nowrap">{h}</th>)}
      </tr></thead>
      <tbody>{list.map((e:any)=><tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
        <td className="p-3">{e.employee_number||'غير متوفر'}</td>
        <td className="p-3 font-black">{e.full_name||'غير متوفر'}</td>
        <td className="p-3">{e.nationality||'غير متوفر'}</td>
        <td className="p-3">{e.national_id||'غير متوفر'}</td>
        <td className="p-3">{e.job_title||'غير متوفر'}</td>
        <td className="p-3">{e.residency_status||'غير متوفر'}</td>
        <td className="p-3">{e.res?.expiry_date||'غير متوفر'}</td>
        <td className="p-3">{e.resState==='na'?'غير مطلوب':<StatusPill state={e.resState}/>}</td>
        <td className="p-3">{isSaudi(e)?'غير مطلوب':e.renewal.daysExpired+' يوم'}</td>
        <td className="p-3 font-bold">{isSaudi(e)?'غير مطلوب':(e.renewal.months?e.renewal.months+' أشهر':'0')}</td>
        <td className="p-3">{isSaudi(e)?'0 ريال':money(e.renewal.workCost)}</td>
        <td className="p-3">{isSaudi(e)?'0 ريال':money(e.renewal.residencyCost)}</td>
        <td className="p-3 font-black text-[#09233f]">{isSaudi(e)?'0 ريال':money(e.renewal.totalCost)}</td>
      </tr>)}</tbody>
    </table>
  </div>

  const critical=[
    ['إقامة منتهية','res_expired',stats.resExpired,'red'],
    ['رخصة عمل منتهية','work_expired',stats.workExpired,'red'],
    ['رخصة عمل تنتهي خلال 30 يوم','work_30',stats.work30,'amber'],
    ['إقامة تنتهي خلال 30 يوم','res_30',stats.res30,'amber'],
    ['تأمين طبي منتهي','insurance_expired',stats.insExpired,'red'],
    ['بدون تأمين','no_insurance',stats.insMissing,'amber'],
    ['بيانات ناقصة','missing',rows.filter(e=>e.missing).length,'amber'],
  ] as const

  return <main dir="rtl" className="min-h-screen bg-[#f5f7fa]">
    <div className="max-w-[1800px] mx-auto p-5 md:p-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 print:mb-3">
        <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center shadow-sm print:hidden"><Users size={29}/></div><div><div className="text-sm font-bold text-[#b88618]">إدارة الموارد البشرية</div><h1 className="text-3xl font-black text-[#09233f]">Dashboard الإقامات الحالية</h1><p className="text-slate-500 mt-1">بيانات مباشرة من ملفات الموظفين الحالية دون إنشاء سجل موظفين جديد.</p></div></div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {!shareMode&&<button onClick={()=>void createShare()} disabled={shareLoading} className="rounded-xl border border-[#b88618] bg-amber-50 px-4 py-2.5 font-black text-[#09233f] inline-flex items-center gap-2">{shareCopied?<Check size={17}/>:<Share2 size={17}/>} {shareLoading?'جاري إنشاء الرابط...':shareCopied?'تم نسخ الرابط':'مشاركة Dashboard'}</button>}
          {(shareAllowExport||!shareMode)&&<><button onClick={()=>void exportExcel()} className="rounded-xl bg-[#09233f] text-white px-4 py-2.5 font-black inline-flex items-center gap-2"><FileSpreadsheet size={17}/> تصدير Excel</button><button onClick={exportPdf} className="rounded-xl bg-[#b88618] text-white px-4 py-2.5 font-black inline-flex items-center gap-2"><FileDown size={17}/> تصدير PDF</button></>}
          {!shareMode&&<button onClick={()=>void load()} className="rounded-xl border bg-white px-4 py-2.5 font-black text-[#09233f] inline-flex items-center gap-2"><RefreshCw size={17}/> تحديث البيانات</button>}
        </div>
      </header>
      {shareMode&&<div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3 print:hidden"><div><div className="font-black text-emerald-800">وضع العرض فقط</div><div className="text-sm text-emerald-700 mt-1">هذا الرابط للعرض فقط ولا يمنح أي صلاحية لتعديل الموظفين أو الشركات أو التكاليف.</div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-200">Read Only</span></div>}
      {shareUrl&&!shareMode&&<div className="mb-5 rounded-2xl border border-[#d9b45a] bg-white p-4 print:hidden"><div className="font-black text-[#09233f] mb-2">رابط المشاركة</div><div className="flex flex-col md:flex-row gap-2"><input readOnly value={shareUrl} className="flex-1 border rounded-xl px-3 py-2.5 bg-slate-50" /><button onClick={()=>{void navigator.clipboard?.writeText(shareUrl);setShareCopied(true)}} className="rounded-xl bg-[#09233f] text-white px-4 py-2.5 font-black inline-flex items-center justify-center gap-2"><Copy size={16}/> نسخ الرابط</button></div></div>

      {error&&<div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard title="إجمالي الموظفين المشمولين" value={stats.total} icon={Users} onClick={()=>choose('all')} active={filter==='all'}/>
        <StatCard title="السعوديون" value={stats.saudi} icon={ShieldCheck} kind="green" onClick={()=>choose('saudi')} active={filter==='saudi'}/>
        <StatCard title="العمالة الأجنبية على الكفالة" value={stats.sponsored} icon={UserRound} kind="blue" onClick={()=>choose('sponsored')} active={filter==='sponsored'}/>
        <StatCard title="لديهم تأمين طبي" value={stats.insured} icon={HeartPulse} kind="green" onClick={()=>choose('all')}/>
        <StatCard title="الإقامات المنتهية" value={stats.resExpired} icon={IdCard} kind="red" onClick={()=>choose('res_expired')} active={filter==='res_expired'}/>
      </section>

<section className="rounded-2xl border border-[#d9b45a] bg-white p-5 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div><h2 className="text-2xl font-black text-[#09233f]">إجمالي المجموعة</h2><p className="text-sm text-slate-500 mt-1">إجمالي جميع الموظفين المشمولين وفق قواعد الداشبورد الحالية، بما في ذلك من لم يتم تحديد شركته بعد.</p></div>
          <select value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)} className="border rounded-xl px-4 py-3 bg-white font-bold min-w-[280px]">
            <option value="all">جميع الشركات</option><option value="undefined">غير محددة</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name} — {c.unified_number}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
          {[['إجمالي الموظفين',groupStats.total],['السعوديون',groupStats.saudi],['الأجانب على الكفالة',groupStats.sponsored],['الإقامات المنتهية',groupStats.resExpired],['رخص العمل المنتهية',groupStats.workExpired],['لديهم تأمين طبي',groupStats.insured]].map(([label,value])=><div key={label} className="rounded-xl border bg-slate-50 p-4"><div className="text-sm font-bold text-slate-500">{label}</div><div className="text-2xl font-black text-[#09233f] mt-1">{value}</div></div>)}
        </div>
        <div className="mt-3 text-sm font-bold text-amber-700">موظفون بدون شركة: {prepared.filter(e=>!e.company_id).length}</div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="font-black text-amber-800">موظفون على كفالة الشركة بدون شركة محددة</div>
            <div className="text-sm text-amber-700 mt-1">هؤلاء الموظفون مستبعدون من جميع إحصائيات داشبورد الإقامات حتى يتم تحديد الشركة يدوياً من ملف الموظف.</div>
          </div>
          <button onClick={()=>setShowExcludedWithoutCompany(v=>!v)} className="rounded-xl border border-amber-300 bg-white px-4 py-2 font-black text-amber-800">
            {showExcludedWithoutCompany?'إخفاء القائمة':'عرض القائمة'} ({excludedWithoutCompany.length})
          </button>
        </div>
        {showExcludedWithoutCompany&&excludedWithoutCompany.length>0&&<div className="mt-4 overflow-auto rounded-xl border border-amber-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#09233f] text-white"><tr><th className="p-3 text-right">رقم الموظف</th><th className="p-3 text-right">اسم الموظف</th><th className="p-3 text-right">الجنسية</th><th className="p-3 text-right">حالة الكفالة</th><th className="p-3 text-right">الإجراء</th></tr></thead>
            <tbody>{excludedWithoutCompany.map(e=><tr key={e.id} className="border-b last:border-0"><td className="p-3">{e.employee_number||'غير متوفر'}</td><td className="p-3 font-bold">{e.full_name}</td><td className="p-3">{e.nationality||'غير متوفر'}</td><td className="p-3">{e.residency_status||'غير متوفر'}</td><td className="p-3"><span className="text-slate-500">متاح للمستخدم الإداري فقط</span></td></tr>)}</tbody>
          </table>
        </div>}
        {showExcludedWithoutCompany&&excludedWithoutCompany.length===0&&<div className="mt-3 text-sm font-bold text-emerald-700">لا يوجد موظفون على كفالة الشركة بدون شركة محددة.</div>}
      </section>

      <section className="rounded-2xl border border-[#d9b45a] bg-white p-5 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div><h2 className="text-2xl font-black text-[#09233f]">تكلفة تجديد الإقامة ورخصة العمل</h2><p className="text-sm text-slate-500 mt-1">الحساب ديناميكي حسب تاريخ اليوم، ويطبق على غير السعوديين المشمولين فقط ممن انتهت إقاماتهم.</p></div>
          <div className="text-sm font-black text-[#b88618]">السنوي: رخصة العمل {money(9700)} · الإقامة {money(650)} · الإجمالي {money(10350)}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
          {[
            ['تكلفة رخص العمل',money(renewalStats.work)],
            ['تكلفة الإقامات',money(renewalStats.residency)],
            ['إجمالي التكلفة',money(renewalStats.total)],
            ['المحتسبون',renewalStats.counted],
            ['3 أشهر',renewalStats.count3],
            ['6 أشهر',renewalStats.count6],
            ['9 أشهر',renewalStats.count9],
            ['12 شهر',renewalStats.count12],
          ].map(([label,value])=><div key={label} className="rounded-xl border bg-slate-50 p-4"><div className="text-sm font-bold text-slate-500">{label}</div><div className="text-xl font-black text-[#09233f] mt-1">{value}</div></div>)}
        </div>
        <div className="mt-3 text-xs text-slate-500">السعوديون والتجديدات غير المطلوبة/غير المنتهية = 0 ريال.</div>
      </section>}

      <section className="space-y-5 mb-6">
        {companies.map(company=>{
          const list=prepared.filter(e=>e.company_id===company.id)
          const st=companyStats(list)
          const renewalCompany = {
            work:list.reduce((sum,e)=>sum+e.renewal.workCost,0),
            residency:list.reduce((sum,e)=>sum+e.renewal.residencyCost,0),
            total:list.reduce((sum,e)=>sum+e.renewal.totalCost,0),
            count:list.filter(e=>e.renewal.totalCost>0).length,
          }
          const cards=[['إجمالي الموظفين',st.total,'blue'],['السعوديون',st.saudi,'green'],['الأجانب على الكفالة',st.sponsored,'blue'],['الإقامات المنتهية',st.resExpired,'red'],['الإقامات خلال 30 يوم',st.res30,'amber'],['رخص العمل المنتهية',st.workExpired,'red'],['رخص العمل خلال 30 يوم',st.work30,'amber'],['رخص العمل > 30 يوم',st.workValid,'green'],['لديهم تأمين طبي',st.insured,'green'],['بدون تأمين طبي',st.insMissing,'amber'],['بيانات ناقصة',st.missing,'amber']]
          return <section key={company.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4"><div><h2 className="text-xl font-black text-[#09233f]">🏢 {company.name}</h2><div className="text-sm font-bold text-[#b88618] mt-1">الرقم الموحد: {company.unified_number}</div></div><button onClick={()=>toggleCompany(company.id)} className="rounded-xl border border-[#b88618] bg-amber-50 px-4 py-2 font-black text-[#09233f] inline-flex items-center gap-2">{expandedCompanies.has(company.id)?<><ChevronUp size={17}/> إخفاء موظفي الشركة</>:<><ChevronDown size={17}/> عرض موظفي الشركة</>}</button></div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{cards.map(([label,value,kind])=><button key={label} onClick={()=>setCompanyFilter(company.id)} className={'rounded-xl border p-4 text-right '+(kind==='red'?'bg-red-50 border-red-200':kind==='amber'?'bg-amber-50 border-amber-200':kind==='green'?'bg-emerald-50 border-emerald-200':'bg-slate-50')}><div className="text-sm font-bold text-slate-600">{label}</div><div className="text-2xl font-black text-[#09233f] mt-1">{value}</div></button>)}</div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['رخص العمل',money(renewalCompany.work)],['الإقامات',money(renewalCompany.residency)],['إجمالي التجديد',money(renewalCompany.total)],['الموظفون المحتسبون',renewalCompany.count]].map(([label,value])=><div key={label} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3"><div className="text-xs font-bold text-slate-500">{label}</div><div className="text-lg font-black text-[#09233f] mt-1">{value}</div></div>)}
            </div>
            <div className="mt-3 text-xs text-slate-500">الإقامات السارية لأكثر من 30 يوم: {st.resValid} · الإقامات بدون بيانات: {st.resMissing} · رخص العمل بدون بيانات: {st.workMissing} · التأمين المنتهي: {st.insExpired}</div>
            {expandedCompanies.has(company.id)&&employeeTable(list)}
          </section>
        })}
      </section>

            <section className="rounded-2xl border border-amber-100 bg-white p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-amber-600"/><h2 className="text-xl font-black text-[#09233f]">يحتاج إلى إجراء</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{critical.map(([label,f,count,kind])=><button key={f} onClick={()=>choose(f as Filter)} className={'rounded-xl border p-3 text-right '+(kind==='red'?'bg-red-50 border-red-200 text-red-700':'bg-amber-50 border-amber-200 text-amber-700')}><div className="text-xs font-bold">{label}</div><div className="mt-1 text-2xl font-black">{count}</div></button>)}</div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#09233f] mb-4">حالة رخص العمل</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['🔴 رخص عمل منتهية',stats.workExpired,'work_expired'],['🟠 تنتهي خلال 30 يوم',stats.work30,'work_30'],['🟢 سارية لأكثر من 30 يوم',stats.workValid,'all'],['⚪ بدون بيانات',stats.workMissing,'work_missing']
          ].map(([label,value,f])=><button key={label} onClick={()=>choose(f==='all'?'all':f as Filter)} className="rounded-xl border p-4 text-right hover:shadow-sm"><div className="font-black">{label}</div><div className="text-2xl font-black text-[#09233f] mt-1">{value}</div></button>)}
        </div></section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-[#09233f] mb-4">حالة الإقامات</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['🔴 إقامات منتهية',stats.resExpired,'res_expired'],['🟠 تنتهي خلال 30 يوم',stats.res30,'res_30'],['🟢 سارية لأكثر من 30 يوم',stats.resValid,'all'],['⚪ بيانات إقامة ناقصة',stats.resMissing,'res_missing']
          ].map(([label,value,f])=><button key={label} onClick={()=>choose(f==='all'?'all':f as Filter)} className="rounded-xl border p-4 text-right hover:shadow-sm"><div className="font-black">{label}</div><div className="text-2xl font-black text-[#09233f] mt-1">{value}</div></button>)}
        </div></section>
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm mb-6"><div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-xl font-black text-[#09233f]">التأمين الطبي</h2><span className="text-sm text-slate-500">ساري: {stats.insured} · منتهي: {stats.insExpired} · بدون تأمين/بيانات: {stats.insMissing}</span></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><button onClick={()=>choose('insured')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-right"><div className="font-black text-emerald-700">🟢 تأمين ساري</div><div className="text-2xl font-black text-[#09233f] mt-1">{stats.insured}</div></button><button onClick={()=>choose('insurance_expired')} className="rounded-xl border border-red-200 bg-red-50 p-4 text-right"><div className="font-black text-red-700">🔴 تأمين منتهي</div><div className="text-2xl font-black text-[#09233f] mt-1">{stats.insExpired}</div></button><button onClick={()=>choose('no_insurance')} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right"><div className="font-black text-slate-600">⚪ بدون تأمين / بيانات</div><div className="text-2xl font-black text-[#09233f] mt-1">{stats.insMissing}</div></button></div></section>

      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden print:break-before-auto">
        <div className="p-4 border-b flex flex-col lg:flex-row gap-3 justify-between"><div><h2 className="text-xl font-black text-[#09233f]">الموظفون المشمولون</h2><p className="text-sm text-slate-500 mt-1">عرض {rows.length} من {employees.length} موظفاً · التاريخ: {today.toLocaleDateString('ar-SA')}</p></div><div className="relative lg:w-[420px]"><Search className="absolute right-3 top-3 text-slate-400" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث بالاسم أو الرقم أو الوظيفة..." className="w-full border rounded-xl pr-10 pl-3 py-2.5"/></div></div>
        <div className="overflow-auto"><table className="w-full min-w-[1900px]"><thead className="bg-[#09233f] text-white"><tr>{['اسم الموظف','رقم الموظف','الشركة','الجنسية','المسمى الوظيفي','القسم','حالة الكفالة','رقم الإقامة/الهوية','انتهاء الإقامة','حالة الإقامة','أيام انتهاء الإقامة','مدة التجديد','تكلفة رخصة العمل','تكلفة الإقامة','إجمالي تكلفة التجديد','انتهاء رخصة العمل','حالة رخصة العمل','التأمين الطبي','انتهاء التأمين الطبي','حالة الملف'].map(h=><th key={h} className="p-3 text-right whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
          {loading?<tr><td colSpan={20} className="p-10 text-center text-slate-500">جاري تحميل بيانات الموظفين...</td></tr>:rows.length===0?<tr><td colSpan={20} className="p-10 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr>:rows.map(e=><tr key={e.id} className="border-b hover:bg-slate-50">
            <td className="p-3 font-black"><span className="text-[#09233f]">{e.full_name||'غير متوفر'}</span></td>
            <td className="p-3">{e.employee_number||'غير متوفر'}</td>
            <td className="p-3">{e.company?.name||'غير محددة'}</td><td className="p-3">{e.nationality||'غير متوفر'}</td><td className="p-3">{e.job_title||'غير متوفر'}</td><td className="p-3">{e.department||'غير متوفر'}</td><td className="p-3">{e.residency_status||'غير متوفر'}</td><td className="p-3">{e.national_id||'غير متوفر'}</td>
            <td className="p-3">{e.res?.expiry_date||'غير متوفر'}</td><td className="p-3">{e.resState==='na'?'غير مطلوب':<StatusPill state={e.resState}/>}</td>
            <td className="p-3">{isSaudi(e)?'غير مطلوب':e.renewal.daysExpired>0?e.renewal.daysExpired+' يوم':'0 يوم'}</td>
            <td className="p-3 font-bold">{isSaudi(e)?'غير مطلوب':e.renewal.months?e.renewal.months+' أشهر':'0'}</td>
            <td className="p-3">{isSaudi(e)?'0 ريال':money(e.renewal.workCost)}</td><td className="p-3">{isSaudi(e)?'0 ريال':money(e.renewal.residencyCost)}</td>
            <td className="p-3 font-black text-[#09233f]">{isSaudi(e)?'0 ريال':money(e.renewal.totalCost)}</td>
            <td className="p-3">{e.work?.expiry_date||'غير متوفر'}</td><td className="p-3">{e.workState==='na'?'غير مطلوب':<StatusPill state={e.workState}/>}</td>
            <td className="p-3">{e.ins?e.ins.document_name||e.ins.document_type||'متوفر':'غير متوفر'}</td><td className="p-3">{e.ins?.expiry_date||'غير متوفر'}</td><td className="p-3"><span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-black '+(e.missing?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700')}>{e.missing?'بيانات ناقصة':'مكتمل'}</span></td>
          </tr>)}</tbody></table></div>
      </section>
      <div className="hidden print:block mt-6 text-xs text-slate-500 border-t pt-3">تاريخ إنشاء التقرير: {today.toLocaleDateString('ar-SA')} · إجمالي الموظفين المشمولين: {stats.total} · إجمالي تكلفة رخص العمل: {money(renewalStats.work)} · إجمالي تكلفة الإقامات: {money(renewalStats.residency)} · إجمالي التكلفة: {money(renewalStats.total)}</div>
    </div>
  </main>
}
