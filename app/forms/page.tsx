'use client'
import Link from 'next/link'
import {FileText,ClipboardCheck,UserRoundCheck,WalletCards,ArrowLeft,Database,Layers,Copy,ExternalLink,Scale} from 'lucide-react'
import {useEffect,useState} from 'react'

const forms=[
 {href:'/forms/leave',key:'leave',title:'طلب إجازة',desc:'إدارة طلبات الإجازة والطلبات المرسلة عبر الرابط الخارجي.',icon:ClipboardCheck},
 {href:'/forms/clearance',key:'clearance',title:'إخلاء الطرف',desc:'متابعة نماذج إخلاء الطرف والطلبات المرسلة من الروابط الخارجية.',icon:FileText},
 {href:'/forms/advance',key:'advance',title:'طلب سلفة مالية',desc:'إنشاء طلب سلفة مرتبط بملف الموظف وإنشاء روابط اعتماد المدير والمالية والموارد البشرية.',icon:WalletCards},
 {href:'/onboarding/manage',key:'onboarding',title:'مباشرة العمل',desc:'إنشاء وتعديل وطباعة نماذج مباشرة العمل.',icon:UserRoundCheck},
 {href:'/offers',key:'offers',title:'العروض الوظيفية',desc:'إدارة وإصدار عروض العمل المرتبطة بالمرشحين.',icon:FileText},
 {href:'/forms/unified',key:'unified',title:'النماذج الموحدة',desc:'الوصول إلى الواجهة الموحدة للنماذج الداخلية.',icon:Layers},
 {href:'/forms/investigation',key:'investigation',title:'تحقيق إداري',desc:'اختيار الموظف، تحديد موضوع التحقيق، إعداد الأسئلة وتحليل الإجابات والخيارات التأديبية.',icon:Scale},
]

