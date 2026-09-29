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

   <aside className="attention-panel">
    <div className="panel-head"><div><span className="eyebrow">ATTENTION</span><h2>مساحة المتابعة</h2></div><ShieldAlert size={19}/></div>
    <div className="attention-empty"><div className="attention-mark">!</div><strong>ابدأ من مركز الأوامر</strong><p>ابحث عن موظف أو شركة أو افتح إحدى مساحات العمل لمتابعة العناصر التي تحتاج إجراء.</p><button onClick={()=>document.querySelector<HTMLButtonElement>('.command-trigger')?.click()}>فتح البحث السريع <Search size={15}/></button></div>
    <div className="recent-note"><span>الوصول السريع</span><Link href="/reports">فتح التقارير <ArrowLeft size={14}/></Link></div>
   </aside>
  </div>
 </main>
}