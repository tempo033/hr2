'use client'
import Link from 'next/link'
import {FileText,ClipboardCheck,UserRoundCheck,WalletCards,ArrowLeft,Database,Layers,Link2,Copy,ExternalLink} from 'lucide-react'
import {useEffect,useState} from 'react'

const forms=[
 {href:'/forms/leave',key:'leave',title:'طلب إجازة',desc:'إدارة طلبات الإجازة والطلبات المرسلة عبر الرابط الخارجي.',icon:ClipboardCheck},
 {href:'/forms/clearance',key:'clearance',title:'إخلاء الطرف',desc:'متابعة نماذج إخلاء الطرف والطلبات المرسلة من الروابط الخارجية.',icon:FileText},
 {href:'/forms/advance',key:'advance',title:'طلب سلفة مالية',desc:'إدارة طلبات السلف المالية ومتابعة النماذج المرسلة.',icon:WalletCards},
 {href:'/onboarding/manage',key:'onboarding',title:'مباشرة العمل',desc:'إنشاء وتعديل وطباعة نماذج مباشرة العمل.',icon:UserRoundCheck},
 {href:'/offers',key:'offers',title:'العروض الوظيفية',desc:'إدارة وإصدار عروض العمل المرتبطة بالمرشحين.',icon:FileText},
 {href:'/forms/unified',key:'unified',title:'النماذج الموحدة',desc:'الوصول إلى الواجهة الموحدة للنماذج الداخلية.',icon:Layers},
]
const labels:Record<string,string>={leave:'طلب إجازة',clearance:'إخلاء الطرف',advance:'طلب سلفة مالية'}
export default function FormsHub(){
 const [links,setLinks]=useState<Record<string,any>>({}); const [busy,setBusy]=useState(''); const [copied,setCopied]=useState('')
 const load=async()=>{const r=await fetch('/api/forms/links',{cache:'no-store'});const d=await r.json();const m:Record<string,any>={};(d.links||[]).forEach((x:any)=>{if(!m[x.form_type])m[x.form_type]=x});setLinks(m)}
 useEffect(()=>{load()},[])
 const create=async(kind:string)=>{setBusy(kind);const r=await fetch('/api/forms/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({form_type:kind})});const d=await r.json();if(!r.ok){alert(d.error||'تعذر إنشاء الرابط');setBusy('');return}setLinks((p:any)=>({...p,[kind]:d.link}));setBusy('');await navigator.clipboard?.writeText(location.origin+'/forms/public/'+d.link.token);setCopied(kind);setTimeout(()=>setCopied(''),1800)}
 const copy=async(token:string,key:string)=>{await navigator.clipboard?.writeText(location.origin+'/forms/public/'+token);setCopied(key);setTimeout(()=>setCopied(''),1800)}
 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8"><div className="max-w-7xl mx-auto">
 <header className="flex items-center justify-between gap-4 mb-8"><div><div className="text-[#b88618] font-bold">الموارد البشرية</div><h1 className="text-3xl font-black text-[#09233f]">مركز النماذج</h1><p className="text-slate-500 mt-1">كل نموذج له صفحة مستقلة وسجل مستقل وروابط خارجية خاصة به.</p></div><Link href="/" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ArrowLeft size={17}/> الرئيسية</Link></header>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{forms.map(({href,key,title,desc,icon:Icon})=>{const l=links[key];return <section key={key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"><Link href={href} className="block"><div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center mb-4"><Icon size={23}/></div><h2 className="text-xl font-black text-[#09233f]">{title}</h2><p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p></Link>{l?.token?<div className="mt-5 border-t pt-4"><div className="text-xs font-bold text-slate-500 mb-2">الرابط الخارجي الخاص بالنموذج</div><div className="flex gap-2"><button onClick={()=>copy(l.token,key)} className="flex-1 rounded-lg border px-3 py-2 font-bold inline-flex justify-center items-center gap-1"><Copy size={15}/>{copied===key?'تم النسخ':'نسخ الرابط'}</button><a href={location.origin+'/forms/public/'+l.token} target="_blank" rel="noreferrer" className="rounded-lg bg-[#b88618] text-white px-3 py-2 font-bold inline-flex items-center gap-1"><ExternalLink size={15}/>فتح</a></div></div>:['leave','clearance','advance'].includes(key)&&<button disabled={busy===key} onClick={()=>create(key)} className="mt-5 w-full rounded-lg bg-[#09233f] text-white px-3 py-2 font-bold disabled:opacity-60">{busy===key?'جارٍ إنشاء الرابط...':'إنشاء الرابط الخاص بالنموذج'}</button>}<div className="mt-4"><Link href={key==='leave'?'/forms/leave/records':key==='clearance'?'/forms/clearance/records':key==='advance'?'/forms/advance/records':'/forms/records'} className="text-[#b88618] font-bold text-sm">فتح صفحة وسجل {title} ←</Link></div></section>})}</div>
 <div className="mt-7 bg-white border rounded-2xl p-5"><Link href="/forms/records" className="font-black text-[#09233f] inline-flex items-center gap-2"><Database size={18}/> سجل النماذج العام ←</Link></div>
 </div></main>
