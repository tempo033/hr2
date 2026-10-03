'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {ArrowLeft,RefreshCw,ExternalLink,Copy,CheckCircle2,Scale} from 'lucide-react'

export default function Records(){
 const [data,setData]=useState<any>({investigations:[],employees:[]})
 const [selected,setSelected]=useState<any>(null)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('');const [copied,setCopied]=useState('');const [filter,setFilter]=useState('all');const [notes,setNotes]=useState('');const [result,setResult]=useState('');const [recommendation,setRecommendation]=useState('');const [attachments,setAttachments]=useState<any[]>([]);const [file,setFile]=useState<File|null>(null)

 const load=async()=>{const r=await fetch('/api/administrative-investigations',{cache:'no-store'});setData(await r.json())}
 const copy=async(url:string)=>{await navigator.clipboard.writeText(url);setCopied(url);setMessage('تم نسخ الرابط بنجاح');window.setTimeout(()=>{setCopied('');setMessage('')},1800)}
 useEffect(()=>{load()},[])

 const loadAttachments=async(id:string)=>{const r=await fetch('/api/administrative-investigations/'+id+'/attachments',{cache:'no-store'});const d=await r.json();setAttachments(d.attachments||[])}
 const uploadAttachment=async()=>{if(!selected||!file)return;const fd=new FormData();fd.append('file',file);const r=await fetch('/api/administrative-investigations/'+selected.investigation.id+'/attachments',{method:'POST',body:fd});const d=await r.json();if(r.ok){setFile(null);await loadAttachments(selected.investigation.id);setMessage('تم رفع المرفق.')}else setMessage(d.error||'تعذر رفع المرفق')}
 const detail=async(id:string)=>{
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'detail',id})})
  const d=await r.json();setSelected(d);loadAttachments(id);setNotes(d.investigation?.investigator_notes||'');setResult(d.investigation?.result_text||'');setRecommendation(d.investigation?.recommendation||'')
 }
 const saveSubject=async()=>{
  const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:selected.investigation.id,subject:selected.investigation.subject,status:selected.investigation.status})})
  setMessage(r.ok?'تم حفظ تعديل موضوع التحقيق.':'تعذر حفظ التعديل')
 }
 const saveFinal=async(status='completed')=>{if(!selected)return;setBusy(true);const r=await fetch('/api/administrative-investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update-final',id:selected.investigation.id,investigator_notes:notes,result_text:result,recommendation,status})});const d=await r.json();if(r.ok){setSelected({...selected,investigation:d.investigation});setMessage('تم حفظ بيانات ختام التحقيق.')}else setMessage(d.error||'تعذر الحفظ');setBusy(false)}
 const finalize=async()=>{return saveFinal('completed')}


 return (
  <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8 text-[#09233f]">
   <div className="max-w-7xl mx-auto">
    <header className="bg-white border rounded-2xl p-6 mb-6 flex justify-between items-center">
     <div><div className="text-[#b88618] font-bold">شركة البنية الأساسية للمقاولات ذ.م.م</div><h1 className="text-3xl font-black">سجل التحقيقات الإدارية</h1><p className="text-slate-500">عرض التحقيقات، روابط الأطراف، رأي الإدارة، والتحليل النهائي.</p></div>
     <div className="flex gap-2"><Link href="/forms/investigation" className="bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold">تحقيق جديد</Link><button onClick={load} className="border rounded-xl px-4 py-2 font-bold inline-flex gap-2"><RefreshCw size={17}/> تحديث</button><Link href="/forms" className="border rounded-xl px-4 py-2 font-bold inline-flex gap-2"><ArrowLeft size={17}/> النماذج</Link></div>
    </header>
    <div className="bg-white border rounded-2xl p-4 mb-5 flex flex-wrap gap-2">{[['all','الكل'],['draft','مسودة'],['sent','مرسل'],['in_progress','قيد الإجابة'],['completed','مكتمل'],['closed','مغلق']].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`px-4 py-2 rounded-xl font-bold \${filter===v?'bg-[#b88618] text-white':'border'}`}>{l}</button>)}</div><div className="grid lg:grid-cols-2 gap-5">
     {(data.investigations||[]).filter((x:any)=>filter==='all'||x.status===filter).map((x:any)=><button key={x.id} onClick={()=>detail(x.id)} className="text-right bg-white border rounded-2xl p-5 hover:shadow-md"><div className="text-xs text-[#b88618] font-bold">{new Date(x.created_at).toLocaleString('ar-SA')}</div><h2 className="font-black text-xl mt-2">{x.subject}</h2><div className="mt-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{x.status==='completed'?'مكتمل':'قيد التحقيق'}</span></div></button>)}
    </div>
    {selected && (
     <section className="bg-white border rounded-2xl p-6 mt-6">
      <div className="flex justify-between items-start gap-4">
       <div className="flex-1"><div className="text-[#b88618] font-bold">تفاصيل التحقيق</div><input value={selected.investigation.subject||''} onChange={e=>setSelected({...selected,investigation:{...selected.investigation,subject:e.target.value}})} className="w-full border rounded-xl p-3 text-xl font-black mt-2"/><button onClick={saveSubject} className="mt-2 border rounded-lg px-4 py-2 font-bold">حفظ التعديل</button></div>
       <button onClick={()=>saveFinal('closed')} disabled={busy} className="bg-[#b88618] text-white rounded-xl px-5 py-3 font-black inline-flex gap-2"><Scale size={18}/>{busy?'جاري الحفظ...':'حفظ وإغلاق التحقيق'}</button>
      </div>
      <div className="mt-5">
       {(selected.parties||[]).map((p:any)=><div key={p.id} className="border rounded-xl p-4 mb-3"><div className="font-black">الموظف: {(data.employees||[]).find((e:any)=>e.id===p.employee_id)?.full_name||p.employee_id}</div><div className="text-sm mt-2">حالة الأقوال: {p.employee_submitted_at?'تم الإرسال':'لم يتم الإرسال'}</div><div className="flex gap-2 mt-2"><a className="text-[#b88618] inline-flex gap-1" href={p.public_url} target="_blank" rel="noreferrer" title="فتح الرابط"><ExternalLink size={15}/> فتح الرابط</a><button className="text-[#b88618] inline-flex gap-1" onClick={()=>copy(location.origin+'/forms/investigation/respond/'+p.employee_token)} title="نسخ الرابط">{copied===location.origin+'/forms/investigation/respond/'+p.employee_token?<CheckCircle2 size={15}/>:<Copy size={15}/>} نسخ</button></div></div>)}
      </div>
      <div className="border-2 border-[#b88618] rounded-xl p-5 mb-5"><h3 className="font-black text-xl mb-4">استكمال التحقيق</h3><label className="font-bold block mb-3">ملاحظات المحقق<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className="w-full border rounded-xl p-3 mt-1"/></label><label className="font-bold block mb-3">نتيجة التحقيق<textarea value={result} onChange={e=>setResult(e.target.value)} rows={4} className="w-full border rounded-xl p-3 mt-1" placeholder="تُكتب يدويًا بناءً على الوقائع والإجابات والمستندات."/></label><label className="font-bold block">التوصية<textarea value={recommendation} onChange={e=>setRecommendation(e.target.value)} rows={4} className="w-full border rounded-xl p-3 mt-1"/></label><div className="flex gap-2 mt-4"><button onClick={()=>saveFinal('completed')} disabled={busy} className="bg-[#09233f] text-white rounded-xl px-5 py-2.5 font-bold">حفظ وإبقاء مفتوح</button><button onClick={()=>saveFinal('closed')} disabled={busy} className="bg-[#b88618] text-white rounded-xl px-5 py-2.5 font-bold">حفظ وإغلاق</button></div></div>
      <div className="border rounded-xl p-5 mb-5"><h3 className="font-black text-lg mb-3">مستندات ومرفقات التحقيق</h3><div className="flex flex-wrap gap-2 items-center"><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files?.[0]||null)} className="border rounded-lg p-2"/><button onClick={uploadAttachment} disabled={!file} className="bg-[#09233f] text-white rounded-lg px-4 py-2 font-bold">رفع المرفق</button></div><div className="mt-3 space-y-2">{attachments.map(a=><div key={a.id} className="flex justify-between items-center border rounded-lg p-3"><span className="font-bold">{a.file_name}</span><button onClick={async()=>{const r=await fetch('/api/administrative-investigations/'+selected.investigation.id+'/attachments/'+a.id);const d=await r.json();if(d.url)window.open(d.url,'_blank')}} className="text-[#b88618] font-bold">عرض</button></div>)}</div></div>
      {(selected.reviews||[]).map((r:any)=><div key={r.id} className="border rounded-xl p-4 mb-4"><div className="font-black">الإدارة المختصة: {r.department_name||'غير محددة'} — {r.reviewer_name||'لم يحدد المسؤول'}</div><p className="whitespace-pre-wrap mt-2">{r.opinion||'لم يصل رأي الإدارة بعد.'}</p><div className="flex gap-2 mt-2"><a className="text-[#b88618] inline-flex gap-1" href={r.public_url} target="_blank" rel="noreferrer" title="فتح الرابط"><ExternalLink size={15}/> فتح الرابط</a><button className="text-[#b88618] inline-flex gap-1" onClick={()=>copy(location.origin+'/forms/investigation/review/'+r.review_token)} title="نسخ الرابط">{copied===location.origin+'/forms/investigation/review/'+r.review_token?<CheckCircle2 size={15}/>:<Copy size={15}/>} نسخ</button></div></div>)}
      {selected.investigation.final_analysis && (
       <div className="border-2 border-[#b88618] rounded-xl p-5">
        <h3 className="font-black text-xl mb-3">التحليل النهائي</h3><p className="font-bold">{selected.investigation.final_analysis.summary}</p>
        <div className="mt-4 space-y-3">
         {(selected.investigation.final_analysis.options||[]).map((o:any,i:number)=><div key={i} className="border rounded-xl p-4"><div className="font-black">{o.penalty}</div><div className="text-sm mt-1"><b>الأساس النظامي:</b> {o.basis}</div><div className="text-sm mt-1"><b>متى يُبحث:</b> {o.when}</div></div>)}
        </div>
        <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm"><b>ضوابط نظامية:</b><ul className="list-disc pr-5 mt-2 space-y-1">{(selected.investigation.final_analysis.legalControls||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>
       </div>
      )}
      {message && <div className="mt-4 p-3 border rounded-xl font-bold">{message}</div>}
     </section>
    )}
   </div>
  </main>
 )
}