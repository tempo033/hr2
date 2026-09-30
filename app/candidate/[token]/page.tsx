'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UserRound, Phone, GraduationCap, BriefcaseBusiness, Paperclip,
  MapPin, FileText, Send, CheckCircle2, ShieldCheck, Building2,
  Mail, MapPinned, CalendarDays, ChevronDown, UploadCloud, X,
  ClipboardCheck, AlertCircle, Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type CandidatePageProps = { params: Promise<{ token: string }> }
type Score = { score: number; evidence: string }
type Requirement = { id: string; name: string; category?: string; required?: boolean }
type Option = { label: string; score: number }

const DEGREE_OPTIONS = ['بكالوريوس', 'دبلوم', 'ثانوي', 'بدون مؤهل']

const getRequirementOptions = (r: Requirement): Option[] => {
  const name = String(r.name || '').trim().toLowerCase()
  const category = String(r.category || '').trim()

  // المؤهل فقط: الاختيارات المطلوبة حرفيًا.
  if (category.includes('مؤهل') || name.includes('مؤهل') || name === 'qualification' || name === 'degree') {
    return [
      { label: 'بكالوريوس', score: 100 },
      { label: 'دبلوم', score: 50 },
      { label: 'ثانوي', score: 25 },
      { label: 'بدون مؤهل', score: 0 },
    ]
  }

  // جميع المتطلبات الأخرى تبقى بنفس اختياراتها الأصلية.
  if (category === 'اعتماد' || /اعتماد|شهادة|عضوية|رخصة|تصنيف/.test(name)) return [{label:'غير متوفر',score:0},{label:'متوفر',score:100}]
  if (/autocad|revit|bim|excel|primavera|ms project|برنامج|software|sap|erp/.test(name)) return [{label:'لا يستخدم',score:0},{label:'أساسي',score:25},{label:'جيد',score:50},{label:'متقدم',score:75},{label:'متقن',score:100}]
  if (/خبرة|experience|سنوات/.test(name)) return [{label:'لا توجد خبرة',score:0},{label:'أقل من سنة',score:25},{label:'1–3 سنوات',score:50},{label:'3–5 سنوات',score:75},{label:'أكثر من 5 سنوات',score:100}]
  if (/قراءة|فهم|حصر|quantity|كميات|boq|مستخلص|shop|as-built|material|rfi|رسومات|مخططات/.test(name)) return [{label:'لا يجيد',score:0},{label:'أساسيات',score:25},{label:'جيد',score:50},{label:'متقدم',score:75},{label:'متمكن',score:100}]
  if (/لغة|english|إنجليزي|عربي/.test(name)) return [{label:'لا يجيد',score:0},{label:'محدود',score:25},{label:'متوسط',score:50},{label:'جيد',score:75},{label:'ممتاز',score:100}]
  if (/رخصة|قيادة|سيارة|نقل|إقامة|كفالة|مباشرة|متاح|جاهز/.test(name)) return [{label:'غير متوفر',score:0},{label:'غير واضح',score:25},{label:'متوفر بشروط',score:50},{label:'متوفر',score:75},{label:'متوفر دون عائق',score:100}]
  return [{label:'لا توجد خبرة',score:0},{label:'محدودة',score:25},{label:'مناسبة',score:50},{label:'جيدة',score:75},{label:'متقدمة',score:100}]
}

const fieldClass = 'w-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-800 outline-none transition focus:border-[#c99b24] focus:ring-4 focus:ring-[#c99b24]/10 placeholder:text-slate-400'
const sectionClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'

function SectionHeader({icon: Icon, title, hint}:{icon:any,title:string,hint?:string}) {
  return <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-7">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#09233f] text-[#d3a62a]">
      <Icon size={22} strokeWidth={2.2}/>
    </span>
    <div>
      <h2 className="text-base md:text-lg font-black text-[#09233f]">{title}</h2>
      {hint && <p className="mt-0.5 text-xs md:text-sm text-slate-500">{hint}</p>}
    </div>
  </div>
}

