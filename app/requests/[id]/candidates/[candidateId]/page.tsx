'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, XCircle, ClipboardCheck, Save, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Requirement = { id: string; name: string; category: string; weight: number; required: boolean }
type Score = { requirement_id: string; score: number; evidence: string }
type Interview = {
  id: string
  interview_date: string | null
  interview_type: string
  engineering_score: number
  technical_office_score: number
  hr_score: number
  engineering_notes: string
  technical_office_notes: string
  hr_notes: string
  final_score: number
  recommendation: string
  final_decision: string
  general_notes: string
  created_at: string
}

const scoreLabel = (score: number) => score >= 75 ? 'قوي' : score >= 50 ? 'مقبول' : 'ضعيف'
const preliminaryRecommendation = (score: number) => score >= 85 ? 'مرشح قوي' : score >= 75 ? 'مرشح للاعتماد' : score >= 65 ? 'قبول مشروط / مراجعة' : 'غير مناسب مبدئيًا'

export default function CandidateReport() {
  const { id, candidateId } = useParams<{ id: string; candidateId: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tableReady, setTableReady] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  const [form, setForm] = useState({
    interview_date: new Date().toISOString().slice(0, 16),
    interview_type: 'مقابلة نهائية',
    engineering_score: 0,
    technical_office_score: 0,
    hr_score: 0,
    engineering_notes: '',
    technical_office_notes: '',
    hr_notes: '',
    final_decision: 'لم يتم اتخاذ القرار',
    general_notes: '',
  })

  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { data: r }, { data: rs }, { data: ss }, { data: iv, error: ivError }] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', candidateId).eq('request_id', id).single(),
        supabase.from('requests').select('*').eq('id', id).single(),
        supabase.from('request_requirements').select('*').eq('request_id', id).order('sort_order'),
        supabase.from('candidate_requirement_scores').select('*').eq('candidate_id', candidateId),
        supabase.from('candidate_interviews').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false }),
      ])
      setCandidate(c); setRequest(r); setRequirements(rs || []); setScores(ss || [])
      if (ivError) {
        setTableReady(false)
      } else {
        setInterviews(iv || [])
        if (iv?.[0]) {
          const latest = iv[0]
          setForm({
            interview_date: latest.interview_date ? new Date(latest.interview_date).toISOString().slice(0, 16) : '',
            interview_type: latest.interview_type || 'مقابلة نهائية',
            engineering_score: Number(latest.engineering_score || 0),
            technical_office_score: Number(latest.technical_office_score || 0),
            hr_score: Number(latest.hr_score || 0),
            engineering_notes: latest.engineering_notes || '',
            technical_office_notes: latest.technical_office_notes || '',
            hr_notes: latest.hr_notes || '',
            final_decision: latest.final_decision || 'لم يتم اتخاذ القرار',
            general_notes: latest.general_notes || '',
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [id, candidateId])

  const map = useMemo(() => Object.fromEntries(scores.map(s => [s.requirement_id, s])), [scores])
  const totalWeight = requirements.reduce((s, r) => s + Number(r.weight || 0), 0)
  const overall = totalWeight ? Math.round(requirements.reduce((s, r) => s + Number(r.weight || 0) * Number(map[r.id]?.score || 0) / 100, 0) / totalWeight * 100) : 0
  const required = requirements.filter(r => r.required)
  const matchedRequired = required.filter(r => Number(map[r.id]?.score || 0) >= 50).length
  const requiredCompliance = required.length ? Math.round(matchedRequired / required.length * 100) : 100
  const strengths = requirements.filter(r => Number(map[r.id]?.score || 0) >= 75)
  const weaknesses = requirements.filter(r => Number(map[r.id]?.score || 0) < 50)
  const requiredGaps = requirements.filter(r => r.required && Number(map[r.id]?.score || 0) < 50)

  const recommendation = requiredGaps.length === 0 && overall >= 80
    ? { label: 'مرشح قوي', tone: 'bg-green-50 text-green-700 border-green-100', note: 'التوافق مرتفع وجميع المتطلبات الأساسية مكتملة.' }
    : requiredCompliance >= 75 && overall >= 70
      ? { label: 'مرشح للمقابلة', tone: 'bg-blue-50 text-blue-700 border-blue-100', note: 'المتطلبات الأساسية والتوافق العام مناسبان للانتقال إلى المقابلة.' }
      : overall >= 50
        ? { label: 'مراجعة إضافية', tone: 'bg-amber-50 text-amber-700 border-amber-100', note: 'يوجد توافق جزئي ويُنصح بمراجعة الفجوات قبل اتخاذ القرار.' }
        : { label: 'غير مناسب مبدئيًا', tone: 'bg-red-50 text-red-700 border-red-100', note: 'التوافق الحالي منخفض مقارنة بمتطلبات الطلب.' }

  const finalScore = Math.round(Number(form.engineering_score) * 0.40 + Number(form.technical_office_score) * 0.35 + Number(form.hr_score) * 0.25)
  const interviewRecommendation = preliminaryRecommendation(finalScore)

  const update = (key: keyof typeof form, value: string | number) => setForm(prev => ({ ...prev, [key]: value }))

  const saveInterview = async () => {
    setSaving(true); setSaveMessage('')
    const payload = {
      candidate_id: candidateId,
      request_id: id,
      interview_date: form.interview_date ? new Date(form.interview_date).toISOString() : null,
      interview_type: form.interview_type,
      engineering_score: Number(form.engineering_score),
      technical_office_score: Number(form.technical_office_score),
      hr_score: Number(form.hr_score),
      engineering_notes: form.engineering_notes,
      technical_office_notes: form.technical_office_notes,
      hr_notes: form.hr_notes,
      final_score: finalScore,
      recommendation: interviewRecommendation,
      final_decision: form.final_decision,
      general_notes: form.general_notes,
    }
    const { data, error } = await supabase.from('candidate_interviews').insert(payload).select('*').single()
    if (error) {
      setTableReady(false)
      setSaveMessage('تعذر الحفظ: جدول المقابلات غير مفعّل في قاعدة البيانات حاليًا. طبّق ملف docs/candidate-interviews.sql ثم أعد المحاولة.')
    } else {
      setInterviews(prev => [data as Interview, ...prev])
      setTableReady(true)
      setSaveMessage('تم حفظ تقييم المقابلة بنجاح.')
    }
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen grid place-items-center" dir="rtl">جاري إعداد التقرير...</main>
  if (!candidate) return <main className="min-h-screen grid place-items-center p-6" dir="rtl"><div className="card p-8">المرشح غير موجود.</div></main>

  return <main className="min-h-screen bg-[#f5f7fa]" dir="rtl"><div className="max-w-6xl mx-auto p-5 md:p-8">
    <div className="flex justify-between items-center mb-5"><Link href={`/requests/${id}`} className="flex items-center gap-2 text-[#09233f] font-bold"><ArrowRight size={18}/> العودة للطلب</Link><div className="text-sm text-slate-500">تقرير تقييم المرشح والمقابلة النهائية</div></div>
    <section className="card p-6 md:p-8"><div className="flex flex-col md:flex-row md:items-center justify-between gap-6"><div><div className="text-[#b88618] font-bold">{request?.exact_type}</div><h1 className="text-3xl font-black text-[#09233f] mt-1">{candidate.full_name}</h1><p className="text-slate-500 mt-2">{candidate.phone} {candidate.specialization ? `• ${candidate.specialization}` : ''}</p></div><div className="text-center"><div className={`text-5xl font-black ${overall >= 75 ? 'text-green-600' : overall >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{overall}%</div><div className="text-sm text-slate-500 mt-1">نسبة التوافق العامة</div></div></div></section>
    <section className="grid md:grid-cols-3 gap-4 mt-5"><div className="card p-5"><div className="text-slate-500 text-sm">سنوات الخبرة</div><div className="text-2xl font-black text-[#09233f] mt-1">{candidate.total_experience_years ?? '—'}</div></div><div className="card p-5"><div className="text-slate-500 text-sm">الخبرة داخل السعودية</div><div className="text-2xl font-black text-[#09233f] mt-1">{candidate.saudi_experience_years ?? '—'}</div></div><div className="card p-5"><div className="text-slate-500 text-sm">مطابقة المتطلبات الأساسية</div><div className="text-2xl font-black text-[#09233f] mt-1">{requiredCompliance}%</div></div></section>
    <section className={`mt-5 rounded-2xl border p-6 ${recommendation.tone}`}><div className="flex items-center gap-3"><ClipboardCheck size={24}/><div><h2 className="text-xl font-black">التوصية قبل المقابلة: {recommendation.label}</h2><p className="mt-1">{recommendation.note}</p></div></div></section>
    <section className="grid md:grid-cols-2 gap-5 mt-5"><div className="card p-6"><h2 className="section-title">نقاط القوة</h2>{strengths.length ? <ul className="space-y-2">{strengths.map(r => <li key={r.id} className="flex gap-2"><CheckCircle2 className="text-green-600" size={18}/><span>{r.name} — {map[r.id]?.score}% ({scoreLabel(Number(map[r.id]?.score || 0))})</span></li>)}</ul> : <p className="text-slate-500">لا توجد متطلبات بدرجة 75% أو أعلى.</p>}</div><div className="card p-6"><h2 className="section-title">نقاط الضعف والفجوات</h2>{weaknesses.length ? <ul className="space-y-2">{weaknesses.map(r => <li key={r.id} className="flex gap-2"><XCircle className="text-red-600" size={18}/><span>{r.name} — {map[r.id]?.score || 0}% {r.required ? '(أساسي)' : ''}</span></li>)}</ul> : <p className="text-slate-500">لا توجد فجوات مسجلة.</p>}</div></section>
    {requiredGaps.length > 0 && <section className="card p-6 mt-5 bg-red-50 border-red-100"><h2 className="font-black text-red-700">تنبيه: متطلبات أساسية غير مكتملة</h2><p className="text-red-700 mt-2">{requiredGaps.map(r => r.name).join('، ')}</p></section>}
    <section className="card p-6 mt-5"><h2 className="section-title">تفاصيل المطابقة حسب الوزن</h2><div className="space-y-4">{requirements.map(r => { const score = Number(map[r.id]?.score || 0); return <div key={r.id}><div className="flex justify-between gap-3 text-sm mb-1"><span className="font-bold">{r.name} {r.required ? '• أساسي' : ''} <span className="font-normal text-slate-400">({Number(r.weight)}%)</span></span><span className="font-bold">{score}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#b88618]" style={{ width: `${score}%` }}/></div>{map[r.id]?.evidence && <p className="text-xs text-slate-500 mt-1">الدليل: {map[r.id].evidence}</p>}</div> })}</div></section>
    <section className="card p-6 mt-5"><h2 className="section-title">البيانات الأكاديمية والخبرة</h2><div className="grid md:grid-cols-2 gap-4 text-sm"><div><b>المؤهل:</b> {candidate.degree || '—'}</div><div><b>التخصص:</b> {candidate.specialization || '—'}</div><div><b>الجامعة:</b> {candidate.university || '—'}</div><div><b>سنة التخرج:</b> {candidate.graduation_year || '—'}</div></div>{candidate.previous_experience && <div className="mt-5"><b>الخبرات السابقة:</b><p className="text-slate-600 mt-2 whitespace-pre-wrap">{candidate.previous_experience}</p></div>}</section>

    <section className="card p-6 md:p-8 mt-6 border-2 border-[#d4a72c]/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div><div className="text-[#b88618] font-bold">المرحلة النهائية</div><h2 className="text-2xl font-black text-[#09233f] mt-1">المقابلة والتقييم النهائي</h2><p className="text-sm text-slate-500 mt-1">التقييم النهائي موزع: الإدارة الهندسية 40%، المكتب الفني 35%، الموارد البشرية 25%.</p></div>
        <div className="text-center rounded-2xl bg-[#09233f] text-white px-6 py-4"><div className="text-4xl font-black">{finalScore}%</div><div className="text-xs text-slate-300 mt-1">النتيجة النهائية</div></div>
      </div>
      {!tableReady && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex gap-3"><AlertTriangle size={20} className="shrink-0"/><div><b>قاعدة البيانات تحتاج تفعيل جدول المقابلات.</b><p className="text-sm mt-1">تم تجهيز الصفحة، لكن الحفظ يحتاج تطبيق <code>docs/candidate-interviews.sql</code> في Supabase.</p></div></div>}
      {saveMessage && <div className={`mb-5 rounded-xl p-4 text-sm ${saveMessage.includes('نجاح') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>{saveMessage}</div>}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <label className="text-sm font-bold">تاريخ ووقت المقابلة<input className="input mt-2" type="datetime-local" value={form.interview_date} onChange={e => update('interview_date', e.target.value)}/></label>
        <label className="text-sm font-bold">نوع المقابلة<select className="input mt-2" value={form.interview_type} onChange={e => update('interview_type', e.target.value)}><option>مقابلة أولية</option><option>مقابلة فنية</option><option>مقابلة نهائية</option><option>مقابلة عن بُعد</option></select></label>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        {[
          { key: 'engineering_score', notes: 'engineering_notes', title: 'الإدارة الهندسية', weight: '40%', placeholder: 'تقييم الخبرة الفنية، التنفيذ، الحلول الهندسية...' },
          { key: 'technical_office_score', notes: 'technical_office_notes', title: 'إدارة المكتب الفني', weight: '35%', placeholder: 'تقييم الرسومات، الحصر، BOQ، المستخلصات، البرامج...' },
          { key: 'hr_score', notes: 'hr_notes', title: 'إدارة الموارد البشرية', weight: '25%', placeholder: 'التواصل، السلوك المهني، الالتزام، الملاءمة...' },
        ].map((panel) => <div key={panel.key} className="rounded-2xl border border-slate-200 p-5 bg-slate-50"><div className="flex justify-between items-center"><h3 className="font-black text-[#09233f]">{panel.title}</h3><span className="text-xs font-bold text-[#b88618]">{panel.weight}</span></div><div className="mt-5 flex items-end gap-3"><input className="w-full" type="range" min="0" max="100" value={Number(form[panel.key as keyof typeof form])} onChange={e => update(panel.key as keyof typeof form, Number(e.target.value))}/><span className="text-2xl font-black text-[#09233f] w-14 text-center">{Number(form[panel.key as keyof typeof form])}</span></div><textarea className="input mt-5 min-h-32" placeholder={panel.placeholder} value={String(form[panel.notes as keyof typeof form])} onChange={e => update(panel.notes as keyof typeof form, e.target.value)}/></div>)}
      </div>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><div className="text-sm text-slate-500">التوصية المبدئية من المقابلة</div><div className="text-xl font-black text-[#09233f] mt-2">{interviewRecommendation}</div><div className="text-xs text-slate-500 mt-2">يتم احتسابها من الدرجة الموزونة فقط، والقرار النهائي يظل بيد الإدارة.</div></div>
        <label className="text-sm font-bold">القرار النهائي<select className="input mt-2" value={form.final_decision} onChange={e => update('final_decision', e.target.value)}><option>لم يتم اتخاذ القرار</option><option>قبول</option><option>قبول مشروط</option><option>احتياطي</option><option>رفض</option></select></label>
      </div>
      <label className="block text-sm font-bold mt-5">ملاحظات عامة<textarea className="input mt-2 min-h-28" placeholder="أضف أي ملاحظات أو توصيات نهائية..." value={form.general_notes} onChange={e => update('general_notes', e.target.value)}/></label>
      <button disabled={saving || !tableReady} onClick={saveInterview} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#09233f] text-white px-6 py-3 font-bold disabled:opacity-50"><Save size={18}/>{saving ? 'جاري الحفظ...' : 'حفظ تقييم المقابلة'}</button>
    </section>

    <section className="card p-6 mt-6"><h2 className="section-title">سجل المقابلات والتقييمات السابقة</h2>{interviews.length ? <div className="space-y-3">{interviews.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><b>{item.interview_type}</b><div className="text-xs text-slate-500 mt-1">{item.interview_date ? new Date(item.interview_date).toLocaleString('ar-SA') : 'بدون تاريخ'}</div></div><div className="flex gap-5 items-center"><span className="font-black text-[#09233f]">{Number(item.final_score)}%</span><span className="text-sm">{item.recommendation}</span><span className="text-sm text-slate-500">{item.final_decision}</span>{index === 0 && <span className="text-xs bg-[#f7efd8] text-[#8b6510] px-2 py-1 rounded-full">الأحدث</span>}</div></div>)}</div> : <p className="text-slate-500">لا توجد مقابلات محفوظة لهذا المرشح حتى الآن.</p>}</section>
  </div></main>
}
