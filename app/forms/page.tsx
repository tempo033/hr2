'use client'

import Link from 'next/link'
import { FileText, ClipboardCheck, UserRoundCheck, WalletCards, ArrowLeft, Database, Layers } from 'lucide-react'

const forms = [
  {
    href: '/forms/unified',
    title: 'بوابة النماذج الموحدة (مباشرة وعرض عمل)',
    desc: 'واجهة تبويبات موحدة تجمع نموذج مباشرة العمل وعرض العمل ونماذج الإجازات مطابقة لهيكل hrform مع إمكانية التحرير والطباعة.',
    icon: Layers,
    badge: 'جديد وموحد'
  },
  {
    href: '/offers',
    title: 'العروض الوظيفية',
    desc: 'إدارة وإصدار عروض العمل الرسمية المرتبطة بالمرشحين وتتبع التوقيع الإلكتروني.',
    icon: FileText
  },
  {
    href: '/onboarding/manage',
    title: 'مباشرة العمل',
    desc: 'إنشاء وتعديل وطباعة نماذج مباشرة العمل وربطها ببيانات الموظف.',
    icon: UserRoundCheck
  },
  {
    href: '/forms/leave',
    title: 'طلب الإجازة',
    desc: 'نموذج طلب إجازة قابل للتحرير والطباعة بصيغة A4.',
    icon: ClipboardCheck
  },
  {
    href: '/forms/clearance',
    title: 'إخلاء الطرف',
    desc: 'نموذج إخلاء طرف متعدد الجهات مع التوقيعات.',
    icon: ClipboardCheck
  },
  {
    href: '/forms/advance',
    title: 'طلب سلفة مالية',
    desc: 'نموذج طلب سلفة مالية مع بيانات الموظف والاعتمادات.',
    icon: WalletCards
  },
  {
    href: '/forms/records',
    title: 'سجل النماذج',
    desc: 'عرض ومتابعة جميع النماذج المحفوظة في قاعدة البيانات.',
    icon: Database
  }
]

export default function FormsHub() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-[#b88618] font-bold">الموارد البشرية</div>
            <h1 className="text-3xl font-black text-[#09233f]">مركز النماذج</h1>
            <p className="text-slate-500 mt-1">جميع نماذج الموارد البشرية وعروض العمل في مكان واحد متكامل.</p>
          </div>
          <Link href="/" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center hover:bg-slate-50">
            <ArrowLeft size={17} /> الرئيسية
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map(({ href, title, desc, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition relative overflow-hidden ${
                badge ? 'border-[#b88618] bg-[#fffdf9]' : 'border-slate-200'
              }`}
            >
              {badge && (
                <div className="absolute top-3 left-3 bg-[#b88618] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {badge}
                </div>
              )}
              <div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center mb-4">
                <Icon size={23} />
              </div>
              <h2 className="text-xl font-black text-[#09233f]">{title}</h2>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p>
              <div className="text-[#b88618] font-bold mt-5 text-sm">فتح النموذج ←</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
