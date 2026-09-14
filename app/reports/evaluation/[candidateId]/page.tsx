'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Printer, ShieldCheck, Users, Building2, Briefcase, Award } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OfficialEvaluationPdfReport() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: c } = await supabase.from('candidates').select('*').eq('id', candidateId).single()
      if (c) {
        setCandidate(c)
        const [{ data: r }, { data: iv }] = await Promise.all([
          supabase.from('requests').select('*').eq('id', c.request_id).single(),
          supabase.from('candidate_interviews').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])
        setRequest(r)
        setInterview(iv)
      }
      setLoading(false)
    })()
  }, [candidateId])

  if (loading) return <main dir="rtl" className="min-h-screen grid place-items-center font-bold text-[#09233f]">جاري تجهيز تقرير التقييم الرسمي...</main>
  if (!candidate) return <main dir="rtl" className="min-h-screen grid place-items-center">المرشح غير موجود.</main>

  const reportDate = new Date().toLocaleDateString('ar-SA')
  const ivDate = interview?.interview_date ? new Date(interview.interview_date).toLocaleDateString('ar-SA') : reportDate

  // Extract GM decision if stored
  let gmDecision = 'معتمد'
  let gmNotes = ''
  if (interview?.general_notes?.includes('[اعتماد المدير العام:')) {
    const match = interview.general_notes.match(/\[اعتماد المدير العام: ([^\]]+)\]([\s\S]*)/)
    if (match) {
      gmDecision = match[1].trim()
      gmNotes = match[2]?.trim() || ''
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-200 py-6 text-slate-800">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          .paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print max-w-[850px] mx-auto mb-4 flex justify-between items-center px-2">
        <Link href={`/requests/${candidate.request_id}/candidates/${candidateId}`} className="flex items-center gap-2 text-[#09233f] font-bold hover:underline">
          <ArrowRight size={18} /> العودة للتقييم
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-[#09233f] hover:bg-[#123864] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow"
        >
          <Printer size={18} /> طباعة / تصدير تقرير التقييم PDF
        </button>
      </div>

      <article className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-8 md:p-12 text-[12px] leading-relaxed">
        {/* HEADER */}
        <header className="border-b-2 border-[#09233f] pb-4 flex justify-between items-center">
          <div>
            <div className="text-xl font-black text-[#09233f]">شركة البنية الأساسية للمقاولات ذ.م.م</div>
            <div className="text-[#b88618] font-bold text-xs">لجنة التقييم والمقابلات المركزية</div>
            <div className="text-[11px] text-slate-500 mt-0.5">محضر تقييم ومقابلة مرشح معتمد رسمياً</div>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-xs font-mono font-bold text-[#09233f]">DOC: EV-{candidate.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[11px] text-slate-500">Date: {reportDate}</div>
            <div className="mt-1 px-2.5 py-0.5 bg-green-50 border border-green-200 text-green-800 rounded text-[10px] font-bold text-center inline-block">
              OFFICIAL EVALUATION
            </div>
          </div>
        </header>

        <div className="text-center my-4">
          <h1 className="text-2xl font-black text-[#09233f]">تقرير التقييم الهرمي والمقابلة الوظيفية</h1>
          <div className="text-xs text-[#b88618] font-bold">HIERARCHICAL CANDIDATE EVALUATION & INTERVIEW MINUTES</div>
        </div>

        {/* CANDIDATE & REQUEST INFO */}
        <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded-lg p-3 bg-slate-50 text-[11.5px]">
          <div><b>اسم المرشح:</b> {candidate.full_name}</div>
          <div><b>الوظيفة المرشح لها:</b> {request?.exact_type || '—'}</div>
          <div><b>المؤهل / التخصص:</b> {candidate.degree || '—'} - {candidate.specialization || '—'}</div>
          <div><b>رقم الجوال:</b> {candidate.phone || '—'}</div>
          <div><b>تاريخ جلسة التقييم:</b> {ivDate}</div>
          <div><b>نوع الجلسة:</b> {interview?.interview_type || 'مقابلة رسمية'}</div>
        </div>

        {/* HIERARCHICAL MATRIX (4 TIERS) */}
        <div className="mt-5">
          <div className="font-black text-sm text-[#09233f] mb-2 flex items-center gap-1.5">
            <Award size={18} className="text-[#b88618]" />
            <span>نتائج مراحل التقييم الهرمي (Hierarchical Evaluation Matrix)</span>
          </div>

          <div className="space-y-3">
            {/* TIER 1: HR */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 p-2.5 flex justify-between items-center text-blue-900">
                <div className="flex items-center gap-2 font-bold">
                  <Users size={16} /> 1. تقييم إدارة الموارد البشرية (الوزن 30%)
                </div>
                <div className="font-black text-sm">{interview?.hr_score ?? '—'} / 100</div>
              </div>
              <div className="p-2.5 bg-white text-[11.5px]">
                <div className="text-slate-600">
                  <b>الملاحظات والتوصية:</b> {interview?.hr_notes || 'تمت المقابلة الأولية والتحقق من الجاهزية والخبرات السابقة وتأكيد التوافق الثقافي للمرشح.'}
                </div>
              </div>
            </div>

            {/* TIER 2: DEPARTMENT */}
            <div className="border border-amber-200 rounded-lg overflow-hidden">
              <div className="bg-amber-50 p-2.5 flex justify-between items-center text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <Building2 size={16} /> 2. تقييم الإدارة المختصة / الهندسية (الوزن 35%)
                </div>
                <div className="font-black text-sm">{interview?.engineering_score ?? '—'} / 100</div>
              </div>
              <div className="p-2.5 bg-white text-[11.5px]">
                <div className="text-slate-600">
                  <b>الملاحظات الفنية:</b> {interview?.engineering_notes || 'تم تقييم الكفاءة التخصصية والخبرات الميدانية السابقة ومدى مطابقة متطلبات المشروع.'}
                </div>
              </div>
            </div>

            {/* TIER 3: MANAGEMENT */}
            <div className="border border-indigo-200 rounded-lg overflow-hidden">
              <div className="bg-indigo-50 p-2.5 flex justify-between items-center text-indigo-900">
                <div className="flex items-center gap-2 font-bold">
                  <Briefcase size={16} /> 3. تقييم الإدارة التنفيذية / المكتب الفني (الوزن 35%)
                </div>
                <div className="font-black text-sm">{interview?.technical_office_score ?? '—'} / 100</div>
              </div>
              <div className="p-2.5 bg-white text-[11.5px]">
                <div className="text-slate-600">
                  <b>ملاحظات الإدارة:</b> {interview?.technical_office_notes || 'مراجعة الميزانية وحزم العمل والجاهزية للانضمام لفرق المشاريع.'}
                </div>
              </div>
            </div>

            {/* TIER 4: GM APPROVAL */}
            <div className="border-2 border-[#b88618] rounded-lg overflow-hidden">
              <div className="bg-[#fbf8f0] p-2.5 flex justify-between items-center text-[#09233f]">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck size={18} className="text-[#b88618]" /> 4. اعتماد المدير العام (General Manager Final Decision)
                </div>
                <div className="font-black text-xs px-2.5 py-0.5 rounded bg-[#09233f] text-white">
                  {gmDecision}
                </div>
              </div>
              <div className="p-2.5 bg-white text-[11.5px]">
                <div className="text-slate-700">
                  <b>توجيهات وقرار المدير العام:</b> {gmNotes || 'معتمد للتعيين ومباشرة العمل بعد استكمال توقيع العرض الوظيفي وإجراءات التعاقد النظامية.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE & FINAL OUTCOME BANNER */}
        <div className="mt-5 p-4 rounded-xl bg-[#09233f] text-white flex justify-between items-center">
          <div>
            <div className="text-[11px] text-slate-300">الدرجة الموزونة الإجمالية</div>
            <div className="text-3xl font-black mt-0.5">{interview?.final_score ?? '—'}%</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-slate-300">التوصية المعتمدة</div>
            <div className="text-base font-bold mt-0.5 text-[#d4a72c]">{interview?.recommendation || 'مرشح معتمد للتعيين'}</div>
          </div>
          <div className="text-left">
            <div className="text-[11px] text-slate-300">حالة القرار</div>
            <div className="text-xl font-black mt-0.5 text-green-400">{interview?.final_decision || 'قبول'}</div>
          </div>
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="mt-8 border-t-2 border-slate-300 pt-4 grid grid-cols-4 gap-4 text-center text-[10.5px]">
          <div>
            <div className="font-bold text-[#09233f]">الموارد البشرية</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center text-slate-500">
              معتمد
            </div>
            <div className="text-slate-400 mt-0.5">التوقيع والتاريخ</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">الإدارة المختصة</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center text-slate-500">
              معتمد
            </div>
            <div className="text-slate-400 mt-0.5">التوقيع والتاريخ</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">الإدارة التنفيذية</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center text-slate-500">
              معتمد
            </div>
            <div className="text-slate-400 mt-0.5">التوقيع والتاريخ</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">المدير العام</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
              <span className="text-[9px] text-[#b88618] font-black border border-[#b88618] px-1.5 py-0.5 rounded">
                معتمد ومختوم
              </span>
            </div>
            <div className="text-slate-400 mt-0.5">الاعتماد النهائي</div>
          </div>
        </div>
      </article>
    </main>
  )
}
