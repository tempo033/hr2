'use client'

import {useEffect,useMemo,useRef,useState} from 'react'
import {Check,ChevronDown,Search,X} from 'lucide-react'

type Employee={
  id:string
  employee_number?:string|null
  full_name?:string|null
  department?:string|null
  job_title?:string|null
}

type Props={
  employees:Employee[]
  value:string
  onChange:(id:string)=>void
  placeholder?:string
  disabled?:boolean
  className?:string
}

const norm=(value:any)=>String(value??'').trim().toLocaleLowerCase('ar')

export default function EmployeeSearchSelect({
  employees,
  value,
  onChange,
  placeholder='اختر الموظف...',
  disabled=false,
  className=''
}:Props){
  const [open,setOpen]=useState(false)
  const [query,setQuery]=useState('')
  const rootRef=useRef<HTMLDivElement>(null)
  const searchRef=useRef<HTMLInputElement>(null)

  const selected=employees.find(e=>e.id===value)

  const filtered=useMemo(()=>{
    const q=norm(query)
    if(!q)return employees
    return employees.filter(e=>{
      const hay=[e.full_name,e.employee_number,e.department,e.job_title].map(norm).join(' ')
      return hay.includes(q)
    })
  },[employees,query])

  useEffect(()=>{
    const close=(event:MouseEvent)=>{
      if(rootRef.current && !rootRef.current.contains(event.target as Node))setOpen(false)
    }
    document.addEventListener('mousedown',close)
    return()=>document.removeEventListener('mousedown',close)
  },[])

  useEffect(()=>{
    if(open)window.setTimeout(()=>searchRef.current?.focus(),0)
    else setQuery('')
  },[open])

  const choose=(id:string)=>{
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={'relative '+className}>
      <button
        type="button"
        disabled={disabled}
        onClick={()=>setOpen(x=>!x)}
        className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-right flex items-center justify-between gap-2 disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className={selected?.full_name?'font-semibold text-slate-800':'text-slate-500'}>
          {selected ? (
            <>{selected.employee_number ? selected.employee_number+' — ' : ''}{selected.full_name||'بدون اسم'}</>
          ) : placeholder}
        </span>
        <ChevronDown size={18} className={'shrink-0 transition-transform '+(open?'rotate-180':'')}/>
      </button>

      {open && (
        <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b bg-slate-50 p-2">
            <div className="relative">
              <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                ref={searchRef}
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}
                placeholder="ابحث باسم الموظف أو الرقم الوظيفي..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-9 pl-9 outline-none focus:border-[#b88618] focus:ring-2 focus:ring-[#b88618]/20"
                dir="rtl"
              />
              {query && (
                <button type="button" onClick={()=>setQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={15}/>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            <button
              type="button"
              onClick={()=>choose('')}
              className="w-full rounded-lg px-3 py-2 text-right text-sm text-slate-500 hover:bg-slate-50"
            >
              بدون اختيار
            </button>

            {filtered.length===0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">لا توجد نتائج مطابقة</div>
            ) : filtered.map(employee=>(
              <button
                type="button"
                key={employee.id}
                onClick={()=>choose(employee.id)}
                className="w-full rounded-lg px-3 py-2.5 text-right hover:bg-amber-50 flex items-center gap-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-800 truncate">
                    {employee.full_name||'بدون اسم'}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {employee.employee_number ? 'رقم: '+employee.employee_number : 'بدون رقم'}
                    {employee.job_title ? ' — '+employee.job_title : ''}
                    {employee.department ? ' — '+employee.department : ''}
                  </span>
                </span>
                {employee.id===value && <Check size={17} className="shrink-0 text-emerald-600"/>}
              </button>
            ))}
          </div>

          <div className="border-t bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            اكتب أول حرف أو جزء من الاسم للوصول للموظف بسرعة.
          </div>
        </div>
      )}
    </div>
  )
}