export default function CandidatePage({ params }: CandidatePageProps) {
  const [token,setToken]=useState('')
  const [loading,setLoading]=useState(true)
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const [error,setError]=useState('')
  const [request,setRequest]=useState<any>(null)
  const [candidate,setCandidate]=useState<any>(null)
  const [requirements,setRequirements]=useState<Requirement[]>([])
  const [scores,setScores]=useState<Record<string,Score>>({})
  const [files,setFiles]=useState<File[]>([])
  const [form,setForm]=useState({full_name:'',phone:'',email:'',city:'',nationality:'',degree:'',specialization:'',university:'',graduation_year:'',total_experience_years:'',saudi_experience_years:'',previous_experience:'',notes:''})

  useEffect(()=>{
    let cancelled=false
    const load=async()=>{
      const p=await params
      if(cancelled)return
      setToken(p.token)
      if(!supabase){setError('لم يتم إعداد الاتصال بقاعدة البيانات بعد.');setLoading(false);return}
      const {data,error:e}=await supabase.rpc('get_candidate_public_form',{p_token:p.token})
      if(e||!data?.ok){setError(data?.message||'رابط المرشح غير صحيح أو غير متاح.');setLoading(false);return}
      const c=data.candidate
      setCandidate(c)
      setRequest(data.request)
      setRequirements(data.requirements||[])
      setForm({
        full_name:c.full_name||'',phone:c.phone||'',email:c.email||'',city:c.city||'',
        nationality:c.nationality||'',degree:c.degree||'',specialization:c.specialization||'',
        university:c.university||'',graduation_year:c.graduation_year?.toString()||'',
        total_experience_years:c.total_experience_years?.toString()||'',
        saudi_experience_years:c.saudi_experience_years?.toString()||'',
        previous_experience:c.previous_experience||'',notes:c.notes||''
      })
      const m:Record<string,Score>={}
      ;(data.scores||[]).forEach((x:any)=>m[x.requirement_id]={score:x.score,evidence:x.evidence||''})
      setScores(m)
      setLoading(false)
    }
    load()
    return()=>{cancelled=true}
  },[params])

  const grouped=useMemo(()=>requirements.reduce((a:any,r:any)=>{(a[r.category||'متطلبات الوظيفة'] ||= []).push(r);return a},{}),[requirements])
  const setRequirement=(id:string,score:number,evidence=scores[id]?.evidence||'')=>setScores({...scores,[id]:{score,evidence}})

  const degreeOptions = DEGREE_OPTIONS.includes(form.degree) || !form.degree
    ? DEGREE_OPTIONS
    : [form.degree, ...DEGREE_OPTIONS]

  const update=(key:string,value:string)=>setForm(prev=>({...prev,[key]:value}))

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    setError('')
    if(!supabase||!candidate||!token)return
    if(!form.full_name.trim()||!form.phone.trim()){
      setError('يرجى إدخال الاسم الكامل ورقم الجوال.')
      window.scrollTo({top:0,behavior:'smooth'})
      return
    }
    setSending(true)
    try{
      const {data,error:e1}=await supabase.rpc('save_candidate_public_form',{
        p_token:token,
        p_candidate:form,
        p_scores:requirements.map(r=>({requirement_id:r.id,score:scores[r.id]?.score??0,evidence:scores[r.id]?.evidence||''}))
      })
      if(e1||!data?.ok) throw new Error(data?.message||'تعذر حفظ البيانات. حاول مرة أخرى.')

      if(files.length){
        const fd=new FormData()
        fd.append('token',token)
        files.forEach(file=>fd.append('files',file))
        const upload=await fetch('/api/candidate/public/attachments',{method:'POST',body:fd})
        const uploadData=await upload.json().catch(()=>null)
        if(!upload.ok) throw new Error(uploadData?.error||'تم حفظ البيانات، لكن تعذر رفع المرفقات. يرجى المحاولة مرة أخرى.')
      }
      setSent(true)
      window.scrollTo({top:0,behavior:'smooth'})
    }catch(err:any){
      setError(err?.message||'حدث خطأ أثناء إرسال الطلب.')
      window.scrollTo({top:0,behavior:'smooth'})
    }finally{
      setSending(false)
    }
  }

  if(loading)return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#f5f7fa] p-6"><div className="flex items-center gap-3 text-[#09233f] font-bold"><Loader2 className="animate-spin"/><span>جاري تحميل نموذج التقديم...</span></div></main>

  if(error&&!request)return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#f5f7fa] p-6"><div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm"><AlertCircle className="mx-auto text-red-600" size={42}/><h1 className="mt-4 text-xl font-black text-[#09233f]">تعذر فتح النموذج</h1><p className="mt-2 text-sm leading-7 text-slate-500">{error}</p></div></main>

  return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] text-slate-800">
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-7 md:px-7">
      <header className="overflow-hidden rounded-2xl bg-[#09233f] shadow-lg">
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#d3a62a]/10"/>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[#09233f] shadow-sm">
                <Building2 size={28}/>
              </div>
              <div>
                <p className="text-xs font-bold tracking-wide text-[#d3a62a]">البنية الاساسية للمقاولات</p>
                <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">بوابة التقديم الوظيفي</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              <ShieldCheck size={17} className="text-[#d3a62a]"/>
              <span>رابط تقديم آمن ومخصص للمرشح</span>
            </div>
          </div>
          <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-300">التقديم على الوظيفة</p>
            <p className="mt-1 text-lg font-black text-white">{request?.exact_type || 'طلب توظيف'}</p>
            {request?.company_name && <p className="mt-1 text-sm text-slate-300">{request.company_name}</p>}
          </div>
        </div>
      </header>

      <div className="my-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-blue-700"/>
        <span>هذا الرابط مخصص لتعبئة بيانات هذا المرشح فقط، ولا يتيح الوصول إلى لوحة HR2 أو بيانات الموظفين أو المرشحين الآخرين.</span>
      </div>

      {sent ? <section className="mt-5 rounded-2xl border border-emerald-100 bg-white px-5 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={48}/></div>
        <h2 className="mt-6 text-2xl font-black text-[#09233f]">تم إرسال طلبك بنجاح</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">تم حفظ بياناتك وإرسالها إلى فريق الموارد البشرية. شكرًا لاهتمامك بالانضمام إلى فريقنا.</p>
        <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><ClipboardCheck size={18} className="text-[#c99b24]"/>تم استلام طلب التقديم بنجاح</div>
      </section> : <form onSubmit={submit} className="mt-5 space-y-5">
        <section className={sectionClass}>
          <SectionHeader icon={UserRound} title="البيانات الشخصية" hint="أدخل بياناتك الأساسية كما هي في مستنداتك الرسمية."/>
          <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-7">
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">الاسم الكامل <b className="text-red-600">*</b></span><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={20}/><input required className={fieldClass+' pr-11'} placeholder="اكتب الاسم الكامل" value={form.full_name} onChange={e=>update('full_name',e.target.value)}/></div></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">رقم الجوال <b className="text-red-600">*</b></span><div className="relative"><Phone className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={20}/><input required type="tel" inputMode="tel" className={fieldClass+' pr-11'} placeholder="05xxxxxxxx" value={form.phone} onChange={e=>update('phone',e.target.value)}/></div></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">البريد الإلكتروني</span><div className="relative"><Mail className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={20}/><input type="email" className={fieldClass+' pr-11'} placeholder="name@example.com" value={form.email} onChange={e=>update('email',e.target.value)}/></div></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">المدينة</span><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={20}/><input className={fieldClass+' pr-11'} placeholder="المدينة" value={form.city} onChange={e=>update('city',e.target.value)}/></div></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">الجنسية</span><input className={fieldClass} placeholder="الجنسية" value={form.nationality} onChange={e=>update('nationality',e.target.value)}/></label>
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeader icon={GraduationCap} title="المؤهل العلمي" hint="اختر أعلى مؤهل حصلت عليه."/>
          <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-7">
            <label><span className="mb-2 block text-sm font-bold text-slate-700">المؤهل العلمي</span><div className="relative"><GraduationCap className="pointer-events-none absolute right-4 top-3.5 z-10 text-slate-400" size={20}/><ChevronDown className="pointer-events-none absolute left-4 top-3.5 z-10 text-slate-400" size={18}/><select className={fieldClass+' appearance-none pr-11 pl-10'} value={form.degree} onChange={e=>update('degree',e.target.value)}><option value="">اختر المؤهل</option>{degreeOptions.map(o=><option key={o} value={o}>{o === form.degree && !DEGREE_OPTIONS.includes(o) ? `${o} (القيمة الحالية)` : o}</option>)}</select></div></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">التخصص</span><input className={fieldClass} placeholder="مثال: هندسة مدنية" value={form.specialization} onChange={e=>update('specialization',e.target.value)}/></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">الجامعة / المؤسسة التعليمية</span><input className={fieldClass} placeholder="اسم الجامعة أو المؤسسة" value={form.university} onChange={e=>update('university',e.target.value)}/></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">سنة التخرج</span><div className="relative"><CalendarDays className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={20}/><input className={fieldClass+' pr-11'} type="number" inputMode="numeric" placeholder="مثال: 2022" value={form.graduation_year} onChange={e=>update('graduation_year',e.target.value)}/></div></label>
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeader icon={BriefcaseBusiness} title="الخبرات العملية" hint="أضف خبرتك العملية بصورة مختصرة وواضحة."/>
          <div className="grid gap-4 p-5 md:grid-cols-2 md:p-7">
            <label><span className="mb-2 block text-sm font-bold text-slate-700">إجمالي سنوات الخبرة</span><input className={fieldClass} type="number" min="0" step="0.5" inputMode="decimal" placeholder="عدد السنوات" value={form.total_experience_years} onChange={e=>update('total_experience_years',e.target.value)}/></label>
            <label><span className="mb-2 block text-sm font-bold text-slate-700">سنوات الخبرة داخل السعودية</span><input className={fieldClass} type="number" min="0" step="0.5" inputMode="decimal" placeholder="عدد السنوات" value={form.saudi_experience_years} onChange={e=>update('saudi_experience_years',e.target.value)}/></label>
            <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">تفاصيل الخبرات السابقة والشركات والمشاريع</span><textarea className={fieldClass+' min-h-32 resize-y'} placeholder="اذكر أهم الشركات والمشاريع والمسميات الوظيفية..." value={form.previous_experience} onChange={e=>update('previous_experience',e.target.value)}/></label>
          </div>
        </section>

        {requirements.length>0 && <section className={sectionClass}>
          <SectionHeader icon={ClipboardCheck} title="متطلبات الوظيفة والمهارات" hint="اختر المستوى الأقرب إلى خبرتك الفعلية لكل متطلب."/>
          <div className="p-5 md:p-7">
            {Object.entries(grouped).map(([cat,rs]:any)=><div key={cat} className="mb-7 last:mb-0">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#09233f]"><span className="h-1.5 w-1.5 rounded-full bg-[#d3a62a]"/>{cat}</h3>
              <div className="space-y-3">{rs.map((r:Requirement)=><div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-bold text-slate-800">{r.name} {r.required&&<span className="mr-1 text-xs font-bold text-red-600">مطلوب</span>}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <select className={fieldClass} value={scores[r.id]?.score??0} onChange={e=>setRequirement(r.id,Number(e.target.value))}>{getRequirementOptions(r).map(o=><option key={`${r.id}-${o.score}`} value={o.score}>{o.label}</option>)}</select>
                  <input className={fieldClass} placeholder="تفاصيل إضافية (اختياري)" value={scores[r.id]?.evidence||''} onChange={e=>setRequirement(r.id,scores[r.id]?.score??0,e.target.value)}/>
                </div>
              </div>)}</div>
            </div>)}
          </div>
        </section>}

        <section className={sectionClass}>
          <SectionHeader icon={Paperclip} title="المرفقات" hint="يمكنك إرفاق السيرة الذاتية والشهادات والمستندات الداعمة."/>
          <div className="p-5 md:p-7">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center transition hover:border-[#c99b24] hover:bg-[#fffaf0]">
              <UploadCloud size={30} className="text-[#c99b24]"/>
              <span className="mt-3 text-sm font-black text-[#09233f]">اضغط لاختيار الملفات</span>
              <span className="mt-1 text-xs leading-5 text-slate-500">PDF أو Word أو JPG أو PNG — حتى 10 ميجابايت للملف، وبحد أقصى 5 ملفات</span>
              <input className="hidden" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,5))}/>
            </label>
            {files.length>0 && <div className="mt-4 space-y-2">{files.map((file,i)=><div key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><div className="flex min-w-0 items-center gap-3"><FileText size={19} className="shrink-0 text-[#c99b24]"/><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-700">{file.name}</p><p className="text-xs text-slate-400">{(file.size/1024/1024).toFixed(2)} MB</p></div></div><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={()=>setFiles(files.filter((_,idx)=>idx!==i))} aria-label="حذف الملف"><X size={18}/></button></div>)}</div>}
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeader icon={MapPinned} title="معلومات إضافية" hint="أضف أي معلومات ترى أنها مهمة لفريق الموارد البشرية."/>
          <div className="p-5 md:p-7"><textarea className={fieldClass+' min-h-32 resize-y'} placeholder="ملاحظات أو معلومات إضافية..." value={form.notes} onChange={e=>update('notes',e.target.value)}/></div>
        </section>

        {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"><AlertCircle size={19} className="mt-0.5 shrink-0"/><span>{error}</span></div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-start gap-3"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-[#c99b24]"/><p className="text-xs leading-6 text-slate-500">راجع البيانات والمرفقات قبل الإرسال. بعد إرسال الطلب ستصل البيانات إلى فريق الموارد البشرية لمراجعتها.</p></div>
          <button disabled={sending} type="submit" className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#c99b24] px-5 py-3 text-base font-black text-[#09233f] shadow-sm transition hover:bg-[#d8ad3b] disabled:cursor-not-allowed disabled:opacity-60">
            {sending ? <><Loader2 size={21} className="animate-spin"/>جاري إرسال الطلب...</> : <><Send size={21}/>إرسال طلب التوظيف</>}
          </button>
        </section>
      </form>}
    </div>
    <footer className="px-4 pb-7 pt-2 text-center text-xs text-slate-400">بوابة التقديم الوظيفي — HR2</footer>
  </main>
}
