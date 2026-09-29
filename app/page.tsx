import Link from 'next/link';
import { BriefcaseBusiness, GraduationCap, ClipboardCheck, UserRoundCheck, ArrowLeft, FilePlus2, UserPlus, Layers, FileText, Calculator, Sparkles, ShieldCheck } from 'lucide-react';

const cards = [
  ['توظيف', 'إنشاء طلب توظيف وتحديد المتطلبات وتحليل المرشحين', BriefcaseBusiness, '/requests/new'],
  ['تدريب', 'إدارة طلبات وبرامج التدريب والمتدربين', GraduationCap, '/requests/new'],
  ['تجربة', 'طلبات التجربة والتقييم الأولي للمرشحين', ClipboardCheck, '/requests/new'],
  ['تقييم', 'إنشاء طلبات تقييم ومقارنة النتائج', UserRoundCheck, '/requests/new']
] as const;

const quickLinks = [
  ['/nitaqat','حاسبة نطاقات','التوطين ومحاكاة النطاقات',Calculator],
  ['/forms/unified','النماذج الموحدة','مباشرة العمل وعروض العمل',Layers],
  ['/interviews','المقابلات والتقييم','المقابلات والتقييم الهرمي',ClipboardCheck],
  ['/offers','العروض الوظيفية','إدارة العروض والتوقيع',FileText],
  ['/onboarding','مباشرة العمل','إجراءات المباشرة وملف الموظف',UserPlus],
] as const;

export default function Home() {
  return (
    <main dir="rtl" className="min-h-[calc(100vh-76px)]">
      <div className="max-w-[1700px] mx-auto px-5 md:px-8 xl:px-10 py-7 md:py-9">
        <section className="relative overflow-hidden rounded-[26px] bg-[#081f38] text-white p-7 md:p-10 shadow-[0_20px_55px_rgba(8,31,56,.18)] mb-7">
          <div className="absolute -left-20 -top-24 w-72 h-72 rounded-full bg-[#c49a32]/15 blur-3xl" />
          <div className="absolute right-1/3 -bottom-28 w-80 h-80 rounded-full bg-[#2f6d9e]/20 blur-3xl" />
          <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black text-[#f1d98d]">
                <Sparkles size={14}/> Enterprise HR Workspace
              </div>
              <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-tight leading-tight">بوابة العمليات المتكاملة</h2>
              <p className="mt-4 text-sm md:text-base leading-7 text-slate-300 max-w-2xl">منصة موحدة لإدارة التوظيف والموظفين والتوطين والرواتب والنماذج والتقارير، بواجهة واحدة واضحة وسريعة.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/requests/new" className="inline-flex items-center gap-2 rounded-xl bg-[#c49a32] text-white px-5 py-3 font-black shadow-lg shadow-black/15 hover:brightness-105">
                <FilePlus2 size={18}/> إنشاء طلب جديد
              </Link>
              <Link href="/employees" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-5 py-3 font-black text-white hover:bg-white/12">
                <UserPlus size={18}/> ملفات الموظفين
              </Link>
            </div>
          </div>
          <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[['العمليات','التوظيف والموظفين'],['التوطين','نطاقات ومحاكاة'],['الإدارة','تقارير ونماذج']].map(([a,b])=>
              <div key={a} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="text-[11px] font-bold text-slate-400">{a}</div><div className="mt-1 font-black">{b}</div></div>
            )}
          </div>
        </section>

        <section className="mb-7">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div><div className="text-xs font-black text-[#c49a32]">WORKFLOW</div><h3 className="text-2xl font-black text-[#081f38] mt-1">ابدأ من هنا</h3></div>
            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-slate-400"><ShieldCheck size={15}/> تجربة استخدام موحدة</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map(([title, desc, Icon, href], i) => (
              <Link key={title} href={href} className="group card p-5 bg-white rounded-[20px] border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#081f38] text-[#e4c66e] flex items-center justify-center shadow-sm"><Icon size={23}/></div>
                  <span className="text-[11px] font-black text-slate-300">0{i+1}</span>
                </div>
                <h4 className="font-black text-lg mt-5 text-[#081f38]">{title}</h4>
                <p className="text-sm text-slate-500 mt-2 leading-6 min-h-12">{desc}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-[#b88618] text-sm font-black group-hover:gap-3 transition-all">ابدأ الآن <ArrowLeft size={16}/></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid xl:grid-cols-[1.45fr_.85fr] gap-5">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 md:p-6 shadow-[0_10px_35px_rgba(8,31,56,.055)]">
            <div className="flex items-center justify-between mb-5"><div><div className="text-xs font-black text-[#c49a32]">QUICK ACCESS</div><h3 className="text-xl font-black text-[#081f38] mt-1">الوحدات الرئيسية</h3></div><Layers size={21} className="text-slate-300"/></div>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickLinks.map(([href,title,desc,Icon])=>(
                <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 hover:border-[#d8c17b] hover:bg-[#fbfaf5] transition">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-[#f7f0dc] text-[#9b751f] grid place-items-center"><Icon size={20}/></div>
                  <div className="min-w-0 flex-1"><div className="font-black text-[#081f38]">{title}</div><div className="text-xs text-slate-500 mt-1">{desc}</div></div>
                  <ArrowLeft size={16} className="text-slate-300 group-hover:text-[#b88618] group-hover:-translate-x-1 transition"/>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/nitaqat" className="group rounded-[22px] bg-gradient-to-br from-[#fbf5e5] to-white border border-[#dfc77f] p-6 shadow-[0_10px_35px_rgba(8,31,56,.055)] hover:-translate-y-1 transition">
            <div className="w-14 h-14 rounded-2xl bg-[#081f38] text-[#e4c66e] grid place-items-center"><Calculator size={28}/></div>
            <div className="text-xs font-black text-[#b88618] mt-6">التوطين</div>
            <h3 className="text-2xl font-black text-[#081f38] mt-1">حاسبة نطاقات</h3>
            <p className="text-sm text-slate-600 leading-7 mt-3">متابعة التوطين ومحاكاة التوظيف وقواعد النشاط والتقارير من مساحة واحدة.</p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#081f38] text-white px-4 py-2.5 text-sm font-black">فتح الوحدة <ArrowLeft size={16}/></span>
          </Link>
        </section>
      </div>
    </main>
  );
}
