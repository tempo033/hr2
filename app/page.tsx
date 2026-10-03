'use client'
import {useEffect,useState} from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, BriefcaseBusiness, Building2, Calculator, ClipboardCheck, FileText, UserPlus, Users, WalletCards, ShieldAlert, Search } from 'lucide-react';

const workspaces=[
 {title:'الموظفون',desc:'ملفات الموظفين والوثائق والإجراءات',href:'/employees',icon:Users},
 {title:'التوظيف',desc:'الطلبات والمرشحون والمقابلات',href:'/requests',icon:BriefcaseBusiness},
 {title:'الرواتب',desc:'المسيرات والبدلات والخصومات',href:'/payroll',icon:WalletCards},
 {title:'الإقامات',desc:'متابعة الوثائق والاستحقاقات',href:'/hr/employee-documents',icon:FileText},
 {title:'نطاقات',desc:'التوطين والمحاكاة والتقارير',href:'/nitaqat',icon:Calculator},
 {title:'النماذج والتحقيقات',desc:'النماذج الداخلية والسجلات',href:'/forms',icon:ClipboardCheck},
];

const actions=[
 ['موظف جديد','إنشاء ملف موظف','/employees',UserPlus],
 ['شركة','إدارة الشركات','/companies',Building2],
 ['مسير رواتب','فتح مسيرات الرواتب','/payroll/runs',WalletCards],
 ['تحقيق إداري','بدء محضر تحقيق','/forms/investigation',ShieldAlert],
];

export default function Home(){
 const[statusCounts,setStatusCounts]=useState({فعال:0,'إجازة':0,'غير فعال':0,'تم إنهاء خدماته':0});
 useEffect(()=>{fetch('/api/employees/data',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(b=>{const rows=b?.employees||[];setStatusCounts({فعال:rows.filter((e:any)=>e.employee_status==='فعال').length,'إجازة':rows.filter((e:any)=>e.employee_status==='إجازة').length,'غير فعال':rows.filter((e:any)=>e.employee_status==='غير فعال').length,'تم إنهاء خدماته':rows.filter((e:any)=>e.employee_status==='تم إنهاء خدماته').length})}).catch(()=>{})},[])
 return <main dir="rtl" className="hr-home">
  <div className="home-grid">
   <header className="home-intro">
    <div><div className="hr-page-kicker">HR2 / CONTROL CENTER</div><h1>مركز تشغيل الموارد البشرية</h1><p>مساحة عمل موحدة للوصول إلى العمليات اليومية، الملفات، الرواتب، التوظيف والمتابعة.</p></div>
    <div className="home-search-hint"><Search size={17}/><span>استخدم البحث السريع من أعلى الشاشة</span><kbd>Ctrl K</kbd></div>
   </header>

   <section className="control-strip">
    <div className="control-main"><span className="eyebrow">مساحة العمل</span><strong>ما الذي تريد إنجازه الآن؟</strong><span className="muted">ابدأ من الإجراء أو الوحدة بدل التنقل بين قوائم كثيرة.</span></div>
    <div className="control-actions">{actions.map(([t,d,href,Icon])=>{const I=Icon as any;return <Link key={t as string} href={href as string} className="action-line"><span className="action-icon"><I size={18}/></span><span><b>{t as string}</b><small>{d as string}</small></span><ArrowLeft size={15}/></Link>})}</div>
   </section>

   <section className="workspace-panel">
    <div className="panel-head"><div><span className="eyebrow">WORKSPACES</span><h2>مساحات HR2</h2></div><span className="panel-meta"><Activity size={14}/> منظومة واحدة</span></div>
    <div className="workspace-list">{workspaces.map(({title,desc,href,icon:Icon},i)=><Link key={title} href={href} className="workspace-row"><span className="workspace-index">{String(i+1).padStart(2,'0')}</span><span className="workspace-icon"><Icon size={19}/></span><span className="workspace-copy"><b>{title}</b><small>{desc}</small></span><ArrowLeft className="workspace-arrow" size={17}/></Link>)}</div>
   </section>

   <section className="workspace-panel">
    <div className="panel-head"><div><span className="eyebrow">EMPLOYEE STATUS</span><h2>حالات الموظفين</h2></div><Link href="/employees" className="text-sm font-bold text-[#b88618]">فتح ملفات الموظفين</Link></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
     <div className="rounded-xl border bg-emerald-50 p-4"><small className="block text-slate-500">فعال</small><strong className="text-2xl text-emerald-700">{statusCounts['فعال']}</strong></div>
     <div className="rounded-xl border bg-amber-50 p-4"><small className="block text-slate-500">إجازة</small><strong className="text-2xl text-amber-700">{statusCounts['إجازة']}</strong></div>
     <div className="rounded-xl border bg-slate-100 p-4"><small className="block text-slate-500">غير فعال</small><strong className="text-2xl text-slate-700">{statusCounts['غير فعال']}</strong></div>
     <div className="rounded-xl border bg-red-50 p-4"><small className="block text-slate-500">تم إنهاء خدماته</small><strong className="text-2xl text-red-700">{statusCounts['تم إنهاء خدماته']}</strong></div>
    </div>
   </section>

   <aside className="attention-panel">
    <div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h2>مساحة المتابعة</h2></div><ShieldAlert size={19}/></div>
    <div className="attention-empty"><div className="attention-mark">!</div><strong>ابدأ من مركز الأوامر</strong><p>ابحث عن موظف أو شركة أو افتح إحدى مساحات العمل لمتابعة العناصر التي تحتاج إجراء.</p><button onClick={()=>document.querySelector<HTMLButtonElement>('.command-trigger')?.click()}>فتح البحث السريع <Search size={15}/></button></div>
    <div className="recent-note"><span>الوصول السريع</span><Link href="/reports">فتح التقارير <ArrowLeft size={14}/></Link></div>
   </aside>
  </div>
 </main>
}