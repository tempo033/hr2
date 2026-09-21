'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2, FileDown, LogOut, UserCog, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const items = [
  ['/', 'الرئيسية', Home, ['admin','hr','interviewer','manager']],
  ['/requests', 'طلبات الموارد البشرية', ClipboardList, ['admin','hr','manager']],
  ['/candidates', 'المرشحون', Users, ['admin','hr','manager','interviewer']],
  ['/rejected-candidates', 'المرشحون غير المقبولين', UserCheck, ['admin','hr','manager','interviewer']],
  ['/interviews', 'المقابلات والتقييم', Users, ['admin','hr','interviewer','manager']],
  ['/interviews/links', 'روابط التقييم', Link2, ['admin','hr','interviewer','manager']],
  ['/hiring-approvals', 'اعتماد التعيين', UserCheck, ['admin','hr','manager']],
  ['/offers', 'العروض الوظيفية', Send, ['admin','hr','manager']],
  ['/onboarding', 'مباشرة العمل', BriefcaseBusiness, ['admin','hr']],
  ['/onboarding/manage', 'إدارة المباشرات', FilePenLine, ['admin','hr']],
  ['/forms', 'مركز النماذج', Files, ['admin','hr']],
  ['/employees', 'ملفات الموظفين', FileText, ['admin','hr']],
  ['/reports', 'التقارير', BarChart3, ['admin','hr','manager']],
  ['/reports/initial', 'تقارير التقييم المبدئي', ClipboardList, ['admin','hr','manager']],
  ['/users', 'المستخدمون والصلاحيات', UserCog, ['admin']],
] as const
const isExternalTokenPage = (pathname: string) => /^\/(candidate|evaluation|offer)\/[^/]+\/?$/.test(pathname) || /^\/forms\/public\/[^/]+\/?$/.test(pathname)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const router=useRouter(); const [role,setRole]=useState<string>(''); const [open,setOpen]=useState(false)
  useEffect(()=>{if(pathname!=='/login'&&!isExternalTokenPage(pathname)) fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setRole(d?.user?.role||''))},[pathname])
  useEffect(()=>setOpen(false),[pathname])
  if(pathname==='/login'||isExternalTokenPage(pathname)) return <>{children}</>
  async function logout(){await supabase.auth.signOut();await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  const visibleItems=items.filter(([, , , roles])=>role && roles.includes(role as never))
  const NavItems=({mobile=false}:{mobile?:boolean})=><div className={mobile?'flex flex-col gap-1.5':'flex flex-col gap-1.5'}>{visibleItems.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-extrabold transition ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white shadow-md':'text-slate-100 hover:bg-white/10'}`}><Icon size={20}/><span>{label}</span></Link>)}</div>
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
