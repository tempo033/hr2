'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2, FileDown, LogOut, UserCog } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const items = [
  ['/', 'الرئيسية', Home, ['admin','hr','interviewer','manager']],['/requests', 'طلبات الموارد البشرية', ClipboardList, ['admin','hr','manager']],['/interviews', 'المقابلات والتقييم', Users, ['admin','hr','interviewer','manager']],['/interviews/links', 'روابط التقييم', Link2, ['admin','hr','interviewer','manager']],['/hiring-approvals', 'اعتماد التعيين', UserCheck, ['admin','hr','manager']],['/offers', 'العروض الوظيفية', Send, ['admin','hr','manager']],['/onboarding', 'مباشرة العمل', BriefcaseBusiness, ['admin','hr']],['/onboarding/manage', 'إدارة المباشرات', FilePenLine, ['admin','hr']],['/forms', 'مركز النماذج', Files, ['admin','hr']],['/employees', 'ملفات الموظفين', FileText, ['admin','hr']],['/reports', 'التقارير', BarChart3, ['admin','hr','manager']],['/users', 'المستخدمون والصلاحيات', UserCog, ['admin']],
] as const
const isExternalTokenPage = (pathname: string) => /^\/(candidate|evaluation)\/[^/]+\/?$/.test(pathname)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const router=useRouter(); const [role,setRole]=useState<string>('')
  useEffect(()=>{if(pathname!=='/login'&&!isExternalTokenPage(pathname)) fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setRole(d?.user?.role||''))},[pathname])
  if(pathname==='/login'||isExternalTokenPage(pathname)) return <>{children}</>
  async function logout(){await supabase.auth.signOut();await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  const visibleItems=items.filter(([, , , roles])=>role && roles.includes(role as never))
  return <div className="min-h-screen app-shell"><nav className="sticky top-0 z-50 bg-[#09233f] text-white border-b border-white/10 shadow-sm print-hidden"><div className="max-w-7xl mx-auto px-4 md:px-6"><div className="flex items-center gap-2 overflow-x-auto py-2">{visibleItems.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-item shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10 ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white':'text-slate-200'}`}><Icon size={17}/>{label}</Link>)}<button onClick={logout} className="mr-auto shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-red-500/20 hover:text-white" title="تسجيل الخروج"><LogOut size={17}/>خروج</button></div></div></nav><div className="print-pdf-control print-hidden"><button type="button" onClick={()=>window.print()} title="تصدير الصفحة الحالية إلى PDF بحجم A4" aria-label="تصدير الصفحة الحالية إلى PDF" className="pdf-export-btn"><FileDown size={17}/><span>تصدير PDF</span></button></div>{children}</div>
}
