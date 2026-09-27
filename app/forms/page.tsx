'use client'

import Link from 'next/link'
import { FileText, ClipboardCheck, UserRoundCheck, WalletCards, ArrowLeft, Database, Layers, Scale } from 'lucide-react'

const forms = [
  { href: '/forms/leave', key: 'leave', title: 'طلب إجازة', desc: 'إدارة طلبات الإجازة والطلبات المرسلة عبر الروابط الخارجية.', icon: ClipboardCheck },
  { href: '/forms/clearance', key: 'clearance', title: 'إخلاء الطرف', desc: 'متابعة نماذج إخلاء الطرف والطلبات المرسلة عبر الروابط الخارجية.', icon: FileText },
  { href: '/forms/advance', key: 'advance', title: 'طلب سلفة مالية', desc: 'إنشاء ومتابعة طلبات السلف المالية، وتكون روابط الاعتماد خاصة بكل طلب داخل سجله.', icon: WalletCards },
  { href: '/onboarding/manage', key: 'onboarding', title: 'مباشرة العمل', desc: 'إنشاء وتعديل وطباعة نماذج مباشرة العمل.', icon: UserRoundCheck },
  { href: '/offers', key: 'offers', title: 'العروض الوظيفية', desc: 'إدارة وإصدار عروض العمل المرتبطة بالمرشحين.', icon: FileText },
  { href: '/forms/unified', key: 'unified', title: 'النماذج الموحدة', desc: 'الوصول إلى الواجهة الموحدة للنماذج الداخلية.', icon: Layers },
  { href: '/forms/investigation', key: 'investigation', title: 'تحقيق إداري', desc: 'اختيار الموظف، تحديد موضوع التحقيق، إعداد الأسئلة وتحليل الإجابات والخيارات التأديبية.', icon: Scale },
]

export default function FormsHub() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-[#b88618] font-bold">الموارد البشرية</div>
            <h1 className="text-3xl font-black text-[#09233f]">مركز النماذج</h1>
            <p className="text-slate-500 mt-1">كل نموذج له صفحة مستقلة وسجل مستقل وروابط خاصة بكل طلب.</p>
          </div>
          <Link href="/" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center">
            <ArrowLeft size={17} /> الرئيسية
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map(({ href, key, title, desc, icon: Icon }) => (
            <section key={key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <Link href={href} className="block">
                <div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center mb-4">
                  <Icon size={23} />
                </div>
                <h2 className="text-xl font-black text-[#09233f]">{title}</h2>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p>
              </Link>

              <div className="mt-4">
                <Link
                  href={
                    key === 'leave'
                      ? '/forms/leave/records'
                      : key === 'clearance'
                        ? '/forms/clearance/records'
                        : key === 'advance'
                          ? '/forms/advance/records'
                          : '/forms/records'
                  }
                  className="text-[#b88618] font-bold text-sm"
                >
                  فتح صفحة وسجل {title} ←
                </Link>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-7 bg-white border rounded-2xl p-5">
          <Link href="/forms/records" className="font-black text-[#09233f] inline-flex items-center gap-2">
            <Database size={18} /> سجل النماذج العام ←
          </Link>
        </div>
      </div>
    </main>
  )
}
