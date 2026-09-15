'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Send, XCircle, Printer, Check, PenTool, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OfferData = { candidate: any; request: any; approval: any; onboarding: any }

export default function CandidateOfferPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState('')
  const [data, setData] = useState<OfferData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => { params.then(p => setToken(p.token)) }, [params])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      const { data: result, error } = await supabase.rpc('get_candidate_offer', { p_token: token })
      if (error || !result?.ok) setMessage(result?.message || error?.message || 'تعذر تحميل العرض.')
      else {
        setData(result as OfferData)
        if (result.candidate?.full_name) setSignatureName(result.candidate.full_name)
        try {
          const cached = localStorage.getItem(`sig_${token}`)
          if (cached) setSignatureDataUrl(cached)
        } catch {}
      }
      setLoading(false)
    })()
  }, [token])

  const point = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#09233f'; ctx.lineTo(x, y); ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (canvasRef.current) setSignatureDataUrl(canvasRef.current.toDataURL('image/png'))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureDataUrl('')
    try { localStorage.removeItem(`sig_${token}`) } catch {}
  }

  const respond = async (decision: 'موافق' | 'غير موافق' | 'أحتاج توضيح') => {
    if (decision === 'موافق' && !signatureDataUrl && !signatureName.trim()) {
      setMessage('يرجى كتابة الاسم أو وضع التوقيع في المربع المخصص لإتمام الموافقة على العرض.')
      return
    }
    setSaving(true); setMessage('')
    const responseNote = decision === 'موافق'
      ? `[موافقة مع توقيع إلكتروني باسم: ${signatureName || data?.candidate?.full_name}] ${notes ? ' - ' + notes : ''}`
      : notes
    const { data: result, error } = await supabase.rpc('respond_candidate_offer', { p_token: token, p_decision: decision, p_notes: responseNote || null })
    if (error || !result?.ok) setMessage(result?.message || error?.message || 'تعذر تسجيل الرد.')
    else {
      setData(prev => prev ? ({ ...prev, approval: prev.approval ? { ...prev.approval, offer_status: decision, offer_responded_at: new Date().toISOString() } : prev.approval }) : prev)
      if (signatureDataUrl) try { localStorage.setItem(`sig_${token}`, signatureDataUrl) } catch {}
      setMessage(decision === 'موافق' ? 'تم تسجيل موافقتك وتوقيعك على العرض الوظيفي بنجاح! مبارك لك.' : 'تم تسجيل ردك بنجاح. شكرًا لك.')
    }
    setSaving(false)
  }

  if (loading) return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-100 font-bold text-[#09233f]">جاري تحميل العرض الوظيفي...</main>
  if (!data?.candidate || !data.approval) return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-100 p-6"><div className="bg-white p-8 rounded-xl text-center shadow font-bold text-slate-700">{message || 'العرض غير متاح.'}</div></main>

  const a = data.approval
  const c = data.candidate
  const o = data.onboarding || {}
  const r = data.request || {}
  const job = o.job_title || r.exact_type || '—'
  const isAccepted = a.offer_status === 'موافق'
  const isDeclined = a.offer_status === 'غير موافق'
  const needsClarification = a.offer_status === 'أحتاج توضيح'
  const alreadyAnswered = a.offer_status && a.offer_status !== 'بانتظار الرد'
  const issued = new Date(a.offer_sent_at || Date.now()).toLocaleDateString('ar-SA')
  const respondedDate = a.offer_responded_at ? new Date(a.offer_responded_at).toLocaleDateString('ar-SA') : ''

  const Row = ({ ar, en, value }: { ar: string; en: string; value?: string | null }) => (
    <div className="grid grid-cols-[1fr_1.3fr_1fr] border-b py-1">
      <div className="p-2 font-bold text-right text-[#09233f]">{ar}</div>
      <div className="p-2 text-center font-medium">{value || '—'}</div>
      <div className="p-2 font-semibold text-left text-slate-500" dir="ltr">{en}</div>
    </div>
  )

  return <main dir="rtl" className="min-h-screen bg-slate-200 p-3 md:p-6 text-slate-800">
    <style>{`@page{size:A4 portrait;margin:8mm}@media print{.no-print{display:none!important}.paper{box-shadow:none!important;max-width:none!important;padding:0!important;width:100%!important}h2{break-after:avoid;page-break-after:avoid}.print-block{break-inside:avoid;page-break-inside:avoid}}`}</style>
    <div className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-7 md:p-10 text-[13px] leading-relaxed">
      <div className="no-print flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {isAccepted && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 font-bold text-sm"><Check size={16}/> تم قبول العرض وتوقيعه رسميًا</span>}
          {isDeclined && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-sm"><XCircle size={16}/> تم الاعتذار عن العرض</span>}
          {needsClarification && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">بانتظار التوضيح</span>}
        </div>
        <button onClick={() => window.print()} className="border border-slate-300 rounded-lg px-4 py-2 font-bold inline-flex items-center gap-2"><Printer size={16}/> طباعة A4</button>
      </div>

      {isAccepted && <div className="print-block mb-5 p-3 rounded-xl border-2 border-green-500 bg-green-50 flex items-center justify-between"><div className="font-bold text-green-900">تمت الموافقة الرسمية على هذا العرض الوظيفي</div><div className="font-bold px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">موافق ومعتمد</div></div>}
      {isDeclined && <div className="print-block mb-5 p-3 rounded-xl border-2 border-red-500 bg-red-50 text-red-900 font-bold">تم الاعتذار عن هذا العرض الوظيفي.</div>}

      <header className="text-center border-b-2 border-[#09233f] pb-4 print-block">
        <div className="font-black text-[#09233f] text-xl">البنية الأساسية للمقاولات ذ.م.م</div>
        <h1 className="text-3xl font-black mt-2 text-[#09233f]">عرض عمل</h1>
        <div className="tracking-[0.35em] font-bold text-[#b88618]">J O B  O F F E R</div>
        <div className="mt-2 font-bold text-xs text-slate-500">خاص وسري · PRIVATE & CONFIDENTIAL</div>
        <div className="flex justify-between mt-3 text-xs text-slate-600"><span>رقم العرض: JO-{issued.replaceAll('/', '')}</span><span>التاريخ: {issued}</span></div>
      </header>

      <p className="mt-5">السيد/السيدة <b>{c.full_name}</b> المحترم/ة، تحية طيبة وبعد،</p>
      <p className="mt-1 text-justify">يسر شركة البنية الأساسية للمقاولات ذ.م.م أن تتقدم لسعادتكم بعرض عمل لشغل وظيفة <b>{job}</b>، وذلك وفقًا للشروط والأحكام الموضحة أدناه.</p>

      <h2 className="mt-5 bg-[#09233f] text-white p-2 font-black text-sm flex justify-between"><span>أولاً: بيانات الوظيفة</span><span className="font-semibold text-xs" dir="ltr">POSITION DETAILS</span></h2>
      <div className="print-block">
        <Row ar="الاسم رباعيًا" en="Full Name" value={c.full_name}/><Row ar="المسمى الوظيفي" en="Job Title" value={job}/><Row ar="رقم الجوال" en="Mobile No" value={c.phone}/><Row ar="الجنسية / رقم الهوية" en="Nationality / ID No" value={`${c.nationality || '—'}${c.national_id ? ' – ' + c.national_id : ''}`}/><Row ar="التبعية الإدارية" en="Reporting Line" value="وفق الهيكل التنظيمي المعتمد للشركة"/><Row ar="مقر العمل" en="Work Location" value={o.work_location || 'مواقع مشاريع الشركة داخل المملكة العربية السعودية'}/><Row ar="أيام وأوقات العمل" en="Working Days & Hours" value={o.working_days_hours || 'من السبت إلى الخميس – (10) ساعات يوميًا شاملة فترات الراحة'}/><Row ar="فترة التجربة" en="Probation Period" value={o.probation_period || '(90) يومًا من تاريخ المباشرة الفعلية'}/><Row ar="تاريخ المباشرة" en="Start Date" value={a.start_date || 'يُحدَّد بعد اجتياز المقابلة واعتماد الجهاز الإشرافي'}/>
      </div>

      <h2 className="mt-5 bg-[#09233f] text-white p-2 font-black text-sm flex justify-between"><span>ثانيًا: الحزمة المالية الشهرية</span><span className="font-semibold text-xs" dir="ltr">MONTHLY COMPENSATION</span></h2>
      <div className="print-block"><Row ar="إجمالي الأجر الشهري / الحزمة" en="Total Monthly Salary" value={a.salary ? `${a.salary} ريال سعودي` : '—'}/><div className="border border-slate-200 bg-slate-50 p-3 mt-2 text-[11px] leading-relaxed">الأجر الشهري أعلاه شامل ومقابل ساعات العمل اليومية المتفق عليها والبالغة (10) ساعات شاملة فترات الراحة، ولا تستحق عنه أي مقابل إضافي. ويُصرف الأجر شهريًا عن طريق التحويل البنكي وفق نظام حماية الأجور.<br/><span dir="ltr" className="text-slate-500 block mt-1">All-inclusive package covering the agreed ten (10) daily working hours, breaks included; paid monthly by bank transfer under the Wage Protection System.</span></div></div>

      <h2 className="mt-5 bg-[#09233f] text-white p-2 font-black text-sm flex justify-between"><span>ثالثًا: أحكام عامة</span><span className="font-semibold text-xs" dir="ltr">GENERAL TERMS</span></h2>
      <ol className="list-decimal mr-6 space-y-1.5 text-[11.5px] mt-2 print-block">
        <li>يخضع هذا العرض لإجراء مقابلة مع الجهاز الإشرافي، ولا يُعد ساريًا ولا تترتب عليه التزامات مالية إلا بعد المباشرة الفعلية وتسجيل حضور موثق، ويبدأ احتساب الأجر من تاريخ المباشرة الفعلية فقط.</li>
        <li>يشمل العرض التسجيل في التأمينات الاجتماعية والتأمين الطبي والإجازة السنوية وفق نظام العمل السعودي ولوائح الشركة.</li>
        <li>لا ينشئ هذا العرض علاقة عمل بذاته، ولا تكتمل إلا بتوقيع عقد العمل من الطرفين واستكمال إجراءات التوظيف النظامية.</li>
        <li>يلتزم المرشح بصحة بياناته ومستنداته، وأي بيان غير صحيح يترتب عليه إلغاء العرض دون أدنى مسؤولية على الشركة.</li>
        <li>يلتزم الموظف بالسرية التامة تجاه معلومات الشركة ومشاريعها وعملائها، وتظل هذه الالتزامات سارية بعد انتهاء العلاقة التعاقدية.</li>
        <li>هذا العرض صالح لمدة (48) ساعة من تاريخ إصداره، وتُطبَّق أحكام نظام العمل السعودي على كل ما لم يرد به نص.</li>
      </ol>
      <p className="mt-4 font-bold text-center text-[#09233f]">نتطلع إلى انضمامكم لفريق العمل، متمنين لكم دوام التوفيق والنجاح.</p>

      <h2 className="mt-6 bg-[#09233f] text-white p-2 font-black text-sm flex justify-between"><span>رابعًا: الإقرار والاعتماد والتوقيع</span><span className="font-semibold text-xs" dir="ltr">ACCEPTANCE & SIGNATURE</span></h2>
      {!alreadyAnswered && <div className="no-print mt-4 border-2 border-dashed border-[#b88618] bg-[#fdfbf6] p-4 rounded-xl">
        <div className="flex items-center gap-2 text-[#09233f] font-black text-sm mb-2"><PenTool size={18} className="text-[#b88618]"/><span>إجراءات الموافقة وتوقيع العرض الوظيفي</span></div>
        <p className="text-xs text-slate-600 mb-4">إذا كنت موافقًا على بنود العرض، يرجى كتابة اسمك الكامل وتوقيعك في المربع المخصص أدناه، ثم النقر على زر قبول وتوقيع العرض.</p>
        <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1">الاسم الكامل لتوقيع العرض:</label><input type="text" className="w-full border rounded-lg p-2.5 text-sm bg-white font-bold" value={signatureName} onChange={e=>setSignatureName(e.target.value)} placeholder="اكتب اسمك كما في الهوية"/><label className="block text-xs font-bold mt-3 mb-1">ملاحظات أو تعليق (اختياري):</label><textarea className="w-full border rounded-lg p-2 text-xs bg-white" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} /></div><div><div className="flex justify-between items-center mb-1"><label className="text-xs font-bold">رسم التوقيع الإلكتروني:</label>{signatureDataUrl&&<button type="button" onClick={clearSignature} className="text-[11px] text-red-600 inline-flex items-center gap-1 font-bold"><RotateCcw size={12}/> مسح التوقيع</button>}</div><div className="border border-slate-300 rounded-lg bg-white relative overflow-hidden"><canvas ref={canvasRef} width={360} height={120} className="w-full h-[120px] touch-none cursor-crosshair" onMouseDown={point} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={point} onTouchMove={draw} onTouchEnd={stopDrawing}/>{!signatureDataUrl&&<div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs">✍️ ارسم توقيعك هنا</div>}</div></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4"><button disabled={saving} onClick={()=>respond('موافق')} className="bg-green-600 text-white rounded-xl p-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 size={18}/> قبول وتوقيع العرض</button><button disabled={saving} onClick={()=>respond('أحتاج توضيح')} className="bg-[#d4a72c] text-[#09233f] rounded-xl p-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><Send size={18}/> أحتاج توضيح</button><button disabled={saving} onClick={()=>respond('غير موافق')} className="bg-slate-700 text-white rounded-xl p-3 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><XCircle size={18}/> اعتذار عن العرض</button></div>
      </div>}

      <div className="border border-slate-300 rounded-lg p-4 mt-4 bg-slate-50 print-block"><div className="font-bold mb-2 flex items-center justify-between"><span>إقرار المرشح:</span><span className="text-xs">حالة العرض: <b>{a.offer_status || 'بانتظار الرد'}</b></span></div><p className="text-xs leading-relaxed">أقر أنا الموقع أدناه بأنني اطلعت على هذا العرض الوظيفي وجميع شروطه وبنوده، وأعلن: <span className="font-bold mr-2">{isAccepted ? '✓ موافق وقابل للعرض' : '□ موافق وقابل للعرض'}</span> <span className="font-bold mr-2">{isDeclined ? '✓ غير موافق / معتذر' : '□ غير موافق / معتذر'}</span></p><div className="grid grid-cols-2 gap-6 mt-6 text-center"><div className="border-t border-slate-300 pt-3"><div className="font-bold text-[#09233f]">المرشح | Candidate</div><div className="mt-2 text-xs"><b>الاسم / Name:</b> {signatureName || c.full_name}</div><div className="min-h-[50px] flex items-center justify-center mt-2">{signatureDataUrl?<img src={signatureDataUrl} alt="Signature" className="max-h-[50px] object-contain"/>:isAccepted?<span className="font-serif italic text-base font-bold text-[#09233f]">{signatureName || c.full_name} (توقيع إلكتروني معتمد)</span>:<div className="border-b border-dotted border-slate-400 w-44 mx-auto h-6"/>}</div><div className="text-xs text-slate-500 mt-1"><b>التاريخ / Date:</b> {respondedDate || issued}</div></div><div className="border-t border-slate-300 pt-3"><div className="font-bold text-[#09233f]">اعتماد الشركة | For the Company</div><div className="mt-2 text-xs"><b>المدير العام / General Manager</b></div><div className="min-h-[50px] flex items-center justify-center mt-2"><div className="w-20 h-20 rounded-full border-2 border-[#b88618] flex items-center justify-center text-[10px] font-bold text-[#b88618] rotate-[-12deg]">ختم الاعتماد<br/>معتمد</div></div><div className="text-xs text-slate-500 mt-1"><b>التاريخ / Date:</b> {issued}</div></div></div></div>
      {message&&<div className="no-print mt-4 p-3 rounded-xl bg-slate-100 border text-center font-bold text-sm text-[#09233f]">{message}</div>}
    </div>
  </main>
}