export default function FormsHub(){
 const [links,setLinks]=useState<Record<string,any>>({})
 const [busy,setBusy]=useState('')
 const [copied,setCopied]=useState('')
 const [employees,setEmployees]=useState<any[]>([])
 const [advanceEmployeeId,setAdvanceEmployeeId]=useState('')
 const [advanceApprovalLinks,setAdvanceApprovalLinks]=useState<any[]>([])

 const load=async()=>{
   const [lr,er]=await Promise.all([
     fetch('/api/forms/links',{cache:'no-store'}),
     fetch('/api/employees/data',{cache:'no-store'})
   ])
   const d=await lr.json().catch(()=>({}))
   const ed=await er.json().catch(()=>({}))
   const m:Record<string,any>={}
   ;(d.links||[]).forEach((x:any)=>{
     if(!m[x.form_type] && !x.record_id && !x.link_scope) m[x.form_type]=x
   })
   setLinks(m)
   setEmployees(ed.employees||ed.records||[])
   setAdvanceApprovalLinks((d.links||[]).filter((x:any)=>x.form_type==='advance'&&x.link_scope?.startsWith('advance:')).slice(0,3))
 }

 useEffect(()=>{load()},[])

 const create=async(kind:string)=>{
   if(kind==='advance' && !advanceEmployeeId){
     alert('اختر الموظف أولاً لإنشاء طلب السلفة وروابط الاعتماد.')
     return
   }
   setBusy(kind)
   const r=await fetch('/api/forms/links',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({form_type:kind,employee_id:kind==='advance'?advanceEmployeeId:undefined})
   })
   const d=await r.json().catch(()=>({}))
   if(!r.ok){
     alert(d.error||'تعذر إنشاء الرابط')
     setBusy('')
     return
   }
   setLinks((p:any)=>({...p,[kind]:d.link}))
   if(kind==='advance')setAdvanceApprovalLinks(d.approval_links||[])
   setBusy('')
   await navigator.clipboard?.writeText(location.origin+'/forms/public/'+d.link.token)
   setCopied(kind)
   setTimeout(()=>setCopied(''),1800)
   if(kind==='advance'){
     alert('تم إنشاء طلب السلفة وروابط الاعتماد: الموارد البشرية، الإدارة المالية، المدير العام. تم نسخ رابط الموظف.')
     await load()
   }
 }

 const copy=async(token:string,key:string)=>{
   await navigator.clipboard?.writeText(location.origin+'/forms/public/'+token)
   setCopied(key)
   setTimeout(()=>setCopied(''),1800)
 }

 return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
   <div className="max-w-7xl mx-auto">
     <header className="flex items-center justify-between gap-4 mb-8">
       <div>
         <div className="text-[#b88618] font-bold">الموارد البشرية</div>
         <h1 className="text-3xl font-black text-[#09233f]">مركز النماذج</h1>
         <p className="text-slate-500 mt-1">كل نموذج له صفحة مستقلة وسجل مستقل وروابط خارجية خاصة به.</p>
       </div>
       <Link href="/" className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 items-center"><ArrowLeft size={17}/> الرئيسية</Link>
     </header>

     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
       {forms.map(({href,key,title,desc,icon:Icon})=>{
         const l=links[key]
         return <section key={key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
           <Link href={href} className="block">
             <div className="w-12 h-12 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center mb-4"><Icon size={23}/></div>
             <h2 className="text-xl font-black text-[#09233f]">{title}</h2>
             <p className="text-slate-500 mt-2 text-sm leading-relaxed">{desc}</p>
           </Link>

           {key==='advance' && (
             <div className="mt-5 border-t pt-4">
               <label className="text-xs font-bold text-slate-500 block mb-2">اختيار الموظف من ملف الموظفين</label>
               <select
                 value={advanceEmployeeId}
                 onChange={e=>setAdvanceEmployeeId(e.target.value)}
                 className="w-full rounded-lg border px-3 py-2 font-bold text-slate-800 bg-white"
               >
                 <option value="">اختر الموظف</option>
                 {employees.map((e:any)=><option key={e.id} value={e.id}>{e.employee_number||'بدون رقم'} — {e.full_name||'بدون اسم'}</option>)}
               </select>
               <button
                 disabled={busy==='advance' || !advanceEmployeeId}
                 onClick={()=>create('advance')}
                 className="mt-3 w-full rounded-lg bg-[#09233f] text-white px-3 py-2 font-bold disabled:opacity-60"
               >
                 {busy==='advance'?'جارٍ إنشاء الطلب والروابط...':'إنشاء طلب السلفة + روابط الاعتماد'}
               </button>
               {advanceApprovalLinks.length>0&&<div className="mt-4 space-y-2"><div className="text-xs font-black text-[#09233f]">روابط الاعتماد الأربعة</div><div className="grid gap-2">{advanceApprovalLinks.map((x:any)=>{const label=x.link_scope==='advance:hr'?'الموارد البشرية':x.link_scope==='advance:finance'?'الإدارة المالية':'المدير العام';return <div key={x.id} className="border rounded-lg p-2 bg-slate-50"><div className="font-bold text-sm">{label}</div><div className="flex gap-2 mt-2"><a target="_blank" rel="noreferrer" href={location.origin+'/forms/public/'+x.token} className="bg-[#09233f] text-white rounded px-2 py-1 text-xs font-bold">فتح الرابط</a><button onClick={()=>copy(x.token,'advance-'+x.id)} className="border rounded px-2 py-1 text-xs font-bold">نسخ</button></div></div>})}</div></div>}
             </div>
           )}

           {l?.token && (
             <div className="mt-5 border-t pt-4">
               <div className="text-xs font-bold text-slate-500 mb-2">الرابط الخارجي الخاص بالنموذج</div>
               <div className="flex gap-2">
                 <button onClick={()=>copy(l.token,key)} className="flex-1 rounded-lg border px-3 py-2 font-bold inline-flex justify-center items-center gap-1"><Copy size={15}/>{copied===key?'تم النسخ':'نسخ الرابط'}</button>
                 <a href={location.origin+'/forms/public/'+l.token} target="_blank" rel="noreferrer" className="rounded-lg bg-[#b88618] text-white px-3 py-2 font-bold inline-flex items-center gap-1"><ExternalLink size={15}/>فتح</a>
               </div>
             </div>
           )}

           {key!=='advance' && !l?.token && ['leave','clearance'].includes(key) && (
             <button disabled={busy===key} onClick={()=>create(key)} className="mt-5 w-full rounded-lg bg-[#09233f] text-white px-3 py-2 font-bold disabled:opacity-60">
               {busy===key?'جارٍ إنشاء الرابط...':'إنشاء الرابط الخاص بالنموذج'}
             </button>
           )}

           <div className="mt-4"><Link href={key==='leave'?'/forms/leave/records':key==='clearance'?'/forms/clearance/records':key==='advance'?'/forms/advance/records':'/forms/records'} className="text-[#b88618] font-bold text-sm">فتح صفحة وسجل {title} ←</Link></div>
         </section>
       })}
     </div>

     <div className="mt-7 bg-white border rounded-2xl p-5"><Link href="/forms/records" className="font-black text-[#09233f] inline-flex items-center gap-2"><Database size={18}/> سجل النماذج العام ←</Link></div>
   </div>
 </main>
}
