'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Save,
  AlertTriangle,
  Video,
  Copy,
  ExternalLink,
  Send,
  Printer,
  ChevronDown,
  ShieldCheck,
  Building2,
  Users,
  Briefcase
} from 'lucide-react'
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

  // 4-Tier Hierarchical Evaluation state
  const [activeTier, setActiveTier] = useState<1 | 2 | 3 | 4>(1)
  const [form, setForm] = useState({
    interview_date: new Date().toISOString().slice(0, 16),
    interview_type: 'مقابلة أولية',
    
    // Tier 1: HR Evaluation (تقييم الموارد البشرية)
    hr_score: 0,
    hr_notes: '',
    hr_evaluator: 'مسؤول الموارد البشرية',
    hr_status: 'معتمد' as 'قيد التقييم' | 'معتمد' | 'مرفوض',

    // Tier 2: Specialized Department (تقييم الإدارة المختصة / الفنية)
    engineering_score: 0,
    engineering_notes: '',
    dept_evaluator: 'مدير الإدارة المختصة',
    dept_status: 'قيد التقييم' as 'قيد التقييم' | 'معتمد' | 'مرفوض',

    // Tier 3: Executive Management (تقييم الإدارة التنفيذية / المكتب الفني)
    technical_office_score: 0,
    technical_office_notes: '',
    management_evaluator: 'الإدارة التنفيذية',
    management_status: 'قيد التقييم' as 'قيد التقييم' | 'معتمد' | 'مرفوض',

    // Tier 4: General Manager Approval (اعتماد المدير العام)
    gm_approval: 'لم يتم اتخاذ القرار' as 'لم يتم اتخاذ القرار' | 'معتمد' | 'معتمد مع تعديل الراتب' | 'مرفوض',
    gm_notes: '',
    gm_name: 'المدير العام',

    final_decision: 'لم يتم اتخاذ القرار',
    general_notes: '',
  })

  // Google Meet modal & states
  const [meetLoading, setMeetLoading] = useState(false)
  const [meetData, setMeetData] = useState<{
    meetLink: string
    meetCode: string
    message: string
    whatsappUrl: string | null
    mailtoUrl: string | null
  } | null>(null)
  const [showMeetModal, setShowMeetModal] = useState(false)
  const [copied, setCopied] = useState(false)

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
          
          // Parse any stored hierarchical notes from general_notes if available
          let parsedGm = 'لم يتم اتخاذ القرار'
          let parsedGmNotes = ''
          try {
            if (latest.general_notes && latest.general_notes.includes('[اعتماد المدير العام:')) {
              const match = latest.general_notes.match(/\[اعتماد المدير العام: ([^\]]+)\]([\s\S]*)/)
              if (match) {
                parsedGm = match[1].trim()
                parsedGmNotes = match[2]?.trim() || ''
              }
            }
          } catch {}

          setForm(prev => ({
            ...prev,
            interview_date: latest.interview_date ? new Date(latest.interview_date).toISOString().slice(0, 16) : '',
            interview_type: latest.interview_type || 'مقابلة أولية',
            hr_score: Number(latest.hr_score || 0),
            hr_notes: latest.hr_notes || '',
            engineering_score: Number(latest.engineering_score || 0),
            engineering_notes: latest.engineering_notes || '',
            technical_office_score: Number(latest.technical_office_score || 0),
            technical_office_notes: latest.technical_office_notes || '',
            final_decision: latest.final_decision || 'لم يتم اتخاذ القرار',
            general_notes: latest.general_notes || '',
            gm_approval: (parsedGm as any) || 'لم يتم اتخاذ القرار',
            gm_notes: parsedGmNotes,
            hr_status: Number(latest.hr_score) > 0 ? 'معتمد' : 'قيد التقييم',
            dept_status: Number(latest.engineering_score) > 0 ? 'معتمد' : 'قيد التقييم',
            management_status: Number(latest.technical_office_score) > 0 ? 'معتمد' : 'قيد التقييم',
          }))
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

  // Hierarchical weighted score: HR 30%, Dept 35%, Management 35%
  const finalScore = Math.round(
    Number(form.hr_score) * 0.30 +
    Number(form.engineering_score) * 0.35 +
    Number(form.technical_office_score) * 0.35
  )
  const interviewRecommendation = preliminaryRecommendation(finalScore)

  const update = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  // Generate Google Meet link and notification message
  const handleGenerateMeet = async (type = form.interview_type) => {
    setMeetLoading(true)
    try {
      const res = await fetch('/api/meet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: candidate?.full_name,
          candidatePhone: candidate?.phone,
          candidateEmail: candidate?.email,
          jobTitle: request?.exact_type,
          interviewDate: form.interview_date,
          interviewType: type
        })
      })
      const result = await res.json()
      if (result.success) {
        setMeetData(result)
        setShowMeetModal(true)
      } else {
        alert(result.error || 'تعذر إنشاء الرابط.')
      }
    } catch (e: any) {
      alert('حدث خطأ أثناء إنشاء رابط المقابلة.')
    } finally {
      setMeetLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveInterview = async () => {
    setSaving(true)
    setSaveMessage('')

    const combinedGeneralNotes = `[اعتماد المدير العام: ${form.gm_approval}] ${form.gm_notes ? '\nملاحظات المدير العام: ' + form.gm_notes : ''} ${form.general_notes ? '\n' + form.general_notes : ''}`.trim()

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
      final_decision: form.gm_approval !== 'لم يتم اتخاذ القرار' ? form.gm_approval : form.final_decision,
      general_notes: combinedGeneralNotes,
    }

    const { data, error } = await supabase.from('candidate_interviews').insert(payload).select('*').single()
    if (error) {
      setTableReady(false)
      setSaveMessage('تعذر الحفظ: جدول المقابلات غير مفعّل في قاعدة البيانات حاليًا.')
    } else {
      setInterviews(prev => [data as Interview, ...prev])
      setTableReady(true)
      setSaveMessage('تم حفظ تقييم المقابلة بالتسلسل الهرمي بنجاح.')
    }
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen grid place-items-center font-bold text-[#09233f]" dir="rtl">جاري إعداد التقرير...</main>
  if (!candidate) return <main className="min-h-screen grid place-items-center p-6" dir="rtl"><div className="card p-8">المرشح غير موجود.</div></main>

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-800" dir="rtl">
      <div className="max-w-6xl mx-auto p-5 md:p-8">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <Link href={`/requests/${id}`} className="flex items-center gap-2 text-[#09233f] font-bold hover:underline">
            <ArrowRight size={18}/> العودة للطلب
          </Link>
          <div className="flex gap-2 items-center">
            <Link
              href={`/reports/candidate/${candidateId}`}
              className="bg-white border rounded-xl px-4 py-2 text-sm font-bold inline-flex items-center gap-2 text-[#09233f] hover:bg-slate-50"
            >
              <Printer size={16}/> تقرير المرشح PDF
            </Link>
            <Link
              href={`/reports/evaluation/${candidateId}`}
              className="bg-[#09233f] text-white rounded-xl px-4 py-2 text-sm font-bold inline-flex items-center gap-2 hover:bg-opacity-90"
            >
              <Printer size={16}/> تقرير التقييم الرسمي PDF
            </Link>
          </div>
        </div>

        {/* CANDIDATE HERO */}
        <section className="card p-6 md:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-[#b88618] font-bold text-sm">{request?.exact_type}</div>
              <h1 className="text-3xl font-black text-[#09233f] mt-1">{candidate.full_name}</h1>
              <p className="text-slate-500 mt-2">
                {candidate.phone || 'بدون جوال'} {candidate.email ? `• ${candidate.email}` : ''} {candidate.specialization ? `• ${candidate.specialization}` : ''}
              </p>
            </div>
            <div className="flex gap-6 items-center">
              <div className="text-center pl-4 border-l border-slate-200">
                <div className={`text-4xl font-black ${overall >= 75 ? 'text-green-600' : overall >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {overall}%
                </div>
                <div className="text-xs text-slate-500 mt-1">توافق المتطلبات</div>
              </div>
              <div className="text-center rounded-2xl bg-[#09233f] text-white px-5 py-3 shadow">
                <div className="text-3xl font-black">{finalScore}%</div>
                <div className="text-[11px] text-slate-300 mt-0.5">درجة التقييم الهرمي</div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK STATS */}
        <section className="grid md:grid-cols-3 gap-4 mt-5">
          <div className="card p-5 bg-white border rounded-2xl shadow-sm">
            <div className="text-slate-500 text-sm">سنوات الخبرة</div>
            <div className="text-2xl font-black text-[#09233f] mt-1">{candidate.total_experience_years ?? '—'} سنة</div>
          </div>
          <div className="card p-5 bg-white border rounded-2xl shadow-sm">
            <div className="text-slate-500 text-sm">الخبرة داخل السعودية</div>
            <div className="text-2xl font-black text-[#09233f] mt-1">{candidate.saudi_experience_years ?? '—'} سنة</div>
          </div>
          <div className="card p-5 bg-white border rounded-2xl shadow-sm">
            <div className="text-slate-500 text-sm">مطابقة المتطلبات الأساسية</div>
            <div className="text-2xl font-black text-[#09233f] mt-1">{requiredCompliance}%</div>
          </div>
        </section>

        {/* PRE-INTERVIEW RECOMMENDATION */}
        <section className={`mt-5 rounded-2xl border p-5 ${recommendation.tone}`}>
          <div className="flex items-center gap-3">
            <ClipboardCheck size={24} className="shrink-0"/>
            <div>
              <h2 className="text-lg font-black">التوصية قبل المقابلة: {recommendation.label}</h2>
              <p className="mt-0.5 text-sm">{recommendation.note}</p>
            </div>
          </div>
        </section>

        {/* GOOGLE MEET & INITIAL INTERVIEW ACTION BAR */}
        <section className="mt-5 p-5 bg-gradient-to-r from-[#09233f] to-[#123864] text-white rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 grid place-items-center text-[#d4a72c] shrink-0">
              <Video size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black">جدولة وإجراء مقابلة أولية عبر Google Meet</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                توليد رابط اجتماع تلقائي وتجهيز رسالة دعوة رسمية للمرشح عبر الواتساب أو البريد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                update('interview_type', 'مقابلة أولية')
                handleGenerateMeet('مقابلة أولية')
              }}
              disabled={meetLoading}
              className="bg-[#b88618] hover:bg-[#a57714] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow transition disabled:opacity-50"
            >
              <Video size={18} />
              {meetLoading ? 'جاري تجهيز الرابط...' : 'تجهيز رابط Google Meet'}
            </button>
          </div>
        </section>

        {/* HIERARCHICAL EVALUATION SYSTEM (4 TIERS) */}
        <section className="card p-6 md:p-8 mt-6 border-2 border-[#b88618]/40 bg-white rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-[#b88618] font-bold text-xs uppercase tracking-wider">نظام التقييم الهرمي المعتمد</div>
              <h2 className="text-2xl font-black text-[#09233f] mt-1">المقابلة والتقييم المتسلسل (4 مراحل)</h2>
              <p className="text-sm text-slate-500 mt-1">
                التسلسل: 1. تقييم الموارد البشرية (30%) ← 2. تقييم الإدارة المختصة (35%) ← 3. تقييم الإدارة التنفيذية (35%) ← 4. اعتماد المدير العام.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">النتيجة الموزونة</div>
                <div className="text-3xl font-black text-[#09233f]">{finalScore}%</div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-[#09233f] text-xs font-bold border">
                {interviewRecommendation}
              </div>
            </div>
          </div>

          {/* HIERARCHY TABS / STEPPER */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
            {[
              { tier: 1, title: '1. الموارد البشرية', subtitle: 'تقييم HR', icon: Users, weight: '30%', score: form.hr_score },
              { tier: 2, title: '2. الإدارة المختصة', subtitle: 'التقييم الفني', icon: Building2, weight: '35%', score: form.engineering_score },
              { tier: 3, title: '3. الإدارة التنفيذية', subtitle: 'إدارة المشاريع', icon: Briefcase, weight: '35%', score: form.technical_office_score },
              { tier: 4, title: '4. المدير العام', subtitle: 'الاعتماد النهائي', icon: ShieldCheck, weight: 'قرار', score: form.gm_approval },
            ].map(item => {
              const Icon = item.icon
              const isSelected = activeTier === item.tier
              return (
                <button
                  key={item.tier}
                  onClick={() => setActiveTier(item.tier as any)}
                  className={`p-3.5 rounded-xl border text-right transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#09233f] text-white border-[#09233f] shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm">{item.title}</span>
                    <Icon size={18} className={isSelected ? 'text-[#d4a72c]' : 'text-slate-400'} />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs">
                    <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>{item.subtitle} ({item.weight})</span>
                    <span className={`font-black ${isSelected ? 'text-[#d4a72c]' : 'text-[#09233f]'}`}>
                      {item.tier === 4 ? (form.gm_approval === 'لم يتم اتخاذ القرار' ? 'بانتظار القرار' : 'معتمد') : `${item.score}%`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* INTERVIEW GENERAL SETTINGS */}
          <div className="grid md:grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-xl border">
            <label className="text-xs font-bold text-slate-700">
              تاريخ ووقت المقابلة
              <input
                className="input mt-1.5 w-full border rounded-lg p-2.5 bg-white text-sm"
                type="datetime-local"
                value={form.interview_date}
                onChange={e => update('interview_date', e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              نوع المقابلة
              <div className="flex gap-2 mt-1.5">
                <select
                  className="input flex-1 border rounded-lg p-2.5 bg-white text-sm"
                  value={form.interview_type}
                  onChange={e => {
                    const newType = e.target.value
                    update('interview_type', newType)
                    if (newType === 'مقابلة أولية' || newType === 'مقابلة عن بُعد') {
                      handleGenerateMeet(newType)
                    }
                  }}
                >
                  <option value="مقابلة أولية">مقابلة أولية (HR)</option>
                  <option value="مقابلة فنية">مقابلة فنية (الإدارة المختصة)</option>
                  <option value="مقابلة نهائية">مقابلة نهائية (الإدارة)</option>
                  <option value="مقابلة عن بُعد">مقابلة عن بُعد (Google Meet)</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleGenerateMeet(form.interview_type)}
                  className="px-3 bg-white border border-[#b88618] text-[#b88618] rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-[#fff9e8]"
                  title="توليد رابط Google Meet"
                >
                  <Video size={16} /> رابط
                </button>
              </div>
            </label>
          </div>

          {/* ACTIVE TIER CONTENT */}
          <div className="mt-6">
            {/* TIER 1: HR EVALUATION */}
            {activeTier === 1 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={22} className="text-blue-700" />
                    <div>
                      <h3 className="font-black text-[#09233f] text-lg">المرحلة الأولى: تقييم الموارد البشرية (HR Evaluation)</h3>
                      <p className="text-xs text-slate-500">الوزن النسبي: 30% من التقييم النهائي الإجمالي</p>
                    </div>
                  </div>
                  <span className="font-black text-blue-800 text-2xl">{form.hr_score}%</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="text-xs font-bold">اسم مسؤول التقييم بالموارد البشرية
                    <input
                      type="text"
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.hr_evaluator}
                      onChange={e => update('hr_evaluator', e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold">حالة تقييم الموارد البشرية
                    <select
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.hr_status}
                      onChange={e => update('hr_status', e.target.value as any)}
                    >
                      <option value="قيد التقييم">قيد التقييم</option>
                      <option value="معتمد">معتمد ومقبول للانتقال للإدارة المختصة</option>
                      <option value="مرفوض">مرفوض مبدئيًا</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                    <span>درجة تقييم الموارد البشرية (التواصل، الجدية، المظهر المهني، التوافق الثقافي):</span>
                    <span className="text-lg font-black text-blue-700">{form.hr_score} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.hr_score}
                    onChange={e => update('hr_score', Number(e.target.value))}
                    className="w-full accent-blue-700"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ملاحظات وتوصيات الموارد البشرية:
                  </label>
                  <textarea
                    rows={3}
                    className="input w-full border rounded-lg p-3 bg-white text-sm"
                    placeholder="ملاحظات حول المقابلة الأولية، الراتب المتوقع، تاريخ الجاهزية للمباشرة، تقييم الشخصية..."
                    value={form.hr_notes}
                    onChange={e => update('hr_notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TIER 2: SPECIALIZED DEPARTMENT EVALUATION */}
            {activeTier === 2 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={22} className="text-amber-700" />
                    <div>
                      <h3 className="font-black text-[#09233f] text-lg">المرحلة الثانية: تقييم الإدارة المختصة (الفنية / الهندسية)</h3>
                      <p className="text-xs text-slate-500">الوزن النسبي: 35% من التقييم النهائي الإجمالي</p>
                    </div>
                  </div>
                  <span className="font-black text-amber-800 text-2xl">{form.engineering_score}%</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="text-xs font-bold">اسم المقيم / مدير الإدارة المختصة
                    <input
                      type="text"
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.dept_evaluator}
                      onChange={e => update('dept_evaluator', e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold">حالة التقييم الفني
                    <select
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.dept_status}
                      onChange={e => update('dept_status', e.target.value as any)}
                    >
                      <option value="قيد التقييم">قيد التقييم</option>
                      <option value="معتمد">معتمد فنياً ومناسب للمشروع</option>
                      <option value="مرفوض">غير مطابق للاحتياج الفني</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                    <span>درجة التقييم الفني والتخصصي (الخبرة، الكفاءة الميدانية، حل المشكلات، الأدوات):</span>
                    <span className="text-lg font-black text-amber-700">{form.engineering_score} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.engineering_score}
                    onChange={e => update('engineering_score', Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ملاحظات الإدارة المختصة (الفنية / الهندسية):
                  </label>
                  <textarea
                    rows={3}
                    className="input w-full border rounded-lg p-3 bg-white text-sm"
                    placeholder="تقييم القدرات الفنية، المشاريع السابقة، الحلول التنفيذية، ملائمة المرشح لطبيعة المشروع..."
                    value={form.engineering_notes}
                    onChange={e => update('engineering_notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TIER 3: EXECUTIVE MANAGEMENT / TECHNICAL OFFICE EVALUATION */}
            {activeTier === 3 && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={22} className="text-indigo-700" />
                    <div>
                      <h3 className="font-black text-[#09233f] text-lg">المرحلة الثالثة: تقييم الإدارة (المكتب الفني / إدارة العمليات)</h3>
                      <p className="text-xs text-slate-500">الوزن النسبي: 35% من التقييم النهائي الإجمالي</p>
                    </div>
                  </div>
                  <span className="font-black text-indigo-800 text-2xl">{form.technical_office_score}%</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="text-xs font-bold">اسم ممثل الإدارة التنفيذية
                    <input
                      type="text"
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.management_evaluator}
                      onChange={e => update('management_evaluator', e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold">توصية الإدارة
                    <select
                      className="input mt-1 w-full border rounded-lg p-2 bg-white"
                      value={form.management_status}
                      onChange={e => update('management_status', e.target.value as any)}
                    >
                      <option value="قيد التقييم">قيد التقييم</option>
                      <option value="معتمد">يوصى بالتعيين ورفع الملف للمدير العام</option>
                      <option value="مرفوض">لا يوصى بالتعيين</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                    <span>درجة التقييم الإداري والتنظيمي (الالتزام، التخطيط، الحصر والتقارير، القيادة):</span>
                    <span className="text-lg font-black text-indigo-700">{form.technical_office_score} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.technical_office_score}
                    onChange={e => update('technical_office_score', Number(e.target.value))}
                    className="w-full accent-indigo-700"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ملاحظات الإدارة التنفيذية والمكتب الفني:
                  </label>
                  <textarea
                    rows={3}
                    className="input w-full border rounded-lg p-3 bg-white text-sm"
                    placeholder="ملاحظات حول الميزانية، حزم العمل، الجداول الزمنية، جاهزية استلام الموقع..."
                    value={form.technical_office_notes}
                    onChange={e => update('technical_office_notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TIER 4: GENERAL MANAGER APPROVAL */}
            {activeTier === 4 && (
              <div className="rounded-2xl border-2 border-[#b88618] bg-[#fbf8f0] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={26} className="text-[#b88618]" />
                    <div>
                      <h3 className="font-black text-[#09233f] text-lg">المرحلة الرابعة: اعتماد المدير العام (General Manager Approval)</h3>
                      <p className="text-xs text-slate-600">الاعتماد النهائي وإصدار أمر تجهيز العرض الوظيفي والمباشرة</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-xl font-black text-xs ${
                    form.gm_approval === 'معتمد' ? 'bg-green-600 text-white' : 'bg-[#09233f] text-white'
                  }`}>
                    {form.gm_approval}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="text-xs font-bold">اسم المدير العام / المفوض
                    <input
                      type="text"
                      className="input mt-1 w-full border rounded-lg p-2 bg-white font-bold"
                      value={form.gm_name}
                      onChange={e => update('gm_name', e.target.value)}
                    />
                  </label>
                  <label className="text-xs font-bold">قرار اعتماد المدير العام
                    <select
                      className="input mt-1 w-full border rounded-lg p-2 bg-white font-bold text-sm"
                      value={form.gm_approval}
                      onChange={e => {
                        update('gm_approval', e.target.value)
                        if (e.target.value === 'معتمد') update('final_decision', 'قبول')
                        if (e.target.value === 'مرفوض') update('final_decision', 'رفض')
                      }}
                    >
                      <option value="لم يتم اتخاذ القرار">لم يتم اتخاذ القرار بعد</option>
                      <option value="معتمد">معتمد للتعيين وإصدار العرض الوظيفي</option>
                      <option value="معتمد مع تعديل الراتب">معتمد مع تعديل العرض المالي</option>
                      <option value="مرفوض">غير معتمد / اعتذار</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    توجيهات وملاحظات المدير العام:
                  </label>
                  <textarea
                    rows={3}
                    className="input w-full border rounded-lg p-3 bg-white text-sm font-medium"
                    placeholder="توجيهات الاعتماد، الراتب المعتمد، تاريخ المباشرة المقترح، أي شروط إضافية..."
                    value={form.gm_notes}
                    onChange={e => update('gm_notes', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* FINAL SUMMARY & DECISION FOOTER */}
          <div className="mt-8 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="grid md:grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-xs text-slate-500">التوصية المبدئية الموزونة</div>
                <div className="text-lg font-black text-[#09233f] mt-0.5">{interviewRecommendation} ({finalScore}%)</div>
                <div className="text-[11px] text-slate-400 mt-1">HR (30%) + المختصة (35%) + الإدارة (35%)</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">القرار النهائي المسجل في النظام</label>
                <select
                  className="input w-full border rounded-lg p-2 bg-white font-bold text-sm"
                  value={form.final_decision}
                  onChange={e => update('final_decision', e.target.value)}
                >
                  <option>لم يتم اتخاذ القرار</option>
                  <option>قبول</option>
                  <option>قبول مشروط</option>
                  <option>احتياطي</option>
                  <option>رفض</option>
                </select>
              </div>

              <div className="flex justify-end items-center gap-3">
                <button
                  disabled={saving || !tableReady}
                  onClick={saveInterview}
                  className="w-full md:w-auto bg-[#09233f] hover:bg-[#123864] text-white px-6 py-3 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Save size={18}/>
                  {saving ? 'جاري الحفظ...' : 'حفظ التقييم الهرمي'}
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className={`mt-4 p-3 rounded-xl text-sm font-bold ${
                saveMessage.includes('نجاح') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {saveMessage}
              </div>
            )}
          </div>
        </section>

        {/* MATCHING DETAILS & BREAKDOWN */}
        <section className="card p-6 mt-6 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-xl font-black text-[#09233f] mb-4">تفاصيل مطابقة المتطلبات الوظيفية</h2>
          <div className="space-y-4">
            {requirements.map(r => {
              const score = Number(map[r.id]?.score || 0)
              return (
                <div key={r.id}>
                  <div className="flex justify-between gap-3 text-sm mb-1">
                    <span className="font-bold">
                      {r.name} {r.required ? '• أساسي' : ''} <span className="font-normal text-slate-400">({Number(r.weight)}%)</span>
                    </span>
                    <span className="font-bold">{score}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#b88618]" style={{ width: `${score}%` }}/>
                  </div>
                  {map[r.id]?.evidence && <p className="text-xs text-slate-500 mt-1">الدليل: {map[r.id].evidence}</p>}
                </div>
              )
            })}
          </div>
        </section>

        {/* INTERVIEW HISTORY */}
        <section className="card p-6 mt-6 bg-white border rounded-2xl shadow-sm">
          <h2 className="text-xl font-black text-[#09233f] mb-4">سجل جلسات التقييم والمقابلات</h2>
          {interviews.length ? (
            <div className="space-y-3">
              {interviews.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#09233f]">{item.interview_type}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.interview_date ? new Date(item.interview_date).toLocaleString('ar-SA') : 'بدون تاريخ'}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="font-black text-lg text-[#09233f]">{Number(item.final_score)}%</span>
                    <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold">{item.final_decision}</span>
                    {index === 0 && <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">الأحدث</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">لا توجد مقابلات سابقة مسجلة لهذا المرشح.</p>
          )}
        </section>
      </div>

      {/* GOOGLE MEET MODAL */}
      {showMeetModal && meetData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-right" dir="rtl">
            <div className="flex justify-between items-center pb-3 border-b">
              <div className="flex items-center gap-2 text-[#09233f] font-black text-lg">
                <Video className="text-[#b88618]" size={22} />
                <span>رابط ودعوة المقابلة عبر Google Meet</span>
              </div>
              <button onClick={() => setShowMeetModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-600 block mb-1">رابط Google Meet:</label>
              <div className="flex items-center gap-2 border rounded-xl p-2 bg-slate-50">
                <input readOnly value={meetData.meetLink} className="flex-1 bg-transparent text-sm font-mono text-[#09233f] outline-none" />
                <button
                  onClick={() => copyToClipboard(meetData.meetLink)}
                  className="px-3 py-1.5 bg-[#09233f] text-white text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Copy size={13} /> {copied ? 'تم النسخ' : 'نسخ'}
                </button>
                <a
                  href={meetData.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 border rounded-lg hover:bg-slate-200 text-slate-700"
                  title="فتح الرابط"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-600 block mb-1">نص رسالة الدعوة المجهزة للمرشح:</label>
              <textarea
                readOnly
                rows={6}
                value={meetData.message}
                className="w-full border rounded-xl p-3 bg-slate-50 text-xs leading-relaxed text-slate-700 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              {meetData.whatsappUrl && (
                <a
                  href={meetData.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-2 shadow"
                >
                  <Send size={15} /> إرسال عبر واتساب
                </a>
              )}
              {meetData.mailtoUrl && (
                <a
                  href={meetData.mailtoUrl}
                  className="bg-[#09233f] hover:bg-[#123864] text-white font-bold py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-2 shadow"
                >
                  إرسال بالبريد الإلكتروني
                </a>
              )}
            </div>

            <div className="mt-3 text-center">
              <button
                onClick={() => {
                  copyToClipboard(meetData.message)
                  alert('تم نسخ الرسالة بالكامل إلى الحافظة.')
                }}
                className="text-xs text-[#b88618] font-bold hover:underline"
              >
                نسخ الرسالة بالكامل
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
