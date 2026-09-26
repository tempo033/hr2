'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2, FileDown, LogOut, UserCog, Menu, X, ChevronDown, CalendarDays, WalletCards, Calculator, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const sections = [
  { id:'recruitment', label:'التوظيف', icon:BriefcaseBusiness, items:[
    ['/requests','طلبات الموارد البشرية',ClipboardList,['admin','hr','manager']],
    ['/candidates','المرشحون',Users,['admin','hr','manager','interviewer']],
    ['/interviews','المقابلات والتقييم',Users,['admin','hr','interviewer','manager']],
    ['/interviews/links','روابط التقييم والمقابلات',Link2,['admin','hr','interviewer','manager']],
    ['/hiring-approvals','اعتماد التعيين',UserCheck,['admin','hr','manager']],
    ['/offers','العروض الوظيفية',Send,['admin','hr','manager']],
    ['/onboarding','مباشرة العمل',BriefcaseBusiness,['admin','hr']],
    ['/onboarding/manage','إدارة المباشرات',FilePenLine,['admin','hr']],
    ['/rejected-candidates','المرشحون غير المقبولين',UserCheck,['admin','hr','manager','interviewer']],
  ]},
  { id:'employees', label:'الموظفون', icon:Users, items:[
    ['/employees','ملفات الموظفين',FileText,['admin','hr']],
    ['/job-descriptions','الوصف الوظيفي',BriefcaseBusiness,['admin','hr','manager','interviewer']],
  ]},
  { id:'leaves', label:'الإجازات', icon:CalendarDays, items:[
    ['/leaves','إدارة الإجازات',CalendarDays,['admin','hr','manager']],
  ]},
  { id:'forms', label:'النماذج والتحقيقات', icon:Files, items:[
    ['/forms','مركز النماذج والتحقيقات',Files,['admin','hr']],
  ]},
  { id:'payroll', label:'الرواتب', icon:WalletCards, items:[
    ['/payroll','لوحة الرواتب',WalletCards,['admin','hr','finance','general_manager','manager']],
    ['/payroll/runs','مسيرات الرواتب',WalletCards,['admin','hr','finance','general_manager']],
    ['/payroll/attendance','الحضور والغياب',CalendarDays,['admin','hr','manager']],
    ['/payroll/overtime','العمل الإضافي',WalletCards,['admin','hr','manager']],
    ['/payroll/deductions','الخصومات والجزاءات',WalletCards,['admin','hr','manager']],
    ['/payroll/advances','السلف',WalletCards,['admin','hr']],
    ['/payroll/bonuses','المكافآت',WalletCards,['admin','hr','manager']],
    ['/payroll/gosi','التأمينات الاجتماعية',WalletCards,['admin','hr','finance']],
    ['/payroll/wps','حماية الأجور WPS',WalletCards,['admin','hr','finance']],
    ['/payroll/projects','تكلفة المشاريع',WalletCards,['admin','hr','finance','general_manager']],
    ['/payroll/reports','تقارير الرواتب',BarChart3,['admin','hr','finance','general_manager','manager']],
    ['/payroll/settings','إعدادات الرواتب',UserCog,['admin']],
  ]},
  { id:'nitaqat', label:'نطاقات', icon:Calculator, items:[
    ['/nitaqat','لوحة نطاقات',Calculator,['admin','hr','manager']], ['/nitaqat/calculator','حاسبة نطاقات',Calculator,['admin','hr','manager']], ['/nitaqat/company','بيانات المنشأة',Building2,['admin','hr']], ['/nitaqat/employees','الموظفون المحتسبون',Users,['admin','hr','manager']], ['/nitaqat/simulation','محاكاة التوطين',Calculator,['admin','hr','manager']], ['/nitaqat/rules','متطلبات النطاق',FileText,['admin','hr','manager']], ['/nitaqat/history','سجل التغييرات',FileText,['admin','hr','manager']], ['/nitaqat/reports','تقارير نطاقات',BarChart3,['admin','hr','manager']], ['/nitaqat/settings','إعدادات نطاقات',UserCog,['admin','hr']],
  ]},
  { id:'reports', label:'التقارير', icon:BarChart3, items:[
    ['/reports','التقارير',BarChart3,['admin','hr','manager']],
    ['/reports/initial','تقارير التقييم المبدئي',ClipboardList,['admin','hr','manager']],
  ]},
  { id:'system', label:'إدارة النظام', icon:UserCog, items:[
    ['/users','المستخدمون والصلاحيات',UserCog,['admin']],
  ]},
] as const

