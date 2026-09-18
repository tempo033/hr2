'use client'
import Link from 'next/link'
import {FileText,ClipboardCheck,UserRoundCheck,WalletCards,ArrowLeft,Database,Layers,Link2,Copy} from 'lucide-react'
import {useState} from 'react'

const forms=[
 {href:'/forms/unified',title:'بوابة النماذج الموحدة (مباشرة وعرض عمل)',desc:'واجهة تبويبات موحدة تجمع نموذج مباشرة العمل وعرض العمل ونماذج الإجازات.',icon:Layers,badge:'موحد'},
 {href:'/offers',title:'العروض الوظيفية',desc:'إدارة وإصدار عروض العمل الرسمية المرتبطة بالمرشحين.',icon:FileText},
 {href:'/onboarding/manage',title:'مباشرة العمل',desc:'إنشاء وتعديل وطباعة نماذج مباشرة العمل وربطها ببيانات الموظف.',icon:UserRoundCheck},
 {href:'/forms/leave',title:'طلب الإجازة',desc:'نموذج طلب إجازة قابل للتحرير والطباعة بصيغة A4.',icon:ClipboardCheck,external:'leave'},
 {href:'/forms/clearance',title:'إخلاء الطرف',desc:'نموذج إخلاء طرف متعدد الجهات مع التوقيعات.',icon:ClipboardCheck,external:'clearance'},
 {href:'/forms/advance',title:'طلب سلفة مالية',desc:'نموذج طلب سلفة مالية مع بيانات الموظف والاعتمادات.',icon:WalletCards,external:'advance'},
 {href:'/forms/records',title:'سجل النماذج',desc:'عرض ومتابعة جميع النماذج المحفوظة وروابط النماذج الخارجية وبيانات الوصول.',icon:Database}
]
export default function FormsHub(){
 const [link,setLink]=useState(''); const [busy,setBusy]=useState('')
 const create=async(kind:string)=>{setBusy(kind);const r=await fetch('/api/forms/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({form_type:kind})});const d=await r.json();if(!r.ok){alert(d.error||'تعذر إنشاء الرابط');setBusy('');return}const u=location.origin+'/forms/public/'+d.link.token;setLink(u);await navigator.clipboard?.writeText(u);setBusy('')}
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8"><div className="max-w-7xl mx-auto">
 <header className="flex items-center justify-between gap-4 mb-8"><div><div className="text-[#b88618] font-bold">الموارد البشرية</div><h1 className="text-3xl font-black text-[#09233f]">مركز النماذج</h1><p className="text-slate-500 mt-1">نماذج الموارد البشرية مع روابط خارجية مستقلة وآمنة.</p></div><Link href="/" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ArrowLeft size={17}/> الرئيسية</Link></header>
 <div className="bg-[#09233f] text-white rounded-2xl p-5 mb-6"><div className="flex items-center gap-3"><Link2 className="text-[#d4a72c]"/><div><h2 className="font-black text-lg">روابط النماذج الخارجية</h2><p className="text-slate-300 text-sm mt-1">أنشئ رابطًا مستقلًا لكل نموذج، وأرسله للشخص المطلوب. عند الفتح والإرسال يتم تسجيل بيانات الوصول في سجل النماذج.</p></div></div><div className="grid md:grid-cols-3 gap-3 mt-5">{[['leave','طلب إجازة'],['clearance','إخلاء طرف'],['advance','طلب سلفة مالية']].map(([k,l])=><button key={k} disabled={busy===k} onClick={()=>create(k)} className="bg-white text-[#09233f] rounded-xl px-4 py-3 font-black disabled:opacity-60">{busy===k?'جارٍ الإنشاء...':<>إنشاء رابط {l}</>}</button>)}</div>{link&&<div className="mt-4 bg-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-2 items-center"><span className="text-xs break-all flex-1" dir="ltr">{link}</span><button onClick={()=>navigator.clipboard?.writeText(link)} className="bg-[#b88618] rounded-lg px-3 py-2 font-bold inline-flex gap-1"><Copy size={15}/> نسخ</button></div>}</div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{forms.map(({href,title,desc,icon:Icon,badge})=><Link key={href} href={href} className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition relative overflow-hidden ${badge?'border-[#b88618] bg-[#fffdf9]':'border-slate-200'}`}>{badge&&<div className="absolute top-3 left-3 bg-[#b88618] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</div>}<div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center mb-4"><Icon size={23}/></div><h2 className="text-xl font-black text-[#09233f]">{title}</h2><p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p><div className="text-[#b88618] font-bold mt-5 text-sm">فتح النموذج ←</div></Link>)}</div>
 </div></main>
}
