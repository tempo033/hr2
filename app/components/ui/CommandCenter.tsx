'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Command, UserRound, Building2, BriefcaseBusiness, WalletCards, FileText, ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Result = { type:string; title:string; meta?:string; href:string; icon:any }

const modules: Result[] = [
  {type:'وحدة',title:'ملفات الموظفين',meta:'إدارة الموظفين والملفات',href:'/employees',icon:UserRound},
  {type:'وحدة',title:'إدارة الشركات',meta:'الشركات والكيانات التابعة',href:'/companies',icon:Building2},
  {type:'وحدة',title:'الرواتب والمزايا',meta:'المسيرات والبدلات والخصومات',href:'/payroll',icon:WalletCards},
  {type:'وحدة',title:'التوظيف والمرشحون',meta:'الطلبات والمرشحون والمقابلات',href:'/candidates',icon:BriefcaseBusiness},
  {type:'وحدة',title:'مركز النماذج',meta:'الإجازات والسلف والتحقيقات',href:'/forms',icon:FileText},
]

export default function CommandCenter(){
  const router=useRouter()
  const [open,setOpen]=useState(false)
  const [q,setQ]=useState('')
  const [employees,setEmployees]=useState<any[]>([])
  const [companies,setCompanies]=useState<any[]>([])

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(true)}
      if(e.key==='Escape')setOpen(false)
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[])

  useEffect(()=>{
    if(!open)return
    Promise.all([
      fetch('/api/employees/data',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('/api/companies?include_inactive=1',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
    ]).then(([e,c])=>{
      setEmployees(e?.employees||[])
      setCompanies(c?.companies||[])
    })
  },[open])

  const results=useMemo<Result[]>(()=>{
    const s=q.trim().toLowerCase()
    if(!s)return modules
    const out:Result[]=[]
    for(const e of employees){
      const hay=[e.full_name,e.employee_number,e.job_title,e.national_id,e.company?.name].filter(Boolean).join(' ').toLowerCase()
      if(hay.includes(s))out.push({type:'موظف',title:e.full_name||'موظف',meta:[e.employee_number,e.job_title,e.company?.name].filter(Boolean).join(' • '),href:'/employees/'+e.id,icon:UserRound})
      if(out.length>=6)break
    }
    for(const c of companies){
      const hay=[c.name,c.name_en,c.unified_number,c.commercial_registration].filter(Boolean).join(' ').toLowerCase()
      if(hay.includes(s))out.push({type:'شركة',title:c.name,meta:c.unified_number,href:'/companies',icon:Building2})
      if(out.length>=10)break
    }
    if(!out.length)return [{type:'وحدة',title:'لا توجد نتائج مطابقة',meta:'جرّب الاسم أو الرقم الوظيفي أو اسم الشركة',href:'#',icon:Search}]
    return out
  },[q,employees,companies])

  const go=(r:Result)=>{if(r.href!=='#'){setOpen(false);setQ('');router.push(r.href)}}

  return <>
    <button className="command-trigger" onClick={()=>setOpen(true)} aria-label="فتح البحث السريع">
      <Search size={17}/><span>بحث في HR2</span><kbd><Command size={12}/>K</kbd>
    </button>
    {open&&<div className="command-overlay" onMouseDown={()=>setOpen(false)}>
      <div className="command-dialog" onMouseDown={e=>e.stopPropagation()} dir="rtl">
        <div className="command-head"><div className="command-search"><Search size={20}/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث عن موظف، شركة، أو وحدة..." /></div><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="إغلاق"><X size={19}/></button></div>
        <div className="command-hint">استخدم <b>Ctrl + K</b> في أي وقت لفتح مركز الأوامر</div>
        <div className="command-results">
          {results.map((r,i)=>{const Icon=r.icon;return <button key={r.type+r.title+i} className="command-result" onClick={()=>go(r)}><span className="command-icon"><Icon size={18}/></span><span className="command-copy"><b>{r.title}</b><small>{r.type}{r.meta?' • '+r.meta:''}</small></span><ArrowLeft size={16}/></button>})}
        </div>
      </div>
    </div>}
  </>
}
