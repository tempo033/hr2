'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Users, UserCheck, BriefcaseBusiness, FileText, Send, FilePenLine, BarChart3, Files, Link2 } from 'lucide-react'
const items = [
  ['/', 'الرئيسية', Home],['/requests', 'طلبات الموارد البشرية', ClipboardList],['/interviews', 'المقابلات والتقييم', Users],['/interviews/links', 'روابط التقييم', Link2],['/hiring-approvals', 'اعتماد التعيين', UserCheck],['/offers', 'العروض الوظيفية', Send],['/onboarding', 'مباشرة العمل', BriefcaseBusiness],['/onboarding/manage', 'إدارة المباشرات', FilePenLine],['/forms', 'مركز النماذج', Files],['/employees', 'ملفات الموظفين', FileText],['/reports', 'التقارير', BarChart3],
] as const
export default function AppShell({ children }: { children: React.ReactNode }) { const pathname=usePathname();const publicPage=pathname.startsWith('/candidate/')||pathname.startsWith('/offer/')||pathname.startsWith('/evaluation/');if(publicPage)return <>{children}</>;return <div className="min-h-screen"><nav className="sticky top-0 z-50 bg-[#09233f] text-white border-b border-white/10 shadow-sm"><div className="max-w-7xl mx-auto px-4 md:px-6"><div className="flex items-center gap-2 overflow-x-auto py-2">{items.map(([href,label,Icon])=><Link key={href} href={href} className={`shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/10 ${pathname===href||pathname.startsWith(href+'/')?'bg-[#b88618] text-white':'text-slate-200'}`}><Icon size={17}/>{label}</Link>)}</div></div></nav>{children}</div> }
