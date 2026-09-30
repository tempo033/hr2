'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2, FileDown, LogOut, UserCog, Menu, X, ChevronDown, CalendarDays, WalletCards, Calculator, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SessionTimeoutGuard from '@/app/components/auth/SessionTimeoutGuard'
import CommandCenter from '@/app/components/ui/CommandCenter'

const sections = [
  { id:'recruitment', label:'التوظيف والاستقطاب', icon:BriefcaseBusiness, items:[
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
  { id:'employees', label:'الموظفون والوصف الوظيفي', icon:Users, items:[
    ['/employees','ملفات الموظفين',FileText,['admin','hr']],
    ['/job-descriptions','الوصف الوظيفي',BriefcaseBusiness,['admin','hr','manager','interviewer']],
    ['/kpi','تقييم مؤشرات الأداء KPI',BarChart3,['admin','hr','manager']],
    ['/hr/employee-documents','لوحة متابعة الموظفين والوثائق',Files,['admin','hr']],
  ]},
  { id:'attendance', label:'الحضور والإجازات', icon:CalendarDays, items:[
    ['/leaves','إدارة الإجازات',CalendarDays,['admin','hr','manager']],
    ['/payroll/attendance','الحضور والغياب',CalendarDays,['admin','hr','manager']],
    ['/attendance','الحضور والانصراف - تطبيق الموظف',CalendarDays,['admin','hr','manager']],
    ['/payroll/overtime','العمل الإضافي',WalletCards,['admin','hr','manager']],
  ]},
  { id:'payroll', label:'الرواتب والتأمينات', icon:WalletCards, items:[
    ['/payroll','لوحة الرواتب',WalletCards,['admin','hr','finance','general_manager','manager']],
    ['/payroll/runs','مسيرات الرواتب',WalletCards,['admin','hr','finance','general_manager']],
    ['/payroll/deductions','الخصومات والجزاءات',WalletCards,['admin','hr','manager']],
    ['/payroll/advances','السلف',WalletCards,['admin','hr']],
    ['/payroll/bonuses','المكافآت',WalletCards,['admin','hr','manager']],
    ['/payroll/gosi','التأمينات الاجتماعية',WalletCards,['admin','hr','finance']],
    ['/payroll/wps','حماية الأجور WPS',WalletCards,['admin','hr','finance']],
    ['/payroll/projects','تكلفة المشاريع',WalletCards,['admin','hr','finance','general_manager']],
    ['/payroll/reports','تقارير الرواتب',BarChart3,['admin','hr','finance','general_manager','manager']],
    ['/payroll/settings','إعدادات الرواتب',UserCog,['admin']],
  ]},
  { id:'nitaqat', label:'نطاقات والتوطين', icon:Calculator, items:[
    ['/nitaqat','لوحة نطاقات',Calculator,['admin','hr','manager']],
    ['/nitaqat/calculator','حاسبة نطاقات',Calculator,['admin','hr','manager']],
    ['/nitaqat/company','بيانات المنشأة',Building2,['admin','hr']],
    ['/nitaqat/employees','الموظفون المحتسبون',Users,['admin','hr','manager']],
    ['/nitaqat/simulation','محاكاة التوطين',Calculator,['admin','hr','manager']],
    ['/nitaqat/rules','متطلبات النطاق',FileText,['admin','hr','manager']],
    ['/nitaqat/history','سجل التغييرات',FileText,['admin','hr','manager']],
    ['/nitaqat/reports','تقارير نطاقات',BarChart3,['admin','hr','manager']],
    ['/nitaqat/settings','إعدادات نطاقات',UserCog,['admin','hr']],
  ]},
  { id:'forms', label:'النماذج والتحقيقات', icon:Files, items:[
    ['/forms','مركز النماذج والتحقيقات',Files,['admin','hr']],
  ]},
  { id:'reports', label:'التقارير والمتابعة', icon:BarChart3, items:[
    ['/reports','التقارير',BarChart3,['admin','hr','manager']],
    ['/reports/initial','تقارير التقييم المبدئي',ClipboardList,['admin','hr','manager']],
  ]},
  { id:'system', label:'إدارة النظام والصلاحيات', icon:UserCog, items:[
    ['/companies','إدارة الشركات',Building2,['admin','hr']],
    ['/users','المستخدمون والصلاحيات',UserCog,['admin']],
  ]},
] as const

const isExternalTokenPage = (pathname: string) => /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) || /^\/forms\/public\/[^/]+\/?$/.test(pathname) || /^\/forms\/investigation\/(respond|review)\/[^/]+\/?$/.test(pathname)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const router=useRouter(); const [role,setRole]=useState<string>(''); const [open,setOpen]=useState(false)
  const [collapsed,setCollapsed]=useState(false)
  const [openSections,setOpenSections]=useState<string[]>([])
  const [isSharedDashboard,setIsSharedDashboard]=useState(false)
  useEffect(()=>{
    const shared=pathname==='/hr/employee-documents' && /^[0-9a-f-]{36}$/i.test(new URLSearchParams(window.location.search).get('share')||'')
    setIsSharedDashboard(shared)
  },[pathname])
  useEffect(()=>{if(pathname!=='/login'&&!isExternalTokenPage(pathname)&&!isSharedDashboard) fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setRole(d?.user?.role||''))},[pathname,isSharedDashboard])
  useEffect(()=>setOpen(false),[pathname])
  async function logout(){await supabase.auth.signOut();await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  const visibleSections=sections.map(s=>({...s,items:s.items.filter(([, , , roles])=>role&&roles.includes(role as never))})).filter(s=>s.items.length)
  useEffect(()=>{const active=visibleSections.find(s=>s.items.some(([href])=>pathname===href||pathname.startsWith(href+'/')));if(active)setOpenSections(v=>v.includes(active.id)?v:[...v,active.id])},[pathname,role])
  if(pathname==='/login'||isExternalTokenPage(pathname)||isSharedDashboard) return <>{children}</>
  const pageTitle=pathname==='/'?'الرئيسية':visibleSections.flatMap(s=>s.items).find(([href])=>pathname===href||pathname.startsWith(href+'/'))?.[1]||'نظام الموارد البشرية'
  const toggleSection=(id:string)=>setOpenSections(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])
  const NavItems=({mobile=false}:{mobile?:boolean})=><div className={mobile?'flex flex-col gap-1':'flex flex-col gap-1'}>
    <Link href="/" className={`nav-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold transition ${pathname==='/'?'bg-[#b88618] text-white shadow-md':'text-slate-100 hover:bg-white/10'}`}><Home size={20}/><span>الرئيسية</span></Link>
    {visibleSections.map(({id,label,icon:SectionIcon,items})=>{const expanded=openSections.includes(id); return <div key={id} className="mt-1">
      <button type="button" onClick={()=>toggleSection(id)} className="sidebar-section-toggle w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-black text-slate-100 hover:bg-white/10">
        <span className="flex items-center gap-3"><SectionIcon size={20}/><span>{label}</span></span><ChevronDown size={18} className={expanded?'rotate-180 transition':'transition'}/>
      </button>
      {expanded&&<div className="sidebar-section-items mr-3 mt-1 border-r border-white/15 pr-2 flex flex-col gap-1">{items.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-item sidebar-subitem flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white shadow-md':'text-slate-300 hover:bg-[#173a59]'}`}><Icon size={17}/><span>{label}</span></Link>)}</div>}
    </div>})}
  </div>
  return <div className={`min-h-screen app-shell ${collapsed?"sidebar-collapsed":""}`}>
    <aside className="hr-sidebar print-hidden">
      <div className="brand-lockup"><div className="brand-mark">HR</div><div><div className="brand-name">HR2</div><div className="brand-sub">Human Resources Operating System</div></div></div><div className="sidebar-section-label">مساحات العمل</div>
      <NavItems />
      <button type="button" onClick={()=>setCollapsed(v=>!v)} className="sidebar-collapse print-hidden" aria-label={collapsed?"توسيع القائمة":"تصغير القائمة"}>{collapsed?<ChevronDown size={18}/>:<ChevronDown size={18} className="rotate-90" />}<span>{collapsed?"توسيع":"تصغير القائمة"}</span></button>
      <button onClick={logout} className="mt-4 w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold text-slate-100 hover:bg-red-500/20 hover:text-white"><LogOut size={20}/>تسجيل الخروج</button>
    </aside>
    <div className="mobile-topbar print-hidden"><button onClick={()=>setOpen(v=>!v)} className="rounded-xl p-2.5 text-white hover:bg-white/10" aria-label="فتح القائمة">{open?<X size={24}/>:<Menu size={24}/>}</button><Link href="/" className="flex items-center gap-2 font-black text-white"><span className="h-9 w-9 rounded-xl bg-[#b88618] grid place-items-center text-sm">HR</span><span>إدارة الموارد البشرية</span></Link></div>
    {open&&<div className="mobile-menu print-hidden"><NavItems mobile/><button onClick={logout} className="mt-3 w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold text-slate-100 hover:bg-red-500/20"><LogOut size={20}/>تسجيل الخروج</button></div>}
    <main className="hr-main">
      <header className="hr-topbar print-hidden">
        <div className="topbar-context"><span className="context-dot"/><div><div className="breadcrumb-kicker">مساحة العمل</div><h1 className="topbar-title truncate">{pageTitle}</h1></div></div>
        <div className="topbar-center"><CommandCenter/></div>
        <div className="topbar-actions"><Link href="/" className="topbar-icon" title="الرئيسية" aria-label="الرئيسية"><Home size={18}/></Link><div className="topbar-user"><span className="topbar-avatar">{role ? role.slice(0,1).toUpperCase() : 'HR'}</span><div className="hidden lg:block"><div className="text-xs text-slate-500">الحساب الحالي</div><div className="text-sm font-black text-[#09233f]">{role==='admin'?'مدير النظام':role==='hr'?'الموارد البشرية':role||'المستخدم'}</div></div></div></div>
      </header>
      <div className="hr-content">{children}</div>
    </main>
    <SessionTimeoutGuard />
    <div className="print-pdf-control print-hidden"><button type="button" onClick={()=>window.print()} title="تصدير الصفحة الحالية إلى PDF بحجم A4" aria-label="تصدير الصفحة الحالية إلى PDF" className="pdf-export-btn"><FileDown size={17}/><span>تصدير PDF</span></button></div>
  </div>
}