const isExternalTokenPage = (pathname: string) => /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) || /^\/forms\/public\/[^/]+\/?$/.test(pathname) || /^\/forms\/investigation\/(respond|review)\/[^/]+\/?$/.test(pathname)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const router=useRouter(); const [role,setRole]=useState<string>(''); const [open,setOpen]=useState(false)
  const [openSections,setOpenSections]=useState<string[]>(['recruitment'])
  useEffect(()=>{if(pathname!=='/login'&&!isExternalTokenPage(pathname)) fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setRole(d?.user?.role||''))},[pathname])
  useEffect(()=>setOpen(false),[pathname])
  useEffect(()=>{const active=sections.find(s=>s.items.some(([href])=>pathname===href||pathname.startsWith(href+'/'))); if(active&&!openSections.includes(active.id)) setOpenSections(v=>[...v,active.id])},[pathname,openSections])
  if(pathname==='/login'||isExternalTokenPage(pathname)) return <>{children}</>
  async function logout(){await supabase.auth.signOut();await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  const toggleSection=(id:string)=>setOpenSections(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  const visibleSections=sections.map(s=>({...s,items:s.items.filter(([, , , roles])=>role&&roles.includes(role as never))})).filter(s=>s.items.length)
  const NavItems=({mobile=false}:{mobile?:boolean})=><div className={mobile?'flex flex-col gap-1.5':'flex flex-col gap-1.5'}>
    <Link href="/" className={`nav-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold transition ${pathname==='/'?'bg-[#b88618] text-white shadow-md':'text-slate-100 hover:bg-white/10'}`}><Home size={20}/><span>الرئيسية</span></Link>
    {visibleSections.map(({id,label,icon:SectionIcon,items})=>{const expanded=openSections.includes(id); return <div key={id} className="mt-1">
      <button type="button" onClick={()=>toggleSection(id)} className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-[15px] font-black text-slate-100 hover:bg-white/10">
        <span className="flex items-center gap-3"><SectionIcon size={20}/><span>{label}</span></span><ChevronDown size={18} className={expanded?'rotate-180 transition':'transition'}/>
      </button>
      {expanded&&<div className="mr-4 mt-1 border-r border-white/15 pr-2 flex flex-col gap-1">{items.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-bold transition ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white shadow-md':'text-slate-200 hover:bg-white/10'}`}><Icon size={17}/><span>{label}</span></Link>)}</div>}
    </div>})}
  </div>
  return <div className="min-h-screen app-shell bg-[#f5f7fa]">
    <aside className="hr-sidebar print-hidden">
      <div className="flex items-center gap-3 px-2 pb-5 mb-4 border-b border-white/10"><div className="h-11 w-11 rounded-2xl bg-[#b88618] grid place-items-center font-black text-white shadow-lg text-lg">HR</div><div><div className="font-black text-[17px] text-white">إدارة الموارد البشرية</div><div className="text-[11px] text-slate-300 mt-0.5">نظام إدارة التوظيف والموارد البشرية</div></div></div>
      <NavItems />
      <button onClick={logout} className="mt-4 w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold text-slate-100 hover:bg-red-500/20 hover:text-white"><LogOut size={20}/>تسجيل الخروج</button>
    </aside>
    <div className="mobile-topbar print-hidden"><button onClick={()=>setOpen(v=>!v)} className="rounded-xl p-2.5 text-white hover:bg-white/10" aria-label="فتح القائمة">{open?<X size={24}/>:<Menu size={24}/>}</button><Link href="/" className="flex items-center gap-2 font-black text-white"><span className="h-9 w-9 rounded-xl bg-[#b88618] grid place-items-center text-sm">HR</span><span>إدارة الموارد البشرية</span></Link></div>
    {open&&<div className="mobile-menu print-hidden"><NavItems mobile/><button onClick={logout} className="mt-3 w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold text-slate-100 hover:bg-red-500/20"><LogOut size={20}/>تسجيل الخروج</button></div>}
    <main className="hr-main">{children}</main>
    <div className="print-pdf-control print-hidden"><button type="button" onClick={()=>window.print()} title="تصدير الصفحة الحالية إلى PDF بحجم A4" aria-label="تصدير الصفحة الحالية إلى PDF" className="pdf-export-btn"><FileDown size={17}/><span>تصدير PDF</span></button></div>
  </div>
}
