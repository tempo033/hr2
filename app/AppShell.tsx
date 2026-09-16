'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2, FileDown, LogOut, UserCog } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const items = [
  ['/', 'الرئيسية', Home],['/requests', 'طلبات الموارد البشرية', ClipboardList],['/interviews', 'المقابلات والتقييم', Users],['/interviews/links', 'روابط التقييم', Link2],['/hiring-approvals', 'اعتماد التعيين', UserCheck],['/offers', 'العروض الوظيفية', Send],['/onboarding', 'مباشرة العمل', BriefcaseBusiness],['/onboarding/manage', 'إدارة المباشرات', FilePenLine],['/forms', 'مركز النماذج', Files],['/employees', 'ملفات الموظفين', FileText],['/reports', 'التقارير', BarChart3],['/users', 'المستخدمون والصلاحيات', UserCog],
] as const

const isExternalTokenPage = (pathname: string) => /^\/(candidate|evaluation)\/[^/]+\/?$/.test(pathname)

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter()
  if (pathname === '/login' || isExternalTokenPage(pathname)) return <>{children}</>
  async function logout(){await supabase.auth.signOut();await fetch('/api/auth/logout',{method:'POST'});router.replace('/login');router.refresh()}
  return <div className="min-h-screen app-shell"><nav className="sticky top-0 z-50 bg-[#09233f] text-white border-b border-white/10 shadow-sm print-hidden"><div className="max-w-7xl mx-auto px-4 md:px-6"><div className="flex items-center gap-2 overflow-x-auto py-2">{items.map(([href,label,Icon])=><Link key={href} href={href} className={`nav-item shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10 ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white':'text-slate-200'}`}><Icon size={17}/>{label}</Link>)}<button onClick={logout} className="mr-auto shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-red-500/20 hover:text-white" title="تسجيل الخروج"><LogOut size={17}/>خروج</button></div></div></nav><div className="print-pdf-control print-hidden"><button type="button" onClick={()=>window.print()} title="تصدير الصفحة الحالية إلى PDF بحجم A4" aria-label="تصدير الصفحة الحالية إلى PDF" className="pdf-export-btn"><FileDown size={17}/><span>تصدير PDF</span></button></div>{children}</div>
}
