import Link from 'next/link';
import { BriefcaseBusiness, GraduationCap, ClipboardCheck, UserRoundCheck, ArrowLeft, FilePlus2, UserPlus, Layers, FileText } from 'lucide-react';

const cards = [
  ['توظيف', 'إنشاء طلب توظيف وتحديد المتطلبات وتحليل المرشحين', BriefcaseBusiness, '/requests/new'],
  ['تدريب', 'إدارة طلبات وبرامج التدريب والمتدربين', GraduationCap, '/requests/new'],
  ['تجربة', 'طلبات التجربة والتقييم الأولي للمرشحين', ClipboardCheck, '/requests/new'],
  ['تقييم', 'إنشاء طلبات تقييم ومقارنة النتائج', UserRoundCheck, '/requests/new']
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-white border-b px-6 md:px-10 py-5 flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-500">نظام إدارة الموارد البشرية والتوظيف</p>
          <h1 className="text-xl font-bold text-[#09233f]">شركة البنية الأساسية للمقاولات</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/forms/unified" className="border border-[#b88618] text-[#b88618] bg-amber-50/50 hover:bg-amber-100 rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 text-sm transition">
            <Layers size={17} /> النماذج الموحدة
          </Link>
          <Link href="/requests/new" className="btn-gold rounded-xl px-5 py-2.5 font-bold flex items-center gap-2 text-sm shadow">
            <FilePlus2 size={18} /> إنشاء طلب جديد
          </Link>
        </div>
      </header>

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-[#09233f]">بوابة العمليات المتكاملة</h2>
          <p className="text-slate-500 mt-2">أنشئ الطلب، حدد متطلباته، أجرِ المقابلات وجدول Google Meet، قيّم هرمياً، واعتمد التعيين ومباشرة العمل.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map(([title, desc, Icon, href]) => (
            <Link key={title} href={href} className="card p-6 hover:-translate-y-1 transition bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center">
                <Icon size={25} />
              </div>
              <h3 className="font-bold text-lg mt-5 text-[#09233f]">{title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-6">{desc}</p>
              <div className="mt-5 text-[#b88618] flex items-center gap-2 text-sm font-bold">ابدأ الآن <ArrowLeft size={16} /></div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-8">
          <Link href="/forms/unified" className="card p-6 flex flex-col md:flex-row justify-between gap-4 items-center border-2 border-[#b88618] bg-amber-50/30 hover:-translate-y-0.5 transition rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#b88618] text-white flex items-center justify-center shrink-0"><Layers size={24} /></div>
              <div>
                <div className="text-xs text-[#b88618] font-bold">بوابة النماذج الموحدة (hrform)</div>
                <h3 className="font-black text-xl text-[#09233f]">مباشرة العمل وعرض العمل</h3>
                <p className="text-sm text-slate-600 mt-1">واجهة تبويبات كاملة لنماذج مباشرة العمل وعروض العمل مع التحرير والطباعة A4.</p>
              </div>
            </div>
            <span className="btn-gold rounded-xl px-5 py-3 font-bold flex items-center gap-2 text-sm shrink-0">فتح النماذج <ArrowLeft size={17} /></span>
          </Link>

          <Link href="/interviews" className="card p-6 flex flex-col md:flex-row justify-between gap-4 items-center border-2 border-[#09233f]/20 hover:-translate-y-0.5 transition rounded-2xl bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center shrink-0"><ClipboardCheck size={24} /></div>
              <div>
                <div className="text-xs text-[#b88618] font-bold">نظام المقابلات والتقييم الهرمي</div>
                <h3 className="font-black text-xl text-[#09233f]">المقابلات والتقييم الهرمي (4 مراحل)</h3>
                <p className="text-sm text-slate-500 mt-1">توليد روابط Google Meet، تسلسل HR ← الإدارة المختصة ← الإدارة ← المدير العام.</p>
              </div>
            </div>
            <span className="btn-primary rounded-xl px-5 py-3 font-bold flex items-center gap-2 text-sm shrink-0">المقابلات <ArrowLeft size={17} /></span>
          </Link>

          <Link href="/offers" className="card p-6 flex flex-col md:flex-row justify-between gap-4 items-center border-2 border-green-200 hover:-translate-y-0.5 transition rounded-2xl bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0"><FileText size={24} /></div>
              <div>
                <div className="text-xs text-green-700 font-bold">عروض العمل والتوقيع</div>
                <h3 className="font-black text-xl text-[#09233f]">عروض العمل والتوقيع الإلكتروني</h3>
                <p className="text-sm text-slate-500 mt-1">إرسال روابط العروض للمرشحين وتتبع قبولهم وتوقيعاتهم مع إظهار الموافقة الرسمية.</p>
              </div>
            </div>
            <span className="rounded-xl px-5 py-3 font-bold flex items-center gap-2 bg-green-600 text-white text-sm shrink-0">العروض <ArrowLeft size={17} /></span>
          </Link>

          <Link href="/onboarding" className="card p-6 flex flex-col md:flex-row justify-between gap-4 items-center border-2 border-blue-200 hover:-translate-y-0.5 transition rounded-2xl bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0"><UserPlus size={24} /></div>
              <div>
                <div className="text-xs text-blue-700 font-bold">إجراءات المباشرة</div>
                <h3 className="font-black text-xl text-[#09233f]">مباشرة العمل وملف الموظف</h3>
                <p className="text-sm text-slate-500 mt-1">تجهيز رقم الموظف والوظيفة والمشروع وتاريخ المباشرة وبيانات ملف الموظف.</p>
              </div>
            </div>
            <span className="rounded-xl px-5 py-3 font-bold flex items-center gap-2 bg-blue-600 text-white text-sm shrink-0">المباشرة <ArrowLeft size={17} /></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
